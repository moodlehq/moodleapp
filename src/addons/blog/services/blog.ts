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

import { ContextLevel, CoreCacheUpdateFrequency } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';
import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonBlogOffline, AddonBlogOfflineEntry } from './blog-offline';

const ROOT_CACHE_KEY = 'addonBlog:';

/**
 * Service to handle blog entries.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogProvider {

    static readonly ENTRIES_PER_PAGE = 10;
    static readonly COMPONENT = 'blog';

    /**
     * Returns whether or not the blog plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, resolved with false or rejected otherwise.
     * @since 3.6
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('core_blog_get_entries') && site.canUseAdvancedFeature('enableblogs');
    }

    /**
     * Get the cache key for the blog entries.
     *
     * @param filter Filter to apply on search.
     * @returns Cache key.
     */
    getEntriesCacheKey(filter: AddonBlogFilter = {}): string {
        return ROOT_CACHE_KEY + CoreUtils.sortAndStringify(filter);
    }

    /**
     * Get blog entries.
     *
     * @param filter Filter to apply on search.
     * @param options WS Options.
     * @returns Promise to be resolved when the entries are retrieved.
     */
    async getEntries(filter: AddonBlogFilter = {}, options?: AddonBlogGetEntriesOptions): Promise<CoreBlogGetEntriesWSResponse> {
        const site = await CoreSites.getSite(options?.siteId);

        const data: CoreBlogGetEntriesWSParams = {
            filters: CoreUtils.objectToArrayOfObjects(filter, 'name', 'value'),
            page: options?.page ?? 0,
            perpage: AddonBlogProvider.ENTRIES_PER_PAGE,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesCacheKey(filter),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            ...CoreSites.getReadingStrategyPreSets(options?.readingStrategy),
        };

        return site.read('core_blog_get_entries', data, preSets);
    }

    /**
     * Create a new entry.
     *
     * @param params WS Params.
     * @param siteId Site ID where the entry should be created.
     * @returns Entry id.
     * @since 4.4
     */
    async addEntry(
        { created, forceOffline, ...params }: AddonBlogAddEntryWSParams & { created: number; forceOffline?: boolean },
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const storeOffline = async (): Promise<void> => {
            await AddonBlogOffline.addOfflineEntry({
                ...params,
                userid: site.getUserId(),
                lastmodified: created,
                options: JSON.stringify(params.options),
                created,
            });
        };

        if (forceOffline || !CoreNetwork.isOnline()) {
            return await storeOffline();
        }

        try {
            await this.addEntryOnline(params, siteId);
        } catch (error) {
            if (!CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return await storeOffline();
            }

            // The WebService has thrown an error, reject.
            throw error;
        }
    }

    /**
     * Add entry online.
     *
     * @param wsParams Params expected by the webservice.
     * @param siteId Site ID.
     */
    async addEntryOnline(wsParams: AddonBlogAddEntryWSParams, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.write('core_blog_add_entry', wsParams);
    }

    /**
     * Update an entry.
     *
     * @param params WS Params.
     * @param siteId Site ID of the entry.
     * @since 4.4
     * @returns void
     */
    async updateEntry(
        { forceOffline, created, ...params }: AddonBlogUpdateEntryParams,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const storeOffline = async (): Promise<void> => {
            const content = {
                subject: params.subject,
                summary: params.summary,
                summaryformat: params.summaryformat,
                userid: site.getUserId(),
                lastmodified: CoreTimeUtils.timestamp(),
                options: JSON.stringify(params.options),
                created,
            };

            await AddonBlogOffline.addOfflineEntry({ ...content, id: params.entryid });
        };

        if (forceOffline || !CoreNetwork.isOnline()) {
            return await storeOffline();
        }

        try {
            await this.updateEntryOnline(params, siteId);
        } catch (error) {
            if (!CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return await storeOffline();
            }

            // The WebService has thrown an error, reject.
            throw error;
        }
    }

    /**
     * Update entry online.
     *
     * @param wsParams Params expected by the webservice.
     * @param siteId Site ID.
     */
    async updateEntryOnline(wsParams: AddonBlogUpdateEntryWSParams, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.write('core_blog_update_entry', wsParams);
    }

    /**
     * Prepare entry for edition by entry id.
     *
     * @param params WS Params.
     * @param siteId Site ID of the entry.
     * @returns WS Response
     * @since 4.4
     */
    async prepareEntryForEdition(
        params: AddonBlogPrepareEntryForEditionWSParams,
        siteId?: string,
    ): Promise<AddonBlogPrepareEntryForEditionWSResponse> {
        const site = await CoreSites.getSite(siteId);

        return await site.write<AddonBlogPrepareEntryForEditionWSResponse>('core_blog_prepare_entry_for_edition', params);
    }

    /**
     * Delete entry by id.
     *
     * @param params WS params.
     * @param siteId Site ID of the entry.
     * @returns Entry deleted successfully or not.
     * @since 4.4
     */
    async deleteEntry({ subject, ...params }: AddonBlogDeleteEntryWSParams & { subject: string }, siteId?: string): Promise<void> {
        try {
            if (!CoreNetwork.isOnline()) {
                return await AddonBlogOffline.markEntryAsRemoved({ id: params.entryid, subject }, siteId);
            }

            await this.deleteEntryOnline(params, siteId);
            await CoreUtils.ignoreErrors(AddonBlogOffline.unmarkEntryAsRemoved(params.entryid));
        } catch (error) {
            if (!CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return await AddonBlogOffline.markEntryAsRemoved({ id: params.entryid, subject }, siteId);
            }

            throw error;
        }
    }

    /**
     * Delete entry online.
     *
     * @param wsParams Params expected by the webservice.
     * @param siteId Site ID.
     */
    async deleteEntryOnline(wsParams: AddonBlogDeleteEntryWSParams, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        await site.write('core_blog_delete_entry', wsParams);
    }

    /**
     * Invalidate blog entries WS call.
     *
     * @param filter Filter to apply on search
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateEntries(filter: AddonBlogFilter = {}, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getEntriesCacheKey(filter));
    }

    /**
     * Is editing blog entry enabled.
     *
     * @param siteId Site ID.
     * @returns is enabled or not.
     * @since 4.4
     */
    async isEditingEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('core_blog_update_entry');
    }

    /**
     * Trigger the blog_entries_viewed event.
     *
     * @param filter Filter to apply on search.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when done.
     */
    async logView(filter: AddonBlogFilter = {}, siteId?: string): Promise<CoreStatusWithWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const data: AddonBlogViewEntriesWSParams = {
            filters: CoreUtils.objectToArrayOfObjects(filter, 'name', 'value'),
        };

        return site.write('core_blog_view_entries', data);
    }

    /**
     * Format local stored entries to required data structure.
     *
     * @param offlineEntry Offline entry data.
     * @param entry Entry.
     * @returns Formatted entry.
     */
    async formatOfflineEntry(
        offlineEntry: AddonBlogOfflineEntry,
        entry?: AddonBlogPostFormatted,
    ): Promise<AddonBlogOfflinePostFormatted> {
        const options: AddonBlogAddEntryOption[] = JSON.parse(offlineEntry.options);
        const moduleId = options?.find(option => option.name === 'modassoc')?.value as number | undefined;
        const courseId = options?.find(option => option.name === 'courseassoc')?.value as number | undefined;
        const tags = options?.find(option => option.name === 'tags')?.value as string | undefined;
        const publishState = options?.find(option => option.name === 'publishstate')?.value as AddonBlogPublishState
            ?? AddonBlogPublishState.draft;
        const user = await CoreUtils.ignoreErrors(CoreUser.getProfile(offlineEntry.userid, courseId, true));
        const folder = 'id' in offlineEntry && offlineEntry.id ? { id: offlineEntry.id } : { created: offlineEntry.created };
        const offlineFiles = await AddonBlogOffline.getOfflineFiles(folder);
        const optionsFiles = this.getAttachmentFilesFromOptions(options);
        const attachmentFiles = [...optionsFiles.online, ...offlineFiles];

        return {
            ...offlineEntry,
            publishstate: publishState,
            publishTranslated: this.getPublishTranslated(publishState),
            user,
            tags: tags?.length ? JSON.parse(tags) : [],
            coursemoduleid: moduleId ?? 0,
            courseid: courseId ?? 0,
            attachmentfiles: attachmentFiles,
            userid: user?.id ?? 0,
            moduleid: moduleId ?? 0,
            summaryfiles: [],
            uniquehash: '',
            module: entry?.module,
            groupid: 0,
            content: offlineEntry.summary,
            updatedOffline: true,
        };
    }

    /**
     * Retrieves publish state translated.
     *
     * @param state Publish state.
     * @returns Translated state.
     */
    getPublishTranslated(state?: string): string {
        switch (state) {
            case 'draft':
                return 'publishtonoone';
            case 'site':
                return 'publishtosite';
            case 'public':
                return 'publishtoworld';
            default:
                return 'privacy:unknown';
        }
    }

    /**
     * Format provided entry to AddonBlogPostFormatted.
     */
    async formatEntry(entry: AddonBlogPostFormatted): Promise<void> {
        entry.publishTranslated = this.getPublishTranslated(entry.publishstate);

        // Calculate the context. This code was inspired by calendar events, Moodle doesn't do this for blogs.
        if (entry.moduleid || entry.coursemoduleid) {
            entry.contextLevel = ContextLevel.MODULE;
            entry.contextInstanceId = entry.moduleid || entry.coursemoduleid;
        } else if (entry.courseid) {
            entry.contextLevel = ContextLevel.COURSE;
            entry.contextInstanceId = entry.courseid;
        } else {
            entry.contextLevel = ContextLevel.USER;
            entry.contextInstanceId = entry.userid;
        }

        entry.summary = CoreFileHelper.replacePluginfileUrls(entry.summary, entry.summaryfiles || []);
        entry.user = await CoreUtils.ignoreErrors(CoreUser.getProfile(entry.userid, entry.courseid, true));
    }

    /**
     * Get attachments files from options object.
     *
     * @param options Entry options.
     * @returns attachmentsId.
     */
    getAttachmentFilesFromOptions(options: AddonBlogAddEntryOption[]): CoreFileUploaderStoreFilesResult {
        const attachmentsId = options.find(option => option.name === 'attachmentsid');

        if (!attachmentsId) {
            return { online: [], offline: 0 };
        }

        switch(typeof attachmentsId.value) {
            case 'object':
                return attachmentsId.value;
            case 'string':
                return JSON.parse(attachmentsId.value);
            default:
                return { online: [], offline: 0 };
        }
    }

}
export const AddonBlog = makeSingleton(AddonBlogProvider);

/**
 * Params of core_blog_get_entries WS.
 */
type CoreBlogGetEntriesWSParams = {
    filters?: { // Parameters to filter blog listings.
        name: string; // The expected keys (value format) are:
        // tag      PARAM_NOTAGS blog tag
        // tagid    PARAM_INT    blog tag id
        // userid   PARAM_INT    blog author (userid)
        // cmid    PARAM_INT    course module id
        // entryid  PARAM_INT    entry id
        // groupid  PARAM_INT    group id
        // courseid PARAM_INT    course id
        // search   PARAM_RAW    search term.
        value: string; // The value of the filter.
    }[];
    page?: number; // The blog page to return.
    perpage?: number; // The number of posts to return per page.
};

/**
 * Data returned by core_blog_get_entries WS.
 */
export type CoreBlogGetEntriesWSResponse = {
    entries: AddonBlogPost[];
    totalentries: number; // The total number of entries found.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by blog's post_exporter.
 */
export interface AddonBlogPost {
    id: number; // Post/entry id.
    module: string; // Where it was published the post (blog, blog_external...).
    userid: number; // Post author.
    courseid: number; // Course where the post was created.
    groupid: number; // Group post was created for.
    moduleid: number; // Module id where the post was created (not used anymore).
    coursemoduleid: number; // Course module id where the post was created.
    subject: string; // Post subject.
    summary: string; // Post summary.
    summaryformat?: number; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    content: string; // Post content.
    uniquehash: string; // Post unique hash.
    rating: number; // Post rating.
    format: number; // Post content format.
    attachment: string; // Post atachment.
    publishstate: AddonBlogPublishState; // Post publish state.
    lastmodified: number; // When it was last modified.
    created: number; // When it was created.
    usermodified: number; // User that updated the post.
    summaryfiles: CoreWSExternalFile[]; // Summaryfiles.
    attachmentfiles?: CoreWSExternalFile[]; // Attachmentfiles.
    tags?: CoreTagItem[]; // @since 3.7. Tags.
}

/**
 * Params of core_blog_view_entries WS.
 */
type AddonBlogViewEntriesWSParams = {
    filters?: { // Parameters used in the filter of view_entries.
        name: string; // The expected keys (value format) are:
        // tag      PARAM_NOTAGS blog tag
        // tagid    PARAM_INT    blog tag id
        // userid   PARAM_INT    blog author (userid)
        // cmid     PARAM_INT    course module id
        // entryid  PARAM_INT    entry id
        // groupid  PARAM_INT    group id
        // courseid PARAM_INT    course id
        // search   PARAM_RAW    search term.
        value: string; // The value of the filter.
    }[];
};

export type AddonBlogFilter = {
    tag?: string;      // Blog tag
    tagid?: number;    // Blog tag id
    userid?: number;   // Blog author (userid)
    cmid?: number;     // Course module id
    entryid?: number;  // Entry id
    groupid?: number;  // Group id
    courseid?: number; // Course id
    search?: string;   // Search term.
};

/**
 * core_blog_add_entry & core_blog_update_entry ws params.
 */
export type AddonBlogAddEntryWSParams = {
    subject: string;
    summary: string;
    summaryformat: number;
    options: AddonBlogAddEntryOption[];
};

export type AddonBlogUpdateEntryWSParams = AddonBlogAddEntryWSParams & ({ entryid: number });

/**
 * Add entry options.
 */
export type AddonBlogAddEntryOption = {
    name: 'inlineattachmentsid' | 'attachmentsid' | 'publishstate' | 'courseassoc' | 'modassoc' | 'tags';
    value: string | number | CoreFileUploaderStoreFilesResult;
};

/**
 * core_blog_prepare_entry_for_edition ws params.
 */
export type AddonBlogPrepareEntryForEditionWSResponse = {
    inlineattachmentsid: number;
    attachmentsid: number;
    areas: AddonBlogPrepareEntryForEditionArea[];
    warnings: string[];
};

export type AddonBlogPrepareEntryForEditionWSParams = {
    entryid: number;
};

/**
 * core_blog_prepare_entry_for_edition Area object.
 */
export type AddonBlogPrepareEntryForEditionArea = {
    area: string;
    options: AddonBlogPrepareEntryForEditionOption[];
};

/**
 * core_blog_prepare_entry_for_edition Option object.
 */
export type AddonBlogPrepareEntryForEditionOption = {
    name: string;
    value: unknown;
};

export type AddonBlogDeleteEntryWSParams = {
    entryid: number;
};

export type AddonBlogDeleteEntryWSResponse = {
    status: boolean; // Status: true only if we set the policyagreed to 1 for the user.
    warnings?: CoreWSExternalWarning[];
};

export type AddonBlogGetEntriesOptions = CoreSitesCommonWSOptions & {
    page?: number;
};

export type AddonBlogUndoDelete = { created: number } | { id: number };

export const AddonBlogPublishState = { draft: 'draft', site: 'site', public: 'public' } as const;
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type AddonBlogPublishState = typeof AddonBlogPublishState[keyof typeof AddonBlogPublishState];

/**
 * Blog post with some calculated data.
 */
export type AddonBlogPostFormatted = Omit<
    AddonBlogPost, 'attachment' | 'attachmentfiles' | 'usermodified' | 'format' | 'rating' | 'module'
> & {
    publishTranslated?: string; // Calculated in the app. Key of the string to translate the publish state of the post.
    user?: CoreUserProfile; // Calculated in the app. Data of the user that wrote the post.
    contextLevel?: ContextLevel; // Calculated in the app. The context level of the entry.
    contextInstanceId?: number; // Calculated in the app. The context instance id.
    coursemoduleid: number; // Course module id where the post was created.
    attachmentfiles?: CoreFileEntry[]; // Attachmentfiles.
    module?: string;
    deleted?: boolean;
    updatedOffline?: boolean;
};

export type AddonBlogOfflinePostFormatted = Omit<AddonBlogPostFormatted, 'id'>;

export type AddonBlogUpdateEntryParams = AddonBlogUpdateEntryWSParams & {
    attachments?: string;
    forceOffline?: boolean;
    created: number;
};
