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

import { AddonModForum, AddonModForumData } from '@addons/mod/forum/services/forum';
import { Component, OnInit } from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { CoreCourse } from '@features/course/services/course';
import { CoreSearchGlobalSearchResultsSource } from '@features/search/classes/global-search-results-source';
import {
    CoreSearchGlobalSearch,
    CoreSearchGlobalSearchFilters,
    CoreSearchGlobalSearchResult,
} from '@features/search/services/global-search';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@singletons/utils';
import { Translate } from '@singletons';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreSearchBoxComponent } from '@features/search/components/search-box/search-box';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSearchGlobalSearchResultComponent } from '@features/search/components/global-search-result/global-search-result';

@Component({
    selector: 'page-addon-mod-forum-search',
    templateUrl: 'search.html',
    imports: [
        CoreSharedModule,
        CoreSearchBoxComponent,
        CoreSearchGlobalSearchResultComponent,
    ],
})
export default class AddonModForumSearchPage implements OnInit {

    loadMoreError = false;
    searchBanner: string | null = null;
    resultsSource = new CoreSearchGlobalSearchResultsSource('', {});
    forum?: AddonModForumData;
    searchAreaId?: string;

    private ready = new CorePromisedValue<void>();

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            const site = CoreSites.getRequiredCurrentSite();
            const searchBanner = site.config?.searchbanner?.trim() ?? '';
            const courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const forumId = CoreNavigator.getRouteNumberParam('forumId');
            const filters: CoreSearchGlobalSearchFilters = {
                courseIds: [courseId],
            };

            if (CoreUtils.isTrueOrOne(site.config?.searchbannerenable) && searchBanner.length > 0) {
                this.searchBanner = searchBanner;
            }

            if (forumId) {
                this.forum = await AddonModForum.getForumById(courseId, forumId);
                const module = await CoreCourse.getModule(this.forum.cmid, courseId);

                filters.searchAreaIds = ['mod_forum-post'];

                if (module.contextid) {
                    filters.contextIds = [module.contextid];
                }

                this.searchAreaId = `AddonModForumSearch-${courseId}-${this.forum.id}`;
            } else {
                filters.searchAreaIds = ['mod_forum-activity', 'mod_forum-post'];
                this.searchAreaId = `AddonModForumSearch-${courseId}`;
            }

            this.resultsSource.setFilters(filters);
            this.ready.resolve();
        } catch (error) {
            CoreAlerts.showError(error);
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
        await this.ready;

        this.resultsSource.setQuery(query);

        if (this.resultsSource.hasEmptyQuery()) {
            return;
        }

        await CoreLoadings.showOperationModals('core.searching', true, async () => {
            await this.resultsSource.reload();
            await CorePromiseUtils.ignoreErrors(
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
                url: CoreUrl.addParamsToUrl('/search/index.php', {
                    q: query,
                }),
            });
        });
    }

    /**
     * Clear search results.
     */
    clearSearch(): void {
        this.loadMoreError = false;

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
            this.loadMoreError = true;
        } finally {
            complete();
        }
    }

}
