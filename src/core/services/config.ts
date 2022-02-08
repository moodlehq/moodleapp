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

import { EnvironmentConfig } from '@/types/config';
import { Injectable } from '@angular/core';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { CoreApp } from '@services/app';
import { APP_SCHEMA, ConfigDBEntry, CONFIG_TABLE_NAME } from '@services/database/config';
import { makeSingleton } from '@singletons';
import { CoreConstants } from '../constants';
import { CoreEvents } from '@singletons/events';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { asyncInstance } from '../utils/async-instance';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreConfigProvider.ENVIRONMENT_UPDATED]: EnvironmentConfig;
    }

}

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable({ providedIn: 'root' })
export class CoreConfigProvider {

    static readonly ENVIRONMENT_UPDATED = 'environment_updated';

    protected table = asyncInstance<CoreDatabaseTable<ConfigDBEntry, 'name'>>();
    protected defaultEnvironment?: EnvironmentConfig;

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

        this.table.setInstance(table);
    }

    /**
     * Deletes an app setting.
     *
     * @param name The config name.
     * @return Promise resolved when done.
     */
    async delete(name: string): Promise<void> {
        await this.table.deleteByPrimaryKey({ name });
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
            const record = await this.table.getOneByPrimaryKey({ name });

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
        await this.table.insert({ name, value });
    }

    /**
     * Update config with the given values.
     *
     * @param config Config updates.
     */
    patchEnvironment(config: Partial<EnvironmentConfig>): void {
        this.defaultEnvironment = this.defaultEnvironment ?? CoreConstants.CONFIG;

        Object.assign(CoreConstants.CONFIG, config);
        CoreEvents.trigger(CoreConfigProvider.ENVIRONMENT_UPDATED, CoreConstants.CONFIG);
    }

    /**
     * Reset config values to its original state.
     */
    resetEnvironment(): void {
        if (!this.defaultEnvironment) {
            // The environment config hasn't been modified; there's not need to reset.

            return;
        }

        Object.keys(CoreConstants.CONFIG).forEach(key => delete CoreConstants.CONFIG[key]);
        Object.assign(CoreConstants.CONFIG, this.defaultEnvironment);
        CoreEvents.trigger(CoreConfigProvider.ENVIRONMENT_UPDATED, CoreConstants.CONFIG);
    }

}

export const CoreConfig = makeSingleton(CoreConfigProvider);
