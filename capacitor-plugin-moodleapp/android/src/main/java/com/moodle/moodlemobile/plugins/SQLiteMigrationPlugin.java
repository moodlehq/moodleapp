// (C) Copyright 2026 Moodle Pty Ltd.
// Licensed under the Apache License, Version 2.0.

package com.moodle.moodlemobile.plugins;

import android.system.ErrnoException;
import android.system.Os;
import android.system.OsConstants;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/**
 * File primitives for the Cordova-to-Capacitor SQLite rename protocol.
 * This does not open/recover databases. Renaming requires all connections to remain closed.
 * Later deletion requires the affected database's connections and registrations to be closed.
 * Only Moodle database names in the existing native database directory are accepted.
 */
@CapacitorPlugin(name = "MoodleAppSQLiteMigration")
public class SQLiteMigrationPlugin extends Plugin {

    private static final int MAX_JOURNAL_BYTES = 16384;

    static {
        System.loadLibrary("moodle_sqlite_migration");
    }

    private static native void renameExclusive(String directory, String source, String destination) throws IOException;

    @PluginMethod
    public synchronized void list(PluginCall call) {
        try {
            File directory = databaseDirectory();
            if (!exists(directory)) {
                call.resolve(new JSObject().put("files", new JSArray()));
                return;
            }
            String[] names = directory.list();
            if (names == null) throw new IOException("Cannot list SQLite directory.");
            JSArray files = new JSArray();
            for (String name : names) {
                if (name.startsWith("MoodleMobile") || name.startsWith("Site-")) {
                    requireRegular(new File(directory, name));
                    files.put(name);
                }
            }
            // Also persists a rename whose previous acknowledgement was interrupted.
            syncDirectory(directory);
            call.resolve(new JSObject().put("files", files));
        } catch (Exception error) {
            call.reject("Cannot inventory SQLite migration files.", error);
        }
    }

    @PluginMethod
    public synchronized void listJournalNames(PluginCall call) {
        try {
            File directory = journalDirectory();
            String[] entries = directory.list();
            if (entries == null) throw new IOException("Cannot list SQLite migration journals.");
            JSArray names = new JSArray();
            for (String entry : entries) {
                requireRegular(new File(directory, entry));
                boolean journal = entry.endsWith(".json");
                if (!journal && !entry.endsWith(".tmp")) throw new IOException("Unexpected SQLite migration metadata.");
                String name = entry.substring(0, entry.length() - (journal ? 5 : 4));
                if (!validName(name)) throw new IOException("Invalid SQLite migration metadata name.");
                if (journal) names.put(name);
            }
            syncDirectory(directory);
            call.resolve(new JSObject().put("names", names));
        } catch (Exception error) {
            call.reject("Cannot inventory SQLite migration journals.", error);
        }
    }

    @PluginMethod
    public synchronized void readJournal(PluginCall call) {
        try {
            String journal = readJournalText(logicalName(call));
            if (journal == null) {
                call.resolve(new JSObject());
                return;
            }
            call.resolve(new JSObject().put("journal", journal));
        } catch (Exception error) {
            call.reject("Cannot read SQLite migration journal.", error);
        }
    }

    @PluginMethod
    public synchronized void writeJournal(PluginCall call) {
        try {
            String name = logicalName(call);
            String journal = call.getString("journal");
            if (journal == null) throw new IOException("SQLite migration journal is required.");
            byte[] bytes = journal.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > MAX_JOURNAL_BYTES) throw new IOException("SQLite migration journal is too large.");
            File directory = journalDirectory();
            File destination = new File(directory, name + ".json");
            File temporary = new File(directory, name + ".tmp");
            if (exists(destination)) requireRegular(destination);
            if (exists(temporary)) requireRegular(temporary);
            // Only metadata is replaced here. Database files always use exclusive renaming.
            FileDescriptor fd = Os.open(temporary.getPath(),
                OsConstants.O_WRONLY | OsConstants.O_CREAT | OsConstants.O_TRUNC | OsConstants.O_NOFOLLOW, 0600);
            try (FileOutputStream output = new FileOutputStream(fd)) {
                output.write(bytes);
                output.getFD().sync();
            }
            Os.rename(temporary.getPath(), destination.getPath());
            syncDirectory(directory);
            call.resolve();
        } catch (Exception error) {
            call.reject("Cannot persist SQLite migration journal.", error);
        }
    }

    @PluginMethod
    public synchronized void renameNoReplace(PluginCall call) {
        try {
            String source = call.getString("source");
            String destination = call.getString("destination");
            if (!validMapping(source, destination)) throw new IOException("Invalid SQLite rename mapping.");
            renameExclusive(databaseDirectory().getPath(), source, destination);
            call.resolve();
        } catch (Exception error) {
            call.reject("Cannot rename SQLite migration file.", error);
        }
    }

    @PluginMethod
    public synchronized void removeDatabaseFiles(PluginCall call) {
        try {
            String name = logicalName(call);
            String text = readJournalText(name);
            if (text == null) throw new IOException("SQLite deletion intent is missing.");
            JSONObject journal = new JSONObject(text);
            if (!Integer.valueOf(2).equals(journal.get("version")) || !name.equals(journal.get("name"))
                || !"deleting".equals(journal.get("state"))) throw new IOException("Invalid SQLite deletion intent.");
            File directory = databaseDirectory();
            if (!exists(directory)) {
                syncDirectory(directory.getParentFile());
                call.resolve();
                return;
            }
            String[] files = directory.list();
            if (files == null) throw new IOException("Cannot list SQLite directory.");
            String principal = name + "SQLite.db";
            for (String file : files) {
                if (file.equals(name) || file.startsWith(name + "-")
                    || (file.startsWith(principal + "-") && !file.equals(principal + "-wal")
                        && !file.equals(principal + "-shm") && !file.equals(principal + "-journal"))) {
                    throw new IOException("Conflicting SQLite deletion file.");
                }
            }
            // Preflight the complete set before any unlink. Connections must already be closed.
            for (String suffix : new String[] { "", "-wal", "-shm", "-journal" }) {
                File file = new File(directory, principal + suffix);
                if (exists(file)) requireRegular(file);
            }
            for (String suffix : new String[] { "", "-wal", "-shm", "-journal" }) {
                File file = new File(directory, principal + suffix);
                if (exists(file) && !file.delete()) throw new IOException("Cannot remove SQLite file.");
            }
            syncDirectory(directory);
            call.resolve();
        } catch (Exception error) {
            call.reject("Cannot durably remove SQLite database files.", error);
        }
    }

    private String readJournalText(String name) throws Exception {
        File file = new File(journalDirectory(), name + ".json");
        if (!exists(file)) return null;
        requireRegular(file);
        if (file.length() > MAX_JOURNAL_BYTES) throw new IOException("SQLite migration journal is too large.");
        try (FileInputStream input = new FileInputStream(Os.open(file.getPath(), OsConstants.O_RDONLY | OsConstants.O_NOFOLLOW, 0))) {
            byte[] bytes = new byte[MAX_JOURNAL_BYTES + 1];
            int length = 0;
            int count;
            while ((count = input.read(bytes, length, bytes.length - length)) > 0) length += count;
            if (length > MAX_JOURNAL_BYTES) throw new IOException("SQLite migration journal is too large.");
            input.getFD().sync();
            syncDirectory(file.getParentFile());
            return StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes, 0, length)).toString();
        }
    }

    private String logicalName(PluginCall call) throws IOException {
        String name = call.getString("name");
        if (!validName(name)) throw new IOException("Invalid SQLite logical name.");
        return name;
    }

    private boolean validName(String name) {
        return name != null && (name.equals("MoodleMobile") || name.matches("Site-[a-zA-Z0-9_-]+"));
    }

    private boolean validMapping(String source, String destination) {
        if (source == null || destination == null) return false;
        for (String suffix : new String[] { "", "-wal", "-shm", "-journal" }) {
            if (!source.endsWith(suffix)) continue;
            String name = source.substring(0, source.length() - suffix.length());
            if (validName(name) && destination.equals(name + "SQLite.db" + suffix)) return true;
        }
        return false;
    }

    private File databaseDirectory() throws Exception {
        File directory = getContext().getDatabasePath("MoodleMobile").getParentFile();
        if (directory == null) throw new IOException("Missing SQLite directory.");
        if (exists(directory)) requireDirectory(directory);
        return directory;
    }

    private File journalDirectory() throws Exception {
        File directory = new File(getContext().getFilesDir(), "sqlite-migration");
        if (!exists(directory)) {
            if (!directory.mkdir()) throw new IOException("Cannot create SQLite journal directory.");
        }
        requireDirectory(directory);
        syncDirectory(directory.getParentFile());
        return directory;
    }

    private boolean exists(File file) throws ErrnoException {
        try {
            Os.lstat(file.getPath());
            return true;
        } catch (ErrnoException error) {
            if (error.errno == OsConstants.ENOENT) return false;
            throw error;
        }
    }

    private void requireRegular(File file) throws Exception {
        if (!OsConstants.S_ISREG(Os.lstat(file.getPath()).st_mode)) throw new IOException("Expected a regular SQLite file.");
    }

    private void requireDirectory(File directory) throws Exception {
        if (!OsConstants.S_ISDIR(Os.lstat(directory.getPath()).st_mode)) throw new IOException("Expected a SQLite directory.");
    }

    private void syncDirectory(File directory) throws ErrnoException {
        FileDescriptor fd = Os.open(directory.getPath(), OsConstants.O_RDONLY | OsConstants.O_NOFOLLOW, 0);
        try {
            if (!OsConstants.S_ISDIR(Os.fstat(fd).st_mode)) throw new ErrnoException("Expected directory", OsConstants.ENOTDIR);
            Os.fsync(fd);
        } finally {
            Os.close(fd);
        }
    }
}
