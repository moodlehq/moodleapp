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
import {
    CoreCapacitorSQLiteManager,
    CoreCapacitorSQLiteManagerDriver,
} from '@classes/capacitor-sqlite-manager';
import {
    CoreSQLiteNativeLifecycle,
    CoreSQLiteNativeLifecycleDriver,
} from '@classes/sqlite-native-lifecycle';
import { CoreDbService } from '@services/db';
import { CorePlatform } from '@services/platform';
import { mock, mockSingleton } from '@/testing/utils';
import { SQLiteDBConnection } from '@classes/sqlitedb';
import { CorePromisedValue } from '@classes/promised-value';

type TestSQLiteDriver = CoreCapacitorSQLiteManagerDriver & CoreSQLiteNativeLifecycleDriver;

class PendingDbProvider extends CoreDbService {

    initialize = jest.fn(async () => this.pending);
    pending = new CorePromisedValue<void>();

    setManager(manager: CoreCapacitorSQLiteManager): void {
        this.manager = manager;
    }

}

class TestDbProvider extends CoreDbService {

    constructor(driver: TestSQLiteDriver) {
        super();
        this.lifecycle = new CoreSQLiteNativeLifecycle(driver);
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
        const error = new Error('Native database migration failed');
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

describe('CoreDbService native lifecycle', () => {
    let engines: Map<string, DatabaseSync>;
    let files: Set<string>;
    let registered: Set<string>;
    let driver: TestSQLiteDriver;
    let provider: CoreDbService;
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
     * Resolve the in-memory database behind the Capacitor-shaped test driver.
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
     * Seed a valid existing Moodle global database.
     */
    function seed(): void {
        files.add('MoodleMobileSQLite.db');
        const global = new DatabaseSync(':memory:');
        global.exec(globalSchema);
        engines.set('MoodleMobile', global);
    }

    beforeEach(() => {
        mockSingleton(CorePlatform, { ready: jest.fn(async () => 'test') });
        engines = new Map();
        files = new Set();
        registered = new Set();
        driver = {
            checkConnectionsConsistency: jest.fn(async () => {
                registered.clear();

                return { result: false };
            }),
            getMigratableDbList: jest.fn(async () => ({ values: [] })),
            moveDatabasesAndAddSuffix: jest.fn(async ({ dbNameList = [] }) => {
                for (const name of dbNameList) {
                    if (!files.delete(name)) {
                        throw new Error('Missing legacy database');
                    }
                    files.add(name.endsWith('.db') ? name.replace('.db', 'SQLite.db') : name + 'SQLite.db');
                }
            }),
            getDatabaseList: jest.fn(async () => ({ values: [...files] })),
            isDatabase: jest.fn(async ({ database = '' }) => ({ result: files.has(database + 'SQLite.db') })),
            deleteDatabase: jest.fn(async ({ database = '' }) => {
                if (registered.has(database)) {
                    throw new Error('Cannot delete a registered database');
                }
                files.delete(database + 'SQLite.db');
                engines.get(database)?.close();
                engines.delete(database);
            }),
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
            query: jest.fn(async ({ database = '', statement = '', values = [] }) => ({
                values: engine(database).prepare(statement).all(...values),
            })),
            run: jest.fn(async ({ database = '', statement = '', values = [] }) => {
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
            beginTransaction: jest.fn(async ({ database = '' }) => {
                engine(database).exec('BEGIN');

                return { changes: { changes: 0 } };
            }),
            commitTransaction: jest.fn(async ({ database = '' }) => {
                engine(database).exec('COMMIT');

                return { changes: { changes: 0 } };
            }),
            rollbackTransaction: jest.fn(async ({ database = '' }) => {
                engine(database).exec('ROLLBACK');

                return { changes: { changes: 0 } };
            }),
            isTransactionActive: jest.fn(async ({ database = '' }) => ({ result: engine(database).isTransaction })),
        };
        provider = new TestDbProvider(driver);
    });

    afterEach(() => {
        engines.forEach(db => db.close());
    });

    it('initialises an empty installation as a new global database and validates its completed schema', async () => {
        await provider.ready();
        expect(files.has('MoodleMobileSQLite.db')).toBe(true);

        engine().exec(globalSchema);
        await provider.completeDatabaseInitialization('MoodleMobile');
        await expect(provider.getDB('MoodleMobile').getAllRecords('sites_2')).resolves.toEqual([]);
    });

    it('reopens retained native databases after a WebView reload without losing saved data', async () => {
        seed();
        engine().exec('INSERT INTO core_config VALUES (\'retained\', \'value\')');
        await provider.ready();
        expect(registered.has('MoodleMobile')).toBe(true);

        provider = new TestDbProvider(driver);
        jest.mocked(driver.getDatabaseList).mockImplementationOnce(async () => {
            expect(registered.size).toBe(0);

            return { values: [...files] };
        });

        const rows = await provider.getDB('MoodleMobile').getAllRecords('core_config');

        expect(rows).toEqual([{ name: 'retained', value: 'value' }]);
        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(2);
        expect(registered.has('MoodleMobile')).toBe(true);
    });

    it('does not create an unknown site database without explicit site preparation', async () => {
        seed();
        await provider.ready();

        await expect(provider.getDB('Site-unknown').execute('SELECT 1')).rejects.toThrow('explicit creation authorisation');
        expect(files.has('Site-unknownSQLite.db')).toBe(false);
        expect(driver.open).not.toHaveBeenCalledWith(expect.objectContaining({ database: 'Site-unknown' }));
    });

    it('requires every saved site database to exist before exposing the global database', async () => {
        seed();
        engine().prepare('INSERT INTO sites_2 VALUES (?, ?)').run('test', 'https://example.invalid');

        await expect(provider.ready()).rejects.toThrow(/database for saved site "test" is missing/);
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
    });

    it('supports new site creation and deletion without lifecycle journal records', async () => {
        seed();
        await provider.ready();
        await provider.prepareSiteDatabase('new');
        await provider.getDB('Site-new').executeBatch(siteSchema);
        await provider.completeDatabaseInitialization('Site-new');

        expect(files.has('Site-newSQLite.db')).toBe(true);
        await provider.deleteDB('Site-new');
        expect(driver.deleteDatabase).toHaveBeenCalledWith({ database: 'Site-new' });
        expect(files.has('Site-newSQLite.db')).toBe(false);
    });

    it('refuses to initialise the global database when an orphan site database remains', async () => {
        files.add('Site-orphanSQLite.db');

        await expect(provider.ready()).rejects.toThrow('global database is missing');
        expect(driver.createConnection).not.toHaveBeenCalled();
    });

    it('propagates native schema errors instead of acknowledging an incomplete installation', () => {
        const error = new Error('Schema upgrade failed');
        expect(() => provider.onDatabaseInitializationError('MoodleMobile', error)).toThrow(error);
    });
});
