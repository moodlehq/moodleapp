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

import { Injectable } from '@angular/core';

import { CoreApp } from '@services/app';
import { SQLiteDB } from '@classes/sqlitedb';
import { makeSingleton } from '@singletons';
import { CONFIG_TABLE_NAME, APP_SCHEMA, ConfigDBEntry } from '@services/db/config';

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable({ providedIn: 'root' })
export class CoreConfigProvider {

    protected appDB: SQLiteDB;
    protected dbReady: Promise<void>; // Promise resolved when the app DB is initialized.

    constructor() {
        this.appDB = CoreApp.instance.getDB();
        this.dbReady = CoreApp.instance.createTablesFromSchema(APP_SCHEMA).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Deletes an app setting.
     *
     * @param name The config name.
     * @return Promise resolved when done.
     */
    async delete(name: string): Promise<void> {
        await this.dbReady;

        await this.appDB.deleteRecords(CONFIG_TABLE_NAME, { name });
    }

    /**
     * Get an app setting.
     *
     * @param name The config name.
     * @param defaultValue Default value to use if the entry is not found.
     * @return Resolves upon success along with the config data. Reject on failure.
     */
    async get<T>(name: string, defaultValue?: T): Promise<T> {
        await this.dbReady;

        try {
            const entry = await this.appDB.getRecord<ConfigDBEntry>(CONFIG_TABLE_NAME, { name });

            return entry.value;
        } catch (error) {
            if (typeof defaultValue != 'undefined') {
                return defaultValue;
            }

            throw error;
        }
    }

    /**
     * Set an app setting.
     *
     * @param name The config name.
     * @param value The config value. Can only store number or strings.
     * @return Promise resolved when done.
     */
    async set(name: string, value: number | string): Promise<void> {
        await this.dbReady;

        await this.appDB.insertRecord(CONFIG_TABLE_NAME, { name, value });
    }

}

export class CoreConfig extends makeSingleton(CoreConfigProvider) {}
