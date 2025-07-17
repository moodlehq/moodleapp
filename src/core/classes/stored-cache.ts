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

import { CoreSites, CoreSiteSchema } from '@services/sites';
import { CoreText } from '@singletons/text';
import { SQLiteDB } from './sqlitedb';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * A cache to store values in database.
 *
 * The data is organized by "entries" that are identified by an ID. Each entry can have multiple values stored,
 * and each value has its own timemodified.
 *
 * Values expire after a certain time.
 */
export class CoreStoredCache {

    constructor(protected tableName: string) {

    }

    /**
     * Clear the cache. Erasing all the entries.
     *
     * @param siteId ID of the site. If not defined, use current site.
     */
    async clear(siteId?: string): Promise<void> {
        const db = await this.getDb(siteId);

        await db.deleteRecords(this.tableName);
    }

    /**
     * Get all the data stored in the cache for a certain id.
     *
     * @param id The ID to identify the entry.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns The data from the cache. Undefined if not found.
     */
    async getEntry<T>(id: number, siteId?: string): Promise<T> {
        const db = await this.getDb(siteId);

        const record = await db.getRecord<CoreStoredCacheRecord>(this.tableName, { id });

        return CoreText.parseJSON(record.data);
    }

    /**
     * Invalidate all the cached data for a certain entry.
     *
     * @param id The ID to identify the entry.
     * @param siteId ID of the site. If not defined, use current site.
     */
    async invalidate(id: number, siteId?: string): Promise<void> {
        const db = await this.getDb(siteId);

        await db.updateRecords(this.tableName, { timemodified: 0 }, { id });
    }

    /**
     * Update the status of a module in the "cache".
     *
     * @param id The ID to identify the entry.
     * @param value Value to set.
     * @param siteId ID of the site. If not defined, use current site.
     * @returns The set value.
     */
    async setEntry<T>(
        id: number,
        value: T,
        siteId?: string,
    ): Promise<void> {
        const db = await this.getDb(siteId);

        let entry = await CorePromiseUtils.ignoreErrors(this.getEntry<T>(id, siteId), { id });

        entry = {
            ...entry,
            ...value,
        };

        const record: CoreStoredCacheRecord = {
            id,
            timemodified: Date.now(),
            data: JSON.stringify(entry),
        };

        await db.insertRecord(this.tableName, record);
    }

    /**
     * Delete an entry from the cache.
     *
     * @param id ID of the entry to delete.
     * @param siteId ID of the site. If not defined, use current site.
     */
    async deleteEntry(id: number, siteId?: string): Promise<void> {
        const db = await this.getDb(siteId);

        await db.deleteRecords(this.tableName, { id });
    }

    /**
     * Get the database to use.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @returns Database.
     */
    protected async getDb(siteId?: string): Promise<SQLiteDB> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb();
    }

}

/**
 * Helper function to get the schema to store cache in the database.
 *
 * @param schemaName Name of the schema.
 * @param tableName Name of the table.
 * @returns Schema.
 */
export function getStoredCacheDBSchema(schemaName: string, tableName: string): CoreSiteSchema {
    return {
        name: schemaName,
        version: 1,
        canBeCleared: [tableName],
        tables: [
            {
                name: tableName,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true,
                    },
                    {
                        name: 'data',
                        type: 'TEXT',
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                    },
                ],
            },
        ],
    };
}

/**
 * Stored cache entry.
 */
type CoreStoredCacheRecord = {
    id: number;
    data: string;
    timemodified: number;
};
