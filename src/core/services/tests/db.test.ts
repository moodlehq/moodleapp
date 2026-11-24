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
import { CapacitorSQLitePlugin } from '@capacitor-community/sqlite';
import { CoreCapacitorSQLiteManager, CoreCapacitorSQLiteManagerDriver } from '@classes/native/capacitor-sqlite-manager';
import { CoreDbService } from '@services/native/db';
import { CorePlatform } from '@services/platform';
import { mock, mockSingleton } from '@/testing/utils';
import { SQLiteDBConnection } from '@classes/native/sqlitedb';
import { CorePromisedValue } from '@classes/promised-value';

type TestSQLiteDriver = CoreCapacitorSQLiteManagerDriver &
    Pick<CapacitorSQLitePlugin, 'getMigratableDbList' | 'moveDatabasesAndAddSuffix' | 'getDatabaseList'>;

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
        this.nativeSQLite = driver;
        this.manager = new CoreCapacitorSQLiteManager(driver);
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

describe('CoreDbService native database access', () => {
    let engines: Map<string, DatabaseSync>;
    let files: Set<string>;
    let registered: Set<string>;
    let driver: TestSQLiteDriver;
    let provider: CoreDbService;
    const globalSchemaStatements = [
        'CREATE TABLE schema_versions (name TEXT PRIMARY KEY, version INTEGER)',
        'INSERT INTO schema_versions VALUES (\'CoreSitesProvider\', 2)',
        'CREATE TABLE sites_2 (id TEXT PRIMARY KEY, siteUrl TEXT)',
        'CREATE TABLE core_config (name TEXT PRIMARY KEY, value TEXT)',
    ];
    const globalSchema = globalSchemaStatements.join(';');
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
            getDatabaseList: jest.fn(async () => ({ values: [...files] })),
            moveDatabasesAndAddSuffix: jest.fn(async ({ dbNameList = [] }) => {
                for (const name of dbNameList) {
                    if (!files.delete(name)) {
                        throw new Error('Missing legacy database');
                    }
                    files.add(name.endsWith('.db') ? name.replace('.db', 'SQLite.db') : name + 'SQLite.db');
                }
            }),
            isDatabase: jest.fn(async ({ database = '' }) => ({ result: files.has(database + 'SQLite.db') })),
            deleteDatabase: jest.fn(async ({ database = '' }) => {
                if (!registered.has(database)) {
                    throw new Error('Cannot delete an unregistered database');
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

    it('migrates before first access and lets the app service create its schema', async () => {
        const dbs = ['MoodleMobile', 'Site-test', 'sites'];
        files = new Set(dbs);
        engines.set('MoodleMobile', new DatabaseSync(':memory:'));
        jest.mocked(driver.getMigratableDbList).mockResolvedValue({
            values: dbs,
        });

        await provider.ready();
        expect(files.has('MoodleMobileSQLite.db')).toBe(true);
        expect(files.has('Site-testSQLite.db')).toBe(true);
        expect(files.has('sitesSQLite.db')).toBe(true);
        expect(driver.moveDatabasesAndAddSuffix).toHaveBeenCalledWith({
            dbNameList: dbs,
        });

        await provider.getDB('MoodleMobile').executeBatch(globalSchemaStatements);
        await expect(provider.getDB('MoodleMobile').getAllRecords('sites_2')).resolves.toEqual([]);
    });

    it('lists native database files after migration and rejects malformed lists', async () => {
        files.add('Site-existing.db');
        jest.mocked(driver.getMigratableDbList).mockResolvedValue({ values: ['Site-existing.db'] });

        await expect(provider.listDatabaseFiles()).resolves.toEqual(['Site-existingSQLite.db']);
        jest.mocked(driver.getDatabaseList).mockResolvedValueOnce({ values: ['valid', 42] });
        await expect(provider.listDatabaseFiles()).rejects.toThrow('invalid database list');
    });

    it('reopens retained native databases after a WebView reload without losing saved data', async () => {
        seed();
        engine().exec('INSERT INTO core_config VALUES (\'retained\', \'value\')');
        await provider.ready();
        expect(registered.has('MoodleMobile')).toBe(false);

        provider = new TestDbProvider(driver);

        const rows = await provider.getDB('MoodleMobile').getAllRecords('core_config');

        expect(rows).toEqual([{ name: 'retained', value: 'value' }]);
        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(2);
        expect(registered.has('MoodleMobile')).toBe(true);
    });

    it('creates a database on first access without app-specific schema checks', async () => {
        await expect(provider.getDB('Site-unknown').execute('SELECT 1')).resolves.toMatchObject({ rowsAffected: 0 });
        expect(files.has('Site-unknownSQLite.db')).toBe(true);
    });

    it.each([false, true])('supports SQLiteDB helpers with native result formats (iOS metadata: %s)', async ios => {
        jest.mocked(driver.query).mockImplementation(async ({ database = '', statement = '', values = [] }) => {
            const prepared = engine(database).prepare(statement);
            const rows = prepared.all(...values);
            const columns = { ['ios_columns']: prepared.columns().map(column => column.name) };

            return { values: ios && rows.length ? [columns, ...rows] : rows };
        });
        const database = provider.getDB('Site-helpers');
        await database.execute('CREATE TABLE records (id INTEGER PRIMARY KEY, value TEXT, amount REAL)');

        expect(await database.insertRecord('records', { id: 0, value: 'replacement' })).toBe(0);
        expect(await database.getRecord('records', { id: 0 })).toEqual({ id: 0, value: 'replacement', amount: null });
        const id = await database.insertRecord('records', { value: 'one', amount: 5 });
        expect(id).toBe(1);
        expect(await database.getRecord('records', { id })).toEqual({ id: 1, value: 'one', amount: 5 });
        expect(await database.updateRecords('records', { amount: 10 }, { id })).toBe(1);
        expect(await database.countRecords('records')).toBe(2);
        expect(await database.deleteRecords('records', { id })).toBe(1);
        await database.close();
        await database.open();
        expect(await database.countRecords('records')).toBe(1);
    });

    it('supports site creation and deletion without lifecycle authorisation or completion calls', async () => {
        seed();
        await provider.ready();
        await provider.getDB('Site-new').executeBatch(siteSchema);

        expect(files.has('Site-newSQLite.db')).toBe(true);
        await provider.deleteDB('Site-new');
        expect(driver.deleteDatabase).toHaveBeenCalledWith({ database: 'Site-new', readonly: false });
        expect(files.has('Site-newSQLite.db')).toBe(false);
    });

    it('creates the global database even if an orphan site database remains', async () => {
        files.add('Site-orphanSQLite.db');

        await provider.ready();
        await provider.getDB('MoodleMobile').executeBatch(globalSchemaStatements);

        expect(files.has('MoodleMobileSQLite.db')).toBe(true);
    });

    it('treats the native empty migration list as no work', async () => {
        jest.mocked(driver.getMigratableDbList).mockRejectedValue(
            new Error('getMigratableDbList: No databases available'),
        );

        await expect(provider.ready()).resolves.toBeUndefined();
        expect(driver.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();
    });

    it('propagates migration errors before opening a database', async () => {
        const error = new Error('Migration failed');
        jest.mocked(driver.getMigratableDbList).mockRejectedValue(error);

        await expect(provider.getDB('MoodleMobile').execute('SELECT 1')).rejects.toBe(error);
        expect(driver.createConnection).not.toHaveBeenCalled();
    });

});
