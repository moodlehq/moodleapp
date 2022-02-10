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
import { CoreConstants } from '../constants';
import { CoreDatabaseTable } from '@classes/database-table';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreUtils } from './utils/utils';
import { CONFIG_TABLE_NAME, APP_SCHEMA, ConfigDBEntry } from '@services/database/config';
import { EnvironmentConfig } from '@/types/config';

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

    protected dbTable: CorePromisedValue<CoreConfigTable>;

    protected defaultEnvironment?: EnvironmentConfig;
    protected isReady = new CorePromisedValue<void>();

    /**
     * Wait until configuration is ready for use.
     */
    ready(): Promise<void> {
        return this.isReady;
    }

    /**
     * Initialize.
     */
    async initialize(): Promise<void> {
        this.loadDevelopmentConfig();

        this.isReady.resolve();
    }

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

    /**
     * Load development config overrides.
     */
    protected loadDevelopmentConfig(): void {
        if (!CoreConstants.enableDevTools() || !CoreUtils.hasCookie('MoodleAppConfig')) {
            return;
        }

        this.patchEnvironment(JSON.parse(CoreUtils.getCookie('MoodleAppConfig') ?? '{}'));
    }

    /**
     * Update config with the given values.
     *
     * @param config Config updates.
     */
    patchEnvironment(config: Partial<EnvironmentConfig>): void {
        this.defaultEnvironment = this.defaultEnvironment ?? CoreConstants.CONFIG;

        Object.assign(CoreConstants.CONFIG, config);
    }

    /**
     * Reset config values to its original state.
     */
    resetEnvironment(): void {
        Object.keys(CoreConstants.CONFIG).forEach(key => delete CoreConstants.CONFIG[key]);
        Object.assign(CoreConstants.CONFIG, this.defaultEnvironment);
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
