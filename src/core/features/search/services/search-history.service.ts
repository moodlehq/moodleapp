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
import {
    CoreSearchHistoryDBPrimaryKeys,
    CoreSearchHistoryDBRecord,
    SEARCH_HISTORY_TABLE_NAME,
    SEARCH_HISTORY_TABLE_PRIMARY_KEYS,
} from './search-history-db';
import { makeSingleton } from '@singletons';
import { LazyMap, lazyMap } from '@/core/utils/lazy-map';
import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';

/**
 * Service that enables adding a history to a search box.
 */
@Injectable({ providedIn: 'root' })
export class CoreSearchHistoryProvider {

    protected static readonly HISTORY_LIMIT = 10;

    protected searchHistoryTables: LazyMap<
        AsyncInstance<CoreDatabaseTable<CoreSearchHistoryDBRecord, CoreSearchHistoryDBPrimaryKeys, never>>
    >;

    constructor() {
        this.searchHistoryTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<CoreSearchHistoryDBRecord, CoreSearchHistoryDBPrimaryKeys, never>(
                    SEARCH_HISTORY_TABLE_NAME,
                    {
                        siteId,
                        primaryKeyColumns: [...SEARCH_HISTORY_TABLE_PRIMARY_KEYS],
                        rowIdColumn: null,
                        config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                        onDestroy: () => delete this.searchHistoryTables[siteId],
                    },
                ),
            ),
        );
    }

    /**
     * Get a search area history sorted by use.
     *
     * @param searchArea Search Area Name.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of items when done.
     */
    async getSearchHistory(searchArea: string, siteId?: string): Promise<CoreSearchHistoryDBRecord[]> {
        siteId ??= CoreSites.getCurrentSiteId();

        const history = await this.searchHistoryTables[siteId].getMany({ searcharea: searchArea });

        // Sorting by last used DESC.
        return history.sort((a, b) => (b.lastused || 0) - (a.lastused || 0));
    }

    /**
     * Controls search limit and removes the last item if overflows.
     *
     * @param searchArea Search area to control
     * @param siteId Site id.
     * @returns Resolved when done.
     */
    protected async controlSearchLimit(searchArea: string, siteId: string): Promise<void> {
        const items = await this.getSearchHistory(searchArea);
        if (items.length > CoreSearchHistoryProvider.HISTORY_LIMIT) {
            // Over the limit. Remove the last.
            const lastItem = items.pop();
            if (!lastItem) {
                return;
            }

            await this.searchHistoryTables[siteId].delete({
                searcharea: lastItem.searcharea,
                searchedtext: lastItem.searchedtext,
            });
        }
    }

    /**
     * Updates the search history item if exists.
     *
     * @param searchArea Area where the search has been performed.
     * @param text Text of the performed text.
     * @param siteId Site id.
     * @returns True if exists, false otherwise.
     */
    protected async updateExistingItem(searchArea: string, text: string, siteId: string): Promise<boolean> {
        const searchItem = {
            searcharea: searchArea,
            searchedtext: text,
        };

        try {
            const existingItem = await this.searchHistoryTables[siteId].getOne(searchItem);

            // If item exist, update time and number of times searched.
            existingItem.lastused = Date.now();
            existingItem.times++;

            await this.searchHistoryTables[siteId].update(existingItem, searchItem);

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
     * @returns Resolved when done.
     */
    async insertOrUpdateSearchText(searchArea: string, text: string, siteId?: string): Promise<void> {
        siteId ??= CoreSites.getCurrentSiteId();

        const exists = await this.updateExistingItem(searchArea, text, siteId);

        if (!exists) {
            // If item is new, control the history does not goes over the limit.
            await this.searchHistoryTables[siteId].insert({
                searcharea: searchArea,
                searchedtext: text,
                lastused: Date.now(),
                times: 1,
            });

            await this.controlSearchLimit(searchArea, siteId);
        }
    }

}

export const CoreSearchHistory = makeSingleton(CoreSearchHistoryProvider);
