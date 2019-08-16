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

import { Injectable } from '@angular/core';
import { CoreAppProvider } from './app';
import { SQLiteDB, SQLiteDBTableSchema } from '@classes/sqlitedb';

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable()
export class CoreConfigProvider {
    protected appDB: SQLiteDB;
    protected TABLE_NAME = 'core_config';
    protected tableSchema: SQLiteDBTableSchema = {
        name: this.TABLE_NAME,
        columns: [
            {
                name: 'name',
                type: 'TEXT',
                unique: true,
                notNull: true
            },
            {
                name: 'value'
            }
        ]
    };

    constructor(appProvider: CoreAppProvider) {
        this.appDB = appProvider.getDB();
        this.appDB.createTableFromSchema(this.tableSchema);
    }

    /**
     * Deletes an app setting.
     *
     * @param {string} name The config name.
     * @return {Promise<any>} Promise resolved when done.
     */
    delete(name: string): Promise<any> {
        return this.appDB.deleteRecords(this.TABLE_NAME, { name: name });
    }

    /**
     * Get an app setting.
     *
     * @param {string} name The config name.
     * @param {any} [defaultValue] Default value to use if the entry is not found.
     * @return {Promise<any>} Resolves upon success along with the config data. Reject on failure.
     */
    get(name: string, defaultValue?: any): Promise<any> {
        return this.appDB.getRecord(this.TABLE_NAME, { name: name }).then((entry) => {
            return entry.value;
        }).catch((error) => {
            if (typeof defaultValue != 'undefined') {
                return defaultValue;
            }

            return Promise.reject(error);
        });
    }

    /**
     * Set an app setting.
     *
     * @param {string} name The config name.
     * @param {number|string} value The config value. Can only store number or strings.
     * @return {Promise<any>} Promise resolved when done.
     */
    set(name: string, value: number | string): Promise<any> {
        return this.appDB.insertRecord(this.TABLE_NAME, { name: name, value: value });
    }
}
