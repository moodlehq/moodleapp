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

import { SQLiteDB } from '@classes/sqlitedb';
import { DbTransaction, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { CoreDB } from '@services/db';

/**
 * Class to mock the interaction with the SQLite database.
 */
export class SQLiteDBMock extends SQLiteDB {

    /**
     * Create and open the database.
     *
     * @param name Database name.
     */
    constructor(public name: string) {
        super(name);
    }

    /**
     * Close the database.
     *
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    close(): Promise<any> {
        // WebSQL databases aren't closed.
        return Promise.resolve();
    }

    /**
     * Drop all the data in the database.
     *
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async emptyDatabase(): Promise<any> {
        await this.ready();

        return new Promise((resolve, reject): void => {
            this.db?.transaction((tx) => {
                // Query all tables from sqlite_master that we have created and can modify.
                const args = [];
                const query = `SELECT * FROM sqlite_master
                            WHERE name NOT LIKE 'sqlite\\_%' escape '\\' AND name NOT LIKE '\\_%' escape '\\'`;

                tx.executeSql(query, args, (tx, result) => {
                    if (result.rows.length <= 0) {
                        // No tables to delete, stop.
                        resolve(null);

                        return;
                    }

                    // Drop all the tables.
                    const promises: Promise<void>[] = [];

                    for (let i = 0; i < result.rows.length; i++) {
                        promises.push(new Promise((resolve, reject): void => {
                            // Drop the table.
                            const name = JSON.stringify(result.rows.item(i).name);
                            tx.executeSql('DROP TABLE ' + name, [], resolve, reject);
                        }));
                    }

                    Promise.all(promises).then(resolve).catch(reject);
                }, reject);
            });
        });
    }

    /**
     * Execute a SQL query.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param sql SQL query to execute.
     * @param params Query parameters.
     * @returns Promise resolved with the result.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async execute(sql: string, params?: any[]): Promise<any> {
        await this.ready();

        return new Promise((resolve, reject): void => {
            // With WebSQL, all queries must be run in a transaction.
            this.db?.transaction((tx) => {
                tx.executeSql(
                    sql,
                    params,
                    (_, results) => resolve(results),
                    (_, error) => reject(new Error(`SQL failed: ${sql}, reason: ${error?.message}`)),
                );
            });
        });
    }

    /**
     * Execute a set of SQL queries. This operation is atomic.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param sqlStatements SQL statements to execute.
     * @returns Promise resolved with the result.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeBatch(sqlStatements: any[]): Promise<any> {
        await this.ready();

        return new Promise((resolve, reject): void => {
            // Create a transaction to execute the queries.
            this.db?.transaction((tx) => {
                const promises: Promise<void>[] = [];

                // Execute all the queries. Each statement can be a string or an array.
                sqlStatements.forEach((statement) => {
                    promises.push(new Promise((resolve, reject): void => {
                        let query;
                        let params;

                        if (Array.isArray(statement)) {
                            query = statement[0];
                            params = statement[1];
                        } else {
                            query = statement;
                            params = null;
                        }

                        tx.executeSql(query, params, (_, results) => resolve(results), (_, error) => reject(error));
                    }));
                });

                // eslint-disable-next-line promise/catch-or-return
                Promise.all(promises).then(resolve, reject);
            });
        });
    }

    /**
     * Open the database. Only needed if it was closed before, a database is automatically opened when created.
     *
     * @returns Promise resolved when done.
     */
    open(): Promise<void> {
        // WebSQL databases can't closed, so the open method isn't needed.
        return Promise.resolve();
    }

    /**
     * @inheritdoc
     */
    protected async createDatabase(): Promise<SQLiteObject> {
        // This DB is for desktop apps, so use a big size to be sure it isn't filled.
        return (window as unknown as WebSQLWindow).openDatabase(this.name, '1.0', this.name, 500 * 1024 * 1024);
    }

    /**
     * @inheritdoc
     */
    protected getDatabaseSpies(db: SQLiteObject): Partial<SQLiteObject> {
        const dbName = this.name;

        return {
            transaction: (callback) => db.transaction((transaction) => {
                const transactionSpy: DbTransaction = {
                    executeSql(sql, params, success, error) {
                        const start = performance.now();

                        return transaction.executeSql(
                            sql,
                            params,
                            (...args) => {
                                CoreDB.logQuery({
                                    sql,
                                    params,
                                    duration: performance.now() - start,
                                    dbName,
                                });

                                return success?.(...args);
                            },
                            (...args) => {
                                CoreDB.logQuery({
                                    sql,
                                    params,
                                    error: args[0],
                                    duration: performance.now() - start,
                                    dbName,
                                });

                                return error?.(...args);
                            },
                        );
                    },
                };

                return callback(transactionSpy);
            }),
        };
    }

}

interface WebSQLWindow extends Window {
    openDatabase(name: string, version: string, displayName: string, estimatedSize: number): SQLiteObject;
}
