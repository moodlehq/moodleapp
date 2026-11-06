// (C) Copyright 2026 Moodle Pty Ltd.
// Licensed under the Apache License, Version 2.0.

import Capacitor
import Darwin
import Foundation

/**
 * File primitives for the Cordova-to-Capacitor SQLite rename protocol, not a SQLite connection.
 * All DB connections must remain closed while it runs. The bridge is not wired to startup yet.
 * Paths are fixed to Moodle's existing Library/LocalDatabase and a separate metadata directory.
 */
@objc(SQLiteMigrationPlugin)
public class SQLiteMigrationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SQLiteMigrationPlugin"
    public let jsName = "MoodleAppSQLiteMigration"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listJournalNames", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readJournal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeJournal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "renameNoReplace", returnType: CAPPluginReturnPromise)
    ]

    private let queue = DispatchQueue(label: "com.moodle.sqlite-migration")
    private let maxJournalBytes = 16384

    @objc public func list(_ call: CAPPluginCall) {
        perform(call) {
            let directory = try self.databaseDirectory()
            guard try self.exists(directory) else { return ["files": [String]()] }
            let names = try FileManager.default.contentsOfDirectory(atPath: directory.path)
                .filter { $0.hasPrefix("MoodleMobile") || $0.hasPrefix("Site-") }
            for name in names {
                try self.requireType(directory.appendingPathComponent(name), directory: false)
            }
            // Persist a move even when the previous call stopped before acknowledging it.
            try self.syncDirectory(directory)
            return ["files": names]
        }
    }

    @objc public func listJournalNames(_ call: CAPPluginCall) {
        perform(call) {
            let directory = try self.journalDirectory()
            var names = [String]()
            for entry in try FileManager.default.contentsOfDirectory(atPath: directory.path) {
                try self.requireType(directory.appendingPathComponent(entry), directory: false)
                let journal = entry.hasSuffix(".json")
                guard journal || entry.hasSuffix(".tmp") else {
                    throw self.failure("Unexpected SQLite migration metadata.")
                }
                let name = String(entry.dropLast(journal ? 5 : 4))
                guard self.validName(name) else { throw self.failure("Invalid SQLite migration metadata name.") }
                if journal { names.append(name) }
            }
            try self.syncDirectory(directory)
            return ["names": names]
        }
    }

    @objc public func readJournal(_ call: CAPPluginCall) {
        perform(call) {
            let name = try self.logicalName(call)
            let file = try self.journalDirectory().appendingPathComponent(name + ".json")
            guard try self.exists(file) else { return [:] }
            try self.requireType(file, directory: false)
            let fd = Darwin.open(file.path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
            guard fd >= 0 else { throw self.posixFailure() }
            let handle = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
            let bytes = try handle.read(upToCount: self.maxJournalBytes + 1) ?? Data()
            guard bytes.count <= self.maxJournalBytes, let journal = String(data: bytes, encoding: .utf8) else {
                throw self.failure("Invalid SQLite migration journal encoding or size.")
            }
            guard Darwin.fsync(fd) == 0 else { throw self.posixFailure() }
            try self.syncDirectory(file.deletingLastPathComponent())
            try handle.close()
            return ["journal": journal]
        }
    }

    @objc public func writeJournal(_ call: CAPPluginCall) {
        perform(call) {
            let name = try self.logicalName(call)
            guard let journal = call.getString("journal"),
                  let bytes = journal.data(using: .utf8), bytes.count <= self.maxJournalBytes else {
                throw self.failure("SQLite migration journal is required and must fit the size limit.")
            }
            let directory = try self.journalDirectory()
            let destination = directory.appendingPathComponent(name + ".json")
            let temporary = directory.appendingPathComponent(name + ".tmp")
            if try self.exists(destination) { try self.requireType(destination, directory: false) }
            if try self.exists(temporary) { try self.requireType(temporary, directory: false) }
            let fd = Darwin.open(temporary.path, O_WRONLY | O_CREAT | O_TRUNC | O_NOFOLLOW | O_CLOEXEC, mode_t(0o600))
            guard fd >= 0 else { throw self.posixFailure() }
            defer { Darwin.close(fd) }
            try bytes.withUnsafeBytes { buffer in
                var offset = 0
                while offset < buffer.count {
                    let written = Darwin.write(fd, buffer.baseAddress!.advanced(by: offset), buffer.count - offset)
                    guard written > 0 else { throw self.posixFailure() }
                    offset += written
                }
            }
            guard Darwin.fsync(fd) == 0 else { throw self.posixFailure() }
            // Only metadata is atomically replaced. Database files always use RENAME_EXCL.
            guard Darwin.rename(temporary.path, destination.path) == 0 else { throw self.posixFailure() }
            try self.syncDirectory(directory)
            return [:]
        }
    }

    @objc public func renameNoReplace(_ call: CAPPluginCall) {
        perform(call) {
            guard let source = call.getString("source"), let destination = call.getString("destination"),
                  self.validMapping(source, destination) else {
                throw self.failure("Invalid SQLite rename mapping.")
            }
            let directory = try self.databaseDirectory()
            let from = directory.appendingPathComponent(source)
            let to = directory.appendingPathComponent(destination)
            try self.requireType(from, directory: false)
            // RENAME_EXCL refuses an existing target atomically, including symlinks.
            guard renamex_np(from.path, to.path, UInt32(RENAME_EXCL)) == 0 else { throw self.posixFailure() }
            try self.syncDirectory(directory)
            return [:]
        }
    }

    private func perform(_ call: CAPPluginCall, operation: @escaping () throws -> JSObject) {
        queue.async {
            do {
                call.resolve(try operation())
            } catch {
                call.reject("SQLite migration file operation failed.", nil, error)
            }
        }
    }

    private func validName(_ name: String) -> Bool {
        name == "MoodleMobile" || name.range(of: "\\ASite-[a-zA-Z0-9_-]+\\z", options: .regularExpression) != nil
    }

    private func logicalName(_ call: CAPPluginCall) throws -> String {
        guard let name = call.getString("name"), validName(name) else {
            throw failure("Invalid SQLite logical name.")
        }
        return name
    }

    private func validMapping(_ source: String, _ destination: String) -> Bool {
        ["", "-wal", "-shm", "-journal"].contains { suffix in
            guard source.hasSuffix(suffix) else { return false }
            let name = String(source.dropLast(suffix.count))
            return validName(name) && destination == name + "SQLite.db" + suffix
        }
    }

    private func databaseDirectory() throws -> URL {
        let library = try FileManager.default.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        let directory = library.appendingPathComponent("LocalDatabase", isDirectory: true)
        if try exists(directory) { try requireType(directory, directory: true) }
        return directory
    }

    private func journalDirectory() throws -> URL {
        let library = try FileManager.default.url(for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
        var directory = library.appendingPathComponent("MoodleSQLiteMigration", isDirectory: true)
        if !(try exists(directory)) {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false)
        }
        try requireType(directory, directory: true)
        try syncDirectory(library)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
        return directory
    }

    private func exists(_ url: URL) throws -> Bool {
        var info = stat()
        if lstat(url.path, &info) == 0 { return true }
        if errno == ENOENT { return false }
        throw posixFailure()
    }

    private func requireType(_ url: URL, directory: Bool) throws {
        var info = stat()
        guard lstat(url.path, &info) == 0 else { throw posixFailure() }
        let expected = directory ? S_IFDIR : S_IFREG
        guard (info.st_mode & S_IFMT) == expected else {
            throw failure("Unexpected SQLite migration filesystem entry.")
        }
    }

    private func syncDirectory(_ url: URL) throws {
        let fd = Darwin.open(url.path, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
        guard fd >= 0 else { throw posixFailure() }
        defer { Darwin.close(fd) }
        guard Darwin.fsync(fd) == 0 else { throw posixFailure() }
    }

    private func failure(_ message: String) -> NSError {
        NSError(domain: "MoodleSQLiteMigration", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func posixFailure() -> NSError {
        NSError(domain: NSPOSIXErrorDomain, code: Int(errno))
    }
}
