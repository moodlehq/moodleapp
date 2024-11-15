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

import { Inject, Injectable, Optional } from '@angular/core';

import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import { CoreAppDB } from './app-db';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { makeSingleton } from '@singletons';
import { SQLiteDB } from '@classes/sqlitedb';

import { APP_SCHEMA, CoreStorageRecord, TABLE_NAME } from './database/storage';
import { CoreSites } from './sites';
import { CoreSite } from '@classes/sites/site';
import { NULL_INJECTION_TOKEN } from '@/core/constants';

/**
 * Service to store data using key-value pairs.
 *
 * The data can be scoped to a single site using CoreStorage.forSite(site), and it will be automatically cleared
 * when the site is deleted.
 *
 * For tabular data, use CoreAppDB.getDB() or CoreSite.getDb().
 */
@Injectable({ providedIn: 'root' })
export class CoreStorageService {

    table: AsyncInstance<CoreStorageTable>;

    constructor(@Optional() @Inject(NULL_INJECTION_TOKEN) lazyTableConstructor?: () => Promise<CoreStorageTable>) {
        this.table = asyncInstance(lazyTableConstructor);
    }

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        await this.initializeTable(CoreAppDB.getDB());
    }

    /**
     * Initialize table.
     *
     * @param database Database.
     */
    async initializeTable(database: SQLiteDB): Promise<void> {
        const table = await getStorageTable(database);

        this.table.setInstance(table);
    }

    /**
     * Get value.
     *
     * @param key Data key.
     * @param defaultValue Value to return if the key wasn't found.
     * @returns Data value.
     */
    async get<T=unknown>(key: string): Promise<T | null>;
    async get<T>(key: string, defaultValue: T): Promise<T>;
    async get<T=unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
        try {
            const { value } = await this.table.getOneByPrimaryKey({ key });

            return JSON.parse(value);
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * Get value directly from the database, without using any optimizations..
     *
     * @param key Data key.
     * @param defaultValue Value to return if the key wasn't found.
     * @returns Data value.
     */
    async getFromDB<T=unknown>(key: string): Promise<T | null>;
    async getFromDB<T>(key: string, defaultValue: T): Promise<T>;
    async getFromDB<T=unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
        try {
            const db = CoreAppDB.getDB();
            const { value } = await db.getRecord<CoreStorageRecord>(TABLE_NAME, { key });

            return JSON.parse(value);
        } catch (error) {
            return defaultValue;
        }
    }

    /**
     * Set value.
     *
     * @param key Data key.
     * @param value Data value.
     */
    async set(key: string, value: unknown): Promise<void> {
        await this.table.insert({ key, value: JSON.stringify(value) });
    }

    /**
     * Check if value exists.
     *
     * @param key Data key.
     * @returns Whether key exists or not.
     */
    async has(key: string): Promise<boolean> {
        return this.table.hasAny({ key });
    }

    /**
     * Remove value.
     *
     * @param key Data key.
     */
    async remove(key: string): Promise<void> {
        await this.table.deleteByPrimaryKey({ key });
    }

    /**
     * Get the core_storage table of the current site.
     *
     * @returns CoreStorageService instance with the core_storage table.
     */
    forCurrentSite(): AsyncInstance<Omit<CoreStorageService, 'forSite' | 'forCurrentSite'>> {
        return asyncInstance(async () => {
            const siteId = await CoreSites.getStoredCurrentSiteId();
            const site = await CoreSites.getSite(siteId);

            if (!(siteId in SERVICE_INSTANCES)) {
                SERVICE_INSTANCES[siteId] = asyncInstance(async () => {
                    const instance = new CoreStorageService();
                    await instance.initializeTable(site.getDb());

                    return instance;
                });
            }

            return await SERVICE_INSTANCES[siteId].getInstance();
        });
    }

    /**
     * Get the core_storage table for the provided site.
     *
     * @param site Site from which we will obtain the storage.
     * @returns CoreStorageService instance with the core_storage table.
     */
    forSite(site: CoreSite): AsyncInstance<Omit<CoreStorageService, 'forSite' | 'forCurrentSite'>> {
        const siteId = site.getId();

        return asyncInstance(async () => {
            if (!(siteId in SERVICE_INSTANCES)) {
                const instance = new CoreStorageService();
                await instance.initializeTable(site.getDb());

                SERVICE_INSTANCES[siteId] = asyncInstance(() => instance);
            }

            return await SERVICE_INSTANCES[siteId].getInstance();
        });
    }

}

export const CoreStorage = makeSingleton(CoreStorageService);

const SERVICE_INSTANCES: Record<string, AsyncInstance<CoreStorageService>> = {};
const TABLE_INSTANCES: WeakMap<SQLiteDB, Promise<CoreStorageTable>> = new WeakMap();

/**
 * Helper function to get a storage table for the given database.
 *
 * @param database Database.
 * @returns Storage table.
 */
function getStorageTable(database: SQLiteDB): Promise<CoreStorageTable> {
    const existingTable = TABLE_INSTANCES.get(database);

    if (existingTable) {
        return existingTable;
    }

    const table = new Promise<CoreStorageTable>((resolve, reject) => {
        const tableProxy = new CoreDatabaseTableProxy<CoreStorageRecord, 'key'>(
            { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
            database,
            TABLE_NAME,
            ['key'],
        );

        tableProxy.initialize()
            .then(() => resolve(tableProxy))
            .catch(reject);
    });

    TABLE_INSTANCES.set(database, table);

    return table;
}

/**
 * Storage table.
 */
type CoreStorageTable = CoreDatabaseTable<CoreStorageRecord, 'key'>;
