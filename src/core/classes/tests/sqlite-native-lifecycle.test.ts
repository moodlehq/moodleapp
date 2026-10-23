// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DatabaseSync } from 'node:sqlite';
import { SQLiteDBConnection } from '@classes/sqlitedb';
import { CoreSQLiteNativeLifecycle, CoreSQLiteNativeLifecycleStorage } from '@classes/sqlite-native-lifecycle';

describe('CoreSQLiteNativeLifecycle', () => {
    const global = 'MoodleMobile';
    const site = 'Site-test';
    let files: Set<string>;
    let journals: Map<string, unknown>;
    let storage: CoreSQLiteNativeLifecycleStorage;
    let lifecycle: CoreSQLiteNativeLifecycle;
    let engine: DatabaseSync;
    let connection: SQLiteDBConnection;

    beforeEach(() => {
        files = new Set([global, site, site + '-wal']);
        journals = new Map();
        storage = {
            list: jest.fn(async () => [...files]),
            listJournalNames: jest.fn(async () => [...journals.keys()]),
            readJournal: jest.fn(async name => journals.get(name)),
            writeJournal: jest.fn(async (name, value) => {
                journals.set(name, value);
            }),
            renameNoReplace: jest.fn(async (from, to) => {
                if (!files.has(from) || files.has(to)) {
                    throw new Error('Invalid rename');
                }
                files.delete(from);
                files.add(to);
            }),
            removeDatabaseFiles: jest.fn(async name => {
                const journal = journals.get(name);
                if (typeof journal !== 'object' || journal === null || !('state' in journal) || journal.state !== 'deleting') {
                    throw new Error('Missing deletion intent');
                }
                for (const suffix of ['', '-wal', '-shm', '-journal']) {
                    files.delete(name + 'SQLite.db' + suffix);
                }
            }),
        };
        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        engine = new DatabaseSync(':memory:');
        connection = {
            executeSql: jest.fn(async (sql, params = []) => {
                const rows = engine.prepare(sql).all(...params.map(value => value === undefined ? null : value));

                return { rows: { length: rows.length, item: index => rows[index] }, rowsAffected: 0 };
            }),
            sqlBatch: jest.fn(),
            open: jest.fn(),
            close: jest.fn(),
        };
        engine.exec(`CREATE TABLE schema_versions (name TEXT PRIMARY KEY, version INTEGER);
            INSERT INTO schema_versions VALUES ('CoreSitesProvider', 3);
            CREATE TABLE core_site_config (name TEXT, value TEXT);
            CREATE TABLE wscache_2 (id TEXT, data TEXT);
            CREATE TABLE sites_2 (id TEXT, siteUrl TEXT);
            INSERT INTO sites_2 VALUES ('test', 'https://example.invalid');
            PRAGMA user_version=42`);
    });

    afterEach(() => {
        engine.close();
    });

    it('preflights and adopts all legacy databases before any open, then retains validated provenance', async () => {
        const first = lifecycle.ready();
        expect(lifecycle.ready()).toBe(first);
        await first;
        expect(files).toEqual(new Set([global + 'SQLite.db', site + 'SQLite.db', site + 'SQLite.db-wal']));
        await expect(lifecycle.prepareOpen(site)).resolves.toBe('existing');
        await lifecycle.validateOpen(site, connection);
        expect(journals.get(site)).toEqual({ version: 2, name: site, origin: 'adopted', state: 'ready' });
        expect(engine.prepare('PRAGMA user_version').get()?.user_version).toBe(42);
        await new CoreSQLiteNativeLifecycle(storage).ready();
    });

    it.each(['created', 'ready', 'creating', 'deleted', 'deleting'])('understands durable %s state on restart', async state => {
        files.delete(site);
        files.delete(site + '-wal');
        if (state !== 'deleted') {
            files.add(site + 'SQLite.db');
        }
        journals.set(site, { version: 2, name: site, origin: 'created', state });
        await lifecycle.ready();
        expect(files.has(site + 'SQLite.db')).toBe(state !== 'deleted' && state !== 'deleting');
        expect(storage.removeDatabaseFiles).toHaveBeenCalledTimes(state === 'deleting' ? 1 : 0);
    });

    it('preflights a late collision before moving or deleting any database', async () => {
        journals.set(global, { version: 2, name: global, origin: 'adopted', state: 'deleting' });
        files.delete(global);
        files.add(global + 'SQLite.db');
        files.add(site + 'SQLite.db');
        await expect(lifecycle.ready()).rejects.toThrow();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
        expect(storage.writeJournal).not.toHaveBeenCalled();
    });

    it.each(['ready', 'created'])('never recreates a missing established %s file', async state => {
        journals.set(site, { version: 2, name: site, origin: 'created', state });
        files.delete(site);
        files.delete(site + '-wal');
        await expect(lifecycle.ready()).rejects.toThrow('missing or conflicting');
        expect(storage.writeJournal).not.toHaveBeenCalled();
    });

    it('requires explicit creation authorisation, including after a completed deletion', async () => {
        await lifecycle.ready();
        await expect(lifecycle.prepareOpen('Site-unknown')).rejects.toThrow();

        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        await lifecycle.reserveCreation('Site-new');
        expect(journals.get('Site-new')).toEqual({
            version: 2, name: 'Site-new', origin: 'created', state: 'creating',
        });
        await expect(lifecycle.prepareOpen('Site-new')).resolves.toBe('create');
        files.add('Site-newSQLite.db');
        await expect(lifecycle.prepareOpen('Site-new')).resolves.toBe('existing');
        await lifecycle.validateOpen('Site-new', connection);
        expect(journals.get('Site-new')).toMatchObject({ state: 'created' });
        await lifecycle.completeInitialization('Site-new', connection);
        expect(journals.get('Site-new')).toMatchObject({ state: 'ready' });
        await lifecycle.prepareDelete('Site-new');
        await lifecycle.removeDatabase('Site-new');
        await lifecycle.completeDelete('Site-new');
        await expect(lifecycle.prepareOpen('Site-new')).rejects.toThrow('explicit creation');

        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        await lifecycle.reserveCreation('Site-new');
        await expect(lifecycle.prepareOpen('Site-new')).resolves.toBe('create');
    });

    it('preserves an untracked target instead of granting it new-database provenance', async () => {
        await lifecycle.ready();
        files.add('Site-newSQLite.db');
        await expect(lifecycle.reserveCreation('Site-new')).rejects.toThrow('conflicting');
        expect(journals.has('Site-new')).toBe(false);
    });

    it('requires the global database before authorising a fresh site', async () => {
        files.clear();
        await expect(lifecycle.reserveCreation('Site-new')).rejects.toThrow('before creating site databases');
        expect(storage.writeJournal).not.toHaveBeenCalled();
    });

    it('supports a genuinely fresh global installation with an explicit reservation', async () => {
        files.clear();
        await lifecycle.reserveCreation(global);
        await expect(lifecycle.prepareOpen(global)).resolves.toBe('create');
        files.add(global + 'SQLite.db');
        await lifecycle.validateOpen(global, connection);
        await lifecycle.completeInitialization(global, connection);
        await lifecycle.reserveCreation('Site-new');
        expect(journals.get(global)).toMatchObject({ origin: 'created', state: 'ready' });
    });

    it('allows a reserved blank/partially initialised file only until explicit schema completion', async () => {
        engine.exec('DROP TABLE schema_versions');
        await lifecycle.reserveCreation('Site-new');
        files.add('Site-newSQLite.db');
        await lifecycle.validateOpen('Site-new', connection);
        expect(journals.get('Site-new')).toMatchObject({ state: 'created' });
        await expect(lifecycle.completeInitialization('Site-new', connection)).rejects.toThrow('no such table');
        expect(journals.get('Site-new')).toMatchObject({ state: 'created' });
    });

    it('does not bless a blank adopted file even if SQLite integrity succeeds', async () => {
        engine.exec('DROP TABLE schema_versions');
        await lifecycle.ready();
        await expect(lifecycle.validateOpen(site, connection)).rejects.toThrow('no such table');
        expect(journals.get(site)).toMatchObject({ version: 1, state: 'renamed' });
    });

    it.each([
        'DROP TABLE core_site_config',
        'DROP TABLE wscache_2',
        'DELETE FROM schema_versions',
        'UPDATE schema_versions SET version = \'wrong\'',
        'UPDATE schema_versions SET version = 0',
    ])('rejects adopted schema damage before recording readiness: %s', async sql => {
        engine.exec(sql);
        await lifecycle.ready();
        await expect(lifecycle.validateOpen(site, connection)).rejects.toThrow();
        expect(journals.get(site)).toMatchObject({ version: 1 });
    });

    it('checks global saved-site shape without requiring a logged-in site', async () => {
        await lifecycle.ready();
        await lifecycle.validateOpen(global, connection);
        engine.exec('DELETE FROM sites_2');
        await lifecycle.validateOpen(global, connection);
        engine.exec('INSERT INTO sites_2 VALUES (\'bad/path\', \'\')');
        await expect(lifecycle.validateOpen(global, connection)).rejects.toThrow('saved Moodle site');
    });

    it('supports the previous global sites table name according to its Moodle schema version', async () => {
        engine.exec('ALTER TABLE sites_2 RENAME TO sites; UPDATE schema_versions SET version=1');
        await lifecycle.ready();
        await lifecycle.validateOpen(global, connection);
        expect(journals.get(global)).toMatchObject({ state: 'ready' });
    });

    it('rejects failed integrity and latches the failure across later lifecycle operations', async () => {
        jest.mocked(connection.executeSql).mockResolvedValueOnce({
            rows: { length: 1, item: () => ({ ['integrity_check']: 'corrupt page' }) }, rowsAffected: 0,
        });
        await lifecycle.ready();
        const error = await lifecycle.validateOpen(site, connection).catch(error => error);
        expect(error.message).toContain('integrity');
        await expect(lifecycle.prepareOpen(site)).rejects.toBe(error);
        await expect(lifecycle.reserveCreation('Site-fallback')).rejects.toBe(error);
    });

    it.each(['creating', 'created', 'ready', 'deleted'])('rejects legacy files alongside v2 %s metadata', async state => {
        journals.set(site, { version: 2, name: site, origin: 'created', state });
        files.add(site + 'SQLite.db');
        await expect(lifecycle.ready()).rejects.toThrow('conflicting');
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it('resumes deletion with orphaned companions, without opening or reimporting a principal', async () => {
        files.delete(site);
        files.delete(site + '-wal');
        files.add(site + 'SQLite.db-wal');
        files.add(site + 'SQLite.db-journal');
        journals.set(site, { version: 2, name: site, origin: 'adopted', state: 'deleting' });
        await lifecycle.ready();
        expect(journals.get(site)).toMatchObject({ origin: 'adopted', state: 'deleted' });
        expect(files.has(site + 'SQLite.db-wal')).toBe(false);
        expect(connection.executeSql).not.toHaveBeenCalled();
        await expect(lifecycle.prepareOpen(site)).rejects.toThrow('explicit creation');
    });

    it('persists intent, removes the complete set and retains a tombstone', async () => {
        await lifecycle.ready();
        await expect(lifecycle.prepareDelete(site)).resolves.toBe('existing');
        expect(journals.get(site)).toMatchObject({ origin: 'adopted', state: 'deleting' });
        await lifecycle.removeDatabase(site);
        await lifecycle.completeDelete(site);
        expect(files.has(site + 'SQLite.db')).toBe(false);
        expect(files.has(site + 'SQLite.db-wal')).toBe(false);
        expect(journals.get(site)).toMatchObject({ origin: 'adopted', state: 'deleted' });
        await new CoreSQLiteNativeLifecycle(storage).ready();
    });

    it('deleting a genuinely absent name records a tombstone without opening anything', async () => {
        await expect(lifecycle.prepareDelete('Site-absent')).resolves.toBe('absent');
        await lifecycle.removeDatabase('Site-absent');
        await lifecycle.completeDelete('Site-absent');
        expect(journals.get('Site-absent')).toMatchObject({ state: 'deleted' });
        expect(connection.open).not.toHaveBeenCalled();
    });

    it('does not authorise global deletion while site files remain', async () => {
        await lifecycle.ready();
        await expect(lifecycle.prepareDelete(global)).rejects.toThrow('while site files exist');
        expect(journals.get(global)).toMatchObject({ version: 1, state: 'renamed' });
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
    });

    it.each(['removeDatabase', 'completeDelete'] as const)('requires deletion intent for %s', async method => {
        await expect(lifecycle[method](site)).rejects.toThrow('intent is missing');
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
    });

    it('refuses a tombstone while any companion survives', async () => {
        await lifecycle.prepareDelete(site);
        await expect(lifecycle.completeDelete(site)).rejects.toThrow('conflicting');
        expect(journals.get(site)).toMatchObject({ state: 'deleting' });
    });

    it.each([
        { version: 9 }, { version: 2, name: site, origin: 'created', state: 'unknown' },
        { version: 2, name: 'Site-other', origin: 'created', state: 'ready' },
        { version: 2, name: site, origin: 'adopted', state: 'creating' },
    ])('rejects corrupt metadata without changing files: %p', async record => {
        journals.set(site, record);
        await expect(lifecycle.ready()).rejects.toThrow('Invalid SQLite lifecycle record');
        expect(storage.writeJournal).not.toHaveBeenCalled();
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each(['creating', 'deleted'])('does not allow orphaned site files under %s global state', async state => {
        files.delete(global);
        journals.set(global, { version: 2, name: global, origin: 'created', state });
        await expect(lifecycle.ready()).rejects.toThrow('global database is missing');
    });

    it.each(['list', 'listJournalNames', 'readJournal'] as const)('latches startup %s failures', async method => {
        const error = new Error('I/O failed');
        jest.mocked(storage[method]).mockRejectedValueOnce(error);
        await expect(lifecycle.ready()).rejects.toBe(error);
        await expect(lifecycle.ready()).rejects.toBe(error);
        expect(storage.renameNoReplace).not.toHaveBeenCalled();
    });

    it.each([false, true])('resumes a creation reservation interrupted after persistence: %s', async after => {
        await lifecycle.ready();
        const write = storage.writeJournal;
        jest.mocked(storage.writeJournal).mockImplementationOnce(async (...args) => {
            if (after) {
                await write(...args);
            }
            throw new Error('Interrupted reservation');
        });
        await expect(lifecycle.reserveCreation('Site-new')).rejects.toThrow('Interrupted reservation');
        storage.writeJournal = write;
        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        if (!after) {
            await lifecycle.reserveCreation('Site-new');
        }
        await expect(lifecycle.prepareOpen('Site-new')).resolves.toBe('create');
    });

    it.each(['intent', 'removal', 'completion'] as const)(
        'resumes deletion after interruption following durable %s',
        async stage => {
            await lifecycle.ready();
            await lifecycle.prepareDelete(site);
            if (stage !== 'intent') {
                await lifecycle.removeDatabase(site);
            }
            if (stage === 'completion') {
                await lifecycle.completeDelete(site);
            }
            await new CoreSQLiteNativeLifecycle(storage).ready();
            expect(journals.get(site)).toMatchObject({ state: 'deleted' });
            expect([...files].some(file => file.startsWith(site))).toBe(false);
        },
    );

    it.each([false, true])('revalidates adoption after a failed readiness write (persisted: %s)', async persisted => {
        await lifecycle.ready();
        const write = storage.writeJournal;
        jest.mocked(storage.writeJournal).mockImplementationOnce(async (...args) => {
            if (persisted) {
                await write(...args);
            }
            throw new Error('Readiness acknowledgement failed');
        });
        await expect(lifecycle.validateOpen(site, connection)).rejects.toThrow('acknowledgement failed');
        storage.writeJournal = write;
        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        await lifecycle.validateOpen(site, connection);
        expect(journals.get(site)).toMatchObject({ origin: 'adopted', state: 'ready' });
    });

    it.each([false, true])('resumes a failed post-open creation write (persisted: %s)', async persisted => {
        await lifecycle.reserveCreation('Site-new');
        files.add('Site-newSQLite.db');
        const write = storage.writeJournal;
        jest.mocked(storage.writeJournal).mockImplementationOnce(async (...args) => {
            if (persisted) {
                await write(...args);
            }
            throw new Error('Creation acknowledgement failed');
        });
        await expect(lifecycle.validateOpen('Site-new', connection)).rejects.toThrow('acknowledgement failed');
        storage.writeJournal = write;
        lifecycle = new CoreSQLiteNativeLifecycle(storage);
        await expect(lifecycle.prepareOpen('Site-new')).resolves.toBe('existing');
        await lifecycle.validateOpen('Site-new', connection);
        await lifecycle.completeInitialization('Site-new', connection);
        expect(journals.get('Site-new')).toMatchObject({ origin: 'created', state: 'ready' });
    });

    it.each([false, true])('never removes files when deletion-intent acknowledgement fails (persisted: %s)', async persisted => {
        await lifecycle.ready();
        const write = storage.writeJournal;
        jest.mocked(storage.writeJournal).mockImplementationOnce(async (...args) => {
            if (persisted) {
                await write(...args);
            }
            throw new Error('Intent acknowledgement failed');
        });
        await expect(lifecycle.prepareDelete(site)).rejects.toThrow('acknowledgement failed');
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
        expect(files.has(site + 'SQLite.db')).toBe(true);
        storage.writeJournal = write;
        await new CoreSQLiteNativeLifecycle(storage).ready();
        expect(files.has(site + 'SQLite.db')).toBe(!persisted);
    });

    it.each([false, true])('finishes a failed tombstone write on restart (persisted: %s)', async persisted => {
        await lifecycle.prepareDelete(site);
        await lifecycle.removeDatabase(site);
        const write = storage.writeJournal;
        jest.mocked(storage.writeJournal).mockImplementationOnce(async (...args) => {
            if (persisted) {
                await write(...args);
            }
            throw new Error('Tombstone acknowledgement failed');
        });
        await expect(lifecycle.completeDelete(site)).rejects.toThrow('acknowledgement failed');
        storage.writeJournal = write;
        await new CoreSQLiteNativeLifecycle(storage).ready();
        expect(journals.get(site)).toMatchObject({ state: 'deleted' });
    });

    it.each(['-mj123.dat', '-wal2', '-journal-extra'])('rejects unexpected deletion companions: %s', async suffix => {
        await lifecycle.prepareDelete(site);
        files.add(site + 'SQLite.db' + suffix);
        await expect(new CoreSQLiteNativeLifecycle(storage).ready()).rejects.toThrow();
        expect(storage.removeDatabaseFiles).not.toHaveBeenCalled();
        expect(files.has(site + 'SQLite.db')).toBe(true);
    });

    it('retains intent after partial native removal and finishes only on restart', async () => {
        await lifecycle.prepareDelete(site);
        jest.mocked(storage.removeDatabaseFiles).mockImplementationOnce(async () => {
            files.delete(site + 'SQLite.db');
            throw new Error('Interrupted unlink');
        });
        await expect(lifecycle.removeDatabase(site)).rejects.toThrow('Interrupted unlink');
        expect(journals.get(site)).toMatchObject({ state: 'deleting' });
        expect(files.has(site + 'SQLite.db-wal')).toBe(true);
        await new CoreSQLiteNativeLifecycle(storage).ready();
        expect(journals.get(site)).toMatchObject({ state: 'deleted' });
    });

    it('blocks stale-source reimport even after deletion and explicit recreation', async () => {
        await lifecycle.prepareDelete(site);
        await lifecycle.removeDatabase(site);
        await lifecycle.completeDelete(site);
        files.add(site);
        await expect(new CoreSQLiteNativeLifecycle(storage).ready()).rejects.toThrow('conflicting');
        expect(files.has(site)).toBe(true);
        expect(files.has(site + 'SQLite.db')).toBe(false);
    });
});
