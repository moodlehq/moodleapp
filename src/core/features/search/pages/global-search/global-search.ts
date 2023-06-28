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

import { Component, OnInit } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreSearchGlobalSearchResultsSource } from '@features/search/classes/global-search-results-source';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreSearchGlobalSearchResult, CoreSearchGlobalSearch } from '@features/search/services/global-search';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreUrlUtils } from '@services/utils/url';

@Component({
    selector: 'page-core-search-global-search',
    templateUrl: 'global-search.html',
})
export class CoreSearchGlobalSearchPage implements OnInit {

    loadMoreError: string | null = null;
    searchBanner: string | null = null;
    resultsSource = new CoreSearchGlobalSearchResultsSource('', {});

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const site = CoreSites.getRequiredCurrentSite();
        const searchBanner = site.config?.searchbanner?.trim() ?? '';

        if (CoreUtils.isTrueOrOne(site.config?.searchbannerenable) && searchBanner.length > 0) {
            this.searchBanner = searchBanner;
        }
    }

    /**
     * Perform a new search.
     *
     * @param query Search query.
     */
    async search(query: string): Promise<void> {
        this.resultsSource.setQuery(query);

        if (this.resultsSource.hasEmptyQuery()) {
            return;
        }

        await CoreDomUtils.showOperationModals('core.searching', true, async () => {
            await this.resultsSource.reload();
            await CoreUtils.ignoreErrors(
                CoreSearchGlobalSearch.logViewResults(this.resultsSource.getQuery(), this.resultsSource.getFilters()),
            );

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_search_view_results',
                name: Translate.instant('core.search.globalsearch'),
                data: {
                    query,
                    filters: JSON.stringify(this.resultsSource.getFilters()),
                },
                url: CoreUrlUtils.addParamsToUrl('/search/index.php', {
                    q: query,
                }),
            });
        });
    }

    /**
     * Clear search results.
     */
    clearSearch(): void {
        this.loadMoreError = null;

        this.resultsSource.setQuery('');
        this.resultsSource.reset();
    }

    /**
     * Visit a result's origin.
     *
     * @param result Result to visit.
     */
    async visitResult(result: CoreSearchGlobalSearchResult): Promise<void> {
        await CoreContentLinksHelper.handleLink(result.url);
    }

    /**
     * Load more results.
     *
     * @param complete Notify completion.
     */
    async loadMoreResults(complete: () => void ): Promise<void> {
        try {
            await this.resultsSource?.load();
        } catch (error) {
            this.loadMoreError = CoreDomUtils.getErrorMessage(error);
        } finally {
            complete();
        }
    }

}
