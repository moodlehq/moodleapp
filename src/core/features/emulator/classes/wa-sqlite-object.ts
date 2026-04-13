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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { CoreQueueRunner } from '@classes/queue-runner';
import SQLiteAsyncESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

const IDB_NAME = 'moodleapp-idb';

let sqlite3Promise: Promise<SQLiteAPI> | null = null;

// wa-sqlite uses Asyncify to pause the WASM call stack while waiting for
// async VFS (IndexedDB) operations. Asyncify is NOT re-entrant: if a second
// SQLite operation enters the WASM while the first is suspended, it corrupts
// the call stack. We serialize all SQLite operations through a single queue to
// prevent concurrent calls, mirroring the serialization that the old
// @sqlite.org/sqlite-wasm Worker1 achieved via a Web Worker message queue.
const sqliteQueue = new CoreQueueRunner(1);

/**
 * Get or initialize the shared SQLiteAPI singleton.
 * The WASM module, API wrapper, and VFS are created once and reused across all database instances.
 *
 * @returns SQLiteAPI instance and the registered VFS.
 */
function getSqlite3(): Promise<SQLiteAPI> {
    if (!sqlite3Promise) {
        sqlite3Promise = (async () => {
            const module = await SQLiteAsyncESMFactory({
                locateFile: (file: string) => `/assets/lib/wa-sqlite/${file}`,
            });

            const sqlite3 = SQLite.Factory(module);
            const vfs = new IDBBatchAtomicVFS(IDB_NAME);
            sqlite3.vfs_register(vfs as unknown as SQLiteVFS, true);

            return sqlite3;
        })();
    }

    return sqlite3Promise;
}

/**
 * Throw an error indicating that the given method hasn't been implemented.
 *
 * @param method Method name.
 */
function notImplemented(method: string): any {
    throw new Error(`${method} method not implemented.`);
}

/**
 * SQLiteObject adapter implemented using wa-sqlite with IDBBatchAtomicVFS.
 */
export class WaSQLiteObject implements SQLiteObject {

    private name: string;
    private sqlite3?: SQLiteAPI;
    private db?: number;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Delete the database.
     */
    async delete(): Promise<void> {
        await sqliteQueue.run(async () => {
            const sqlite = await getSqlite3();

            if (this.db !== undefined) {
                // Close the database before deleting.
                await (this.sqlite3 ?? sqlite).close(this.db);
                this.db = undefined;
            }

            // The xDelete function in IDBBatchAtomicVFS causes problems with subsequent queries in other database instances.
            // Instead, delete the database entries directly from IndexedDB. Databases are stored as blocks.
            const path = new URL(this.name, 'file://localhost/').pathname;

            await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open(IDB_NAME);
                request.onsuccess = () => {
                    const idb = request.result;
                    const transaction = idb.transaction('blocks', 'readwrite');
                    const store = transaction.objectStore('blocks');
                    const keyRange = IDBKeyRange.bound([path], [path, []]);
                    const deleteRequest = store.delete(keyRange);

                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);

                    transaction.oncomplete = () => idb.close();
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    /**
     * @inheritdoc
     */
    async open(): Promise<void> {
        return sqliteQueue.run(() => this._open());
    }

    /**
     * Opens the database (un-serialized; always call via open()).
     */
    private async _open(): Promise<void> {
        this.sqlite3 = await getSqlite3();

        if (this.db !== undefined) {
            return;
        }

        this.db = await this.sqlite3.open_v2(this.name);
    }

    /**
     * @inheritdoc
     */
    async close(): Promise<void> {
        return sqliteQueue.run(async () => {
            if (!this.sqlite3 || this.db === undefined) {
                return;
            }

            await this.sqlite3.close(this.db);
            this.db = undefined;
        });
    }

    /**
     * @inheritdoc
     */
    async executeSql(statement: string, params?: any[] | undefined): Promise<any> {
        return sqliteQueue.run(async () => {
            const sqlite3 = this.sqlite3;
            const db = this.db;
            if (!sqlite3 || db === undefined) {
                throw new Error('Database is not open.');
            }

            let insertId: number | undefined = undefined;
            const rows = [] as unknown[];
            const isInsert = /^\s*INSERT\b/i.test(statement);

            if (isInsert && !/\bRETURNING\b/i.test(statement)) {
                statement = statement.trim();
                if (statement.endsWith(';')) {
                    statement = statement.slice(0, -1);
                }
                statement += ' RETURNING *';
            }

            for await (const stmt of sqlite3.statements(db, statement)) {
                if (params?.length) {
                    sqlite3.bind_collection(stmt, params);
                }

                const columnNames = sqlite3.column_names(stmt);

                while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
                    const row = sqlite3.row(stmt);

                    rows.push(columnNames.reduce((record, column, index) => {
                        record[column] = row[index];

                        return record;
                    }, {} as Record<string, unknown>));
                }
            }

            if (isInsert) {
                // wa-sqlite has no JS wrapper for sqlite3_last_insert_rowid().
                // Use the SQL function instead.
                await sqlite3.exec(db, 'SELECT last_insert_rowid()', (row) => {
                    insertId = Number(row[0]);
                });
            }

            return {
                rows: {
                    item: (i: number) => rows[i],
                    length: rows.length,
                },
                rowsAffected: rows.length,
                insertId,
            };
        });
    }

    /**
     * @inheritdoc
     */
    async sqlBatch(sqlStatements: any[]): Promise<any> {
        for (const sql of sqlStatements) {
            if (Array.isArray(sql)) {
                await this.executeSql(sql[0], sql[1]);
            } else {
                await this.executeSql(sql);
            }
        }
    }

    // These methods and properties are not used in our app,
    // but still need to be declared to conform with the SQLiteObject interface.
    _objectInstance = null; // eslint-disable-line @typescript-eslint/naming-convention
    databaseFeatures = { isSQLitePluginDatabase: false };
    openDBs = null;
    addTransaction = () => notImplemented('SQLiteObject.addTransaction');
    transaction = () => notImplemented('SQLiteObject.transaction');
    readTransaction = () => notImplemented('SQLiteObject.readTransaction');
    startNextTransaction = () => notImplemented('SQLiteObject.startNextTransaction');
    abortallPendingTransactions = () => notImplemented('SQLiteObject.abortallPendingTransactions');

}
