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
import { CoreError } from '@classes/errors/error';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreApp } from '@services/app';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModGlossaryEntryDBRecord, ENTRIES_TABLE_NAME } from './database/glossary';
import { AddonModGlossaryOffline } from './glossary-offline';
import { AddonModGlossaryAutoSyncData, AddonModGlossarySyncProvider } from './glossary-sync';
import { CoreFileEntry } from '@services/file-helper';

const ROOT_CACHE_KEY = 'mmaModGlossary:';

/**
 * Service that provides some features for glossaries.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryProvider {

    static readonly COMPONENT = 'mmaModGlossary';
    static readonly LIMIT_ENTRIES = 25;
    static readonly LIMIT_CATEGORIES = 10;
    static readonly SHOW_ALL_CATEGORIES = 0;
    static readonly SHOW_NOT_CATEGORISED = -1;

    static readonly ADD_ENTRY_EVENT = 'addon_mod_glossary_add_entry';

    /**
     * Get the course glossary cache key.
     *
     * @param courseId Course Id.
     * @return Cache key.
     */
    protected getCourseGlossariesCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'courseGlossaries:' + courseId;
    }

    /**
     * Get all the glossaries in a course.
     *
     * @param courseId Course Id.
     * @param options Other options.
     * @return Resolved with the glossaries.
     */
    async getCourseGlossaries(courseId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModGlossaryGlossary[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetGlossariesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseGlossariesCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModGlossaryProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModGlossaryGetGlossariesByCoursesWSResponse>(
            'mod_glossary_get_glossaries_by_courses',
            params,
            preSets,
        );

        return result.glossaries;
    }

    /**
     * Invalidate all glossaries in a course.
     *
     * @param courseId Course Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    async invalidateCourseGlossaries(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getCourseGlossariesCacheKey(courseId);

        await site.invalidateWsCacheForKey(key);
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
        return ROOT_CACHE_KEY + 'entriesByAuthor:' + glossaryId + ':' + letter + ':' + field + ':' + sort;
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
    async getEntriesByAuthor(
        glossaryId: number,
        letter: string,
        field: string,
        sort: string,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByAuthorWSParams = {
            id: glossaryId,
            letter: letter,
            field: field,
            sort: sort,
            from: options.from || 0,
            limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByAuthorCacheKey(glossaryId, letter, field, sort),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_author', params, preSets);
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
    async invalidateEntriesByAuthor(
        glossaryId: number,
        letter: string,
        field: string,
        sort: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByAuthorCacheKey(glossaryId, letter, field, sort);

        await site.invalidateWsCacheForKey(key);
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
    async getEntriesByCategory(
        glossaryId: number,
        categoryId: number,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesByCategoryWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByCategoryWSParams = {
            id: glossaryId,
            categoryid: categoryId,
            from: options.from || 0,
            limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByCategoryCacheKey(glossaryId, categoryId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_category', params, preSets);
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
    async invalidateEntriesByCategory(glossaryId: number, categoryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByCategoryCacheKey(glossaryId, categoryId);

        await site.invalidateWsCacheForKey(key);
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
        return ROOT_CACHE_KEY + 'entriesByCategory:' + glossaryId + ':' + categoryId;
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
        return ROOT_CACHE_KEY + 'entriesByDate:' + glossaryId + ':' + order + ':' + sort;
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
    async getEntriesByDate(
        glossaryId: number,
        order: string,
        sort: string,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByDateWSParams = {
            id: glossaryId,
            order: order,
            sort: sort,
            from: options.from || 0,
            limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByDateCacheKey(glossaryId, order, sort),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_date', params, preSets);
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
    async invalidateEntriesByDate(glossaryId: number, order: string, sort: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByDateCacheKey(glossaryId, order, sort);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the entries by letter cache key.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @return Cache key.
     */
    protected getEntriesByLetterCacheKey(glossaryId: number, letter: string): string {
        return ROOT_CACHE_KEY + 'entriesByLetter:' + glossaryId + ':' + letter;
    }

    /**
     * Get entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @param options Other options.
     * @return Resolved with the entries.
     */
    async getEntriesByLetter(
        glossaryId: number,
        letter: string,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        options.from = options.from || 0;
        options.limit = options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByLetterWSParams = {
            id: glossaryId,
            letter: letter,
            from: options.from,
            limit: options.limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByLetterCacheKey(glossaryId, letter),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModGlossaryGetEntriesWSResponse>(
            'mod_glossary_get_entries_by_letter',
            params,
            preSets,
        );

        if (options.limit == AddonModGlossaryProvider.LIMIT_ENTRIES) {
            // Store entries in background, don't block the user for this.
            CoreUtils.ignoreErrors(this.storeEntries(glossaryId, result.entries, options.from, site.getId()));
        }

        return result;
    }

    /**
     * Invalidate cache of entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param letter A letter, or a special keyword.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    async invalidateEntriesByLetter(glossaryId: number, letter: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByLetterCacheKey(glossaryId, letter);

        return site.invalidateWsCacheForKey(key);
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
    protected getEntriesBySearchCacheKey(
        glossaryId: number,
        query: string,
        fullSearch: boolean,
        order: string,
        sort: string,
    ): string {
        return ROOT_CACHE_KEY + 'entriesBySearch:' + glossaryId + ':' + fullSearch + ':' + order + ':' + sort + ':' + query;
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
    async getEntriesBySearch(
        glossaryId: number,
        query: string,
        fullSearch: boolean,
        order: string,
        sort: string,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesBySearchWSParams = {
            id: glossaryId,
            query: query,
            fullsearch: fullSearch,
            order: order,
            sort: sort,
            from: options.from || 0,
            limit: options.limit || AddonModGlossaryProvider.LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch, order, sort),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_search', params, preSets);
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
    async invalidateEntriesBySearch(
        glossaryId: number,
        query: string,
        fullSearch: boolean,
        order: string,
        sort: string,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch, order, sort);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the glossary categories cache key.
     *
     * @param glossaryId Glossary Id.
     * @return The cache key.
     */
    protected getCategoriesCacheKey(glossaryId: number): string {
        return ROOT_CACHE_KEY + 'categories:' + glossaryId;
    }

    /**
     * Get all the categories related to the glossary.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @return Promise resolved with the categories if supported or empty array if not.
     */
    async getAllCategories(glossaryId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModGlossaryCategory[]> {
        const site = await CoreSites.getSite(options.siteId);

        return this.getCategories(glossaryId, [], site, options);
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
    protected async getCategories(
        glossaryId: number,
        categories: AddonModGlossaryCategory[],
        site: CoreSite,
        options: AddonModGlossaryGetCategoriesOptions = {},
    ): Promise<AddonModGlossaryCategory[]> {
        options.from = options.from || 0;
        options.limit = options.limit || AddonModGlossaryProvider.LIMIT_CATEGORIES;

        const params: AddonModGlossaryGetCategoriesWSParams = {
            id: glossaryId,
            from: options.from,
            limit: options.limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCategoriesCacheKey(glossaryId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModGlossaryGetCategoriesWSResponse>('mod_glossary_get_categories', params, preSets);

        categories = categories.concat(response.categories);
        const canLoadMore = (options.from + options.limit) < response.count;
        if (canLoadMore) {
            options.from += options.limit;

            return this.getCategories(glossaryId, categories, site, options);
        }

        return categories;
    }

    /**
     * Invalidate cache of categories by glossary id.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when categories data has been invalidated,
     */
    async invalidateCategories(glossaryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCategoriesCacheKey(glossaryId));
    }

    /**
     * Get an entry by ID cache key.
     *
     * @param entryId Entry Id.
     * @return Cache key.
     */
    protected getEntryCacheKey(entryId: number): string {
        return ROOT_CACHE_KEY + 'getEntry:' + entryId;
    }

    /**
     * Get one entry by ID.
     *
     * @param entryId Entry ID.
     * @param options Other options.
     * @return Promise resolved with the entry.
     */
    async getEntry(entryId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModGlossaryGetEntryByIdResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntryByIdWSParams = {
            id: entryId,
        };
        const preSets = {
            cacheKey: this.getEntryCacheKey(entryId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModGlossaryProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        try {
            return await site.read<AddonModGlossaryGetEntryByIdWSResponse>('mod_glossary_get_entry_by_id', params, preSets);
        } catch (error) {
            // Entry not found. Search it in the list of entries.
            try {
                const data = await this.getStoredDataForEntry(entryId, site.getId());

                if (typeof data.from != 'undefined') {
                    const response = await CoreUtils.ignoreErrors(
                        this.getEntryFromList(data.glossaryId, entryId, data.from, false, options),
                    );

                    if (response) {
                        return response;
                    }
                }

                // Page not specified or entry not found in the page, search all pages.
                return await this.getEntryFromList(data.glossaryId, entryId, 0, true, options);
            } catch {
                throw error;
            }
        }
    }

    /**
     * Get a glossary ID and the "from" of a given entry.
     *
     * @param entryId Entry ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the glossary ID and the "from".
     */
    async getStoredDataForEntry(entryId: number, siteId?: string): Promise<{glossaryId: number; from: number}> {
        const site = await CoreSites.getSite(siteId);

        const conditions: Partial<AddonModGlossaryEntryDBRecord> = {
            entryid: entryId,
        };

        const record = await site.getDb().getRecord<AddonModGlossaryEntryDBRecord>(ENTRIES_TABLE_NAME, conditions);

        return {
            glossaryId: record.glossaryid,
            from: record.pagefrom,
        };
    }

    /**
     * Get an entry from the list of entries.
     *
     * @param glossaryId Glossary ID.
     * @param entryId Entry ID.
     * @param from Page to get.
     * @param loadNext Whether to load next pages if not found.
     * @param options Options.
     * @return Promise resolved with the entry data.
     */
    protected async getEntryFromList(
        glossaryId: number,
        entryId: number,
        from: number,
        loadNext: boolean,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModGlossaryGetEntryByIdResponse> {
        // Get the entries from this "page" and check if the entry we're looking for is in it.
        const result = await this.getEntriesByLetter(glossaryId, 'ALL', {
            from: from,
            readingStrategy: CoreSitesReadingStrategy.ONLY_CACHE,
            cmId: options.cmId,
            siteId: options.siteId,
        });

        const entry = result.entries.find(entry => entry.id == entryId);

        if (entry) {
            // Entry found, return it.
            return { entry, from };
        }

        const nextFrom = from + result.entries.length;
        if (nextFrom < result.count && loadNext) {
            // Get the next "page".
            return this.getEntryFromList(glossaryId, entryId, nextFrom, true, options);
        }

        // No more pages and the entry wasn't found. Reject.
        throw new CoreError('Entry not found.');
    };

    /**
     * Performs the whole fetch of the entries using the proper function and arguments.
     *
     * @param fetchFunction Function to fetch.
     * @param fetchArguments Arguments to call the fetching.
     * @param options Other options.
     * @return Promise resolved with all entrries.
     */
    fetchAllEntries(
        fetchFunction: (options?: AddonModGlossaryGetEntriesOptions) => AddonModGlossaryGetEntriesWSResponse,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModGlossaryEntry[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const entries: AddonModGlossaryEntry[] = [];

        const fetchMoreEntries = async (): Promise<AddonModGlossaryEntry[]> => {
            const result = await fetchFunction({
                from: entries.length,
                ...options, // Include all options.
            });

            Array.prototype.push.apply(entries, result.entries);

            return entries.length < result.count ? fetchMoreEntries() : entries;
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
    async invalidateEntry(entryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getEntryCacheKey(entryId));
    }

    /**
     * Invalidate cache of all entries in the array.
     *
     * @param entries Entry objects to invalidate.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when data is invalidated.
     */
    protected async invalidateEntries(entries: AddonModGlossaryEntry[], siteId?: string): Promise<void> {
        const keys: string[] = [];
        entries.forEach((entry) => {
            keys.push(this.getEntryCacheKey(entry.id));
        });

        const site = await CoreSites.getSite(siteId);

        await site.invalidateMultipleWsCacheForKey(keys);
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModGlossary#invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @return Promise resolved when data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        const glossary = await this.getGlossary(courseId, moduleId);

        await CoreUtils.ignoreErrors(this.invalidateGlossaryEntries(glossary));

        await CoreUtils.allPromises([
            this.invalidateCourseGlossaries(courseId),
            this.invalidateCategories(glossary.id),
        ]);
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
    async invalidateGlossaryEntries(glossary: AddonModGlossaryGlossary, onlyEntriesList?: boolean, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        if (!onlyEntriesList) {
            promises.push(this.fetchAllEntries(this.getEntriesByLetter.bind(this, glossary.id, 'ALL'), {
                cmId: glossary.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId,
            }).then((entries) => this.invalidateEntries(entries, siteId)));
        }

        glossary.browsemodes.forEach((mode) => {
            switch (mode) {
                case 'letter':
                    promises.push(this.invalidateEntriesByLetter(glossary.id, 'ALL', siteId));
                    break;
                case 'cat':
                    promises.push(this.invalidateEntriesByCategory(
                        glossary.id,
                        AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
                        siteId,
                    ));
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

        await CoreUtils.allPromises(promises);
    }

    /**
     * Get one glossary by cmid.
     *
     * @param courseId Course Id.
     * @param cmId Course Module Id.
     * @param options Other options.
     * @return Promise resolved with the glossary.
     */
    async getGlossary(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModGlossaryGlossary> {
        const glossaries = await this.getCourseGlossaries(courseId, options);

        const glossary = glossaries.find((glossary) => glossary.coursemodule == cmId);

        if (glossary) {
            return glossary;
        }

        throw new CoreError('Glossary not found.');
    }

    /**
     * Get one glossary by glossary ID.
     *
     * @param courseId Course Id.
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @return Promise resolved with the glossary.
     */
    async getGlossaryById(
        courseId: number,
        glossaryId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModGlossaryGlossary> {
        const glossaries = await this.getCourseGlossaries(courseId, options);

        const glossary = glossaries.find((glossary) => glossary.id == glossaryId);

        if (glossary) {
            return glossary;
        }

        throw new CoreError('Glossary not found.');
    }

    /**
     * Create a new entry on a glossary
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param courseId Course ID of the glossary.
     * @param entryOptions Options for the entry.
     * @param attachments Attachments ID if sending online, result of CoreFileUploaderProvider#storeFilesToUpload otherwise.
     * @param otherOptions Other options.
     * @return Promise resolved with entry ID if entry was created in server, false if stored in device.
     */
    async addEntry(
        glossaryId: number,
        concept: string,
        definition: string,
        courseId: number,
        entryOptions: Record<string, AddonModGlossaryEntryOption>,
        attachments?: number | CoreFileUploaderStoreFilesResult,
        otherOptions: AddonModGlossaryAddEntryOptions = {},
    ): Promise<number | false> {
        otherOptions.siteId = otherOptions.siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a new entry to be synchronized later.
        const storeOffline = async (): Promise<false> => {
            const discardTime = otherOptions.discardEntry?.timecreated;

            if (otherOptions.checkDuplicates) {
                // Check if the entry is duplicated in online or offline mode.
                const conceptUsed = await this.isConceptUsed(glossaryId, concept, {
                    cmId: otherOptions.cmId,
                    timeCreated: discardTime,
                    siteId: otherOptions.siteId,
                });

                if (conceptUsed) {
                    throw new CoreError(Translate.instant('addon.mod_glossary.errconceptalreadyexists'));
                }
            }

            if (typeof attachments == 'number') {
                // When storing in offline the attachments can't be a draft ID.
                throw new CoreError('Error adding entry.');
            }

            await AddonModGlossaryOffline.addNewEntry(
                glossaryId,
                concept,
                definition,
                courseId,
                entryOptions,
                attachments,
                otherOptions.timeCreated,
                otherOptions.siteId,
                undefined,
                otherOptions.discardEntry,
            );

            return false;
        };

        if (!CoreApp.isOnline() && otherOptions.allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If we are editing an offline entry, discard previous first.
        if (otherOptions.discardEntry) {
            await AddonModGlossaryOffline.deleteNewEntry(
                glossaryId,
                otherOptions.discardEntry.concept,
                otherOptions.discardEntry.timecreated,
                otherOptions.siteId,
            );
        }

        try {
            // Try to add it in online.
            return this.addEntryOnline(glossaryId, concept, definition, entryOptions, <number> attachments, otherOptions.siteId);
        } catch (error) {
            if (otherOptions.allowOffline && !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            }

            // The WebService has thrown an error or offline not supported, reject.
            throw error;
        }
    }

    /**
     * Create a new entry on a glossary. It does not cache calls. It will fail if offline or cannot connect.
     *
     * @param glossaryId Glossary ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param options Options for the entry.
     * @param attachId Attachments ID (if any attachment).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the entry ID if created, rejected otherwise.
     */
    async addEntryOnline(
        glossaryId: number,
        concept: string,
        definition: string,
        options?: Record<string, AddonModGlossaryEntryOption>,
        attachId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModGlossaryAddEntryWSParams = {
            glossaryid: glossaryId,
            concept: concept,
            definition: definition,
            definitionformat: 1,
            options: CoreUtils.objectToArrayOfObjects(options || {}, 'name', 'value'),
        };

        if (attachId) {
            params.options!.push({
                name: 'attachmentsid',
                value: String(attachId),
            });
        }

        // Workaround for bug MDL-57737.
        if (!site.isVersionGreaterEqualThan('3.2.2')) {
            params.definition = CoreTextUtils.cleanTags(params.definition);
        }

        const response = await site.write<AddonModGlossaryAddEntryWSResponse>('mod_glossary_add_entry', params);

        return response.entryid;
    }

    /**
     * Check if a entry concept is already used.
     *
     * @param glossaryId Glossary ID.
     * @param concept Concept to check.
     * @param options Other options.
     * @return Promise resolved with true if used, resolved with false if not used or error.
     */
    async isConceptUsed(glossaryId: number, concept: string, options: AddonModGlossaryIsConceptUsedOptions = {}): Promise<boolean> {
        try {
            // Check offline first.
            const exists = await AddonModGlossaryOffline.isConceptUsed(glossaryId, concept, options.timeCreated, options.siteId);

            if (exists) {
                return true;
            }

            // If we get here, there's no offline entry with this name, check online.
            // Get entries from the cache.
            const entries = await this.fetchAllEntries(this.getEntriesByLetter.bind(glossaryId, 'ALL'), {
                cmId: options.cmId,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId: options.siteId,
            });

            // Check if there's any entry with the same concept.
            return entries.some((entry) => entry.concept == concept);
        } catch {
            // Error, assume not used.
            return false;
        }
    }

    /**
     * Return whether or not the plugin is enabled for editing in the current site. Plugin is enabled if the glossary WS are
     * available.
     *
     * @return Whether the glossary editing is available or not.
     */
    isPluginEnabledForEditing(): boolean {
        return !!CoreSites.getCurrentSite()?.wsAvailable('mod_glossary_add_entry');
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
    logView(glossaryId: number, mode: string, name?: string, siteId?: string): Promise<void> {
        const params: AddonModGlossaryViewGlossaryWSParams = {
            id: glossaryId,
            mode: mode,
        };

        return CoreCourseLogHelper.logSingle(
            'mod_glossary_view_glossary',
            params,
            AddonModGlossaryProvider.COMPONENT,
            glossaryId,
            name,
            'glossary',
            { mode },
            siteId,
        );
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
    logEntryView(entryId: number, glossaryId: number, name?: string, siteId?: string): Promise<void> {
        const params: AddonModGlossaryViewEntryWSParams = {
            id: entryId,
        };

        return CoreCourseLogHelper.logSingle(
            'mod_glossary_view_entry',
            params,
            AddonModGlossaryProvider.COMPONENT,
            glossaryId,
            name,
            'glossary',
            { entryid: entryId },
            siteId,
        );
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
    protected async storeEntries(
        glossaryId: number,
        entries: AddonModGlossaryEntry[],
        from: number,
        siteId?: string,
    ): Promise<void> {
        await Promise.all(entries.map((entry) => this.storeEntryId(glossaryId, entry.id, from, siteId)));
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
    protected async storeEntryId(glossaryId: number, entryId: number, from: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonModGlossaryEntryDBRecord = {
            entryid: entryId,
            glossaryid: glossaryId,
            pagefrom: from,
        };

        await site.getDb().insertRecord(ENTRIES_TABLE_NAME, entry);
    }

}

export const AddonModGlossary = makeSingleton(AddonModGlossaryProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [AddonModGlossaryProvider.ADD_ENTRY_EVENT]: AddonModGlossaryAddEntryEventData;
        [AddonModGlossarySyncProvider.AUTO_SYNCED]: AddonModGlossaryAutoSyncData;
    }

}

/**
 * Data passed to ADD_ENTRY_EVENT.
 */
export type AddonModGlossaryAddEntryEventData = {
    glossaryId: number;
    entryId?: number;
};

/**
 * Params of mod_glossary_get_glossaries_by_courses WS.
 */
export type AddonModGlossaryGetGlossariesByCoursesWSParams = {
    courseids?: number[]; // Array of course IDs.
};

/**
 * Data returned by mod_glossary_get_glossaries_by_courses WS.
 */
export type AddonModGlossaryGetGlossariesByCoursesWSResponse = {
    glossaries: AddonModGlossaryGlossary[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_glossary_get_glossaries_by_courses WS.
 */
export type AddonModGlossaryGlossary = {
    id: number; // Glossary id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Glossary name.
    intro: string; // The Glossary intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    allowduplicatedentries: number; // If enabled, multiple entries can have the same concept name.
    displayformat: string; // Display format type.
    mainglossary: number; // If enabled this glossary is a main glossary.
    showspecial: number; // If enabled, participants can browse the glossary by special characters, such as @ and #.
    showalphabet: number; // If enabled, participants can browse the glossary by letters of the alphabet.
    showall: number; // If enabled, participants can browse all entries at once.
    allowcomments: number; // If enabled, all participants with permission will be able to add comments to glossary entries.
    allowprintview: number; // If enabled, students are provided with a link to a printer-friendly version of the glossary.
    usedynalink: number; // If enabled, the entry will be automatically linked.
    defaultapproval: number; // If set to no, entries require approving by a teacher before they are viewable by everyone.
    approvaldisplayformat: string; // When approving glossary items you may wish to use a different display format.
    globalglossary: number;
    entbypage: number; // Entries shown per page.
    editalways: number; // Always allow editing.
    rsstype: number; // RSS type.
    rssarticles: number; // This setting specifies the number of glossary entry concepts to include in the RSS feed.
    assessed: number; // Aggregate type.
    assesstimestart: number; // Restrict rating to items created after this.
    assesstimefinish: number; // Restrict rating to items created before this.
    scale: number; // Scale ID.
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
    completionentries: number; // Number of entries to complete.
    section: number; // Section.
    visible: number; // Visible.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping ID.
    browsemodes: string[];
    canaddentry?: number; // Whether the user can add a new entry.
};

/**
 * Common data passed to the get entries WebServices.
 */
export type AddonModGlossaryCommonGetEntriesWSParams = {
    id: number; // Glossary entry ID.
    from?: number; // Start returning records from here.
    limit?: number; // Number of records to return.
    options?: {
        // When false, includes the non-approved entries created by the user.
        // When true, also includes the ones that the user has the permission to approve.
        includenotapproved?: boolean;
    }; // An array of options.
};

/**
 * Data returned by the different get entries WebServices.
 */
export type AddonModGlossaryGetEntriesWSResponse = {
    count: number; // The total number of records matching the request.
    entries: AddonModGlossaryEntry[];
    ratinginfo?: CoreRatingInfo; // Rating information.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_glossary_get_entries_by_author WS.
 */
export type AddonModGlossaryGetEntriesByAuthorWSParams = AddonModGlossaryCommonGetEntriesWSParams & {
    letter: string; // First letter of firstname or lastname, or either keywords: 'ALL' or 'SPECIAL'.
    field?: string; // Search and order using: 'FIRSTNAME' or 'LASTNAME'.
    sort?: string; // The direction of the order: 'ASC' or 'DESC'.
};

/**
 * Params of mod_glossary_get_entries_by_category WS.
 */
export type AddonModGlossaryGetEntriesByCategoryWSParams = AddonModGlossaryCommonGetEntriesWSParams & {
    categoryid: number; // The category ID. Use '0' for all categories, or '-1' for uncategorised entries.
};

/**
 * Data returned by mod_glossary_get_entries_by_category WS.
 */
export type AddonModGlossaryGetEntriesByCategoryWSResponse = Omit<AddonModGlossaryGetEntriesWSResponse, 'entries'> & {
    entries: AddonModGlossaryEntryWithCategory[];
};

/**
 * Params of mod_glossary_get_entries_by_date WS.
 */
export type AddonModGlossaryGetEntriesByDateWSParams = AddonModGlossaryCommonGetEntriesWSParams & {
    order?: string; // Order the records by: 'CREATION' or 'UPDATE'.
    sort?: string; // The direction of the order: 'ASC' or 'DESC'.
};

/**
 * Params of mod_glossary_get_entries_by_letter WS.
 */
export type AddonModGlossaryGetEntriesByLetterWSParams = AddonModGlossaryCommonGetEntriesWSParams & {
    letter: string; // A letter, or either keywords: 'ALL' or 'SPECIAL'.
};

/**
 * Params of mod_glossary_get_entries_by_search WS.
 */
export type AddonModGlossaryGetEntriesBySearchWSParams = AddonModGlossaryCommonGetEntriesWSParams & {
    query: string; // The query string.
    fullsearch?: boolean; // The query.
    order?: string; // Order by: 'CONCEPT', 'CREATION' or 'UPDATE'.
    sort?: string; // The direction of the order: 'ASC' or 'DESC'.
};

/**
 * Entry data returned by several WS.
 */
export type AddonModGlossaryEntry = {
    id: number; // The entry ID.
    glossaryid: number; // The glossary ID.
    userid: number; // Author ID.
    userfullname: string; // Author full name.
    userpictureurl: string; // Author picture.
    concept: string; // The concept.
    definition: string; // The definition.
    definitionformat: number; // Definition format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    definitiontrust: boolean; // The definition trust flag.
    definitioninlinefiles?: CoreWSExternalFile[];
    attachment: boolean; // Whether or not the entry has attachments.
    attachments?: CoreWSExternalFile[];
    timecreated: number; // Time created.
    timemodified: number; // Time modified.
    teacherentry: boolean; // The entry was created by a teacher, or equivalent.
    sourceglossaryid: number; // The source glossary ID.
    usedynalink: boolean; // Whether the concept should be automatically linked.
    casesensitive: boolean; // When true, the matching is case sensitive.
    fullmatch: boolean; // When true, the matching is done on full words only.
    approved: boolean; // Whether the entry was approved.
    tags?: CoreTagItem[];
};

/**
 * Entry data returned by several WS.
 */
export type AddonModGlossaryEntryWithCategory = AddonModGlossaryEntry & {
    categoryid?: number; // The category ID. This may be '-1' when the entry is not categorised.
    categoryname?: string; // The category name. May be empty when the entry is not categorised.
};

/**
 * Params of mod_glossary_get_categories WS.
 */
export type AddonModGlossaryGetCategoriesWSParams = {
    id: number; // The glossary ID.
    from?: number; // Start returning records from here.
    limit?: number; // Number of records to return.
};

/**
 * Data returned by mod_glossary_get_categories WS.
 */
export type AddonModGlossaryGetCategoriesWSResponse = {
    count: number; // The total number of records.
    categories: AddonModGlossaryCategory[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_glossary_get_categories WS.
 */
export type AddonModGlossaryCategory = {
    id: number; // The category ID.
    glossaryid: number; // The glossary ID.
    name: string; // The name of the category.
    usedynalink: boolean; // Whether the category is automatically linked.
};

/**
 * Params of mod_glossary_get_entry_by_id WS.
 */
export type AddonModGlossaryGetEntryByIdWSParams = {
    id: number; // Glossary entry ID.
};

/**
 * Data returned by mod_glossary_get_entry_by_id WS.
 */
export type AddonModGlossaryGetEntryByIdWSResponse = {
    entry: AddonModGlossaryEntry;
    ratinginfo?: CoreRatingInfo; // Rating information.
    permissions?: {
        candelete: boolean; // Whether the user can delete the entry.
        canupdate: boolean; // Whether the user can update the entry.
    }; // User permissions for the managing the entry.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by mod_glossary_get_entry_by_id WS, with some calculated data if needed.
 */
export type AddonModGlossaryGetEntryByIdResponse = AddonModGlossaryGetEntryByIdWSResponse & {
    from?: number;
};

/**
 * Params of mod_glossary_add_entry WS.
 */
export type AddonModGlossaryAddEntryWSParams = {
    glossaryid: number; // Glossary id.
    concept: string; // Glossary concept.
    definition: string; // Glossary concept definition.
    definitionformat: number; // Definition format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    options?: { // Optional settings.
        name: string; // The allowed keys (value format) are:
        // inlineattachmentsid (int); the draft file area id for inline attachments
        // attachmentsid (int); the draft file area id for attachments
        // categories (comma separated int); comma separated category ids
        // aliases (comma separated str); comma separated aliases
        // usedynalink (bool); whether the entry should be automatically linked.
        // casesensitive (bool); whether the entry is case sensitive.
        // fullmatch (bool); whether to match whole words only.
        value: string | number; // The value of the option (validated inside the function).
    }[];
};

/**
 * Data returned by mod_glossary_add_entry WS.
 */
export type AddonModGlossaryAddEntryWSResponse = {
    entryid: number; // New glossary entry ID.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_glossary_view_glossary WS.
 */
export type AddonModGlossaryViewGlossaryWSParams = {
    id: number; // Glossary instance ID.
    mode: string; // The mode in which the glossary is viewed.
};

/**
 * Params of mod_glossary_view_entry WS.
 */
export type AddonModGlossaryViewEntryWSParams = {
    id: number; // Glossary entry ID.
};

/**
 * Options to pass to add entry.
 */
export type AddonModGlossaryAddEntryOptions = {
    timeCreated?: number; // The time the entry was created. If not defined, current time.
    discardEntry?: AddonModGlossaryDiscardedEntry; // The entry provided will be discarded if found.
    allowOffline?: boolean; // True if it can be stored in offline, false otherwise.
    checkDuplicates?: boolean; // Check for duplicates before storing offline. Only used if allowOffline is true.
    cmId?: number; // Module ID.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Entry to discard.
 */
export type AddonModGlossaryDiscardedEntry = {
    concept: string;
    timecreated: number;
};

/**
 * Entry to be added.
 */
export type AddonModGlossaryNewEntry = {
    concept: string;
    definition: string;
    timecreated: number;
};

/**
 * Entry to be added, including attachments.
 */
export type AddonModGlossaryNewEntryWithFiles = AddonModGlossaryNewEntry & {
    files: CoreFileEntry[];
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

/**
 * Possible values for entry options.
 */
export type AddonModGlossaryEntryOption = string | number;
