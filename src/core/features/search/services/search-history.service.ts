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

import { CoreSites } from '@services/sites';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreSearchHistoryDBRecord, SEARCH_HISTORY_TABLE_NAME } from './search-history-db';
import { makeSingleton } from '@singletons';

/**
 * Service that enables adding a history to a search box.
 */
@Injectable({ providedIn: 'root' })
export class CoreSearchHistoryProvider {

    protected static readonly HISTORY_LIMIT = 10;

    /**
     * Get a search area history sorted by use.
     *
     * @param searchArea Search Area Name.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of items when done.
     */
    async getSearchHistory(searchArea: string, siteId?: string): Promise<CoreSearchHistoryDBRecord[]> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            searcharea: searchArea,
        };

        const history: CoreSearchHistoryDBRecord[] = await site.getDb().getRecords(SEARCH_HISTORY_TABLE_NAME, conditions);

        // Sorting by last used DESC.
        return history.sort((a, b) => (b.lastused || 0) - (a.lastused || 0));
    }

    /**
     * Controls search limit and removes the last item if overflows.
     *
     * @param searchArea Search area to control
     * @param db SQLite DB where to perform the search.
     * @return Resolved when done.
     */
    protected async controlSearchLimit(searchArea: string, db: SQLiteDB): Promise<void> {
        const items = await this.getSearchHistory(searchArea);
        if (items.length > CoreSearchHistoryProvider.HISTORY_LIMIT) {
            // Over the limit. Remove the last.
            const lastItem = items.pop();

            const searchItem = {
                searcharea: lastItem!.searcharea,
                searchedtext: lastItem!.searchedtext,
            };

            await db.deleteRecords(SEARCH_HISTORY_TABLE_NAME, searchItem);
        }
    }

    /**
     * Updates the search history item if exists.
     *
     * @param searchArea Area where the search has been performed.
     * @param text Text of the performed text.
     * @param db SQLite DB where to perform the search.
     * @return True if exists, false otherwise.
     */
    protected async updateExistingItem(searchArea: string, text: string, db: SQLiteDB): Promise<boolean> {
        const searchItem = {
            searcharea: searchArea,
            searchedtext: text,
        };

        try {
            const existingItem: CoreSearchHistoryDBRecord = await db.getRecord(SEARCH_HISTORY_TABLE_NAME, searchItem);

            // If item exist, update time and number of times searched.
            existingItem.lastused = Date.now();
            existingItem.times++;

            await db.updateRecords(SEARCH_HISTORY_TABLE_NAME, existingItem, searchItem);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Inserts a searched term on the history.
     *
     * @param searchArea Area where the search has been performed.
     * @param text Text of the performed text.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    async insertOrUpdateSearchText(searchArea: string, text: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const db = site.getDb();

        const exists = await this.updateExistingItem(searchArea, text, db);

        if (!exists) {
            // If item is new, control the history does not goes over the limit.
            const searchItem: CoreSearchHistoryDBRecord = {
                searcharea: searchArea,
                searchedtext: text,
                lastused: Date.now(),
                times: 1,
            };

            await db.insertRecord(SEARCH_HISTORY_TABLE_NAME, searchItem);

            await this.controlSearchLimit(searchArea, db);
        }
    }

}

export const CoreSearchHistory = makeSingleton(CoreSearchHistoryProvider);
