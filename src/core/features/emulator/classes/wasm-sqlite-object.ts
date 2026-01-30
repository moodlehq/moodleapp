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
import { CorePromisedValue } from '@classes/promised-value';
import { CoreLogger } from '@static/logger';
import { Sqlite3Worker1Promiser, sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

/**
 * Throw an error indicating that the given method hasn't been implemented.
 *
 * @param method Method name.
 */
function notImplemented(method: string): any {
    throw new Error(`${method} method not implemented.`);
}

/**
 * SQLiteObject adapter implemented using the sqlite-wasm package.
 */
export class WasmSQLiteObject implements SQLiteObject {

    private name: string;
    private promisedPromiser: CorePromisedValue<Sqlite3Worker1Promiser>;
    private promiser: Sqlite3Worker1Promiser;
    protected logger: CoreLogger;

    constructor(name: string) {
        this.name = name;
        this.promisedPromiser = new CorePromisedValue();
        this.logger = CoreLogger.getInstance('WasmSQLiteObject');

        this.promiser = async (...args) => {
            const promiser = await this.promisedPromiser;

            return promiser.call(promiser, ...args);
        };
    }

    /**
     * Delete the database.
     */
    async delete(): Promise<void> {
        if (!this.promisedPromiser.isResolved()) {
            await this.open();
        }

        await this.promiser('close', { unlink: true });
    }

    /**
     * @inheritdoc
     */
    async open(): Promise<void> {
        const promiser = await new Promise<Sqlite3Worker1Promiser>((resolve) => {
            const _promiser = sqlite3Worker1Promiser(() => resolve(_promiser));
        });

        const response = await promiser('config-get', {});
        const isEnabled = (response as any).result.opfsEnabled;
        if (!isEnabled) {
            this.logger.error('opfsEnabled flag is disabled. Reloading the page.');

            // @TODO Fix Workaround for the issue with the opfsEnabled flag.
            // The flag gets disabled when opening a database, so we need to reload the page to make it work.
            window.location.reload();
        }

        try {
            await promiser('open', { filename: `file:${this.name}.sqlite3`, vfs: 'opfs' });
        } catch (error) {
            this.logger.error(`Error opening database: ${this.name}. Details: ${error.result.message}`);

            throw error;
        }
        this.promisedPromiser.resolve(promiser);
    }

    /**
     * @inheritdoc
     */
    async close(): Promise<void> {
        await this.promiser('close', {});
    }

    /**
     * @inheritdoc
     */
    async executeSql(statement: string, params?: any[] | undefined): Promise<any> {
        let insertId: number | undefined = undefined;
        const rows = [] as unknown[];

        await this.promiser('exec', {
            sql: statement,
            bind: params,
            callback({ row, columnNames, rowId }) {
                if (!row) {
                    return;
                }

                insertId ||= rowId;

                rows.push(columnNames.reduce((record, column, index) => {
                    record[column] = row[index];

                    return record;
                }, {}));
            },
        });

        return {
            rows: {
                item: (i: number) => rows[i],
                length: rows.length,
            },
            rowsAffected: rows.length,
            insertId,
        };
    }

    /**
     * @inheritdoc
     */
    async sqlBatch(sqlStatements: any[]): Promise<any> {
        await Promise.all(sqlStatements.map(sql => this.executeSql(sql)));
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
