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

import {
    CoreSearchGlobalSearchResult,
    CoreSearchGlobalSearch,
    CORE_SEARCH_GLOBAL_SEARCH_PAGE_LENGTH,
    CoreSearchGlobalSearchFilters,
} from '@features/search/services/global-search';
import { CorePaginatedItemsManagerSource } from '@classes/items-management/paginated-items-manager-source';

/**
 * Provides a collection of global search results.
 */
export class CoreSearchGlobalSearchResultsSource extends CorePaginatedItemsManagerSource<CoreSearchGlobalSearchResult> {

    private query: string;
    private filters: CoreSearchGlobalSearchFilters;

    constructor(query: string, filters: CoreSearchGlobalSearchFilters) {
        super();

        this.query = query;
        this.filters = filters;
    }

    /**
     * Check whether the source has an empty query.
     *
     * @returns Whether the source has an empty query.
     */
    hasEmptyQuery(): boolean {
        return !this.query || this.query.trim().length === 0;
    }

    /**
     * Get search query.
     *
     * @returns Search query.
     */
    getQuery(): string {
        return this.query;
    }

    /**
     * Get search filters.
     *
     * @returns Search filters.
     */
    getFilters(): CoreSearchGlobalSearchFilters {
        return this.filters;
    }

    /**
     * Set search query.
     *
     * @param query Search query.
     */
    setQuery(query: string): void {
        this.query = query;

        this.setDirty(true);
    }

    /**
     * Set search filters.
     *
     * @param filters Search filters.
     */
    setFilters(filters: CoreSearchGlobalSearchFilters): void {
        this.filters = filters;

        this.setDirty(true);
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: CoreSearchGlobalSearchResult[]; hasMoreItems: boolean }> {
        const pageResults = await CoreSearchGlobalSearch.getResults(this.query, this.filters, page);

        return { items: pageResults.results, hasMoreItems: pageResults.canLoadMore };
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return CORE_SEARCH_GLOBAL_SEARCH_PAGE_LENGTH;
    }

}
