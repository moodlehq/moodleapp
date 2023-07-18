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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreSearchGlobalSearchResultsSource } from '@features/search/classes/global-search-results-source';
import {
    CoreSearchGlobalSearch,
    CoreSearchGlobalSearchFilters,
    CoreSearchGlobalSearchResult,
} from '@features/search/services/global-search';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';

@Component({
    selector: 'page-addon-mod-forum-search',
    templateUrl: 'search.html',
    styleUrls: ['search.scss'],
})
export class AddonModForumSearchPage implements OnInit {

    loadMoreError: string | null = null;
    searchBanner: string | null = null;
    resultsSource = new CoreSearchGlobalSearchResultsSource('', {});
    searchAreaId?: string;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            const site = CoreSites.getRequiredCurrentSite();
            const searchBanner = site.config?.searchbanner?.trim() ?? '';
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const filters: CoreSearchGlobalSearchFilters = {
                courseIds: [courseId],
            };

            if (CoreUtils.isTrueOrOne(site.config?.searchbannerenable) && searchBanner.length > 0) {
                this.searchBanner = searchBanner;
            }

            filters.searchAreaIds = ['mod_forum-activity', 'mod_forum-post'];
            this.searchAreaId = `AddonModForumSearch-${courseId}`;

            this.resultsSource.setFilters(filters);
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            CoreNavigator.back();

            return;
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
        });
    }

    /**
     * Clear search results.
     */
    clearSearch(): void {
        this.loadMoreError = null;
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
