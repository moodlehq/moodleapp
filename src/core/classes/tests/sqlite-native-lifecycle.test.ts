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
import {
    CoreSQLiteNativeLifecycle,
    CoreSQLiteNativeLifecycleDriver,
} from '@classes/sqlite-native-lifecycle';

describe('CoreSQLiteNativeLifecycle', () => {
    const global = 'MoodleMobile';
    const site = 'Site-test';
    let files: Set<string>;
    let sqlite: CoreSQLiteNativeLifecycleDriver;
    let lifecycle: CoreSQLiteNativeLifecycle;
    let engine: DatabaseSync;
    let connection: SQLiteDBConnection;

    beforeEach(() => {
        files = new Set([global + 'SQLite.db', site + 'SQLite.db']);
        sqlite = {
            getMigratableDbList: jest.fn(async () => ({ values: [] })),
            moveDatabasesAndAddSuffix: jest.fn(async ({ dbNameList = [] }) => {
                for (const name of dbNameList) {
                    if (!files.delete(name)) {
                        throw new Error(`Missing legacy database: ${name}`);
                    }
                    files.add(name.endsWith('.db') ? name.replace('.db', 'SQLite.db') : name + 'SQLite.db');
                }
            }),
            getDatabaseList: jest.fn(async () => ({ values: [...files] })),
            isDatabase: jest.fn(async ({ database }) => ({ result: files.has(database + 'SQLite.db') })),
        };
        lifecycle = new CoreSQLiteNativeLifecycle(sqlite);
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
            INSERT INTO sites_2 VALUES ('test', 'https://example.invalid')`);
    });

    afterEach(() => {
        engine.close();
    });

    it('migrates Cordova databases once before listing native databases', async () => {
        files = new Set([global + '.db', site + '.db']);
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({ values: [global + '.db', site + '.db'] });

        const first = lifecycle.ready();
        expect(lifecycle.ready()).toBe(first);
        await first;

        expect(sqlite.getMigratableDbList).toHaveBeenCalledWith({ folderPath: 'default' });
        expect(sqlite.moveDatabasesAndAddSuffix).toHaveBeenCalledWith({
            dbNameList: [global + '.db', site + '.db'],
        });
        expect(files).toEqual(new Set([global + 'SQLite.db', site + 'SQLite.db']));
        expect(sqlite.getMigratableDbList).toHaveBeenCalledTimes(1);
    });

    it('does not move databases when no Cordova databases are present', async () => {
        await lifecycle.ready();

        expect(sqlite.getMigratableDbList).toHaveBeenCalledWith({ folderPath: 'default' });
        expect(sqlite.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();
    });

    it('ignores non-database entries returned from the legacy files directory', async () => {
        files = new Set([global + '.db', site + '.db']);
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({
            values: ['NoCloud', 'sites', 'MoodleMobile.db', site + '.db'],
        });

        await lifecycle.ready();

        expect(sqlite.moveDatabasesAndAddSuffix).toHaveBeenCalledWith({
            dbNameList: ['MoodleMobile.db', site + '.db'],
        });
    });

    it('treats the Android plugin empty-database response as an empty migration list', async () => {
        jest.mocked(sqlite.getMigratableDbList).mockRejectedValue(
            new Error('getMigratableDbList: No databases available '),
        );

        await expect(lifecycle.ready()).resolves.toBeUndefined();
        expect(sqlite.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();
    });

    it('refuses to migrate saved site databases without the global database', async () => {
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({ values: [site + '.db'] });

        await expect(lifecycle.ready()).rejects.toThrow('global database is missing');
        expect(sqlite.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();
    });

    it('rejects duplicate names and SQLite companion files before moving anything', async () => {
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({
            values: ['MoodleMobile', 'MoodleMobile.db'],
        });
        await expect(lifecycle.ready()).rejects.toThrow('duplicate database');
        expect(sqlite.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();

        lifecycle = new CoreSQLiteNativeLifecycle(sqlite);
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({
            values: ['MoodleMobile.db', 'MoodleMobile.db-wal'],
        });
        await expect(lifecycle.ready()).rejects.toThrow('invalid database list');
        expect(sqlite.moveDatabasesAndAddSuffix).not.toHaveBeenCalled();
    });

    it('propagates migration failures and invalid inventories', async () => {
        const error = new Error('Migration failed');
        jest.mocked(sqlite.getMigratableDbList).mockRejectedValue(error);
        await expect(lifecycle.ready()).rejects.toBe(error);

        lifecycle = new CoreSQLiteNativeLifecycle(sqlite);
        jest.mocked(sqlite.getMigratableDbList).mockResolvedValue({ values: ['../unsafe'] });
        await expect(lifecycle.ready()).rejects.toThrow('invalid database list');
    });

    it('treats an empty inventory as a fresh install and authorises only the global database', async () => {
        files.clear();
        await lifecycle.prepareGlobalDatabase();
        await expect(lifecycle.prepareOpen(global)).resolves.toBe('create');
        await expect(lifecycle.prepareOpen(site)).rejects.toThrow('explicit creation authorisation');
        files.add(global + 'SQLite.db');
        await lifecycle.prepareSiteDatabase('test');
        await expect(lifecycle.prepareOpen(site)).resolves.toBe('create');
    });

    it('treats the Android plugin empty-database response as an empty inventory', async () => {
        files.clear();
        jest.mocked(sqlite.getDatabaseList).mockRejectedValue(
            new Error('getDatabaseList: No databases available '),
        );

        await expect(lifecycle.prepareGlobalDatabase()).resolves.toBeUndefined();
    });

    it('refuses to create a global database when site databases remain', async () => {
        files.delete(global + 'SQLite.db');

        await expect(lifecycle.prepareGlobalDatabase()).rejects.toThrow('global database is missing');
        expect(sqlite.isDatabase).not.toHaveBeenCalled();
    });

    it('validates existing databases and requires each saved site to have a database', async () => {
        await lifecycle.prepareGlobalDatabase();
        await lifecycle.validateOpen(global, connection);
        await lifecycle.reconcileSites(connection);

        files.delete(site + 'SQLite.db');
        await expect(lifecycle.reconcileSites(connection)).rejects.toThrow('database for saved site "test" is missing');
    });

    it('does not allow deleting the global database while any site database remains', async () => {
        await expect(lifecycle.prepareDelete(global)).rejects.toThrow('while site databases exist');
    });

    it('verifies deletion after the plugin operation and allows an absent database', async () => {
        files.delete(site + 'SQLite.db');
        await expect(lifecycle.prepareDelete(site)).resolves.toBe('absent');
        await expect(lifecycle.completeDelete(site)).resolves.toBeUndefined();

        files.add(site + 'SQLite.db');
        await expect(lifecycle.prepareDelete(site)).resolves.toBe('existing');
        files.delete(site + 'SQLite.db');
        await expect(lifecycle.completeDelete(site)).resolves.toBeUndefined();
    });

    it('rejects invalid database inventories rather than treating errors as an empty install', async () => {
        const error = new Error('Database listing failed');
        jest.mocked(sqlite.getDatabaseList).mockRejectedValue(error);
        await expect(lifecycle.prepareGlobalDatabase()).rejects.toBe(error);
    });
});
