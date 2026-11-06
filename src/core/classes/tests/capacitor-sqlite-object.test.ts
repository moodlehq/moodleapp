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
import { CoreCapacitorSQLiteDriver, CoreCapacitorSQLiteObject } from '@classes/capacitor-sqlite-object';
import { SQLiteDB } from '@classes/sqlitedb';

describe.each([false, true])('Capacitor SQLite contract (iOS metadata: %s)', ios => {
    let engine: DatabaseSync;
    let driver: CoreCapacitorSQLiteDriver;
    let adapter: CoreCapacitorSQLiteObject;
    let database: SQLiteDB;

    beforeEach(() => {
        engine = new DatabaseSync(':memory:');
        driver = {
            query: jest.fn(async ({ statement, values = [] }) => {
                if (!statement) {
                    throw new Error('Missing statement');
                }
                const prepared = engine.prepare(statement);
                const rows = prepared.all(...values);

                const columns = { ['ios_columns']: prepared.columns().map(column => column.name) };

                return { values: ios && rows.length ? [columns, ...rows] : rows };
            }),
            run: jest.fn(async ({ statement, values = [] }) => {
                if (!statement) {
                    throw new Error('Missing statement');
                }
                const before = engine.prepare('SELECT total_changes() AS total').get();
                const result = engine.prepare(statement).run(...values);
                const after = engine.prepare('SELECT total_changes() AS total').get();

                return {
                    changes: {
                        changes: Number(after?.total) - Number(before?.total),
                        lastId: Number(result.lastInsertRowid),
                    },
                };
            }),
            beginTransaction: jest.fn(async () => {
                engine.exec('BEGIN TRANSACTION');

                return { changes: { changes: 0 } };
            }),
            commitTransaction: jest.fn(async () => {
                engine.exec('COMMIT');

                return { changes: { changes: 0 } };
            }),
            rollbackTransaction: jest.fn(async () => {
                engine.exec('ROLLBACK');

                return { changes: { changes: 0 } };
            }),
            isTransactionActive: jest.fn(async () => ({ result: engine.isTransaction })),
            isDatabase: jest.fn(async () => ({ result: true })),
            close: jest.fn(async () => undefined),
            open: jest.fn(async () => undefined),
        };
        adapter = new CoreCapacitorSQLiteObject('Site-test', driver);
        database = new SQLiteDB('Site-test', adapter);
        engine.exec('CREATE TABLE records (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT UNIQUE, amount REAL)');
    });

    afterEach(() => {
        engine.close();
    });

    it('preserves insert IDs and row accessors including NULL, unicode and numeric values', async () => {
        const value = 'caf\u00e9 \u{1f600}';
        const inserted = await adapter.executeSql('INSERT INTO records (value, amount) VALUES (?, ?)', [value, 1.5]);
        expect(inserted).toMatchObject({ insertId: 1, rowsAffected: 1, rows: { length: 0 } });
        await adapter.executeSql('INSERT INTO records (value, amount) VALUES (?, ?)', [undefined, null]);
        const result = await adapter.executeSql('SELECT * FROM records ORDER BY id');

        expect(result.rows.length).toBe(2);
        expect(result.rows.item(0)).toEqual({ id: 1, value: 'caf\u00e9 \u{1f600}', amount: 1.5 });
        expect(result.rows.item(1)).toEqual({ id: 2, value: null, amount: null });
        expect(result.rows.item(2)).toBeUndefined();
        expect(result.rowsAffected).toBe(0);
        expect(result).not.toHaveProperty('insertId');
    });

    it.each(['INSERT', 'REPLACE'])('preserves an explicit ROWID of zero for %s', async operation => {
        const inserted = await adapter.executeSql(`${operation} INTO records (id, value) VALUES (?, ?)`, [0, 'zero']);

        expect(inserted).toMatchObject({ rowsAffected: 1, insertId: 0 });
        expect(await database.insertRecord('records', { id: 0, value: 'replacement' })).toBe(0);
        expect(await database.getRecord('records', { id: 0 })).toEqual({ id: 0, value: 'replacement', amount: null });
    });

    it.each(['UPDATE records SET amount = 5 WHERE id = 10', 'DELETE FROM records WHERE id = 10'])(
        'does not expose a stale insert ID for %s',
        async statement => {
            await adapter.executeSql('INSERT INTO records (id, value) VALUES (?, ?)', [10, 'ten']);
            const result = await adapter.executeSql(statement);

            expect(result.rowsAffected).toBe(1);
            expect(result).not.toHaveProperty('insertId');
        },
    );

    it('preserves a user column called ios_columns', async () => {
        const result = await adapter.executeSql('SELECT \'text\' AS ios_columns');

        expect(result.rows.length).toBe(1);
        expect(result.rows.item(0)).toEqual({ ['ios_columns']: 'text' });
    });

    it('handles zero rows and normalises mutation/DDL counts without stale changes', async () => {
        await adapter.executeSql('INSERT INTO records (value) VALUES (\'one\'), (\'two\')');
        expect((await adapter.executeSql('UPDATE records SET amount = 5 WHERE value = \'one\'')).rowsAffected).toBe(1);
        expect((await adapter.executeSql('DELETE FROM records WHERE id = -1')).rowsAffected).toBe(0);
        expect((await adapter.executeSql('SELECT * FROM records WHERE id = -1')).rows.length).toBe(0);
        expect((await adapter.executeSql('CREATE TABLE other (id INTEGER)')).rowsAffected).toBe(0);
        expect((await adapter.executeSql('DELETE FROM records')).rowsAffected).toBe(2);
    });

    it('matches native Cordova total_changes semantics when triggers write additional rows', async () => {
        engine.exec(`CREATE TABLE audit (value TEXT);
            CREATE TRIGGER record_insert AFTER INSERT ON records BEGIN
                INSERT INTO audit VALUES (new.value);
            END;`);

        const result = await adapter.executeSql('INSERT INTO records (value) VALUES (?)', ['one']);

        expect(result.rowsAffected).toBe(2);
        expect(result.insertId).toBe(1);
    });

    it('does not invent an insert ID for ignored inserts or no-row updates', async () => {
        await adapter.executeSql('INSERT INTO records (id, value) VALUES (10, ?)', ['ten']);
        const ignored = await adapter.executeSql('INSERT OR IGNORE INTO records (value) VALUES (?)', ['ten']);
        expect(ignored.rowsAffected).toBe(0);
        expect(ignored).not.toHaveProperty('insertId');
        const updated = await adapter.executeSql('UPDATE records SET value = ? WHERE id = -1', ['missing']);
        expect(updated).not.toHaveProperty('insertId');
    });

    it('routes comments, CTE SELECT, PRAGMA and quoted separators without treating them as mutations', async () => {
        const result = await adapter.executeSql(`-- INSERT is just a comment
            /* UPDATE */
            WITH input AS (SELECT ? AS value) SELECT value, '; RETURNING' AS note FROM input; -- SELECT 2`, ['one']);

        expect(result.rows.item(0)).toEqual({ value: 'one', note: '; RETURNING' });
        expect(driver.run).not.toHaveBeenCalled();
        expect((await adapter.executeSql('PRAGMA table_info(records)')).rows.length).toBe(3);
        expect((await adapter.executeSql('EXPLAIN SELECT * FROM records')).rows.length).toBeGreaterThan(0);
    });

    it('executes bound CTE mutations and REPLACE as writes', async () => {
        await adapter.executeSql('WITH input AS (SELECT ? AS value) INSERT INTO records (value) SELECT value FROM input', ['one']);
        const replaced = await adapter.executeSql('REPLACE INTO records (id, value) VALUES (?, ?)', [1, 'replacement']);

        expect(replaced).toMatchObject({ rowsAffected: 1, insertId: 1 });
        expect((await adapter.executeSql('SELECT value FROM records')).rows.item(0)).toEqual({ value: 'replacement' });
    });

    it('keeps parameter values separate from SQL, including quotes and SQL-looking text', async () => {
        const value = '\'); DELETE FROM records; --';
        await adapter.executeSql('INSERT INTO records (value) VALUES (?)', [value]);

        expect((await adapter.executeSql('SELECT value FROM records')).rows.item(0)).toEqual({ value });
        expect(driver.run).toHaveBeenCalledWith(expect.objectContaining({
            database: 'Site-test', statement: 'INSERT INTO records (value) VALUES (?)', values: [value],
            readonly: false, transaction: false, returnMode: 'no',
        }));
    });

    it('commits an atomic mixed batch and serialises queries submitted while it is running', async () => {
        const batch = adapter.sqlBatch([
            ['INSERT INTO records (value) VALUES (?)', ['one']],
            'SELECT * FROM records',
            ['INSERT INTO records (value) VALUES (?)', ['two']],
        ]);
        const query = adapter.executeSql('SELECT count(*) AS total FROM records');

        await batch;
        expect((await query).rows.item(0)).toEqual({ total: 2 });
        expect(driver.beginTransaction).toHaveBeenCalledTimes(1);
        expect(driver.commitTransaction).toHaveBeenCalledTimes(1);
        expect(driver.rollbackTransaction).not.toHaveBeenCalled();
    });

    it.each(['INSERT', 'INSERT OR ROLLBACK'])('rolls back the failed batch (%s) and keeps the connection usable', async insert => {
        await expect(adapter.sqlBatch([
            ['INSERT INTO records (value) VALUES (?)', ['duplicate']],
            [`${insert} INTO records (value) VALUES (?)`, ['duplicate']],
        ])).rejects.toThrow();

        expect((await adapter.executeSql('SELECT count(*) AS total FROM records')).rows.item(0)).toEqual({ total: 0 });
        expect(driver.commitTransaction).not.toHaveBeenCalled();
        expect(driver.rollbackTransaction).toHaveBeenCalledTimes(insert === 'INSERT' ? 1 : 0);
        await adapter.executeSql('INSERT INTO records (value) VALUES (\'after-failure\')');
    });

    it('rolls back DDL as well as writes on a later failure', async () => {
        await expect(adapter.sqlBatch([
            'CREATE TABLE temporary_table (id INTEGER)',
            'INSERT INTO missing_table VALUES (1)',
        ])).rejects.toThrow();

        const result = await adapter.executeSql('SELECT name FROM sqlite_master WHERE name = \'temporary_table\'');
        expect(result.rows.length).toBe(0);
    });

    it('rejects invalid batches before beginning a transaction or writing anything', async () => {
        await expect(adapter.sqlBatch([
            'INSERT INTO records (value) VALUES (\'should-not-exist\')',
            'SELECT 1; DELETE FROM records',
        ])).rejects.toThrow('Only one SQLite statement');
        expect(driver.beginTransaction).not.toHaveBeenCalled();
        expect(driver.run).not.toHaveBeenCalled();
        await adapter.sqlBatch([]);
        expect(driver.beginTransaction).not.toHaveBeenCalled();
    });

    it('supports the existing SQLiteDB helpers without exposing plugin response types', async () => {
        const id = await database.insertRecord('records', { value: 'one', amount: 5 });
        expect(id).toBe(1);
        expect(await database.getRecord('records', { id })).toEqual({ id: 1, value: 'one', amount: 5 });
        expect(await database.updateRecords('records', { amount: 10 }, { id })).toBe(1);
        expect(await database.countRecords('records')).toBe(1);
        expect(await database.deleteRecords('records', { id })).toBe(1);
    });

    it('serialises close/reopen, rejects SQL while closed and preserves reopen failures', async () => {
        const writing = adapter.executeSql('INSERT INTO records (value) VALUES (\'one\')');
        const closing = adapter.close();
        await writing;
        await closing;
        await expect(adapter.executeSql('SELECT 1')).rejects.toThrow('closed');
        await adapter.close();
        expect(driver.close).toHaveBeenCalledTimes(1);
        const error = new Error('Cannot reopen');
        jest.mocked(driver.open).mockRejectedValueOnce(error);
        await expect(adapter.open()).rejects.toBe(error);
        await expect(adapter.executeSql('SELECT 1')).rejects.toThrow('closed');
        await database.open();
        expect(await database.countRecords('records')).toBe(1);
    });

    it('does not mark the database closed if the native close fails', async () => {
        const error = new Error('Cannot close');
        jest.mocked(driver.close).mockRejectedValueOnce(error);

        await expect(adapter.close()).rejects.toBe(error);
        await expect(adapter.executeSql('SELECT 1')).resolves.toMatchObject({ rowsAffected: 0 });
    });

    it('refuses to reopen a missing database instead of allowing the plugin to create a replacement', async () => {
        await adapter.close();
        jest.mocked(driver.isDatabase).mockResolvedValueOnce({ result: false });

        await expect(adapter.open()).rejects.toThrow('empty replacement');
        expect(driver.open).not.toHaveBeenCalled();
        await expect(adapter.executeSql('SELECT 1')).rejects.toThrow('closed');
    });

    it.each(['PRAGMA foreign_keys = OFF', 'VACUUM'])('rejects maintenance in a batch: %s', async statement => {
        await expect(adapter.sqlBatch([statement])).rejects.toThrow('maintenance');
        expect(driver.beginTransaction).not.toHaveBeenCalled();
    });

    it('propagates a failed begin without trying to roll back an unstarted transaction', async () => {
        const error = new Error('Cannot start a transaction');
        jest.mocked(driver.beginTransaction).mockRejectedValueOnce(error);

        await expect(adapter.sqlBatch(['SELECT 1'])).rejects.toBe(error);
        expect(driver.query).not.toHaveBeenCalled();
        expect(driver.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('rolls back if begin opened the transaction but failed before acknowledgement', async () => {
        const error = new Error('Transaction acknowledgement failed');
        jest.mocked(driver.beginTransaction).mockImplementationOnce(async () => {
            engine.exec('BEGIN TRANSACTION');
            throw error;
        });

        await expect(adapter.sqlBatch(['SELECT 1'])).rejects.toBe(error);
        expect(driver.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(engine.isTransaction).toBe(false);
        await expect(adapter.executeSql('SELECT 1')).resolves.toMatchObject({ rowsAffected: 0 });
    });

    it.each(['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT test', 'ATTACH DATABASE ? AS other',
        'INSERT INTO records (value) VALUES (?) RETURNING id', 'SELECT 1; SELECT 2'])(
        'explicitly rejects SQL outside the supported app contract: %s',
        async statement => {
            await expect(adapter.executeSql(statement)).rejects.toThrow();
            expect(driver.run).not.toHaveBeenCalled();
            expect(driver.query).not.toHaveBeenCalled();
        },
    );

    it.each([NaN, Infinity])('rejects non-finite parameter values: %s', async value => {
        await expect(adapter.executeSql('SELECT ?', [value])).rejects.toThrow('parameter');
        expect(driver.query).not.toHaveBeenCalled();
    });

    it('propagates missing/malformed native responses instead of fabricating empty rows or successful writes', async () => {
        jest.mocked(driver.query).mockResolvedValueOnce({});
        await expect(adapter.executeSql('SELECT 1')).rejects.toThrow('query response');
        jest.mocked(driver.query).mockResolvedValueOnce({ values: [null] });
        await expect(adapter.executeSql('SELECT 1')).rejects.toThrow('query response');
        jest.mocked(driver.run).mockResolvedValueOnce({});
        await expect(adapter.executeSql('INSERT INTO records (value) VALUES (\'one\')')).rejects.toThrow('mutation response');
        jest.mocked(driver.run).mockResolvedValueOnce({ changes: { changes: 1 } });
        await expect(adapter.executeSql('INSERT INTO records (value) VALUES (\'one\')')).rejects.toThrow('insert metadata');
    });

    it('surfaces a failed commit and rolls back before permitting later SQL', async () => {
        const error = new Error('Commit failed');
        jest.mocked(driver.commitTransaction).mockRejectedValueOnce(error);

        await expect(adapter.sqlBatch(['INSERT INTO records (value) VALUES (\'one\')'])).rejects.toBe(error);
        expect((await adapter.executeSql('SELECT * FROM records')).rows.length).toBe(0);
        expect(driver.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('blocks subsequent SQL after an unconfirmed rollback and preserves both errors', async () => {
        const rollback = new Error('Cannot roll back');
        jest.mocked(driver.rollbackTransaction).mockRejectedValueOnce(rollback);
        let failure: unknown;
        try {
            await adapter.sqlBatch(['INSERT INTO missing_table VALUES (1)']);
        } catch (error) {
            failure = error;
        }

        expect(failure).toMatchObject({
            message: 'SQLite batch failed and rollback could not be confirmed.',
            debug: { details: expect.stringContaining('Cannot roll back') },
        });
        await expect(adapter.executeSql('SELECT 1')).rejects.toBe(failure);
        await expect(adapter.sqlBatch([])).rejects.toBe(failure);
        await expect(adapter.open()).rejects.toBe(failure);
        await adapter.close();
    });
});
