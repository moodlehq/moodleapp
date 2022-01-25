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
import { makeSingleton } from '@singletons';
import { CONFIG_TABLE_NAME, APP_SCHEMA, ConfigDBEntry } from '@services/database/config';
import { CoreDatabaseTable } from '@classes/database-table';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable({ providedIn: 'root' })
export class CoreConfigProvider {

    protected dbTable: CorePromisedValue<CoreConfigTable>;

    constructor() {
        this.dbTable = new CorePromisedValue();
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        const db = CoreApp.getDB();
        const table = await CoreConfigTable.create(db);

        this.dbTable.resolve(table);
    }

    /**
     * Deletes an app setting.
     *
     * @param name The config name.
     * @return Promise resolved when done.
     */
    async delete(name: string): Promise<void> {
        const table = await this.dbTable;

        await table.deleteByPrimaryKey({ name });
    }

    /**
     * Get an app setting.
     *
     * @param name The config name.
     * @param defaultValue Default value to use if the entry is not found.
     * @return Resolves upon success along with the config data. Reject on failure.
     */
    async get<T>(name: string, defaultValue?: T): Promise<T> {
        const table = await this.dbTable;
        const record = table.findByPrimaryKey({ name });

        if (record !== null) {
            return record.value;
        }

        if (defaultValue !== undefined) {
            return defaultValue;
        }

        throw new Error(`Couldn't get config with name '${name}'`);
    }

    /**
     * Set an app setting.
     *
     * @param name The config name.
     * @param value The config value. Can only store number or strings.
     * @return Promise resolved when done.
     */
    async set(name: string, value: number | string): Promise<void> {
        const table = await this.dbTable;

        await table.insert({ name, value });
    }

}

export const CoreConfig = makeSingleton(CoreConfigProvider);

/**
 * Config database table.
 */
class CoreConfigTable extends CoreDatabaseTable<ConfigDBEntry, 'name'> {

    protected table = CONFIG_TABLE_NAME;
    protected primaryKeys = ['name'];

}
