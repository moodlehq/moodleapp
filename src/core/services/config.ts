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
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { CoreApp } from '@services/app';
import { APP_SCHEMA, ConfigDBEntry, CONFIG_TABLE_NAME } from '@services/database/config';
import { makeSingleton } from '@singletons';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable({ providedIn: 'root' })
export class CoreConfigProvider {

    protected table: CorePromisedValue<CoreDatabaseTable<ConfigDBEntry, 'name'>> = new CorePromisedValue();

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        try {
            await CoreApp.createTablesFromSchema(APP_SCHEMA);
        } catch (e) {
            // Ignore errors.
        }

        const table = new CoreDatabaseTableProxy<ConfigDBEntry, 'name'>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            CoreApp.getDB(),
            CONFIG_TABLE_NAME,
            ['name'],
        );

        await table.initialize();

        this.table.resolve(table);
    }

    /**
     * Deletes an app setting.
     *
     * @param name The config name.
     * @return Promise resolved when done.
     */
    async delete(name: string): Promise<void> {
        const table = await this.table;

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
        try {
            const table = await this.table;
            const record = await table.findByPrimaryKey({ name });

            return record.value;
        } catch (error) {
            if (defaultValue !== undefined) {
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
        const table = await this.table;

        await table.insert({ name, value });
    }

}

export const CoreConfig = makeSingleton(CoreConfigProvider);
