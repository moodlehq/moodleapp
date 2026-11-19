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

import {
    CoreCapacitorSQLiteManager,
    CoreCapacitorSQLiteManagerDriver,
} from '@classes/capacitor-sqlite-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { SQLiteDB } from '@classes/sqlitedb';

describe('CoreCapacitorSQLiteManager', () => {
    const name = 'Site-manager';
    let driver: CoreCapacitorSQLiteManagerDriver;
    let manager: CoreCapacitorSQLiteManager;
    let files: Set<string>;
    let registered: Set<string>;
    let opened: Set<string>;

    beforeEach(() => {
        files = new Set([name, 'MoodleMobile']);
        registered = new Set();
        opened = new Set();
        driver = {
            checkConnectionsConsistency: jest.fn(async () => {
                registered.clear();
                opened.clear();

                return { result: false };
            }),
            createConnection: jest.fn(async ({ database = '' }) => {
                if (registered.has(database)) {
                    throw new Error('Duplicate registration');
                }
                registered.add(database);
            }),
            closeConnection: jest.fn(async ({ database = '' }) => {
                registered.delete(database);
                opened.delete(database);
            }),
            isDatabase: jest.fn(async ({ database = '' }) => ({ result: files.has(database) })),
            deleteDatabase: jest.fn(async ({ database = '' }) => {
                if (!registered.has(database) || opened.has(database)) {
                    throw new Error('Deletion requires a closed, registered connection');
                }
                files.delete(database);
            }),
            open: jest.fn(async ({ database = '' }) => {
                if (!registered.has(database)) {
                    throw new Error('Not registered');
                }
                files.add(database);
                opened.add(database);
            }),
            close: jest.fn(async ({ database = '' }) => {
                opened.delete(database);
            }),
            query: jest.fn(async ({ database = '' }) => {
                if (!opened.has(database)) {
                    throw new Error('Not open');
                }

                return { values: [{ value: 1 }] };
            }),
            run: jest.fn(async () => ({ changes: { changes: 1, lastId: 1 } })),
            beginTransaction: jest.fn(async () => ({ changes: { changes: 0 } })),
            commitTransaction: jest.fn(async () => ({ changes: { changes: 0 } })),
            rollbackTransaction: jest.fn(async () => ({ changes: { changes: 0 } })),
            isTransactionActive: jest.fn(async () => ({ result: true })),
        };
        manager = new CoreCapacitorSQLiteManager(driver);
    });

    it('keeps handles synchronous and shares one registration and adapter', async () => {
        const first = new SQLiteDB(name, manager.getConnection(name));
        const second = new SQLiteDB(name, manager.getConnection(name));
        expect(driver.createConnection).not.toHaveBeenCalled();

        await Promise.all([first.execute('SELECT 1'), second.execute('SELECT 2')]);

        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.open).toHaveBeenCalledTimes(1);
        expect(driver.query).toHaveBeenCalledTimes(2);
    });

    it('releases registrations left by the previous WebView before opening', async () => {
        registered.add(name);
        opened.add(name);

        await manager.getConnection(name).executeSql('SELECT 1');

        expect(driver.checkConnectionsConsistency).toHaveBeenCalledWith({ dbNames: [], openModes: [] });
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(registered.has(name)).toBe(true);
    });

    it('shares and propagates a failed startup consistency check', async () => {
        const error = new Error('Cannot close retained connection');
        jest.mocked(driver.checkConnectionsConsistency).mockRejectedValue(error);

        await expect(manager.getConnection(name).executeSql('SELECT 1')).rejects.toBe(error);
        await expect(manager.databaseExists(name)).rejects.toBe(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(1);
    });

    it('creates a missing database on first access without app-specific checks', async () => {
        const connection = manager.getConnection('Site-new');

        await expect(connection.executeSql('SELECT 1')).resolves.toMatchObject({ rowsAffected: 0 });

        expect(files.has('Site-new')).toBe(true);
        expect(driver.isDatabase).not.toHaveBeenCalled();
    });

    it('checks database existence without opening or creating it', async () => {
        await expect(manager.databaseExists(name)).resolves.toBe(true);
        await expect(manager.databaseExists('Site-absent')).resolves.toBe(false);

        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.open).not.toHaveBeenCalled();
    });

    it('serializes a batch and waits for it before deleting the database', async () => {
        const entered = new CorePromisedValue<void>();
        const release = new CorePromisedValue<void>();
        jest.mocked(driver.run).mockImplementationOnce(async () => {
            entered.resolve();
            await release;

            return { changes: { changes: 1, lastId: 1 } };
        });
        const first = manager.getConnection(name);
        const second = manager.getConnection(name);
        const batch = first.sqlBatch(['INSERT INTO records VALUES (1)', 'INSERT INTO records VALUES (2)']);
        await entered;
        const read = second.executeSql('SELECT 1');
        const deletion = manager.deleteDatabase(name);

        expect(driver.query).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
        release.resolve();
        await Promise.all([batch, read, deletion]);

        expect(driver.commitTransaction).toHaveBeenCalledTimes(1);
        expect(driver.query).toHaveBeenCalledTimes(1);
        expect(files.has(name)).toBe(false);
    });

    it('shares close and reopen state without registering twice', async () => {
        const first = manager.getConnection(name);
        const second = manager.getConnection(name);
        await first.open();
        await first.close();
        await expect(second.executeSql('SELECT 1')).rejects.toThrow('closed');
        await second.open();
        await first.executeSql('SELECT 1');

        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.open).toHaveBeenCalledTimes(2);
    });

    it('does not recreate a file that disappeared while the adapter was closed', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        await connection.close();
        files.delete(name);

        await expect(connection.open()).rejects.toThrow('empty replacement');
        await expect(connection.executeSql('SELECT 1')).rejects.toThrow('empty replacement');
        expect(driver.open).toHaveBeenCalledTimes(1);
    });

    it('deletes absent databases without opening them', async () => {
        await manager.deleteDatabase('Site-absent');

        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
    });

    it('registers an unopened existing database for deletion and releases it afterwards', async () => {
        await manager.deleteDatabase(name);

        expect(files.has(name)).toBe(false);
        expect(driver.open).not.toHaveBeenCalled();
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.deleteDatabase).toHaveBeenCalledWith({ database: name, readonly: false });
        expect(driver.closeConnection).toHaveBeenCalledTimes(1);
        expect(registered.has(name)).toBe(false);
    });

    it('releases an existing registration when its database is already absent', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        await connection.close();
        files.delete(name);

        await manager.deleteDatabase(name);

        expect(driver.deleteDatabase).not.toHaveBeenCalled();
        expect(driver.closeConnection).toHaveBeenCalledTimes(1);
        expect(registered.has(name)).toBe(false);
    });

    it('retires old handles after deletion and permits a fresh handle', async () => {
        const old = manager.getConnection(name);
        await old.open();
        await manager.deleteDatabase(name);

        await expect(old.open()).rejects.toThrow('deleted database');
        await expect(old.executeSql('SELECT 1')).rejects.toThrow('deleted database');
        await manager.getConnection(name).open();
        expect(driver.createConnection).toHaveBeenCalledTimes(2);
    });

    it('latches native open and deletion failures', async () => {
        const openError = new Error('Native open failed');
        jest.mocked(driver.open).mockRejectedValueOnce(openError);
        const connection = manager.getConnection(name);
        await expect(connection.open()).rejects.toBe(openError);
        await expect(connection.open()).rejects.toBe(openError);
        expect(driver.closeConnection).toHaveBeenCalledTimes(1);

        manager = new CoreCapacitorSQLiteManager(driver);
        const deleteError = new Error('Native deletion failed');
        jest.mocked(driver.deleteDatabase).mockRejectedValueOnce(deleteError);
        await expect(manager.deleteDatabase(name)).rejects.toBe(deleteError);
        await expect(manager.getConnection(name).open()).rejects.toBe(deleteError);
        expect(registered.has(name)).toBe(false);
    });

    it('does not close a registration it did not successfully acquire', async () => {
        await manager.ready();
        registered.add(name);

        await expect(manager.getConnection(name).open()).rejects.toThrow('Duplicate registration');
        expect(driver.closeConnection).not.toHaveBeenCalled();
        expect(registered.has(name)).toBe(true);
    });

    it.each(['', '../MoodleMobile', '.', '..', 'Site_bad', 'Site bad', 'Site-bad\\name', 'Site-bad\n'])(
        'rejects unsafe names: %p',
        value => {
            expect(() => manager.getConnection(value)).toThrow('Invalid SQLite database name');
            expect(() => manager.deleteDatabase(value)).toThrow('Invalid SQLite database name');
        },
    );

    it('accepts alphanumeric database names with hyphens', async () => {
        files.add('Analytics-2026-v1');

        await expect(manager.getConnection('Analytics-2026-v1').executeSql('SELECT 1')).resolves.toMatchObject({
            rowsAffected: 0,
        });
    });
});
