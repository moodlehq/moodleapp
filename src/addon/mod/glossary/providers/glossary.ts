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
import { TranslateService } from '@ngx-translate/core';
import { CoreSite } from '@classes/site';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider, CoreSiteSchema, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreRatingInfo } from '@core/rating/providers/rating';
import { AddonModGlossaryOfflineProvider } from './offline';
import { CoreCourseCommonModWSOptions } from '@core/course/providers/course';

/**
 * Service that provides some features for glossaries.
 */
@Injectable()
export class AddonModGlossaryProvider {
    static COMPONENT = 'mmaModGlossary';
    static LIMIT_ENTRIES = 25;
    static LIMIT_CATEGORIES = 10;
    static SHOW_ALL_CATEGORIES = 0;
    static SHOW_NOT_CATEGORISED = -1;

    static ADD_ENTRY_EVENT = 'addon_mod_glossary_add_entry';

    protected ROOT_CACHE_KEY = 'mmaModGlossary:';

    // Variables for database.
    static ENTRIES_TABLE = 'addon_mod_glossary_entry_glossaryid';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModGlossaryProvider',
        version: 1,
        tables: [
            {
                name: AddonModGlossaryProvider.ENTRIES_TABLE,
                columns: [
                    {
                        name: 'entryid',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'glossaryid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'pagefrom',
                        type: 'INTEGER',
                    }
                ]
            }
        ]
    };

    constructor(private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private translate: TranslateService,
            private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider,
            private glossaryOffline: AddonModGlossaryOfflineProvider,
            private logHelper: CoreCourseLogHelperProvider) {

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Get the course glossary cache key.
     *
     * @param courseId Course Id.
     * @return Cache key.
     */
    protected getCourseGlossariesCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'courseGlossaries:' + courseId;
    }

    /**
     * Get all the glossaries in a course.
     *
     * @param courseId Course Id.
     * @param options Other options.
     * @return Resolved with the glossaries.
     */
    getCourseGlossaries(courseId: number, options: CoreSitesCommonWSOptions = {}): Promise<any[]> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                courseids: [courseId],
            };
            const preSets = {
                cacheKey: this.getCourseGlossariesCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                component: AddonModGlossaryProvider.COMPONENT,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_glossaries_by_courses', params, preSets).then((result) => {
                return result.glossaries;
            });
        });
    }

    /**
     * Invalidate all glossaries in a course.
     *
     * @param courseId Course Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateCourseGlossaries(courseId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getCourseGlossariesCacheKey(courseId);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get the entries by author cache key.
     *
     * @param glossaryId Glossary Id.
     * @param letter First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param field Search and order using: FIRSTNAME or LASTNAME
     * @param sort The direction of the order: ASC or DESC
     * @return Cache key.
     */
    protected getEntriesByAuthorCacheKey(glossaryId: number, letter: string, field: string, sort: string): string {
        return this.ROOT_CACHE_KEY + 'entriesByAuthor:' + glossaryId + ':' + letter + ':' + field + ':' + sort;
    }

    /**
     * Get entries by author.
     *
     * @param glossaryId Glossary Id.
     * @param letter First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param field Search and order using: FIRSTNAME or LASTNAME
     * @param sort The direction of the order: ASC or DESC
     * @param options Other options.
     * @return Resolved with the entries.
     */
    getEntriesByAuthor(glossaryId: number, letter: string, field: string, sort: string,
            options: AddonModGlossaryGetEntriesOptions = {}): Promise<any[]> {

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: glossaryId,
                letter: letter,
                field: field,
                sort: sort,
                from: options.from || 0,
                limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
            };
            const preSets = {
                cacheKey: this.getEntriesByAuthorCacheKey(glossaryId, letter, field, sort),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entries_by_author', params, preSets);
        });
    }

    /**
     * Invalidate cache of entries by author.
     *
     * @param glossaryId Glossary Id.
     * @param letter First letter of firstname or lastname, or either keywords: ALL or SPECIAL.
     * @param field Search and order using: FIRSTNAME or LASTNAME
     * @param sort The direction of the order: ASC or DESC
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntriesByAuthor(glossaryId: number, letter: string, field: string, sort: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getEntriesByAuthorCacheKey(glossaryId, letter, field, sort);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get entries by category.
     *
     * @param glossaryId Glossary Id.
     * @param categoryId The category ID. Use constant SHOW_ALL_CATEGORIES for all categories, or
     *                   constant SHOW_NOT_CATEGORISED for uncategorised entries.
     * @param options Other options.
     * @return Resolved with the entries.
     */
    getEntriesByCategory(glossaryId: number, categoryId: number, options: AddonModGlossaryGetEntriesOptions = {}): Promise<any[]> {

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: glossaryId,
                categoryid: categoryId,
                from: options.from || 0,
                limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
            };
            const preSets = {
                cacheKey: this.getEntriesByCategoryCacheKey(glossaryId, categoryId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entries_by_category', params, preSets);
        });
    }

    /**
     * Invalidate cache of entries by category.
     *
     * @param glossaryId Glossary Id.
     * @param categoryId The category ID. Use constant SHOW_ALL_CATEGORIES for all categories, or
     *                   constant SHOW_NOT_CATEGORISED for uncategorised entries.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntriesByCategory(glossaryId: number, categoryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getEntriesByCategoryCacheKey(glossaryId, categoryId);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get the entries by category cache key.
     *
     * @param glossaryId Glossary Id.
     * @param categoryId The category ID. Use constant SHOW_ALL_CATEGORIES for all categories, or
     *                   constant SHOW_NOT_CATEGORISED for uncategorised entries.
     * @return Cache key.
     */
    getEntriesByCategoryCacheKey(glossaryId: number, categoryId: number): string {
        return this.ROOT_CACHE_KEY + 'entriesByCategory:' + glossaryId + ':' + categoryId;
    }

    /**
     * Get the entries by date cache key.
     *
     * @param glossaryId Glossary Id.
     * @param order The way to order the records.
     * @param sort The direction of the order.
     * @return Cache key.
     */
    getEntriesByDateCacheKey(glossaryId: number, order: string, sort: string): string {
        return this.ROOT_CACHE_KEY + 'entriesByDate:' + glossaryId + ':' + order + ':' + sort;
    }

    /**
     * Get entries by date.
     *
     * @param glossaryId Glossary Id.
     * @param order The way to order the records.
     * @param sort The direction of the order.
     * @param options Other options.
     * @return Resolved with the entries.
     */
    getEntriesByDate(glossaryId: number, order: string, sort: string, options: AddonModGlossaryGetEntriesOptions = {})
            : Promise<any[]> {

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: glossaryId,
                order: order,
                sort: sort,
                from: options.from || 0,
                limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
            };
            const preSets = {
                cacheKey: this.getEntriesByDateCacheKey(glossaryId, order, sort),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entries_by_date', params, preSets);
        });
    }

    /**
     * Invalidate cache of entries by date.
     *
     * @param glossaryId Glossary Id.
     * @param order The way to order the records.
     * @param sort The direction of the order.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntriesByDate(glossaryId: number, order: string, sort: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getEntriesByDateCacheKey(glossaryId, order, sort);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get the entries by letter cache key.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @return Cache key.
     */
    protected getEntriesByLetterCacheKey(glossaryId: number, letter: string): string {
        return this.ROOT_CACHE_KEY + 'entriesByLetter:' + glossaryId + ':' + letter;
    }

    /**
     * Get entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @param options Other options.
     * @return Resolved with the entries.
     */
    getEntriesByLetter(glossaryId: number, letter: string, options: AddonModGlossaryGetEntriesOptions = {}): Promise<any> {
        options.from = options.from || 0;
        options.limit = options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES;

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: glossaryId,
                letter: letter,
                from: options.from,
                limit: options.limit,
            };
            const preSets = {
                cacheKey: this.getEntriesByLetterCacheKey(glossaryId, letter),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entries_by_letter', params, preSets).then((result) => {

                if (options.limit == AddonModGlossaryProvider.LIMIT_ENTRIES) {
                    // Store entries in background, don't block the user for this.
                    this.storeEntries(glossaryId, result.entries, options.from, site.getId()).catch(() => {
                        // Ignore errors.
                    });
                }

                return result;
            });
        });
    }

    /**
     * Invalidate cache of entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntriesByLetter(glossaryId: number, letter: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getEntriesByLetterCacheKey(glossaryId, letter);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get the entries by search cache key.
     *
     * @param glossaryId Glossary Id.
     * @param query The search query.
     * @param fullSearch Whether or not full search is required.
     * @param order The way to order the results.
     * @param sort The direction of the order.
     * @return Cache key.
     */
    protected getEntriesBySearchCacheKey(glossaryId: number, query: string, fullSearch: boolean, order: string, sort: string):
            string {
        return this.ROOT_CACHE_KEY + 'entriesBySearch:' + glossaryId + ':' + fullSearch + ':' + order + ':' + sort + ':' + query;
    }

    /**
     * Get entries by search.
     *
     * @param glossaryId Glossary Id.
     * @param query The search query.
     * @param fullSearch Whether or not full search is required.
     * @param order The way to order the results.
     * @param sort The direction of the order.
     * @param from Start returning records from here.
     * @param limit Number of records to return.
     * @param omitExpires True to always get the value from cache. If data isn't cached, it will call the WS.
     * @param forceOffline True to always get the value from cache. If data isn't cached, it won't call the WS.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved with the entries.
     */
    getEntriesBySearch(glossaryId: number, query: string, fullSearch: boolean, order: string, sort: string,
            options: AddonModGlossaryGetEntriesOptions = {}): Promise<any[]> {

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: glossaryId,
                query: query,
                fullsearch: fullSearch,
                order: order,
                sort: sort,
                from: options.from || 0,
                limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
            };
            const preSets = {
                cacheKey: this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch, order, sort),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entries_by_search', params, preSets);
        });
    }

    /**
     * Invalidate cache of entries by search.
     *
     * @param glossaryId Glossary Id.
     * @param query The search query.
     * @param fullSearch Whether or not full search is required.
     * @param order The way to order the results.
     * @param sort The direction of the order.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntriesBySearch(glossaryId: number, query: string, fullSearch: boolean, order: string, sort: string, siteId?: string):
            Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const key = this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch, order, sort);

            return site.invalidateWsCacheForKey(key);
        });
    }

    /**
     * Get the glossary categories cache key.
     *
     * @param glossaryId Glossary Id.
     * @return The cache key.
     */
    protected getCategoriesCacheKey(glossaryId: number): string {
        return this.ROOT_CACHE_KEY + 'categories:' + glossaryId;
    }

    /**
     * Get all the categories related to the glossary.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @return Promise resolved with the categories if supported or empty array if not.
     */
    getAllCategories(glossaryId: number, options: CoreCourseCommonModWSOptions = {}): Promise<any[]> {
        return this.sitesProvider.getSite(options.siteId).then((site) => {
            return this.getCategories(glossaryId, [], site, options);
        });
    }

    /**
     * Get the categories related to the glossary by sections. It's a recursive function see initial call values.
     *
     * @param glossaryId Glossary Id.
     * @param categories Already fetched categories where to append the fetch.
     * @param site Site object.
     * @param options Other options.
     * @return Promise resolved with the categories.
     */
    protected getCategories(glossaryId: number, categories: any[], site: CoreSite,
            options: AddonModGlossaryGetCategoriesOptions = {}): Promise<any[]> {

        options.from = options.from || 0;
        options.limit = options.limit || AddonModGlossaryProvider.LIMIT_CATEGORIES;

        const params = {
            id: glossaryId,
            from: options.from,
            limit: options.limit,
        };
        const preSets = {
            cacheKey: this.getCategoriesCacheKey(glossaryId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_categories', params, preSets).then((response) => {
            categories = categories.concat(response.categories);
            const canLoadMore = (options.from + options.limit) < response.count;
            if (canLoadMore) {
                options.from += options.limit;

                return this.getCategories(glossaryId, categories, site, options);
            }

            return categories;
        });
    }

    /**
     * Invalidate cache of categories by glossary id.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when categories data has been invalidated,
     */
    invalidateCategories(glossaryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCategoriesCacheKey(glossaryId));
        });
    }

    /**
     * Get an entry by ID cache key.
     *
     * @param entryId Entry Id.
     * @return Cache key.
     */
    protected getEntryCacheKey(entryId: number): string {
        return this.ROOT_CACHE_KEY + 'getEntry:' + entryId;
    }

    /**
     * Get one entry by ID.
     *
     * @param entryId Entry ID.
     * @param options Other options.
     * @return Promise resolved with the entry.
     */
    getEntry(entryId: number, options: CoreCourseCommonModWSOptions = {})
            : Promise<{entry: any, ratinginfo: CoreRatingInfo, from?: number}> {

        return this.sitesProvider.getSite(options.siteId).then((site) => {
            const params = {
                id: entryId,
            };
            const preSets = {
                cacheKey: this.getEntryCacheKey(entryId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                component: AddonModGlossaryProvider.COMPONENT,
                componentId: options.cmId,
                ...this.sitesProvider.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            };

            return site.read('mod_glossary_get_entry_by_id', params, preSets).then((response) => {
                if (response && response.entry) {
                    return response;
                } else {
                    return Promise.reject(null);
                }
            }).catch((error) => {
                // Entry not found. Search it in the list of entries.
                let glossaryId;

                const searchEntry = (from: number, loadNext: boolean): Promise<any> => {
                    // Get the entries from this "page" and check if the entry we're looking for is in it.
                    return this.getEntriesByLetter(glossaryId, 'ALL', {
                        from: from,
                        readingStrategy: CoreSitesReadingStrategy.OnlyCache,
                        cmId: options.cmId,
                        siteId: options.siteId,
                    }).then((result) => {

                        for (let i = 0; i < result.entries.length; i++) {
                            const entry = result.entries[i];
                            if (entry.id == entryId) {
                                // Entry found, return it.
                                return {
                                    entry: entry,
                                    from: from
                                };
                            }
                        }

                        const nextFrom = from + result.entries.length;
                        if (nextFrom < result.count && loadNext) {
                            // Get the next "page".
                            return searchEntry(nextFrom, true);
                        }

                        // No more pages and the entry wasn't found. Reject.
                        return Promise.reject(null);
                    });
                };

                return this.getStoredDataForEntry(entryId, site.getId()).then((data) => {
                    glossaryId = data.glossaryId;

                    if (typeof data.from != 'undefined') {
                        return searchEntry(data.from, false).catch(() => {
                            // Entry not found in that page. Search all pages.
                            return searchEntry(0, true);
                        });
                    }

                    // Page not specified, search all pages.
                    return searchEntry(0, true);
                }).catch(() => {
                    return Promise.reject(error);
                });
            });
        });
    }

    /**
     * Get a glossary ID and the "from" of a given entry.
     *
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the glossary ID and the "from".
     */
    getStoredDataForEntry(entryId: number, siteId?: string): Promise<{glossaryId: number, from: number}> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                entryid: entryId
            };

            return site.getDb().getRecord(AddonModGlossaryProvider.ENTRIES_TABLE, conditions).then((record) => {
                return {
                    glossaryId: record.glossaryid,
                    from: record.pagefrom
                };
            });
        });
    }

    /**
     * Performs the fetch of the entries using the propper function and arguments.
     *
     * @param fetchFunction Function to fetch.
     * @param fetchArguments Arguments to call the fetching.
     * @param options Other options.
     * @return Promise resolved with the response.
     */
    fetchEntries(fetchFunction: Function, fetchArguments: any[], options: AddonModGlossaryGetEntriesOptions = {}): Promise<any> {
        const args = fetchArguments.slice();
        args.push(options);

        return fetchFunction.apply(this, args);
    }

    /**
     * Performs the whole fetch of the entries using the proper function and arguments.
     *
     * @param fetchFunction Function to fetch.
     * @param fetchArguments Arguments to call the fetching.
     * @param options Other options.
     * @return Promise resolved with all entrries.
     */
    fetchAllEntries(fetchFunction: Function, fetchArguments: any[], options: CoreCourseCommonModWSOptions = {}): Promise<any[]> {
        options.siteId = options.siteId || this.sitesProvider.getCurrentSiteId();

        const entries = [];

        const fetchMoreEntries = (): Promise<any[]> => {
            return this.fetchEntries(fetchFunction, fetchArguments, {
                from: entries.length,
                ...options, // Include all options.
            }).then((result) => {
                Array.prototype.push.apply(entries, result.entries);

                return entries.length < result.count ? fetchMoreEntries() : entries;
            });
        };

        return fetchMoreEntries();
    }

    /**
     * Invalidate cache of entry by ID.
     *
     * @param entryId Entry Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    invalidateEntry(entryId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEntryCacheKey(entryId));
        });
    }

    /**
     * Invalidate cache of all entries in the array.
     *
     * @param entries Entry objects to invalidate.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    protected invalidateEntries(entries: any[], siteId?: string): Promise<any> {
        const keys = [];
        entries.forEach((entry) => {
            keys.push(this.getEntryCacheKey(entry.id));
        });

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateMultipleWsCacheForKey(keys);
        });
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModGlossary#invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @return Promise resolved when data is invalidated.
     */
     invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.getGlossary(courseId, moduleId).then((glossary) => {
            return this.invalidateGlossaryEntries(glossary).finally(() => {
                return this.utils.allPromises([
                    this.invalidateCourseGlossaries(courseId),
                    this.invalidateCategories(glossary.id)
                ]);
            });
        });
    }

    /**
     * Invalidate the prefetched content for a given glossary, except files.
     * To invalidate files, use AddonModGlossaryProvider#invalidateFiles.
     *
     * @param glossary The glossary object.
     * @param onlyEntriesList If true, entries won't be invalidated.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateGlossaryEntries(glossary: any, onlyEntriesList?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        if (!onlyEntriesList) {
            promises.push(this.fetchAllEntries(this.getEntriesByLetter, [glossary.id, 'ALL'], {
                cmId: glossary.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.PreferCache,
                siteId,
            }).then((entries) => {
                return this.invalidateEntries(entries, siteId);
            }));
        }

        glossary.browsemodes.forEach((mode) => {
            switch (mode) {
                case 'letter':
                    promises.push(this.invalidateEntriesByLetter(glossary.id, 'ALL', siteId));
                    break;
                case 'cat':
                    promises.push(this.invalidateEntriesByCategory(glossary.id, AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                            siteId));
                    break;
                case 'date':
                    promises.push(this.invalidateEntriesByDate(glossary.id, 'CREATION', 'DESC', siteId));
                    promises.push(this.invalidateEntriesByDate(glossary.id, 'UPDATE', 'DESC', siteId));
                    break;
                case 'author':
                    promises.push(this.invalidateEntriesByAuthor(glossary.id, 'ALL', 'LASTNAME', 'ASC', siteId));
                    break;
                default:
            }
        });

        return this.utils.allPromises(promises);
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param moduleId The module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the files are invalidated.
     */
    protected invalidateFiles(moduleId: number, siteId?: string): Promise<any> {
        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModGlossaryProvider.COMPONENT, moduleId);
    }

    /**
     * Get one glossary by cmid.
     *
     * @param courseId Course Id.
     * @param cmId Course Module Id.
     * @param options Other options.
     * @return Promise resolved with the glossary.
     */
    getGlossary(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<any> {
        return this.getCourseGlossaries(courseId, options).then((glossaries) => {
            const glossary = glossaries.find((glossary) => glossary.coursemodule == cmId);

            if (glossary) {
                return glossary;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get one glossary by glossary ID.
     *
     * @param courseId Course Id.
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @return Promise resolved with the glossary.
     */
    getGlossaryById(courseId: number, glossaryId: number, options: CoreSitesCommonWSOptions = {}): Promise<any> {
        return this.getCourseGlossaries(courseId, options).then((glossaries) => {
            const glossary = glossaries.find((glossary) => glossary.id == glossaryId);

            if (glossary) {
                return glossary;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Create a new entry on a glossary
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param courseId Course ID of the glossary.
     * @param entryOptions Array of options for the entry.
     * @param attach Attachments ID if sending online, result of CoreFileUploaderProvider#storeFilesToUpload
     *               otherwise.
     * @param otherOptions Other options.
     * @return Promise resolved with entry ID if entry was created in server, false if stored in device.
     */
    addEntry(glossaryId: number, concept: string, definition: string, courseId: number, entryOptions: any, attach: any,
            otherOptions: AddonModGlossaryAddEntryOptions = {}): Promise<number | false> {
        otherOptions.siteId = otherOptions.siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a new entry to be synchronized later.
        const storeOffline = (): Promise<number | false> => {
            const discardTime = otherOptions.discardEntry && otherOptions.discardEntry.timecreated;

            let duplicatesPromise;
            if (otherOptions.checkDuplicates) {
                duplicatesPromise = this.isConceptUsed(glossaryId, concept, {
                    cmId: otherOptions.cmId,
                    timeCreated: discardTime,
                    siteId: otherOptions.siteId,
                });
            } else {
                duplicatesPromise = Promise.resolve(false);
            }

            // Check if the entry is duplicated in online or offline mode.
            return duplicatesPromise.then((used) => {
                if (used) {
                    return Promise.reject(this.translate.instant('addon.mod_glossary.errconceptalreadyexists'));
                }

                return this.glossaryOffline.addNewEntry(glossaryId, concept, definition, courseId, attach, entryOptions,
                        otherOptions.timeCreated, otherOptions.siteId, undefined, otherOptions.discardEntry).then(() => {
                    return false;
                });
            });
        };

        if (!this.appProvider.isOnline() && otherOptions.allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If we are editing an offline entry, discard previous first.
        let discardPromise;
        if (otherOptions.discardEntry) {
            discardPromise = this.glossaryOffline.deleteNewEntry(
                    glossaryId, otherOptions.discardEntry.concept, otherOptions.discardEntry.timecreated, otherOptions.siteId);
        } else {
            discardPromise = Promise.resolve();
        }

        return discardPromise.then(() => {
            // Try to add it in online.
            return this.addEntryOnline(glossaryId, concept, definition, entryOptions, attach, otherOptions.siteId)
                    .then((entryId) => {
                return entryId;
            }).catch((error) => {
                if (otherOptions.allowOffline && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Create a new entry on a glossary. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param options Array of options for the entry.
     * @param attachId Attachments ID (if any attachment).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the entry ID if created, rejected otherwise.
     */
    addEntryOnline(glossaryId: number, concept: string, definition: string, options?: any, attachId?: number, siteId?: string):
            Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                glossaryid: glossaryId,
                concept: concept,
                definition: definition,
                definitionformat: 1,
                options: this.utils.objectToArrayOfObjects(options || {}, 'name', 'value')
            };

            if (attachId) {
                params.options.push({
                    name: 'attachmentsid',
                    value: attachId
                });
            }

            // Workaround for bug MDL-57737.
            if (!site.isVersionGreaterEqualThan('3.2.2')) {
                params.definition = this.textUtils.cleanTags(params.definition);
            }

            return site.write('mod_glossary_add_entry', params).then((response) => {
                if (response && response.entryid) {
                    return response.entryid;
                }

                return Promise.reject(this.utils.createFakeWSError(''));
            });
        });
    }

    /**
     * Check if a entry concept is already used.
     *
     * @param glossaryId Glossary ID.
     * @param concept Concept to check.
     * @param options Other options.
     * @return Promise resolved with true if used, resolved with false if not used or error.
     */
    isConceptUsed(glossaryId: number, concept: string, options: AddonModGlossaryIsConceptUsedOptions = {}): Promise<boolean> {
        // Check offline first.
        return this.glossaryOffline.isConceptUsed(glossaryId, concept, options.timeCreated, options.siteId).then((exists) => {
            if (exists) {
                return true;
            }

            // If we get here, there's no offline entry with this name, check online.
            // Get entries from the cache.
            return this.fetchAllEntries(this.getEntriesByLetter, [glossaryId, 'ALL'], {
                cmId: options.cmId,
                readingStrategy: CoreSitesReadingStrategy.PreferCache,
                siteId: options.siteId,
            }).then((entries) => {
                // Check if there's any entry with the same concept.
                return entries.some((entry) => entry.concept == concept);
            });
        }).catch(() => {
            // Error, assume not used.
            return false;
        });
    }

    /**
     * Return whether or not the plugin is enabled for editing in the current site. Plugin is enabled if the glossary WS are
     * available.
     *
     * @return Whether the glossary editing is available or not.
     */
    isPluginEnabledForEditing(): boolean {
        return  this.sitesProvider.getCurrentSite().wsAvailable('mod_glossary_add_entry');
    }

    /**
     * Report a glossary as being viewed.
     *
     * @param glossaryId Glossary ID.
     * @param mode The mode in which the glossary was viewed.
     * @param name Name of the glossary.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(glossaryId: number, mode: string, name?: string, siteId?: string): Promise<any> {
        const params = {
            id: glossaryId,
            mode: mode
        };

        return this.logHelper.logSingle('mod_glossary_view_glossary', params, AddonModGlossaryProvider.COMPONENT, glossaryId, name,
                'glossary', {mode: mode}, siteId);
    }

    /**
     * Report a glossary entry as being viewed.
     *
     * @param entryId Entry ID.
     * @param glossaryId Glossary ID.
     * @param name Name of the glossary.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logEntryView(entryId: number, glossaryId: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            id: entryId
        };

        return this.logHelper.logSingle('mod_glossary_view_entry', params, AddonModGlossaryProvider.COMPONENT, glossaryId, name,
                'glossary', {entryid: entryId}, siteId);
    }

    /**
     * Store several entries so we can determine their glossaryId in offline.
     *
     * @param glossaryId Glossary ID the entries belongs to.
     * @param entries Entries.
     * @param from The "page" the entries belong to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected storeEntries(glossaryId: number, entries: any[], from: number, siteId?: string): Promise<any> {
        const promises = [];

        entries.forEach((entry) => {
            promises.push(this.storeEntryId(glossaryId, entry.id, from, siteId));
        });

        return Promise.all(promises);
    }

    /**
     * Store an entry so we can determine its glossaryId in offline.
     *
     * @param glossaryId Glossary ID the entry belongs to.
     * @param entryId Entry ID.
     * @param from The "page" the entry belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected storeEntryId(glossaryId: number, entryId: number, from: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                entryid: entryId,
                glossaryid: glossaryId,
                pagefrom: from
            };

            return site.getDb().insertRecord(AddonModGlossaryProvider.ENTRIES_TABLE, entry);
        });
    }
}

/**
 * Options to pass to add entry.
 */
export type AddonModGlossaryAddEntryOptions = {
    timeCreated?: number; // The time the entry was created. If not defined, current time.
    discardEntry?: any; // The entry provided will be discarded if found.
    allowOffline?: boolean; // True if it can be stored in offline, false otherwise.
    checkDuplicates?: boolean; // Check for duplicates before storing offline. Only used if allowOffline is true.
    cmId?: number; // Module ID.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to the different get entries functions.
 */
export type AddonModGlossaryGetEntriesOptions = CoreCourseCommonModWSOptions & {
    from?: number; // Start returning records from here. Defaults to 0.
    limit?: number; // Number of records to return. Defaults to AddonModGlossaryProvider.LIMIT_ENTRIES.
};

/**
 * Options to pass to get categories.
 */
export type AddonModGlossaryGetCategoriesOptions = CoreCourseCommonModWSOptions & {
    from?: number; // Start returning records from here. Defaults to 0.
    limit?: number; // Number of records to return. Defaults to AddonModGlossaryProvider.LIMIT_CATEGORIES.
};

/**
 * Options to pass to is concept used.
 */
export type AddonModGlossaryIsConceptUsedOptions = {
    cmId?: number; // Module ID.
    timeCreated?: number; // Timecreated to check that is not the timecreated we are editing.
    siteId?: string; // Site ID. If not defined, current site.
};
