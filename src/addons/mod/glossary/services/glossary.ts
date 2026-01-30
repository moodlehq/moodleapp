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
import { CoreSite } from '@classes/sites/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreObject } from '@static/object';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@static/events';
import { AddonModGlossaryEntryDBRecord, ENTRIES_TABLE_NAME } from './database/glossary';
import { AddonModGlossaryOffline } from './glossary-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
    ADDON_MOD_GLOSSARY_ENTRY_ADDED,
    ADDON_MOD_GLOSSARY_ENTRY_DELETED,
    ADDON_MOD_GLOSSARY_ENTRY_UPDATED,
    ADDON_MOD_GLOSSARY_LIMIT_CATEGORIES,
    ADDON_MOD_GLOSSARY_LIMIT_ENTRIES,
} from '../constants';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@static/text';
import { CoreCourseModuleHelper, CoreCourseModuleStandardElements } from '@features/course/services/course-module-helper';

/**
 * Service that provides some features for glossaries.
 */
@Injectable({ providedIn: 'root' })
export class AddonModGlossaryProvider {

    protected static readonly SHOW_ALL_CATEGORIES = 0;
    protected static readonly ROOT_CACHE_KEY = 'mmaModGlossary:';

    /**
     * Get the course glossary cache key.
     *
     * @param courseId Course Id.
     * @returns Cache key.
     */
    protected getCourseGlossariesCacheKey(courseId: number): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}courseGlossaries:${courseId}`;
    }

    /**
     * Get all the glossaries in a course.
     *
     * @param courseId Course Id.
     * @param options Other options.
     * @returns Resolved with the glossaries.
     */
    async getCourseGlossaries(courseId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModGlossaryGlossary[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetGlossariesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseGlossariesCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
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
     * @returns Cache key.
     */
    protected getEntriesByAuthorCacheKey(glossaryId: number): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}entriesByAuthor:${glossaryId}:ALL:LASTNAME:ASC`;
    }

    /**
     * Get entries by author.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @returns Resolved with the entries.
     */
    async getEntriesByAuthor(
        glossaryId: number,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByAuthorWSParams = {
            id: glossaryId,
            letter: 'ALL',
            field: 'LASTNAME',
            sort: 'ASC',
            from: options.from || 0,
            limit: options.limit || ADDON_MOD_GLOSSARY_LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByAuthorCacheKey(glossaryId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_author', params, preSets);
    }

    /**
     * Invalidate cache of entries by author.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateEntriesByAuthor(glossaryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByAuthorCacheKey(glossaryId);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get entries by category.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @returns Resolved with the entries.
     */
    async getEntriesByCategory(
        glossaryId: number,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesByCategoryWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByCategoryWSParams = {
            id: glossaryId,
            categoryid: AddonModGlossaryProvider.SHOW_ALL_CATEGORIES,
            from: options.from || 0,
            limit: options.limit || ADDON_MOD_GLOSSARY_LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByCategoryCacheKey(glossaryId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_glossary_get_entries_by_category', params, preSets);
    }

    /**
     * Invalidate cache of entries by category.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateEntriesByCategory(glossaryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByCategoryCacheKey(glossaryId);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the entries by category cache key.
     *
     * @param glossaryId Glossary Id.
     * @returns Cache key.
     */
    getEntriesByCategoryCacheKey(glossaryId: number): string {
        const prefix = `${AddonModGlossaryProvider.ROOT_CACHE_KEY}entriesByCategory`;

        return `${prefix}:${glossaryId}:${AddonModGlossaryProvider.SHOW_ALL_CATEGORIES}`;
    }

    /**
     * Get the entries by date cache key.
     *
     * @param glossaryId Glossary Id.
     * @param order The way to order the records.
     * @returns Cache key.
     */
    getEntriesByDateCacheKey(glossaryId: number, order: string): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}entriesByDate:${glossaryId}:${order}:DESC`;
    }

    /**
     * Get entries by date.
     *
     * @param glossaryId Glossary Id.
     * @param order The way to order the records.
     * @param options Other options.
     * @returns Resolved with the entries.
     */
    async getEntriesByDate(
        glossaryId: number,
        order: string,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByDateWSParams = {
            id: glossaryId,
            order: order,
            sort: 'DESC',
            from: options.from || 0,
            limit: options.limit || ADDON_MOD_GLOSSARY_LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByDateCacheKey(glossaryId, order),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
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
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateEntriesByDate(glossaryId: number, order: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByDateCacheKey(glossaryId, order);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the entries by letter cache key.
     *
     * @param glossaryId Glossary Id.
     * @returns Cache key.
     */
    protected getEntriesByLetterCacheKey(glossaryId: number): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}entriesByLetter:${glossaryId}:ALL`;
    }

    /**
     * Get entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @returns Resolved with the entries.
     */
    async getEntriesByLetter(
        glossaryId: number,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const from = options.from || 0;
        const limit = options.limit || ADDON_MOD_GLOSSARY_LIMIT_ENTRIES;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesByLetterWSParams = {
            id: glossaryId,
            letter: 'ALL',
            from,
            limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesByLetterCacheKey(glossaryId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModGlossaryGetEntriesWSResponse>(
            'mod_glossary_get_entries_by_letter',
            params,
            preSets,
        );

        if (limit === ADDON_MOD_GLOSSARY_LIMIT_ENTRIES) {
            // Store entries in background, don't block the user for this.
            CorePromiseUtils.ignoreErrors(this.storeEntries(glossaryId, result.entries, from, site.getId()));
        }

        return result;
    }

    /**
     * Invalidate cache of entries by letter.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateEntriesByLetter(glossaryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesByLetterCacheKey(glossaryId);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the entries by search cache key.
     *
     * @param glossaryId Glossary Id.
     * @param query The search query.
     * @param fullSearch Whether or not full search is required.
     * @returns Cache key.
     */
    protected getEntriesBySearchCacheKey(glossaryId: number, query: string, fullSearch: boolean): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}entriesBySearch:${glossaryId}:${fullSearch}:CONCEPT:ASC:${query}`;
    }

    /**
     * Get entries by search.
     *
     * @param glossaryId Glossary Id.
     * @param query The search query.
     * @param fullSearch Whether or not full search is required.
     * @param options Get entries options.
     * @returns Resolved with the entries.
     */
    async getEntriesBySearch(
        glossaryId: number,
        query: string,
        fullSearch: boolean,
        options: AddonModGlossaryGetEntriesOptions = {},
    ): Promise<AddonModGlossaryGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntriesBySearchWSParams = {
            id: glossaryId,
            query: query,
            fullsearch: fullSearch,
            order: 'CONCEPT',
            sort: 'ASC',
            from: options.from || 0,
            limit: options.limit || ADDON_MOD_GLOSSARY_LIMIT_ENTRIES,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
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
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateEntriesBySearch(
        glossaryId: number,
        query: string,
        fullSearch: boolean,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const key = this.getEntriesBySearchCacheKey(glossaryId, query, fullSearch);

        await site.invalidateWsCacheForKey(key);
    }

    /**
     * Get the glossary categories cache key.
     *
     * @param glossaryId Glossary Id.
     * @returns The cache key.
     */
    protected getCategoriesCacheKey(glossaryId: number): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}categories:${glossaryId}`;
    }

    /**
     * Get all the categories related to the glossary.
     *
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @returns Promise resolved with the categories if supported or empty array if not.
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
     * @returns Promise resolved with the categories.
     */
    protected async getCategories(
        glossaryId: number,
        categories: AddonModGlossaryCategory[],
        site: CoreSite,
        options: AddonModGlossaryGetCategoriesOptions = {},
    ): Promise<AddonModGlossaryCategory[]> {
        const from = options.from || 0;
        const limit = options.limit || ADDON_MOD_GLOSSARY_LIMIT_CATEGORIES;

        const params: AddonModGlossaryGetCategoriesWSParams = {
            id: glossaryId,
            from,
            limit,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCategoriesCacheKey(glossaryId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModGlossaryGetCategoriesWSResponse>('mod_glossary_get_categories', params, preSets);

        categories = categories.concat(response.categories);
        const canLoadMore = (from + limit) < response.count;
        if (canLoadMore) {
            return this.getCategories(glossaryId, categories, site, {
                ...options,
                from: from + limit,
            });
        }

        return categories;
    }

    /**
     * Invalidate cache of categories by glossary id.
     *
     * @param glossaryId Glossary Id.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateCategories(glossaryId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCategoriesCacheKey(glossaryId));
    }

    /**
     * Get an entry by ID cache key.
     *
     * @param entryId Entry Id.
     * @returns Cache key.
     */
    protected getEntryCacheKey(entryId: number): string {
        return `${AddonModGlossaryProvider.ROOT_CACHE_KEY}getEntry:${entryId}`;
    }

    /**
     * Get one entry by ID.
     *
     * @param entryId Entry ID.
     * @param options Other options.
     * @returns Promise resolved with the entry.
     */
    async getEntry(entryId: number, options: AddonModGlossaryGetEntryOptions = {}): Promise<AddonModGlossaryGetEntryByIdResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModGlossaryGetEntryByIdWSParams = {
            id: entryId,
        };
        const preSets = {
            cacheKey: this.getEntryCacheKey(entryId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
            filter: options.filter !== false,
            rewriteurls: options.filter !== false,
        };

        try {
            return await site.read<AddonModGlossaryGetEntryByIdWSResponse>('mod_glossary_get_entry_by_id', params, preSets);
        } catch (error) {
            if (!preSets.getFromCache) {
                // Cache disabled, throw the error instead of returning the cached data from the list of entries.
                throw error;
            }

            // Entry not found. Search it in the list of entries.
            try {
                const data = await this.getStoredDataForEntry(entryId, site.getId());

                if (data.from !== undefined) {
                    const response = await CorePromiseUtils.ignoreErrors(
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
     * @returns Promise resolved with the glossary ID and the "from".
     */
    async getStoredDataForEntry(entryId: number, siteId?: string): Promise<{ glossaryId: number; from: number }> {
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
     * @returns Promise resolved with the entry data.
     */
    protected async getEntryFromList(
        glossaryId: number,
        entryId: number,
        from: number,
        loadNext: boolean,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModGlossaryGetEntryByIdResponse> {
        // Get the entries from this "page" and check if the entry we're looking for is in it.
        const result = await this.getEntriesByLetter(glossaryId, {
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
    }

    /**
     * Check whether the site can delete glossary entries.
     *
     * @param siteId Site id.
     * @returns Whether the site can delete entries.
     */
    async canDeleteEntries(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_glossary_delete_entry');
    }

    /**
     * Check whether the site can update glossary entries.
     *
     * @param siteId Site id.
     * @returns Whether the site can update entries.
     * @since 3.10
     */
    async canUpdateEntries(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('mod_glossary_update_entry');
    }

    /**
     * Performs the whole fetch of the entries using the proper function and arguments.
     *
     * @param fetchFunction Function to fetch.
     * @param options Other options.
     * @returns Promise resolved with all entrries.
     */
    fetchAllEntries(
        fetchFunction: (options?: AddonModGlossaryGetEntriesOptions) => Promise<AddonModGlossaryGetEntriesWSResponse>,
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
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        const glossary = await this.getGlossary(courseId, moduleId);

        await CorePromiseUtils.ignoreErrors(this.invalidateGlossaryEntries(glossary));

        await CorePromiseUtils.allPromises([
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
     */
    async invalidateGlossaryEntries(glossary: AddonModGlossaryGlossary, onlyEntriesList?: boolean, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        if (!onlyEntriesList) {
            promises.push(this.fetchAllEntries((options) => this.getEntriesByLetter(glossary.id, options), {
                cmId: glossary.coursemodule,
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                siteId,
            }).then((entries) => this.invalidateEntries(entries, siteId)));
        }

        glossary.browsemodes.forEach((mode) => {
            switch (mode) {
                case 'letter':
                    promises.push(this.invalidateEntriesByLetter(glossary.id, siteId));
                    break;
                case 'cat':
                    promises.push(this.invalidateEntriesByCategory(glossary.id, siteId));
                    break;
                case 'date':
                    promises.push(this.invalidateEntriesByDate(glossary.id, 'CREATION', siteId));
                    promises.push(this.invalidateEntriesByDate(glossary.id, 'UPDATE', siteId));
                    break;
                case 'author':
                    promises.push(this.invalidateEntriesByAuthor(glossary.id, siteId));
                    break;
                default:
            }
        });

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Get one glossary by cmid.
     *
     * @param courseId Course Id.
     * @param cmId Course Module Id.
     * @param options Other options.
     * @returns Promise resolved with the glossary.
     */
    async getGlossary(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModGlossaryGlossary> {
        const glossaries = await this.getCourseGlossaries(courseId, options);

        return CoreCourseModuleHelper.getActivityByCmId(glossaries, cmId);
    }

    /**
     * Get one glossary by glossary ID.
     *
     * @param courseId Course Id.
     * @param glossaryId Glossary Id.
     * @param options Other options.
     * @returns Promise resolved with the glossary.
     */
    async getGlossaryById(
        courseId: number,
        glossaryId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModGlossaryGlossary> {
        const glossaries = await this.getCourseGlossaries(courseId, options);

        return CoreCourseModuleHelper.getActivityByField(glossaries, 'id', glossaryId);
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
     * @returns Promise resolved with entry ID if entry was created in server, false if stored in device.
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
            if (otherOptions.checkDuplicates) {
                // Check if the entry is duplicated in online or offline mode.
                const conceptUsed = await this.isConceptUsed(glossaryId, concept, {
                    cmId: otherOptions.cmId,
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

            await AddonModGlossaryOffline.addOfflineEntry(
                glossaryId,
                concept,
                definition,
                courseId,
                otherOptions.timeCreated ?? Date.now(),
                entryOptions,
                attachments,
                otherOptions.siteId,
                undefined,
            );

            return false;
        };

        if (!CoreNetwork.isOnline() && otherOptions.allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        try {
            // Try to add it in online.
            const entryId = await this.addEntryOnline(
                glossaryId,
                concept,
                definition,
                entryOptions,
                <number> attachments,
                otherOptions.siteId,
            );

            return entryId;
        } catch (error) {
            if (otherOptions.allowOffline && !CoreWSError.isWebServiceError(error)) {
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
     * @returns Promise resolved with the entry ID if created, rejected otherwise.
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
            definitionformat: DEFAULT_TEXT_FORMAT,
            options: CoreObject.toArrayOfObjects(options || {}, 'name', 'value'),
        };

        if (attachId) {
            params.options?.push({
                name: 'attachmentsid',
                value: String(attachId),
            });
        }

        const response = await site.write<AddonModGlossaryAddEntryWSResponse>('mod_glossary_add_entry', params);

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_ADDED, { glossaryId, entryId: response.entryid }, siteId);

        return response.entryid;
    }

    /**
     * Update an existing entry on a glossary.
     *
     * @param glossaryId Glossary ID.
     * @param entryId Entry ID.
     * @param concept Glossary entry concept.
     * @param definition Glossary entry concept definition.
     * @param options Options for the entry.
     * @param attachId Attachments ID (if any attachment).
     * @param siteId Site ID. If not defined, current site.
     */
    async updateEntry(
        glossaryId: number,
        entryId: number,
        concept: string,
        definition: string,
        options?: Record<string, AddonModGlossaryEntryOption>,
        attachId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModGlossaryUpdateEntryWSParams = {
            entryid: entryId,
            concept: concept,
            definition: definition,
            definitionformat: DEFAULT_TEXT_FORMAT,
            options: CoreObject.toArrayOfObjects(options || {}, 'name', 'value'),
        };

        if (attachId) {
            params.options?.push({
                name: 'attachmentsid',
                value: String(attachId),
            });
        }

        const response = await site.write<AddonModGlossaryUpdateEntryWSResponse>('mod_glossary_update_entry', params);

        if (!response.result) {
            throw new CoreError(response.warnings?.[0].message ?? 'Error updating entry');
        }

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_UPDATED, { glossaryId, entryId }, siteId);
    }

    /**
     * Delete entry.
     *
     * @param glossaryId Glossary id.
     * @param entryId Entry id.
     */
    async deleteEntry(glossaryId: number, entryId: number): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();

        await site.write('mod_glossary_delete_entry', { entryid: entryId });

        CoreEvents.trigger(ADDON_MOD_GLOSSARY_ENTRY_DELETED, { glossaryId, entryId });
    }

    /**
     * Check if a entry concept is already used.
     *
     * @param glossaryId Glossary ID.
     * @param concept Concept to check.
     * @param options Other options.
     * @returns Promise resolved with true if used, resolved with false if not used or error.
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
            const entries = await this.fetchAllEntries((options) => this.getEntriesByLetter(glossaryId, options), {
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
     * Report a glossary as being viewed.
     *
     * @param glossaryId Glossary ID.
     * @param mode The mode in which the glossary was viewed.
     * @param siteId Site ID. If not defined, current site.
     */
    async logView(glossaryId: number, mode: string, siteId?: string): Promise<void> {
        const params: AddonModGlossaryViewGlossaryWSParams = {
            id: glossaryId,
            mode: mode,
        };

        await CoreCourseLogHelper.log(
            'mod_glossary_view_glossary',
            params,
            ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            glossaryId,
            siteId,
        );
    }

    /**
     * Report a glossary entry as being viewed.
     *
     * @param entryId Entry ID.
     * @param glossaryId Glossary ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async logEntryView(entryId: number, glossaryId: number, siteId?: string): Promise<void> {
        const params: AddonModGlossaryViewEntryWSParams = {
            id: entryId,
        };

        await CoreCourseLogHelper.log(
            'mod_glossary_view_entry',
            params,
            ADDON_MOD_GLOSSARY_COMPONENT_LEGACY,
            glossaryId,
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

    /**
     * Prepare entry for edition.
     *
     * @param entryId Entry ID.
     * @param siteId Site ID.
     * @returns Data of prepared area.
     */
    async prepareEntryForEdition(
        entryId: number,
        siteId?: string,
    ): Promise<AddonModGlossaryPrepareEntryForEditionWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModGlossaryPrepareEntryForEditionWSParams = {
            entryid: entryId,
        };

        return await site.write('mod_glossary_prepare_entry_for_edition', params);
    }

}

export const AddonModGlossary = makeSingleton(AddonModGlossaryProvider);

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_GLOSSARY_ENTRY_ADDED]: AddonModGlossaryEntryAddedEventData;
        [ADDON_MOD_GLOSSARY_ENTRY_UPDATED]: AddonModGlossaryEntryUpdatedEventData;
        [ADDON_MOD_GLOSSARY_ENTRY_DELETED]: AddonModGlossaryEntryDeletedEventData;
    }

}

/**
 * ADDON_MOD_GLOSSARY_ENTRY_ADDED event payload.
 */
export type AddonModGlossaryEntryAddedEventData = {
    glossaryId: number;
    entryId?: number;
    timecreated?: number;
};

/**
 * ADDON_MOD_GLOSSARY_ENTRY_UPDATED event payload.
 */
export type AddonModGlossaryEntryUpdatedEventData = {
    glossaryId: number;
    entryId?: number;
    timecreated?: number;
};

/**
 * ADDON_MOD_GLOSSARY_ENTRY_DELETED event payload.
 */
export type AddonModGlossaryEntryDeletedEventData = {
    glossaryId: number;
    entryId?: number;
    timecreated?: number;
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
export type AddonModGlossaryGlossary = CoreCourseModuleStandardElements & {
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
    definitionformat: CoreTextFormat; // Definition format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
    definitionformat: CoreTextFormat; // Definition format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Params of mod_glossary_update_entry WS.
 */
export type AddonModGlossaryUpdateEntryWSParams = {
    entryid: number; // Glossary entry id to update.
    concept: string; // Glossary concept.
    definition: string; // Glossary concept definition.
    definitionformat: CoreTextFormat; // Definition format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Data returned by mod_glossary_update_entry WS.
 */
export type AddonModGlossaryUpdateEntryWSResponse = {
    result: boolean; // The update result.
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
 * Params of mod_glossary_prepare_entry_for_edition WS.
 */
type AddonModGlossaryPrepareEntryForEditionWSParams = {
    entryid: number; // Glossary entry id to update.
};

/**
 * Data returned by mod_glossary_prepare_entry_for_edition WS.
 */
export type AddonModGlossaryPrepareEntryForEditionWSResponse = {
    inlineattachmentsid: number; // Draft item id for the text editor.
    attachmentsid: number; // Draft item id for the file manager.
    areas: { // File areas including options.
        area: string; // File area name.
        options: { // Draft file area options.
            name: string; // Name of option.
            value: string; // Value of option.
        }[];
    }[];
    aliases: string[];
    categories: number[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Options to pass to add entry.
 */
export type AddonModGlossaryAddEntryOptions = {
    timeCreated?: number; // The time the entry was created. If not defined, current time.
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
    limit?: number; // Number of records to return. Defaults to ADDON_MOD_GLOSSARY_LIMIT_ENTRIES.
};

/**
 * Options to pass to get categories.
 */
export type AddonModGlossaryGetCategoriesOptions = CoreCourseCommonModWSOptions & {
    from?: number; // Start returning records from here. Defaults to 0.
    limit?: number; // Number of records to return. Defaults to ADDON_MOD_GLOSSARY_LIMIT_CATEGORIES.
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

/**
 * Options for getEntry.
 */
export type AddonModGlossaryGetEntryOptions = CoreCourseCommonModWSOptions & {
    filter?: boolean; // Defaults to true. If false, text won't be filtered and URLs won't be rewritten.
};
