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
import { makeSingleton } from '@singletons';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourseListItem, CoreCourses } from '@features/courses/services/courses';
import { CoreUserWithAvatar } from '@components/user-avatar/user-avatar';
import { CoreUser } from '@features/user/services/user';
import { CoreCacheUpdateFrequency } from '@/core/constants';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_SEARCH_GLOBAL_SEARCH_FILTERS_UPDATED]: CoreSearchGlobalSearchFilters;
    }

}

export const CORE_SEARCH_GLOBAL_SEARCH_PAGE_LENGTH = 10;
export const CORE_SEARCH_GLOBAL_SEARCH_FILTERS_UPDATED = 'core-search-global-search-filters-updated';

export type CoreSearchGlobalSearchResult = {
    id: number;
    title: string;
    url: string;
    content?: string;
    context?: CoreSearchGlobalSearchResultContext;
    module?: CoreSearchGlobalSearchResultModule;
    component?: CoreSearchGlobalSearchResultComponent;
    course?: CoreCourseListItem;
    user?: CoreUserWithAvatar;
};

export type CoreSearchGlobalSearchResultContext = {
    userName?: string;
    courseName?: string;
};

export type CoreSearchGlobalSearchResultModule = {
    name: string;
    iconurl: string;
    area: string;
};

export type CoreSearchGlobalSearchResultComponent = {
    name: string;
    iconurl: string;
};

export type CoreSearchGlobalSearchSearchAreaCategory = {
    id: string;
    name: string;
};

export type CoreSearchGlobalSearchSearchArea = {
    id: string;
    name: string;
    category: CoreSearchGlobalSearchSearchAreaCategory;
};

export interface CoreSearchGlobalSearchFilters {
    searchAreaCategoryIds?: string[];
    searchAreaIds?: string[];
    courseIds?: number[];
    contextIds?: number[];
}

/**
 * Service to perform global searches.
 */
@Injectable({ providedIn: 'root' })
export class CoreSearchGlobalSearchService {

    private static readonly SEARCH_AREAS_CACHE_KEY = 'CoreSearchGlobalSearch:SearchAreas';

    /**
     * Check whether global search is enabled or not.
     *
     * @returns Whether global search is enabled or not.
     */
    async isEnabled(siteId?: string): Promise<boolean> {
        const site = siteId
            ? await CoreSites.getSite(siteId)
            : CoreSites.getRequiredCurrentSite();

        return !site?.isFeatureDisabled('NoDelegate_GlobalSearch')
            && site?.wsAvailable('core_search_get_results') // @since 4.3
            && site?.canUseAdvancedFeature('enableglobalsearch');
    }

    /**
     * Get results.
     *
     * @param query Search query.
     * @param filters Search filters.
     * @param page Page.
     * @returns Search results.
     */
    async getResults(
        query: string,
        filters: CoreSearchGlobalSearchFilters,
        page: number,
    ): Promise<{ results: CoreSearchGlobalSearchResult[]; total: number; canLoadMore: boolean }> {
        if (this.filtersYieldEmptyResults(filters)) {
            return {
                results: [],
                total: 0,
                canLoadMore: false,
            };
        }

        const site = CoreSites.getRequiredCurrentSite();
        const params: CoreSearchGetResultsWSParams = {
            query,
            page,
            filters: await this.prepareAdvancedWSFilters(filters),
        };
        const preSets = CoreSites.getReadingStrategyPreSets(CoreSitesReadingStrategy.PREFER_NETWORK);

        const { totalcount, results } = await site.read<CoreSearchGetResultsWSResponse>('core_search_get_results', params, preSets);

        return {
            results: await Promise.all((results ?? []).map(result => this.formatWSResult(result))),
            total: totalcount,
            canLoadMore: totalcount > (page + 1) * CORE_SEARCH_GLOBAL_SEARCH_PAGE_LENGTH,
        };
    }

    /**
     * Get available search areas.
     *
     * @returns Search areas.
     */
    async getSearchAreas(): Promise<CoreSearchGlobalSearchSearchArea[]> {
        const site = CoreSites.getRequiredCurrentSite();
        const params: CoreSearchGetSearchAreasListWSParams = {};

        const { areas } = await site.read<CoreSearchGetSearchAreasListWSResponse>('core_search_get_search_areas_list', params, {
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            cacheKey: CoreSearchGlobalSearchService.SEARCH_AREAS_CACHE_KEY,
        });

        return areas.map(area => ({
            id: area.id,
            name: area.name,
            category: {
                id: area.categoryid,
                name: area.categoryname,
            },
        }));
    }

    /**
     * Invalidate search areas cache.
     */
    async invalidateSearchAreas(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();

        await site.invalidateWsCacheForKey(CoreSearchGlobalSearchService.SEARCH_AREAS_CACHE_KEY);
    }

    /**
     * Log event for viewing results.
     *
     * @param query Search query.
     * @param filters Search filters.
     */
    async logViewResults(query: string, filters: CoreSearchGlobalSearchFilters): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        const params: CoreSearchViewResultsWSParams = {
            query,
            filters: await this.prepareBasicWSFilters(filters),
        };

        await site.write<CoreSearchViewResultsWSResponse>('core_search_view_results', params);
    }

    /**
     * Format a WS result to be used in the app.
     *
     * @param wsResult WS result.
     * @returns App result.
     */
    protected async formatWSResult(wsResult: CoreSearchWSResult): Promise<CoreSearchGlobalSearchResult> {
        const result: CoreSearchGlobalSearchResult = {
            id: wsResult.itemid,
            title: wsResult.title,
            url: wsResult.docurl,
            content: wsResult.content,
        };

        if (wsResult.componentname === 'core_user') {
            const user = await CoreUser.getProfile(wsResult.itemid);

            result.user = user;
        } else if (wsResult.componentname === 'core_course' && wsResult.areaname === 'course') {
            const course = await CoreCourses.getCourseByField('id', wsResult.itemid);

            result.course = course;
        } else {
            if (wsResult.userfullname || wsResult.coursefullname) {
                result.context = {
                    userName: wsResult.userfullname,
                    courseName: wsResult.coursefullname,
                };
            }

            if (wsResult.iconurl) {
                if (wsResult.componentname.startsWith('mod_')) {
                    result.module = {
                        name: wsResult.componentname.substring(4),
                        iconurl: wsResult.iconurl,
                        area: wsResult.areaname,
                    };
                } else {
                    result.component = {
                        name: wsResult.componentname,
                        iconurl: wsResult.iconurl,
                    };
                }
            }
        }

        return result;
    }

    /**
     * Check whether the given filter will necessarily yield an empty list of results.
     *
     * @param filters Filters.
     * @returns Whether the given filters will return 0 results.
     */
    protected filtersYieldEmptyResults(filters: CoreSearchGlobalSearchFilters): boolean {
        return filters.courseIds?.length === 0
            || filters.contextIds?.length === 0
            || filters.searchAreaIds?.length === 0
            || filters.searchAreaCategoryIds?.length === 0;
    }

    /**
     * Prepare basic search filters before sending to WS.
     *
     * @param filters App filters.
     * @returns Basic WS filters.
     */
    protected async prepareBasicWSFilters(filters: CoreSearchGlobalSearchFilters): Promise<CoreSearchBasicWSFilters> {
        const wsFilters: CoreSearchBasicWSFilters = {};

        if (filters.courseIds) {
            wsFilters.courseids = filters.courseIds;
        }

        if (filters.searchAreaIds) {
            wsFilters.areaids = filters.searchAreaIds;
        }

        if (filters.searchAreaCategoryIds) {
            const searchAreas = await this.getSearchAreas();

            wsFilters.areaids = searchAreas
                .filter(({ id, category }) => {
                    if (filters.searchAreaIds && !filters.searchAreaIds.includes(id)) {
                        return false;
                    }

                    return filters.searchAreaCategoryIds?.includes(category.id);
                })
                .map(({ id }) => id);
        }

        return wsFilters;
    }

    /**
     * Prepare advanced search filters before sending to WS.
     *
     * @param filters App filters.
     * @returns Advanced WS filters.
     */
    protected async prepareAdvancedWSFilters(filters: CoreSearchGlobalSearchFilters): Promise<CoreSearchAdvancedWSFilters> {
        const wsFilters: CoreSearchAdvancedWSFilters = await this.prepareBasicWSFilters(filters);

        if (filters.contextIds) {
            wsFilters.contextids = filters.contextIds;
        }

        return wsFilters;
    }

}

export const CoreSearchGlobalSearch = makeSingleton(CoreSearchGlobalSearchService);

/**
 * Params of core_search_get_results WS.
 */
type CoreSearchGetResultsWSParams = {
    query: string; // The search query.
    filters?: CoreSearchAdvancedWSFilters; // Filters to apply.
    page?: number; // Results page number starting from 0, defaults to the first page.
};

/**
 * Params of core_search_get_search_areas_list WS.
 */
type CoreSearchGetSearchAreasListWSParams = {
    cat?: string; // Category to filter areas.
};

/**
 * Params of core_search_view_results WS.
 */
type CoreSearchViewResultsWSParams = {
    query: string; // The search query.
    filters?: CoreSearchBasicWSFilters; // Filters to apply.
    page?: number; // Results page number starting from 0, defaults to the first page.
};

/**
 * Search result returned in WS.
 */
type CoreSearchWSResult = { // Search results.
    itemid: number; // Unique id in the search area scope.
    componentname: string; // Component name.
    areaname: string; // Search area name.
    courseurl: string; // Result course url.
    coursefullname: string; // Result course fullname.
    timemodified: number; // Result modified time.
    title: string; // Result title.
    docurl: string; // Result url.
    iconurl?: string; // Icon url.
    content?: string; // Result contents.
    contextid: number; // Result context id.
    contexturl: string; // Result context url.
    description1?: string; // Extra result contents, depends on the search area.
    description2?: string; // Extra result contents, depends on the search area.
    multiplefiles?: number; // Whether multiple files are returned or not.
    filenames?: string[]; // Result file names if present.
    filename?: string; // Result file name if present.
    userid?: number; // User id.
    userurl?: string; // User url.
    userfullname?: string; // User fullname.
    textformat: number; // Text fields format, it is the same for all of them.
};

/**
 * Basic search filters used in WS.
 */
type CoreSearchBasicWSFilters = {
    title?: string; // Result title.
    areaids?: string[]; // Restrict results to these areas.
    courseids?: number[]; // Restrict results to these courses.
    timestart?: number; // Docs modified after this date.
    timeend?: number; // Docs modified before this date.
};

/**
 * Advanced search filters used in WS.
 */
type CoreSearchAdvancedWSFilters = CoreSearchBasicWSFilters & {
    contextids?: number[]; // Restrict results to these contexts.
    cat?: string; // Category to filter areas.
    userids?: number[]; // Restrict results to these users.
    groupids?: number[]; // Restrict results to these groups.
    mycoursesonly?: boolean; // Only results from my courses.
    order?: string; // How to order.
};

/**
 * Data returned by core_search_get_results WS.
 */
type CoreSearchGetResultsWSResponse = {
    totalcount: number; // Total number of results.
    results?: CoreSearchWSResult[];
};

/**
 * Data returned by core_search_get_search_areas_list WS.
 */
type CoreSearchGetSearchAreasListWSResponse = {
    areas: { // Search areas.
        id: string; // Search area id.
        categoryid: string; // Category id.
        categoryname: string; // Category name.
        name: string; // Search area name.
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by core_search_view_results WS.
 */
type CoreSearchViewResultsWSResponse = {
    status: boolean; // Status: true if success.
    warnings?: CoreWSExternalWarning[];
};
