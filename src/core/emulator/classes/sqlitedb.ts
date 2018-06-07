// (C) Copyright 2015 Martin Dougiamas
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

/* tslint:disable:no-console */

import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Class to mock the interaction with the SQLite database.
 */
export class SQLiteDBMock extends SQLiteDB {
    promise: Promise<void>;

    /**
     * Create and open the database.
     *
     * @param {string} name Database name.
     */
    constructor(public name: string) {
        super(name, null, null);
    }

    /**
     * Close the database.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    close(): Promise<any> {
        // WebSQL databases aren't closed.
        return Promise.resolve();
    }

    /**
     * Drop all the data in the database.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    emptyDatabase(): Promise<any> {
        return new Promise((resolve, reject): void => {
            this.db.transaction((tx) => {
                // Query all tables from sqlite_master that we have created and can modify.
                const args = [],
                    query = `SELECT * FROM sqlite_master
                            WHERE name NOT LIKE 'sqlite\\_%' escape '\\' AND name NOT LIKE '\\_%' escape '\\'`;

                tx.executeSql(query, args, (tx, result) => {
                    if (result.rows.length <= 0) {
                        // No tables to delete, stop.
                        resolve();

                        return;
                    }

                    // Drop all the tables.
                    const promises = [];

                    for (let i = 0; i < result.rows.length; i++) {
                        promises.push(new Promise((resolve, reject): void => {
                            // Drop the table.
                            const name = JSON.stringify(result.rows.item(i).name);
                            tx.executeSql('DROP TABLE ' + name, [], resolve, reject);
                        }));
                    }

                    Promise.all(promises).then(resolve, reject);
                }, reject);
            });
        });
    }

    /**
     * Execute a SQL query.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param {string} sql SQL query to execute.
     * @param {any[]} params Query parameters.
     * @return {Promise<any>} Promise resolved with the result.
     */
    execute(sql: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject): void => {
            // With WebSQL, all queries must be run in a transaction.
            this.db.transaction((tx) => {
                tx.executeSql(sql, params, (tx, results) => {
                    resolve(results);
                }, (tx, error) => {
                    console.error(sql, params, error);
                    reject(error);
                });
            });
        });
    }

    /**
     * Execute a set of SQL queries. This operation is atomic.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param {any[]} sqlStatements SQL statements to execute.
     * @return {Promise<any>} Promise resolved with the result.
     */
    executeBatch(sqlStatements: any[]): Promise<any> {
        return new Promise((resolve, reject): void => {
            // Create a transaction to execute the queries.
            this.db.transaction((tx) => {
                const promises = [];

                // Execute all the queries. Each statement can be a string or an array.
                sqlStatements.forEach((statement) => {
                    promises.push(new Promise((resolve, reject): void => {
                        let query,
                            params;

                        if (Array.isArray(statement)) {
                            query = statement[0];
                            params = statement[1];
                        } else {
                            query = statement;
                            params = null;
                        }

                        tx.executeSql(query, params, (tx, results) => {
                            resolve(results);
                        }, (tx, error) => {
                            console.error(query, params, error);
                            reject(error);
                        });
                    }));
                });

                Promise.all(promises).then(resolve, reject);
            });
        });
    }

    /**
     * Initialize the database.
     */
    init(): void {
        // This DB is for desktop apps, so use a big size to be sure it isn't filled.
        this.db = (<any> window).openDatabase(this.name, '1.0', this.name, 500 * 1024 * 1024);
        this.promise = Promise.resolve();
    }

    /**
     * Open the database. Only needed if it was closed before, a database is automatically opened when created.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    open(): Promise<any> {
        // WebSQL databases can't closed, so the open method isn't needed.
        return Promise.resolve();
    }

}
