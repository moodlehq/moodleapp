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
    CoreCapacitorSQLiteLifecycle,
    CoreCapacitorSQLiteManager,
    CoreCapacitorSQLiteManagerDriver,
} from '@classes/capacitor-sqlite-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { SQLiteDB } from '@classes/sqlitedb';

describe('CoreCapacitorSQLiteManager', () => {
    const name = 'Site-manager';
    let driver: CoreCapacitorSQLiteManagerDriver;
    let lifecycle: CoreCapacitorSQLiteLifecycle;
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
        lifecycle = {
            ready: jest.fn(async () => undefined),
            prepareOpen: jest.fn(async () => 'existing'),
            validateOpen: jest.fn(async () => undefined),
            completeInitialization: jest.fn(async () => undefined),
            prepareDelete: jest.fn(async name => files.has(name) ? 'existing' : 'absent'),
            removeDatabase: jest.fn(async database => {
                if (registered.has(database) || opened.has(database)) {
                    throw new Error('Deletion requires no native registration');
                }
                files.delete(database);
            }),
            completeDelete: jest.fn(async () => undefined),
        };
        manager = new CoreCapacitorSQLiteManager(driver, lifecycle);
    });

    it('keeps synchronous deferred handles and shares a registration/adapter across forceNew-style wrappers', async () => {
        const first = new SQLiteDB(name, manager.getConnection(name));
        const second = new SQLiteDB(name, manager.getConnection(name));
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(lifecycle.ready).not.toHaveBeenCalled();

        await Promise.all([first.execute('SELECT 1'), second.execute('SELECT 2')]);

        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.createConnection).toHaveBeenCalledWith({
            database: name, encrypted: false, mode: 'no-encryption', version: 1, readonly: false,
        });
        expect(driver.open).toHaveBeenCalledTimes(1);
        expect(lifecycle.prepareOpen).toHaveBeenCalledTimes(1);
        expect(lifecycle.validateOpen).toHaveBeenCalledTimes(1);
        expect(driver.query).toHaveBeenCalledTimes(2);
    });

    it('blocks every database and deletion on the shared startup barrier', async () => {
        const ready = new CorePromisedValue<void>();
        jest.mocked(lifecycle.ready).mockReturnValue(ready);
        const read = manager.getConnection(name).executeSql('SELECT 1');
        const other = manager.getConnection('MoodleMobile').open();
        const deletion = manager.deleteDatabase('Site-absent');
        await Promise.resolve();
        await Promise.resolve();
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(lifecycle.prepareDelete).not.toHaveBeenCalled();
        ready.resolve();
        await Promise.all([read, other, deletion]);
        expect(lifecycle.ready).toHaveBeenCalledTimes(1);
    });

    it('releases registrations from an earlier WebView before lifecycle recovery and registers only once', async () => {
        registered.add(name);
        opened.add(name);
        jest.mocked(lifecycle.ready).mockImplementation(async () => {
            expect(registered.size).toBe(0);
            expect(opened.size).toBe(0);
        });

        await Promise.all([
            manager.ready(),
            manager.getConnection(name).executeSql('SELECT 1'),
            manager.getConnection(name).executeSql('SELECT 2'),
        ]);

        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(1);
        expect(driver.checkConnectionsConsistency).toHaveBeenCalledWith({ dbNames: [], openModes: [] });
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(registered.has(name)).toBe(true);
    });

    it('blocks inventory, queries and deletion if retained connections cannot be released', async () => {
        const error = new Error('Cannot close retained connection');
        jest.mocked(driver.checkConnectionsConsistency).mockRejectedValue(error);

        await expect(manager.ready()).rejects.toBe(error);
        await expect(manager.getConnection(name).executeSql('SELECT 1')).rejects.toBe(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);

        expect(driver.checkConnectionsConsistency).toHaveBeenCalledTimes(1);
        expect(lifecycle.ready).not.toHaveBeenCalled();
        expect(lifecycle.prepareDelete).not.toHaveBeenCalled();
        expect(driver.createConnection).not.toHaveBeenCalled();
    });

    it('latches startup errors across names and never reaches the plugin', async () => {
        const error = new Error('Inventory failed');
        jest.mocked(lifecycle.ready).mockRejectedValue(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        await expect(manager.getConnection('MoodleMobile').open()).rejects.toBe(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(lifecycle.removeDatabase).not.toHaveBeenCalled();
        expect(lifecycle.ready).toHaveBeenCalledTimes(1);
    });

    it('does not release caller SQL until post-open validation succeeds', async () => {
        const validated = new CorePromisedValue<void>();
        const validating = new CorePromisedValue<void>();
        jest.mocked(lifecycle.validateOpen).mockImplementation(async (_name, connection) => {
            await connection.executeSql('PRAGMA integrity_check');
            validating.resolve();
            await validated;
        });
        const read = manager.getConnection(name).executeSql('SELECT 1');
        await validating;
        expect(driver.query).toHaveBeenCalledTimes(1);
        validated.resolve();
        await read;
        expect(driver.query).toHaveBeenCalledTimes(2);
    });

    it.each(['prepareOpen', 'validateOpen'] as const)('latches %s failures without exposing an adapter', async method => {
        const error = new Error('Unsafe database');
        jest.mocked(lifecycle[method]).mockRejectedValue(error);
        const handle = manager.getConnection(name);
        await expect(handle.executeSql('SELECT 1')).rejects.toBe(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        expect(driver.query).not.toHaveBeenCalled();
        expect(registered.size).toBe(0);
        expect(lifecycle[method]).toHaveBeenCalledTimes(1);
    });

    it('refuses a missing adopted database before registration or open', async () => {
        files.delete(name);
        await expect(manager.getConnection(name).open()).rejects.toThrow('authorised open');
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.open).not.toHaveBeenCalled();
        expect(files.has(name)).toBe(false);
    });

    it('allows explicit new-database authorisation but refuses an existing destination', async () => {
        jest.mocked(lifecycle.prepareOpen).mockResolvedValue('create');
        await expect(manager.getConnection(name).open()).rejects.toThrow('authorised open');
        expect(driver.open).not.toHaveBeenCalled();

        const fresh = 'Site-fresh';
        await manager.getConnection(fresh).open();
        expect(files.has(fresh)).toBe(true);
        expect(lifecycle.validateOpen).toHaveBeenCalledWith(fresh, expect.anything());
    });

    it.each([{}, { result: false }])('does not use malformed/absent existence as authorisation: %p', async result => {
        jest.mocked(driver.isDatabase).mockResolvedValue(result);
        await expect(manager.getConnection(name).open()).rejects.toThrow('authorised open');
        expect(driver.open).not.toHaveBeenCalled();
    });

    it('keeps one batch indivisible across separate handles and waits before deletion', async () => {
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
        expect(lifecycle.prepareDelete).not.toHaveBeenCalled();
        release.resolve();
        await Promise.all([batch, read, deletion]);
        expect(driver.commitTransaction).toHaveBeenCalledTimes(1);
        expect(driver.query).toHaveBeenCalledTimes(1);
        expect(files.has(name)).toBe(false);
    });

    it('shares close/reopen state and validates reopened files without registering twice', async () => {
        const first = manager.getConnection(name);
        const second = manager.getConnection(name);
        await first.open();
        await first.close();
        await expect(second.executeSql('SELECT 1')).rejects.toThrow('closed');
        await second.open();
        await first.executeSql('SELECT 1');
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
        expect(driver.open).toHaveBeenCalledTimes(2);
        expect(lifecycle.validateOpen).toHaveBeenCalledTimes(2);
    });

    it('closing an unused handle does not create a database', async () => {
        await manager.getConnection('Site-unused').close();
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(lifecycle.prepareOpen).not.toHaveBeenCalled();
    });

    it('seals app schemas through the owned adapter without deadlocking on a deferred handle', async () => {
        jest.mocked(lifecycle.completeInitialization).mockImplementation(async (_name, connection) => {
            await connection.executeSql('SELECT 1');
        });
        await manager.completeInitialization(name);
        expect(lifecycle.completeInitialization).toHaveBeenCalledWith(name, expect.anything());
        expect(driver.query).toHaveBeenCalledTimes(1);
        expect(driver.createConnection).toHaveBeenCalledTimes(1);
    });

    it('blocks missing-file reopen and does not silently recreate it', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        await connection.close();
        files.delete(name);
        await expect(connection.open()).rejects.toThrow('empty replacement');
        await expect(connection.executeSql('SELECT 1')).rejects.toThrow('empty replacement');
        expect(driver.open).toHaveBeenCalledTimes(1);
    });

    it('latches failed validation after reopening', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        await connection.close();
        const error = new Error('Reopened data invalid');
        jest.mocked(lifecycle.validateOpen).mockRejectedValue(error);
        await expect(connection.open()).rejects.toBe(error);
        await expect(connection.executeSql('SELECT 1')).rejects.toBe(error);
        expect(registered.size).toBe(0);
    });

    it('retains a failed-close connection until close succeeds', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        const error = new Error('Close failed');
        jest.mocked(driver.close).mockRejectedValueOnce(error);
        await expect(connection.close()).rejects.toBe(error);
        await connection.executeSql('SELECT 1');
        await connection.close();
        expect(driver.close).toHaveBeenCalledTimes(2);
    });

    it('does not record or perform deletion when closing the live connection fails', async () => {
        const connection = manager.getConnection(name);
        await connection.open();
        const error = new Error('Cannot drain connection');
        jest.mocked(driver.close).mockRejectedValueOnce(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        expect(lifecycle.prepareDelete).not.toHaveBeenCalled();
        expect(lifecycle.removeDatabase).not.toHaveBeenCalled();
        expect(files.has(name)).toBe(true);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
    });

    it('cleans up an acknowledged registration after native open fails without retrying', async () => {
        const error = new Error('Recovery failed');
        jest.mocked(driver.open).mockRejectedValueOnce(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        expect(driver.open).toHaveBeenCalledTimes(1);
        expect(driver.closeConnection).toHaveBeenCalledTimes(1);
        expect(registered.size).toBe(0);
    });

    it('keeps unrelated database queues independent', async () => {
        const waiting = new CorePromisedValue<void>();
        const entered = new CorePromisedValue<void>();
        jest.mocked(lifecycle.prepareOpen).mockImplementation(async database => {
            if (database === name) {
                entered.resolve();
                await waiting;
            }

            return 'existing';
        });
        const blocked = manager.getConnection(name).open();
        await entered;
        await manager.getConnection('MoodleMobile').executeSql('SELECT 1');
        expect(opened.has(name)).toBe(false);
        waiting.resolve();
        await blocked;
    });

    it('deletes unopened files without opening or validating their contents', async () => {
        await manager.deleteDatabase(name);
        expect(driver.open).not.toHaveBeenCalled();
        expect(lifecycle.prepareOpen).not.toHaveBeenCalled();
        expect(lifecycle.validateOpen).not.toHaveBeenCalled();
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(driver.closeConnection).not.toHaveBeenCalled();
        expect(lifecycle.completeDelete).toHaveBeenCalledWith(name);
        expect(files.has(name)).toBe(false);
    });

    it('passes an authorised absent database through durable removal without plugin registration', async () => {
        files.delete(name);
        await manager.deleteDatabase(name);
        expect(driver.createConnection).not.toHaveBeenCalled();
        expect(lifecycle.removeDatabase).toHaveBeenCalledWith(name);
        expect(lifecycle.completeDelete).toHaveBeenCalledWith(name);
    });

    it('retires every old handle and only allows new handles after successful deletion', async () => {
        const first = manager.getConnection(name);
        const second = manager.getConnection(name);
        await first.open();
        await manager.deleteDatabase(name);
        await expect(first.open()).rejects.toThrow('deleted database');
        await expect(second.executeSql('SELECT 1')).rejects.toThrow('deleted database');
        await expect(second.close()).rejects.toThrow('deleted database');
        jest.mocked(lifecycle.prepareOpen).mockResolvedValue('create');
        await manager.getConnection(name).open();
        await expect(first.executeSql('SELECT 1')).rejects.toThrow('deleted database');
        expect(driver.createConnection).toHaveBeenCalledTimes(2);
    });

    it.each(['prepareDelete', 'completeDelete'] as const)('blocks recreation after %s failure', async method => {
        const error = new Error('Deletion record failed');
        jest.mocked(lifecycle[method]).mockRejectedValue(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        expect(driver.open).not.toHaveBeenCalled();
        expect(lifecycle.removeDatabase).toHaveBeenCalledTimes(method === 'prepareDelete' ? 0 : 1);
    });

    it('does not delete when the durable permission and actual file state disagree', async () => {
        jest.mocked(lifecycle.prepareDelete).mockResolvedValue('absent');
        await expect(manager.deleteDatabase(name)).rejects.toThrow('authorised deletion');
        expect(lifecycle.removeDatabase).not.toHaveBeenCalled();
        expect(lifecycle.completeDelete).not.toHaveBeenCalled();
    });

    it('latches durable deletion failure without registering or reopening files', async () => {
        const error = new Error('Cannot delete');
        jest.mocked(lifecycle.removeDatabase).mockRejectedValue(error);
        await expect(manager.deleteDatabase(name)).rejects.toBe(error);
        await expect(manager.getConnection(name).open()).rejects.toBe(error);
        expect(lifecycle.completeDelete).not.toHaveBeenCalled();
        expect(registered.size).toBe(0);
    });

    it('does not close a registration it did not successfully acquire', async () => {
        await manager.ready();
        registered.add(name);
        await expect(manager.getConnection(name).open()).rejects.toThrow('Duplicate registration');
        expect(driver.closeConnection).not.toHaveBeenCalled();
        expect(registered.has(name)).toBe(true);
    });

    it('preserves both validation and cleanup failures and never retries SQL', async () => {
        jest.mocked(lifecycle.validateOpen).mockRejectedValue(new Error('Invalid data'));
        jest.mocked(driver.closeConnection).mockRejectedValue(new Error('Cleanup failed'));
        const connection = manager.getConnection(name);
        const error = await connection.open().catch(error => error);
        expect(error.message).toContain('cleanup could not be confirmed');
        expect(error.debug.details).toContain('Invalid data');
        expect(error.debug.details).toContain('Cleanup failed');
        await expect(connection.executeSql('SELECT 1')).rejects.toBe(error);
        expect(driver.open).toHaveBeenCalledTimes(1);
    });

    it.each(['', '../MoodleMobile', 'Site-bad.db', 'Site-bad\n', 'other'])('rejects unsafe names: %p', name => {
        expect(() => manager.getConnection(name)).toThrow('Invalid SQLite database name');
        expect(() => manager.deleteDatabase(name)).toThrow('Invalid SQLite database name');
        expect(lifecycle.ready).not.toHaveBeenCalled();
    });
});
