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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Search history item definition.
 */
export interface CoreSearchHistoryItem {
    searcharea: string; // Search area where the search has been performed.
    lastused?: number; // Timestamp of the last search.
    searchedtext: string; // Text of the performed search.
    times?: number; // Times search has been performed (if previously in history).
}

/**
 * Service that enables adding a history to a search box.
 */
@Injectable()
export class CoreSearchHistoryProvider {

    protected static HISTORY_TABLE = 'seach_history';
    protected static HISTORY_LIMIT = 10;

    protected siteSchema: CoreSiteSchema = {
        name: 'CoreSearchHistoryProvider',
        version: 1,
        tables: [
            {
                name: CoreSearchHistoryProvider.HISTORY_TABLE,
                columns: [
                    {
                        name: 'searcharea',
                        type: 'TEXT',
                        notNull: true,
                    },
                    {
                        name: 'lastused',
                        type: 'INTEGER',
                        notNull: true,
                    },
                    {
                        name: 'times',
                        type: 'INTEGER',
                        notNull: true,
                    },
                    {
                        name: 'searchedtext',
                        type: 'TEXT',
                        notNull: true,
                    },
                ],
                primaryKeys: ['searcharea', 'searchedtext'],
            },
        ],
    };

    constructor(protected sitesProvider: CoreSitesProvider) {

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get a search area history sorted by use.
     *
     * @param searchArea Search Area Name.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of items when done.
     */
    async getSearchHistory(searchArea: string, siteId?: string): Promise<CoreSearchHistoryItem[]> {
        const site = await this.sitesProvider.getSite(siteId);
        const conditions: any = {
            searcharea: searchArea,
        };

        const history = await site.getDb().getRecords(CoreSearchHistoryProvider.HISTORY_TABLE, conditions);

        // Sorting by last used DESC.
        return history.sort((a, b) => {
            return b.lastused - a.lastused;
        });
    }

    /**
     * Controls search limit and removes the last item if overflows.
     *
     * @param  searchArea Search area to control
     * @param  db SQLite DB where to perform the search.
     * @return Resolved when done.
     */
    protected async controlSearchLimit(searchArea: string, db: SQLiteDB): Promise<void> {
        const items = await this.getSearchHistory(searchArea);
        if (items.length > CoreSearchHistoryProvider.HISTORY_LIMIT) {
            // Over the limit. Remove the last.
            const lastItem = items.pop();

            const searchItem: CoreSearchHistoryItem = {
                searcharea: lastItem.searcharea,
                searchedtext: lastItem.searchedtext,
            };

            await db.deleteRecords(CoreSearchHistoryProvider.HISTORY_TABLE, searchItem);
        }
    }

    /**
     * Updates the search history item if exists.
     *
     * @param  searchArea Area where the search has been performed.
     * @param  text Text of the performed text.
     * @param  db SQLite DB where to perform the search.
     * @return True if exists, false otherwise.
     */
    protected async updateExistingItem(searchArea: string, text: string, db: SQLiteDB): Promise<boolean> {
        const searchItem: CoreSearchHistoryItem = {
            searcharea: searchArea,
            searchedtext: text,
        };

        try {
            const existingItem = await db.getRecord(CoreSearchHistoryProvider.HISTORY_TABLE, searchItem);

            // If item exist, update time and number of times searched.
            existingItem.lastused = Date.now();
            existingItem.times++;

            await db.updateRecords(CoreSearchHistoryProvider.HISTORY_TABLE, existingItem, searchItem);

            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Inserts a searched term on the history.
     *
     * @param  searchArea Area where the search has been performed.
     * @param  text Text of the performed text.
     * @param  siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    async insertOrUpdateSearchText(searchArea: string, text: string, siteId?: string): Promise<void> {
        const site = await this.sitesProvider.getSite(siteId);
        const db = site.getDb();

        const exists = await this.updateExistingItem(searchArea, text, db);

        if (!exists) {
            // If item is new, control the history does not goes over the limit.
            const searchItem: CoreSearchHistoryItem = {
                searcharea: searchArea,
                searchedtext: text,
                lastused: Date.now(),
                times: 1,
            };

            await site.getDb().insertRecord(CoreSearchHistoryProvider.HISTORY_TABLE, searchItem);

            await this.controlSearchLimit(searchArea, db);
        }
    }
}
