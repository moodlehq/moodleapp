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
import { CoreDbServiceMock, CoreBrowserSQLiteDriver } from '@features/emulator/services/db';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { CoreDbProvider } from '@services/db';
import { getDatabaseProviders } from '@services/database';
import { mockSingleton } from '@/testing/utils';
import { Injector } from '@angular/core';

describe('Capacitor browser database provider', () => {
    let engines: Map<string, DatabaseSync>;
    let registered: Set<string>;
    let driver: CoreBrowserSQLiteDriver;
    let provider: CoreDbServiceMock;
    let initialize: jest.Mock<Promise<void>, []>;

    /**
     * Obtain the real SQLite engine behind the browser-shaped test driver.
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

    beforeEach(() => {
        engines = new Map();
        registered = new Set();
        initialize = jest.fn(async () => undefined);
        driver = {
            initWebStore: jest.fn(async () => undefined),
            saveToStore: jest.fn(async ({ database }) => {
                if (engine(database).isTransaction) {
                    throw new Error('Cannot export during a transaction');
                }
                engine(database).exec('PRAGMA foreign_keys = ON');
            }),
            createConnection: jest.fn(async ({ database = '' }) => {
                if (registered.has(database)) {
                    throw new Error('Duplicate connection');
                }
                registered.add(database);
            }),
            closeConnection: jest.fn(async ({ database = '' }) => { registered.delete(database); }),
            isDatabase: jest.fn(async ({ database = '' }) => ({ result: engines.has(database) })),
            open: jest.fn(async ({ database = '' }) => {
                if (!engines.has(database)) {
                    engines.set(database, new DatabaseSync(':memory:'));
                }
            }),
            close: jest.fn(async () => undefined),
            deleteDatabase: jest.fn(async ({ database = '' }) => {
                engine(database).close();
                engines.delete(database);
            }),
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
        provider = new CoreDbServiceMock(driver, initialize);
        jest.spyOn(provider, 'loggingEnabled').mockReturnValue(false);
    });

    afterEach(() => {
        engines.forEach(db => db.close());
    });

    it('defers early SQL until the one shared web-store initialization succeeds', async () => {
        const pending = new CorePromisedValue<void>();
        initialize.mockImplementation(() => pending);
        const db = provider.getDB('MoodleMobile');
        const querying = db.execute('SELECT 1');
        expect(driver.createConnection).not.toHaveBeenCalled();
        pending.resolve();
        await querying;
        await provider.ready();
        expect(initialize).toHaveBeenCalledTimes(1);
        expect(driver.initWebStore).toHaveBeenCalledTimes(1);
    });

    it('does not open a connection or fall back when initialization fails', async () => {
        const error = new Error('IndexedDB unavailable');
        initialize.mockRejectedValue(error);
        await expect(provider.getDB('MoodleMobile').execute('SELECT 1')).rejects.toBe(error);
        await expect(provider.ready()).rejects.toBe(error);
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(initialize).toHaveBeenCalledTimes(1);
    });

    it('shares registration, SQL serialization and persisted writes across forceNew wrappers', async () => {
        const first = provider.getDB('MoodleMobile');
        const second = provider.getDB('MoodleMobile', true);
        await first.execute('CREATE TABLE records (id INTEGER PRIMARY KEY, value TEXT UNIQUE)');
        jest.mocked(driver.saveToStore).mockClear();
        await Promise.all([
            first.executeBatch(['INSERT INTO records VALUES (1, \'one\')', 'INSERT INTO records VALUES (2, \'two\')']),
            second.execute('INSERT INTO records VALUES (?, ?)', [3, 'three']),
        ]);
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.saveToStore).toHaveBeenCalledTimes(2);
        expect(await first.getAllRecords('records')).toHaveLength(3);
        expect(driver.saveToStore).toHaveBeenCalledTimes(2);
    });

    it('waits for persistence before resolving a write or allowing a second handle to read it', async () => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('CREATE TABLE records (value TEXT)');
        const pending = new CorePromisedValue<void>();
        const entered = new CorePromisedValue<void>();
        jest.mocked(driver.saveToStore).mockImplementationOnce(async () => {
            entered.resolve();
            await pending;
        });
        let written = false;
        let read = false;
        const writing = db.execute('INSERT INTO records VALUES (?)', ['one']).then(() => written = true);
        await entered;
        const reading = provider.getDB('MoodleMobile', true).getAllRecords('records').then(() => read = true);
        expect(written).toBe(false);
        expect(read).toBe(false);
        pending.resolve();
        await Promise.all([writing, reading]);
        expect(written).toBe(true);
        expect(read).toBe(true);
    });

    it('rolls back a failed batch without exporting partial changes and remains usable', async () => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('CREATE TABLE records (value TEXT UNIQUE)');
        jest.mocked(driver.saveToStore).mockClear();
        await expect(db.executeBatch([
            'INSERT INTO records VALUES (\'duplicate\')', 'INSERT INTO records VALUES (\'duplicate\')',
        ])).rejects.toThrow();
        expect(driver.saveToStore).not.toHaveBeenCalled();
        expect(await db.getAllRecords('records')).toEqual([]);
        await db.execute('INSERT INTO records VALUES (\'valid\')');
        expect(driver.saveToStore).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])('blocks later reads, close and delete after a persistence failure (batch: %s)', async batch => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('CREATE TABLE records (value TEXT)');
        const error = new Error('QuotaExceededError');
        jest.mocked(driver.saveToStore).mockRejectedValueOnce(error);
        const sql = 'INSERT INTO records VALUES (\'not acknowledged\')';
        await expect(batch ? db.executeBatch([sql]) : db.execute(sql)).rejects.toBe(error);
        await expect(db.getAllRecords('records')).rejects.toBe(error);
        await expect(db.close()).rejects.toBe(error);
        await expect(provider.deleteDB('MoodleMobile')).rejects.toBe(error);
        expect(driver.close).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
    });

    it('coordinates close/reopen across wrappers without allowing SQL after close', async () => {
        const first = provider.getDB('MoodleMobile');
        const second = provider.getDB('MoodleMobile', true);
        await first.execute('CREATE TABLE records (value TEXT)');
        await first.close();
        await expect(second.execute('SELECT * FROM records')).rejects.toThrow('closed');
        await second.open();
        expect(await first.getAllRecords('records')).toEqual([]);
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
    });

    it('deletes only the named database and permanently retires its old wrappers', async () => {
        const old = provider.getDB('Site-test');
        const retained = provider.getDB('MoodleMobile');
        await old.execute('CREATE TABLE records (value TEXT)');
        await retained.execute('CREATE TABLE records (value TEXT)');
        await provider.deleteDB('Site-test');
        await expect(old.execute('SELECT 1')).rejects.toThrow('deleted');
        expect(await retained.getAllRecords('records')).toEqual([]);
        await provider.getDB('Site-test').execute('CREATE TABLE fresh (id INTEGER)');
        await expect(provider.getDB('Site-test').tableExists('records')).rejects.toThrow('No records found');
        await expect(old.open()).rejects.toThrow('deleted');
    });

    it('preserves the previous browser foreign-key policy after opening and exporting', async () => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('CREATE TABLE records (value TEXT)');
        const result = await db.execute('PRAGMA foreign_keys');
        expect(result.rows.item(0)).toEqual({ ['foreign_keys']: 0 });
    });

    it('preserves explicitly enabled foreign keys across exports', async () => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('PRAGMA foreign_keys = ON');
        await db.execute('CREATE TABLE parent (id INTEGER PRIMARY KEY)');
        await db.execute('CREATE TABLE child (id INTEGER REFERENCES parent(id))');
        await expect(db.execute('INSERT INTO child VALUES (1)')).rejects.toThrow('FOREIGN KEY');
        const result = await db.execute('PRAGMA foreign_keys');
        expect(result.rows.item(0)).toEqual({ ['foreign_keys']: 1 });
    });

    it('does not flush or delete a database after rollback cannot be confirmed', async () => {
        const db = provider.getDB('MoodleMobile');
        await db.execute('CREATE TABLE records (value TEXT UNIQUE)');
        jest.mocked(driver.isTransactionActive).mockRejectedValueOnce(new Error('Cannot inspect transaction'));
        await expect(db.executeBatch([
            'INSERT INTO records VALUES (\'duplicate\')', 'INSERT INTO records VALUES (\'duplicate\')',
        ])).rejects.toThrow('rollback could not be confirmed');
        await expect(provider.deleteDB('MoodleMobile')).rejects.toThrow('rollback could not be confirmed');
        expect(driver.close).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
    });

    it('does not create an absent database merely to delete it', async () => {
        await provider.deleteDB('Site-absent');
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.deleteDatabase).not.toHaveBeenCalled();
    });

    it('propagates global schema failures instead of acknowledging incomplete installation', () => {
        const error = new Error('Required schema failed');
        expect(() => provider.onDatabaseInitializationError('MoodleMobile', error)).toThrow(error);
    });

    it.each([false, true])('defaults to native storage without the emulator module (mobile: %s)', mobile => {
        mockSingleton(CorePlatform, { isMobile: () => mobile });
        const selected = Injector.create({ providers: [CoreDbProvider, ...getDatabaseProviders()] }).get(CoreDbProvider);
        expect(selected instanceof CoreDbProvider).toBe(true);
    });
});
