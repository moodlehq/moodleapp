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
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSExternalWarning, CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModWikiPageDBRecord } from './database/wiki';
import { AddonModWikiOffline } from './wiki-offline';
import { AddonModWikiAutoSyncData, AddonModWikiManualSyncData } from './wiki-sync';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_WIKI_AUTO_SYNCED,
    ADDON_MOD_WIKI_COMPONENT,
    ADDON_MOD_WIKI_MANUAL_SYNCED,
    ADDON_MOD_WIKI_PAGE_CREATED_EVENT,
} from '../constants';

/**
 * Service that provides some features for wikis.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWikiProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModWiki:';

    protected subwikiListsCache: {[wikiId: number]: AddonModWikiSubwikiListData} = {};
    protected wikiFirstViewedPage: Record<string, Record<number, string>> = {};
    protected editedPage?: AddonModWikiEditedPageData;

    constructor() {
        // Clear subwiki lists cache on logout.
        CoreEvents.on(CoreEvents.LOGIN, () => {
            this.clearSubwikiList();
        });
    }

    /**
     * Clear subwiki list cache for a certain wiki or all of them.
     *
     * @param wikiId wiki Id, if not provided all will be cleared.
     */
    clearSubwikiList(wikiId?: number): void {
        if (wikiId === undefined) {
            this.subwikiListsCache = {};
        } else {
            delete this.subwikiListsCache[wikiId];
        }
    }

    /**
     * Delete and return the edited page data if any.
     *
     * @returns Edited page data, undefined if no data.
     */
    consumeEditedPageData(): AddonModWikiEditedPageData | undefined {
        const editedPage = this.editedPage;
        delete this.editedPage;

        return editedPage;
    }

    /**
     * Save wiki contents on a page or section.
     *
     * @param pageId Page ID.
     * @param content content to be saved.
     * @param section section to get.
     * @returns Promise resolved with the page ID.
     */
    async editPage(pageId: number, content: string, section?: string, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWikiEditPageWSParams = {
            pageid: pageId,
            content: content,
        };

        if (section) {
            params.section = section;
        }

        const response = await site.write<AddonModWikiEditPageWSResponse>('mod_wiki_edit_page', params);

        return response.pageid;
    }

    /**
     * Get the first page opened for a wiki in the app if it isn't the current one.
     *
     * @param wikiId Wiki ID.
     * @param path Path.
     * @returns The first wiki page opened if any.
     */
    getFirstWikiPageOpened(wikiId: number, path: string): string | undefined {
        const tab = CoreNavigator.getMainMenuTabFromPath(path);
        if (!tab) {
            return;
        }

        if (this.wikiFirstViewedPage[tab] && this.wikiFirstViewedPage[tab][wikiId] !== path) {
            return this.wikiFirstViewedPage[tab][wikiId];
        }
    }

    /**
     * Get a wiki page contents.
     *
     * @param pageId Page ID.
     * @param options Other options.
     * @returns Promise resolved with the page data.
     */
    async getPageContents(pageId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModWikiPageContents> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWikiGetPageContentsWSParams = {
            pageid: pageId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getPageContentsCacheKey(pageId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: ADDON_MOD_WIKI_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWikiGetPageContentsWSResponse>('mod_wiki_get_page_contents', params, preSets);

        return response.page;
    }

    /**
     * Get cache key for wiki Pages Contents WS calls.
     *
     * @param pageId Wiki Page ID.
     * @returns Cache key.
     */
    protected getPageContentsCacheKey(pageId: number): string {
        return AddonModWikiProvider.ROOT_CACHE_KEY + 'page:' + pageId;
    }

    /**
     * Get a wiki page contents for editing. It does not cache calls.
     *
     * @param pageId Page ID.
     * @param section Section to get.
     * @param lockOnly Just renew lock and not return content.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with page contents.
     */
    async getPageForEditing(
        pageId: number,
        section?: string,
        lockOnly?: boolean,
        siteId?: string,
    ): Promise<AddonModWikiWSEditPageSection> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModWikiGetPageForEditingWSParams = {
            pageid: pageId,
        };
        if (section) {
            params.section = section;
        }
        if (lockOnly) {
            params.lockonly = true;
        }

        const response = await site.write<AddonModWikiGetPageForEditingWSResponse>('mod_wiki_get_page_for_editing', params);

        return response.pagesection;
    }

    /**
     * Gets the list of files from a specific subwiki.
     *
     * @param wikiId Wiki ID.
     * @param options Other options.
     * @returns Promise resolved with subwiki files.
     */
    async getSubwikiFiles(wikiId: number, options: AddonModWikiGetSubwikiFilesOptions = {}): Promise<CoreWSFile[]> {
        const site = await CoreSites.getSite(options.siteId);

        const groupId = options.groupId || -1;
        const userId = options.userId || 0;

        const params: AddonModWikiGetSubwikiFilesWSParams = {
            wikiid: wikiId,
            groupid: groupId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubwikiFilesCacheKey(wikiId, groupId, userId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: ADDON_MOD_WIKI_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWikiGetSubwikiFilesWSResponse>('mod_wiki_get_subwiki_files', params, preSets);

        return response.files;
    }

    /**
     * Get cache key for wiki Subwiki Files WS calls.
     *
     * @param wikiId Wiki ID.
     * @param groupId Group ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getSubwikiFilesCacheKey(wikiId: number, groupId: number, userId: number): string {
        return this.getSubwikiFilesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Files WS calls.
     *
     * @param wikiId Wiki ID.
     * @returns Cache key.
     */
    protected getSubwikiFilesCacheKeyPrefix(wikiId: number): string {
        return AddonModWikiProvider.ROOT_CACHE_KEY + 'subwikifiles:' + wikiId;
    }

    /**
     * Get a list of subwikis and related data for a certain wiki from the cache.
     *
     * @param wikiId wiki Id
     * @returns Subwiki list and related data.
     */
    getSubwikiList(wikiId: number): AddonModWikiSubwikiListData {
        return this.subwikiListsCache[wikiId];
    }

    /**
     * Get the list of Pages of a SubWiki.
     *
     * @param wikiId Wiki ID.
     * @param options Other options.
     * @returns Promise resolved with wiki subwiki pages.
     */
    async getSubwikiPages(wikiId: number, options: AddonModWikiGetSubwikiPagesOptions = {}): Promise<AddonModWikiSubwikiPage[]> {
        const site = await CoreSites.getSite(options.siteId);

        const groupId = options.groupId || -1;
        const userId = options.userId || 0;
        const sortBy = options.sortBy || 'title';
        const sortDirection = options.sortDirection || 'ASC';

        const params: AddonModWikiGetSubwikiPagesWSParams = {
            wikiid: wikiId,
            groupid: groupId,
            userid: userId,
            options: {
                sortby: sortBy,
                sortdirection: sortDirection,
                includecontent: options.includeContent ? 1 : 0,
            },
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSubwikiPagesCacheKey(wikiId, groupId, userId),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: ADDON_MOD_WIKI_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWikiGetSubwikiPagesWSResponse>('mod_wiki_get_subwiki_pages', params, preSets);

        return response.pages;
    }

    /**
     * Get cache key for wiki Subwiki Pages WS calls.
     *
     * @param wikiId Wiki ID.
     * @param groupId Group ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getSubwikiPagesCacheKey(wikiId: number, groupId: number, userId: number): string {
        return this.getSubwikiPagesCacheKeyPrefix(wikiId) + ':' + groupId + ':' + userId;
    }

    /**
     * Get cache key for all wiki Subwiki Pages WS calls.
     *
     * @param wikiId Wiki ID.
     * @returns Cache key.
     */
    protected getSubwikiPagesCacheKeyPrefix(wikiId: number): string {
        return AddonModWikiProvider.ROOT_CACHE_KEY + 'subwikipages:' + wikiId;
    }

    /**
     * Get all the subwikis of a wiki.
     *
     * @param wikiId Wiki ID.
     * @param options Other options.
     * @returns Promise resolved with subwikis.
     */
    async getSubwikis(wikiId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModWikiSubwiki[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWikiGetSubwikisWSParams = {
            wikiid: wikiId,
        };
        const preSets = {
            cacheKey: this.getSubwikisCacheKey(wikiId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: ADDON_MOD_WIKI_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWikiGetSubwikisWSResponse>('mod_wiki_get_subwikis', params, preSets);

        return response.subwikis.map(subwiki => ({
            ...subwiki,
            groupid: Number(subwiki.groupid), // Convert groupid to number.
        }));
    }

    /**
     * Get cache key for get wiki subWikis WS calls.
     *
     * @param wikiId Wiki ID.
     * @returns Cache key.
     */
    protected getSubwikisCacheKey(wikiId: number): string {
        return AddonModWikiProvider.ROOT_CACHE_KEY + 'subwikis:' + wikiId;
    }

    /**
     * Get a wiki by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the wiki is retrieved.
     */
    getWiki(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModWikiWiki> {
        return this.getWikiByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a wiki with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the wiki is retrieved.
     */
    protected async getWikiByField(
        courseId: number,
        key: string,
        value: unknown,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModWikiWiki> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWikiGetWikisByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getWikiDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: ADDON_MOD_WIKI_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModWikiGetWikisByCoursesWSResponse>('mod_wiki_get_wikis_by_courses', params, preSets);

        const currentWiki = response.wikis.find((wiki) => wiki[key] == value);
        if (currentWiki) {
            return currentWiki;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Get a wiki by wiki ID.
     *
     * @param courseId Course ID.
     * @param id Wiki ID.
     * @param options Other options.
     * @returns Promise resolved when the wiki is retrieved.
     */
    getWikiById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModWikiWiki> {
        return this.getWikiByField(courseId, 'id', id, options);
    }

    /**
     * Get cache key for wiki data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getWikiDataCacheKey(courseId: number): string {
        return AddonModWikiProvider.ROOT_CACHE_KEY + 'wiki:' + courseId;
    }

    /**
     * Gets a list of files to download for a wiki, using a format similar to module.contents from get_course_contents.
     *
     * @param wiki Wiki.
     * @param options Other options.
     * @returns Promise resolved with the list of files.
     */
    async getWikiFileList(wiki: AddonModWikiWiki, options: CoreSitesCommonWSOptions = {}): Promise<CoreWSFile[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        let files: CoreWSFile[] = [];
        const modOptions = {
            cmId: wiki.coursemodule,
            ...options, // Include all options.
        };

        const subwikis = await this.getSubwikis(wiki.id, modOptions);

        await Promise.all(subwikis.map(async (subwiki) => {
            const subwikiOptions = {
                groupId: subwiki.groupid,
                userId: subwiki.userid,
                ...modOptions, // Include all options.
            };

            const subwikiFiles = await this.getSubwikiFiles(subwiki.wikiid, subwikiOptions);

            files = files.concat(subwikiFiles);
        }));

        return files;
    }

    /**
     * Gets a list of all pages for a Wiki.
     *
     * @param wiki Wiki.
     * @param options Other options.
     * @returns Page list.
     */
    async getWikiPageList(wiki: AddonModWikiWiki, options: CoreSitesCommonWSOptions = {}): Promise<AddonModWikiSubwikiPage[]> {
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        let pages: AddonModWikiSubwikiPage[] = [];
        const modOptions = {
            cmId: wiki.coursemodule,
            ...options, // Include all options.
        };

        const subwikis = await this.getSubwikis(wiki.id, modOptions);

        await Promise.all(subwikis.map(async (subwiki) => {
            const subwikiPages = await this.getSubwikiPages(subwiki.wikiid, {
                groupId: subwiki.groupid,
                userId: subwiki.userid,
                ...modOptions, // Include all options.
            });

            pages = pages.concat(subwikiPages);
        }));

        return pages;
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const wiki = await this.getWiki(courseId, moduleId, { siteId });

        await Promise.all([
            this.invalidateWikiData(courseId, siteId),
            this.invalidateSubwikis(wiki.id, siteId),
            this.invalidateSubwikiPages(wiki.id, siteId),
            this.invalidateSubwikiFiles(wiki.id, siteId),
        ]);
    }

    /**
     * Invalidates page content WS call for a certain page.
     *
     * @param pageId Wiki Page ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidatePage(pageId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getPageContentsCacheKey(pageId));
    }

    /**
     * Invalidates all the subwiki files WS calls for a certain wiki.
     *
     * @param wikiId Wiki ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubwikiFiles(wikiId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getSubwikiFilesCacheKeyPrefix(wikiId));
    }

    /**
     * Invalidates all the subwiki pages WS calls for a certain wiki.
     *
     * @param wikiId Wiki ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubwikiPages(wikiId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getSubwikiPagesCacheKeyPrefix(wikiId));
    }

    /**
     * Invalidates all the get subwikis WS calls for a certain wiki.
     *
     * @param wikiId Wiki ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSubwikis(wikiId: number, siteId?: string): Promise<void> {
        this.clearSubwikiList(wikiId);

        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSubwikisCacheKey(wikiId));
    }

    /**
     * Invalidates wiki data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateWikiData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getWikiDataCacheKey(courseId));
    }

    /**
     * Check if a page title is already used.
     *
     * @param wikiId Wiki ID.
     * @param subwikiId Subwiki ID.
     * @param title Page title.
     * @param options Other options.
     * @returns Promise resolved with true if used, resolved with false if not used or cannot determine.
     */
    async isTitleUsed(
        wikiId: number,
        subwikiId: number,
        title: string,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<boolean> {
        try {
            // First get the subwiki.
            const subwikis = await this.getSubwikis(wikiId, options);

            // Search the subwiki.
            const subwiki = subwikis.find((subwiki) => subwiki.id == subwikiId);

            if (!subwiki) {
                return false;
            }

            // Now get all the pages of the subwiki.
            const pages = await this.getSubwikiPages(wikiId, {
                groupId: subwiki.groupid,
                userId: subwiki.userid,
                ...options, // Include all options.
            });

            // Check if there's any page with the same title.
            const page = pages.find((page) => page.title == title);

            return !!page;
        } catch {
            return false;
        }
    }

    /**
     * Report a wiki page as being viewed.
     *
     * @param id Page ID.
     * @param wikiId Wiki ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logPageView(id: number, wikiId: number, siteId?: string): Promise<void> {
        const params: AddonModWikiViewPageWSParams = {
            pageid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_wiki_view_page',
            params,
            ADDON_MOD_WIKI_COMPONENT,
            wikiId,
            siteId,
        );
    }

    /**
     * Report the wiki as being viewed.
     *
     * @param id Wiki ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModWikiViewWikiWSParams = {
            wikiid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_wiki_view_wiki',
            params,
            ADDON_MOD_WIKI_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Create a new page on a subwiki.
     *
     * @param title Title to create the page.
     * @param content Content to save on the page.
     * @param options Other options.
     * @returns Promise resolved with page ID if page was created in server, -1 if stored in device.
     */
    async newPage(title: string, content: string, options: AddonModWikiNewPageOptions = {}): Promise<number> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a new page to be synchronized later.
        const storeOffline = async (): Promise<number> => {
            if (options.wikiId && options.subwikiId) {
                // We have wiki ID, check if there's already an online page with this title and subwiki.
                const used = await CoreUtils.ignoreErrors(this.isTitleUsed(options.wikiId, options.subwikiId, title, {
                    cmId: options.cmId,
                    readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
                    siteId: options.siteId,
                }));

                if (used) {
                    throw new CoreError(Translate.instant('addon.mod_wiki.pageexists'));
                }
            }

            await AddonModWikiOffline.saveNewPage(
                title,
                content,
                options.subwikiId,
                options.wikiId,
                options.userId,
                options.groupId,
                options.siteId,
            );

            return -1;
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // Discard stored content for this page. If it exists it means the user is editing it.
        await AddonModWikiOffline.deleteNewPage(
            title,
            options.subwikiId,
            options.wikiId,
            options.userId,
            options.groupId,
            options.siteId,
        );

        try {
            // Try to create it in online.
            return await this.newPageOnline(title, content, options);
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that the page cannot be added.
                throw error;
            }

            // Couldn't connect to server, store in offline.
            return storeOffline();
        }
    }

    /**
     * Create a new page on a subwiki. It will fail if offline or cannot connect.
     *
     * @param title Title to create the page.
     * @param content Content to save on the page.
     * @param options Other options.
     * @returns Promise resolved with the page ID if created, rejected otherwise.
     */
    async newPageOnline(title: string, content: string, options: AddonModWikiNewPageOnlineOptions = {}): Promise<number> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModWikiNewPageWSParams = {
            title: title,
            content: content,
            contentformat: 'html',
        };

        const subwikiId = AddonModWikiOffline.convertToPositiveNumber(options.subwikiId);
        const wikiId = AddonModWikiOffline.convertToPositiveNumber(options.wikiId);

        if (subwikiId && subwikiId > 0) {
            params.subwikiid = subwikiId;
        } else if (wikiId) {
            params.wikiid = wikiId;
            params.userid = AddonModWikiOffline.convertToPositiveNumber(options.userId);
            params.groupid = AddonModWikiOffline.convertToPositiveNumber(options.groupId);
        }

        const response = await site.write<AddonModWikiNewPageWSResponse>('mod_wiki_new_page', params);

        return response.pageid;
    }

    /**
     * Set edited page data.
     *
     * @param data Data.
     */
    setEditedPageData(data: AddonModWikiEditedPageData): void {
        this.editedPage = data;
    }

    /**
     * Save subwiki list for a wiki to the cache.
     *
     * @param wikiId Wiki Id.
     * @param subwikis List of subwikis.
     * @param count Number of subwikis in the subwikis list.
     * @param subwikiId Subwiki Id currently selected.
     * @param userId User Id currently selected.
     * @param groupId Group Id currently selected.
     */
    setSubwikiList(
        wikiId: number,
        subwikis: AddonModWikiSubwikiListGrouping[],
        count: number,
        subwikiId: number,
        userId: number,
        groupId: number,
    ): void {
        this.subwikiListsCache[wikiId] = {
            count: count,
            subwikiSelected: subwikiId,
            userSelected: userId,
            groupSelected: groupId,
            subwikis: subwikis,
        };
    }

    /**
     * Sort an array of wiki pages by title.
     *
     * @param pages Pages to sort.
     * @param desc True to sort in descendent order, false to sort in ascendent order. Defaults to false.
     * @returns Sorted pages.
     */
    sortPagesByTitle<T extends AddonModWikiSubwikiPage | AddonModWikiPageDBRecord>(
        pages: T[],
        desc?: boolean,
    ): T[] {
        return pages.sort((a, b) => {
            let result = a.title >= b.title ? 1 : -1;

            if (desc) {
                result = -result;
            }

            return result;
        });
    }

    /**
     * Check if a wiki has a certain subwiki.
     *
     * @param wikiId Wiki ID.
     * @param subwikiId Subwiki ID to search.
     * @param options Other options.
     * @returns Promise resolved with true if it has subwiki, resolved with false otherwise.
     */
    async wikiHasSubwiki(wikiId: number, subwikiId: number, options: CoreCourseCommonModWSOptions = {}): Promise<boolean> {
        try {
            // Get the subwikis to check if any of them matches the one passed as param.
            const subwikis = await this.getSubwikis(wikiId, options);

            const subwiki = subwikis.find((subwiki) => subwiki.id == subwikiId);

            return !!subwiki;
        } catch {
            // Not found, return false.
            return false;
        }
    }

    /**
     * If this page is the first opened page for a wiki, remove the stored path so it's no longer the first viewed page.
     *
     * @param wikiId Wiki ID.
     * @param path Path.
     */
    wikiPageClosed(wikiId: number, path: string): void {
        const tab = CoreNavigator.getMainMenuTabFromPath(path);
        if (!tab) {
            return;
        }

        this.wikiFirstViewedPage[tab] = this.wikiFirstViewedPage[tab] || {};

        if (this.wikiFirstViewedPage[tab][wikiId] === path) {
            delete this.wikiFirstViewedPage[tab][wikiId];
        }
    }

    /**
     * If this page is the first opened page for a wiki, save its path so we can go back to it.
     *
     * @param wikiId Wiki ID.
     * @param path Path.
     */
    wikiPageOpened(wikiId: number, path: string): void {
        const tab = CoreNavigator.getMainMenuTabFromPath(path);
        if (!tab) {
            return;
        }

        this.wikiFirstViewedPage[tab] = this.wikiFirstViewedPage[tab] || {};

        if (this.wikiFirstViewedPage[tab][wikiId]) {
            // There's already an opened page for this wiki.
            return;
        }

        this.wikiFirstViewedPage[tab][wikiId] = path;
    }

}

export const AddonModWiki = makeSingleton(AddonModWikiProvider);

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_WIKI_PAGE_CREATED_EVENT]: AddonModWikiPageCreatedData;
        [ADDON_MOD_WIKI_AUTO_SYNCED]: AddonModWikiAutoSyncData;
        [ADDON_MOD_WIKI_MANUAL_SYNCED]: AddonModWikiManualSyncData;
    }

}

/**
 * Options to pass to getSubwikiFiles.
 */
export type AddonModWikiGetSubwikiFilesOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User to get files from.
    groupId?: number; // Group to get files from.
};

/**
 * Options to pass to getSubwikiPages.
 */
export type AddonModWikiGetSubwikiPagesOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User to get pages from.
    groupId?: number; // Group to get pages from.
    sortBy?: string; // The attribute to sort the returned list. Defaults to 'title'.
    sortDirection?: string; // Direction to sort the returned list (ASC | DESC). Defaults to 'ASC'.
    includeContent?: boolean; // Whether the pages have to include their content.
};

/**
 * Options to pass to newPageOnline.
 */
export type AddonModWikiNewPageOnlineOptions = {
    subwikiId?: number; // Subwiki ID. If not defined, wikiId, userId and groupId should be defined.
    wikiId?: number; // Wiki ID. Optional, will be used to create a new subwiki if subwikiId not supplied.
    userId?: number; // User ID. Optional, will be used to create a new subwiki if subwikiId not supplied.
    groupId?: number; // Group ID. Optional, will be used to create a new subwiki if subwikiId not supplied.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to pass to newPage.
 */
export type AddonModWikiNewPageOptions = AddonModWikiNewPageOnlineOptions & {
    cmId?: number; // Module ID.
};

export type AddonModWikiSubwikiListData = {
    count: number; // Number of subwikis.
    subwikiSelected: number; // Subwiki ID currently selected.
    userSelected: number; // User of the subwiki currently selected.
    groupSelected: number; // Group of the subwiki currently selected.
    subwikis: AddonModWikiSubwikiListGrouping[]; // List of subwikis, grouped by a certain label.
};

export type AddonModWikiSubwikiListGrouping = {
    label: string;
    subwikis: AddonModWikiSubwikiListSubwiki[];
};

export type AddonModWikiSubwikiListSubwiki = {
    name: string;
    id: number;
    userid: number;
    groupid: number;
    groupLabel: string;
    canedit: boolean;
};

/**
 * Params of mod_wiki_edit_page WS.
 */
export type AddonModWikiEditPageWSParams = {
    pageid: number; // Page ID.
    content: string; // Page contents.
    section?: string; // Section page title.
};

/**
 * Data returned by mod_wiki_edit_page WS.
 */
export type AddonModWikiEditPageWSResponse = {
    pageid: number; // Edited page id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_wiki_get_page_contents WS.
 */
export type AddonModWikiGetPageContentsWSParams = {
    pageid: number; // Page ID.
};

/**
 * Data returned by mod_wiki_get_page_contents WS.
 */
export type AddonModWikiGetPageContentsWSResponse = {
    page: AddonModWikiPageContents; // Page.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Page data returned by mod_wiki_get_page_contents WS.
 */
export type AddonModWikiPageContents = {
    id: number; // Page ID.
    wikiid: number; // Page's wiki ID.
    subwikiid: number; // Page's subwiki ID.
    groupid: number; // Page's group ID.
    userid: number; // Page's user ID.
    title: string; // Page title.
    cachedcontent: string; // Page contents.
    contentformat?: number; // Cachedcontent format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    caneditpage: boolean; // True if user can edit the page.
    version?: number; // Latest version of the page.
    tags?: CoreTagItem[]; // Tags.
};

/**
 * Params of mod_wiki_get_page_for_editing WS.
 */
export type AddonModWikiGetPageForEditingWSParams = {
    pageid: number; // Page ID to edit.
    section?: string; // Section page title.
    lockonly?: boolean; // Just renew lock and not return content.
};

/**
 * Data returned by mod_wiki_get_page_for_editing WS.
 */
export type AddonModWikiGetPageForEditingWSResponse = {
    pagesection: AddonModWikiWSEditPageSection;
};

/**
 * Page section data returned by mod_wiki_get_page_for_editing WS.
 */
export type AddonModWikiWSEditPageSection = {
    content?: string; // The contents of the page-section to be edited.
    contentformat?: string; // Format of the original content of the page.
    version: number; // Latest version of the page.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_wiki_get_subwiki_files WS.
 */
export type AddonModWikiGetSubwikiFilesWSParams = {
    wikiid: number; // Wiki instance ID.
    groupid?: number; // Subwiki's group ID, -1 means current group. It will be ignored if the wiki doesn't use groups.
    userid?: number; // Subwiki's user ID, 0 means current user. It will be ignored in collaborative wikis.
};

/**
 * Data returned by mod_wiki_get_subwiki_files WS.
 */
export type AddonModWikiGetSubwikiFilesWSResponse = {
    files: CoreWSExternalFile[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_wiki_get_subwiki_pages WS.
 */
export type AddonModWikiGetSubwikiPagesWSParams = {
    wikiid: number; // Wiki instance ID.
    groupid?: number; // Subwiki's group ID, -1 means current group. It will be ignored if the wiki doesn't use groups.
    userid?: number; // Subwiki's user ID, 0 means current user. It will be ignored in collaborative wikis.
    options?: {
        sortby?: string; // Field to sort by (id, title, ...).
        sortdirection?: string; // Sort direction: ASC or DESC.
        includecontent?: number; // Include each page contents or just the contents size.
    }; // Options.
};

/**
 * Data returned by mod_wiki_get_subwiki_pages WS.
 */
export type AddonModWikiGetSubwikiPagesWSResponse = {
    pages: AddonModWikiSubwikiPage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Page data returned by mod_wiki_get_subwiki_pages WS.
 */
export type AddonModWikiSubwikiPage = {
    id: number; // Page ID.
    subwikiid: number; // Page's subwiki ID.
    title: string; // Page title.
    timecreated: number; // Time of creation.
    timemodified: number; // Time of last modification.
    timerendered: number; // Time of last renderization.
    userid: number; // ID of the user that last modified the page.
    pageviews: number; // Number of times the page has been viewed.
    readonly: number; // 1 if readonly, 0 otherwise.
    caneditpage: boolean; // True if user can edit the page.
    firstpage: boolean; // True if it's the first page.
    cachedcontent?: string; // Page contents.
    contentformat?: number; // Cachedcontent format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    contentsize?: number; // Size of page contents in bytes (doesn't include size of attached files).
    tags?: CoreTagItem[]; // Tags.
};

/**
 * Params of mod_wiki_get_subwikis WS.
 */
export type AddonModWikiGetSubwikisWSParams = {
    wikiid: number; // Wiki instance ID.
};

/**
 * Data returned by mod_wiki_get_subwikis WS.
 */
export type AddonModWikiGetSubwikisWSResponse = {
    subwikis: AddonModWikiSubwikiWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Subwiki data returned by mod_wiki_get_subwikis WS.
 */
export type AddonModWikiSubwikiWSData = {
    id: number; // Subwiki ID.
    wikiid: number; // Wiki ID.
    groupid: string; // Group ID.
    userid: number; // User ID.
    canedit: boolean; // True if user can edit the subwiki.
};

/**
 * Subwiki data with some calculated data.
 */
export type AddonModWikiSubwiki = Omit<AddonModWikiSubwikiWSData, 'groupid'> & {
    groupid: number; // Group ID.
};

/**
 * Params of mod_wiki_get_wikis_by_courses WS.
 */
export type AddonModWikiGetWikisByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_wiki_get_wikis_by_courses WS.
 */
export type AddonModWikiGetWikisByCoursesWSResponse = {
    wikis: AddonModWikiWiki[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Wiki data returned by mod_wiki_get_wikis_by_courses WS.
 */
export type AddonModWikiWiki = {
    id: number; // Wiki ID.
    coursemodule: number; // Course module ID.
    course: number; // Course ID.
    name: string; // Wiki name.
    intro?: string; // Wiki intro.
    introformat?: number; // Wiki intro format. format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    timecreated?: number; // Time of creation.
    timemodified?: number; // Time of last modification.
    firstpagetitle?: string; // First page title.
    wikimode?: string; // Wiki mode (individual, collaborative).
    defaultformat?: string; // Wiki's default format (html, creole, nwiki).
    forceformat?: number; // 1 if format is forced, 0 otherwise.
    editbegin?: number; // Edit begin.
    editend?: number; // Edit end.
    section?: number; // Course section ID.
    visible?: number; // 1 if visible, 0 otherwise.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group ID.
    cancreatepages: boolean; // True if user can create pages.
};

/**
 * Params of mod_wiki_view_page WS.
 */
export type AddonModWikiViewPageWSParams = {
    pageid: number; // Wiki page ID.
};

/**
 * Params of mod_wiki_view_wiki WS.
 */
export type AddonModWikiViewWikiWSParams = {
    wikiid: number; // Wiki instance ID.
};

/**
 * Params of mod_wiki_new_page WS.
 */
export type AddonModWikiNewPageWSParams = {
    title: string; // New page title.
    content: string; // Page contents.
    contentformat?: string; // Page contents format. If an invalid format is provided, default wiki format is used.
    subwikiid?: number; // Page's subwiki ID.
    wikiid?: number; // Page's wiki ID. Used if subwiki does not exists.
    userid?: number; // Subwiki's user ID. Used if subwiki does not exists.
    groupid?: number; // Subwiki's group ID. Used if subwiki does not exists.
};

/**
 * Data returned by mod_wiki_new_page WS.
 */
export type AddonModWikiNewPageWSResponse = {
    pageid: number; // New page id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data passed to PAGE_CREATED event.
 */
export type AddonModWikiPageCreatedData = {
    pageId: number;
    subwikiId: number;
    pageTitle: string;
};

/**
 * Data about a page that was just edited.
 */
export type AddonModWikiEditedPageData = {
    cmId?: number;
    courseId?: number;
    wikiId: number;
    pageTitle: string;
    subwikiId?: number;
    userId?: number;
    groupId?: number;
    pageId?: number;
};
