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
import { CoreCapacitorSQLiteManager, CoreCapacitorSQLiteManagerDriver } from '@classes/capacitor-sqlite-manager';
import { CoreSQLiteNativeLifecycle, CoreSQLiteNativeLifecycleStorage } from '@classes/sqlite-native-lifecycle';
import { CoreDbProvider } from '@services/db';
import { CorePlatform } from '@services/platform';
import { mock, mockSingleton } from '@/testing/utils';
import { SQLiteDBConnection } from '@classes/sqlitedb';
import { CorePromisedValue } from '@classes/promised-value';

class PendingDbProvider extends CoreDbProvider {

    initialize = jest.fn(async () => this.pending);
    pending = new CorePromisedValue<void>();

    setManager(manager: CoreCapacitorSQLiteManager): void {
        this.manager = manager;
    }

}

class TestDbProvider extends CoreDbProvider {

    constructor(storage: CoreSQLiteNativeLifecycleStorage, driver: CoreCapacitorSQLiteManagerDriver) {
        super();
        this.lifecycle = new CoreSQLiteNativeLifecycle(storage);
        this.manager = new CoreCapacitorSQLiteManager(driver, this.lifecycle);
    }

}

describe('CoreDB readiness', () => {
    let provider: PendingDbProvider;
    let create: jest.Mock;
    let remove: jest.Mock;
    let connection: SQLiteDBConnection;

    beforeEach(() => {
        provider = new PendingDbProvider();
        jest.spyOn(provider, 'loggingEnabled').mockReturnValue(false);
        connection = mock<SQLiteDBConnection>({
            executeSql: jest.fn(async () => ({ rows: { length: 0, item: () => undefined }, rowsAffected: 0 })),
            close: jest.fn(async () => undefined),
        });
        create = jest.fn(() => connection);
        remove = jest.fn(async () => undefined);
        provider.setManager(mock<CoreCapacitorSQLiteManager>({ getConnection: create, deleteDatabase: remove }));
    });

    it('keeps getDB synchronous and blocks early queries and deletion behind one shared barrier', async () => {
        const database = provider.getDB('MoodleMobile');
        expect(provider.getDB('MoodleMobile')).toBe(database);
        const query = database.execute('SELECT 1');
        const deletion = provider.deleteDB('Site-inactive');
        const readiness = provider.ready();

        expect(provider.ready()).toBe(readiness);
        expect(connection.executeSql).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
        provider.pending.resolve();
        await Promise.all([query, deletion, readiness]);

        expect(provider.initialize).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalledWith('MoodleMobile');
        expect(remove).toHaveBeenCalledWith('Site-inactive');
    });

    it('rejects concurrent and later queries and deletions after readiness fails', async () => {
        const error = new Error('Native database adoption failed');
        const database = provider.getDB('MoodleMobile');
        const queries = [database.execute('SELECT 1'), database.execute('SELECT 2')];
        const deletion = provider.deleteDB('Site-inactive');
        provider.pending.reject(error);

        await expect(queries[0]).rejects.toBe(error);
        await expect(queries[1]).rejects.toBe(error);
        await expect(deletion).rejects.toBe(error);
        await expect(database.execute('SELECT 3')).rejects.toBe(error);
        await expect(provider.getDB('Site-another').execute('SELECT 1')).rejects.toBe(error);
        await expect(provider.deleteDB('MoodleMobile')).rejects.toBe(error);
        expect(connection.executeSql).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
    });

    it('preserves forceNew and delegates deletion to the connection manager once ready', async () => {
        provider.pending.resolve();
        const original = provider.getDB('MoodleMobile');
        await original.execute('SELECT 1');
        const replacement = provider.getDB('MoodleMobile', true);
        expect(replacement).not.toBe(original);
        await replacement.execute('SELECT 1');
        await provider.deleteDB('MoodleMobile');

        expect(create).toHaveBeenCalledTimes(2);
        expect(remove).toHaveBeenCalledTimes(1);
        expect(provider.getDB('MoodleMobile')).not.toBe(replacement);
    });
});

describe('CoreDbProvider native lifecycle', () => {
    let engines: Map<string, DatabaseSync>;
    let files: Set<string>;
    let records: Map<string, unknown>;
    let registered: Set<string>;
    let storage: CoreSQLiteNativeLifecycleStorage;
    let driver: CoreCapacitorSQLiteManagerDriver;
    let provider: CoreDbProvider;
    const globalSchema = `CREATE TABLE schema_versions (name TEXT PRIMARY KEY, version INTEGER);
        INSERT INTO schema_versions VALUES ('CoreSitesProvider', 2);
        CREATE TABLE sites_2 (id TEXT PRIMARY KEY, siteUrl TEXT);
        CREATE TABLE core_config (name TEXT PRIMARY KEY, value TEXT);`;
    const siteSchema = [
        'CREATE TABLE schema_versions (name TEXT PRIMARY KEY, version INTEGER)',
        'INSERT INTO schema_versions VALUES (\'CoreSitesProvider\', 3)',
        'CREATE TABLE core_site_config (name TEXT, value TEXT)',
        'CREATE TABLE wscache_2 (id TEXT, data TEXT)',
    ];

    /**
     * Resolve the real in-memory engine behind the native-shaped test driver.
     *
     * @param name Logical database name.
     * @returns SQLite engine.
     */
    function engine(name = 'MoodleMobile'): DatabaseSync {
        const value = engines.get(name);
        if (!value) {
            throw new Error('Missing test engine');
        }

        return value;
    }

    /**
     * Seed a known legacy installation without using the candidate provider.
     */
    function seed(): void {
        files.add('MoodleMobile');
        const global = new DatabaseSync(':memory:');
        global.exec(globalSchema);
        engines.set('MoodleMobile', global);
    }

    beforeEach(() => {
        mockSingleton(CorePlatform, { ready: jest.fn(async () => 'test') });
        engines = new Map();
        files = new Set();
        records = new Map();
        registered = new Set();
        storage = {
            list: jest.fn(async () => [...files]),
            listJournalNames: jest.fn(async () => [...records.keys()]),
            readJournal: jest.fn(async name => records.get(name)),
            writeJournal: jest.fn(async (name, value) => {
                records.set(name, value);
            }),
            renameNoReplace: jest.fn(async (from, to) => {
                if (!files.has(from) || files.has(to)) {
                    throw new Error('Unsafe rename');
                }
                files.delete(from);
                files.add(to);
            }),
            removeDatabaseFiles: jest.fn(async name => {
                if (registered.has(name)) {
                    throw new Error('Cannot delete registered database');
                }
                for (const suffix of ['', '-wal', '-shm', '-journal']) {
                    files.delete(name + 'SQLite.db' + suffix);
                }
            }),
        };
        driver = {
            checkConnectionsConsistency: jest.fn(async () => {
                registered.clear();

                return { result: false };
            }),
            isDatabase: jest.fn(async ({ database = '' }) => ({ result: files.has(database + 'SQLite.db') })),
            createConnection: jest.fn(async ({ database = '' }) => {
                if (registered.has(database)) {
                    throw new Error('Duplicate connection');
                }
                registered.add(database);
            }),
            closeConnection: jest.fn(async ({ database = '' }) => {
                registered.delete(database);
            }),
            open: jest.fn(async ({ database = '' }) => {
                if (!registered.has(database)) {
                    throw new Error('Not registered');
                }
                if (!files.has(database + 'SQLite.db')) {
                    engines.set(database, new DatabaseSync(':memory:'));
                    files.add(database + 'SQLite.db');
                }
            }),
            close: jest.fn(async () => undefined),
            query: jest.fn(async ({ database, statement = '', values = [] }) => ({
                values: engine(database).prepare(statement).all(...values),
            })),
            run: jest.fn(async ({ database, statement = '', values = [] }) => {
                const db = engine(database);
                const before = db.prepare('SELECT total_changes() AS total').get();
                const result = db.prepare(statement).run(...values);
                const after = db.prepare('SELECT total_changes() AS total').get();

                return {
                    changes: {
                        changes: Number(after?.total) - Number(before?.total),
                        lastId: Number(result.lastInsertRowid),
                    },
                };
            }),
            beginTransaction: jest.fn(async ({ database }) => {
                engine(database).exec('BEGIN');

                return { changes: { changes: 0 } };
            }),
            commitTransaction: jest.fn(async ({ database }) => {
                engine(database).exec('COMMIT');

                return { changes: { changes: 0 } };
            }),
            rollbackTransaction: jest.fn(async ({ database }) => {
                engine(database).exec('ROLLBACK');

                return { changes: { changes: 0 } };
            }),
            isTransactionActive: jest.fn(async ({ database }) => ({ result: engine(database).isTransaction })),
        };
        provider = new TestDbProvider(storage, driver);
        jest.spyOn(provider, 'loggingEnabled').mockReturnValue(false);
    });

    afterEach(() => {
        engines.forEach(db => db.close());
    });

    it('reserves a fresh global database and seals schemas only after installation', async () => {
        const db = provider.getDB('MoodleMobile');
        expect(driver.open).not.toHaveBeenCalled();
        await provider.ready();
        expect(records.get('MoodleMobile')).toMatchObject({ origin: 'created', state: 'created' });
        engine().exec(globalSchema);
        await provider.completeDatabaseInitialization('MoodleMobile');
        expect(records.get('MoodleMobile')).toMatchObject({ state: 'ready' });
        expect(provider.getDB('MoodleMobile')).toBe(db);
    });

    it('reopens retained native databases after a WebView reload without losing saved data', async () => {
        seed();
        engine().exec('INSERT INTO core_config VALUES (\'retained\', \'value\')');
        await provider.ready();
        expect(registered.has('MoodleMobile')).toBe(true);

        provider = new TestDbProvider(storage, driver);
        jest.spyOn(provider, 'loggingEnabled').mockReturnValue(false);
        jest.mocked(storage.list).mockImplementationOnce(async () => {
            expect(registered.size).toBe(0);

            return [...files];
        });

        const rows = await provider.getDB('MoodleMobile').getAllRecords('core_config');

        expect(rows).toEqual([{ name: 'retained', value: 'value' }]);
        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(2);
        expect(registered.has('MoodleMobile')).toBe(true);
    });

    it('does not reserve an unknown site on getDB or failed open', async () => {
        seed();
        await provider.ready();
        await expect(provider.getDB('Site-unknown').execute('SELECT 1')).rejects.toThrow();
        expect(records.has('Site-unknown')).toBe(false);
        expect(files.has('Site-unknownSQLite.db')).toBe(false);
    });

    it('resumes a fresh global schema interrupted before saving its version', async () => {
        seed();
        files.delete('MoodleMobile');
        files.add('MoodleMobileSQLite.db');
        records.set('MoodleMobile', { version: 2, name: 'MoodleMobile', origin: 'created', state: 'created' });
        engine().exec('DELETE FROM schema_versions');
        await provider.ready();
        engine().exec('INSERT INTO schema_versions VALUES (\'CoreSitesProvider\', 2)');
        await provider.completeDatabaseInitialization('MoodleMobile');
        expect(records.get('MoodleMobile')).toMatchObject({ state: 'ready' });
    });

    it('does not skip missing-version validation when an incomplete global schema contains accounts', async () => {
        seed();
        files.delete('MoodleMobile');
        files.add('MoodleMobileSQLite.db');
        records.set('MoodleMobile', { version: 2, name: 'MoodleMobile', origin: 'created', state: 'created' });
        engine().exec('DELETE FROM schema_versions; INSERT INTO sites_2 VALUES (\'test\', \'https://example.invalid\')');
        await expect(provider.ready()).rejects.toThrow('missing or invalid');
        expect(engine().prepare('SELECT id FROM sites_2').all()).toEqual([{ id: 'test' }]);
    });

    it('supports explicit new-site creation, schema sealing and retry without duplicate reservations', async () => {
        seed();
        await provider.prepareSiteDatabase('new');
        await provider.prepareSiteDatabase('new');
        const db = provider.getDB('Site-new');
        await db.executeBatch(siteSchema);
        await provider.completeDatabaseInitialization('Site-new');
        await provider.prepareSiteDatabase('new');
        expect(records.get('Site-new')).toMatchObject({ origin: 'created', state: 'ready' });
        expect(driver.createConnection).toHaveBeenCalledTimes(2);
    });

    it('reconciles pending deletion and current-site config before making the global database available', async () => {
        seed();
        engine().exec(`INSERT INTO sites_2 VALUES ('removed', 'https://example.invalid');
            INSERT INTO core_config VALUES ('current_site_id', 'removed');
            INSERT INTO core_config VALUES ('unrelated', 'retained');`);
        files.add('Site-removedSQLite.db');
        records.set('Site-removed', { version: 2, name: 'Site-removed', origin: 'adopted', state: 'deleting' });
        const result = await provider.getDB('MoodleMobile').getAllRecords('sites_2');
        expect(result).toEqual([]);
        expect(engine().prepare('SELECT * FROM core_config').all()).toEqual([{ name: 'unrelated', value: 'retained' }]);
        expect(records.get('Site-removed')).toMatchObject({ state: 'deleted' });
        expect(files.has('Site-removedSQLite.db')).toBe(false);
    });

    it('clears stale current-site config even if the saved row was already removed', async () => {
        seed();
        engine().exec('INSERT INTO core_config VALUES (\'current_site_id\', \'removed\')');
        records.set('Site-removed', { version: 2, name: 'Site-removed', origin: 'adopted', state: 'deleted' });
        await provider.ready();
        expect(engine().prepare('SELECT * FROM core_config').all()).toEqual([]);
    });

    it('preflights remaining saved sites before committing any tombstone cleanup', async () => {
        seed();
        engine().exec(`INSERT INTO sites_2 VALUES ('removed', 'https://removed.invalid');
            INSERT INTO sites_2 VALUES ('missing', 'https://missing.invalid');`);
        records.set('Site-removed', { version: 2, name: 'Site-removed', origin: 'adopted', state: 'deleted' });
        await expect(provider.ready()).rejects.toThrow();
        expect(engine().prepare('SELECT id FROM sites_2 ORDER BY id').all()).toEqual([{ id: 'missing' }, { id: 'removed' }]);
        expect(files.has('Site-missingSQLite.db')).toBe(false);
    });

    it('rolls back saved-site cleanup if config deletion fails and blocks all early consumers', async () => {
        seed();
        engine().exec(`INSERT INTO sites_2 VALUES ('removed', 'https://example.invalid');
            INSERT INTO core_config VALUES ('current_site_id', 'removed');
            CREATE TRIGGER reject_config_delete BEFORE DELETE ON core_config BEGIN
                SELECT RAISE(ABORT, 'injected cleanup failure');
            END;`);
        records.set('Site-removed', { version: 2, name: 'Site-removed', origin: 'adopted', state: 'deleted' });
        const ready = provider.ready();
        const early = provider.getDB('MoodleMobile').execute('SELECT 1');
        await expect(ready).rejects.toThrow('injected cleanup failure');
        await expect(early).rejects.toThrow('injected cleanup failure');
        expect(engine().prepare('SELECT id FROM sites_2').all()).toEqual([{ id: 'removed' }]);
        expect(engine().prepare('SELECT value FROM core_config').all()).toEqual([{ value: 'removed' }]);
    });

    it('supports reconciliation of the previous saved-site table before app schema upgrades', async () => {
        seed();
        engine().exec(`ALTER TABLE sites_2 RENAME TO sites;
            UPDATE schema_versions SET version=1;
            INSERT INTO sites VALUES ('removed', 'https://example.invalid')`);
        records.set('Site-removed', { version: 2, name: 'Site-removed', origin: 'adopted', state: 'deleted' });
        await provider.ready();
        expect(engine().prepare('SELECT * FROM sites').all()).toEqual([]);
    });

    it('shares a connection across forceNew wrappers and retires even unused wrappers after deletion', async () => {
        seed();
        await provider.prepareSiteDatabase('new');
        const original = provider.getDB('Site-new');
        const unused = provider.getDB('Site-new', true);
        await original.executeBatch(siteSchema);
        await provider.completeDatabaseInitialization('Site-new');
        await provider.deleteDB('Site-new');
        await expect(unused.execute('SELECT 1')).rejects.toThrow('deleted database');
        await provider.prepareSiteDatabase('new');
        const recreated = provider.getDB('Site-new');
        expect(recreated).not.toBe(unused);
        await recreated.executeBatch(siteSchema);
        await expect(original.open()).rejects.toThrow('deleted database');
        expect(records.get('Site-new')).toMatchObject({ state: 'created' });
    });

    it('propagates native schema errors instead of acknowledging an incomplete installation', () => {
        const error = new Error('Schema upgrade failed');
        expect(() => provider.onDatabaseInitializationError('MoodleMobile', error)).toThrow(error);
    });

    it('blocks rather than reserving a replacement for recorded missing global data', async () => {
        records.set('MoodleMobile', { version: 2, name: 'MoodleMobile', origin: 'adopted', state: 'ready' });
        await expect(provider.ready()).rejects.toThrow('missing or conflicting');
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(files.size).toBe(0);
    });
});
