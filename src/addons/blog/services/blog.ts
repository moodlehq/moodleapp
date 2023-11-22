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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';

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
     * @param page Page of the blog entries to fetch.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the entries are retrieved.
     */
    async getEntries(filter: AddonBlogFilter = {}, page: number = 0, siteId?: string): Promise<CoreBlogGetEntriesWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const data: CoreBlogGetEntriesWSParams = {
            filters: CoreUtils.objectToArrayOfObjects(filter, 'name', 'value'),
            page: page,
            perpage: AddonBlogProvider.ENTRIES_PER_PAGE,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getEntriesCacheKey(filter),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
        };

        return site.read('core_blog_get_entries', data, preSets);
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
export type AddonBlogPost = {
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
    publishstate: string; // Post publish state.
    lastmodified: number; // When it was last modified.
    created: number; // When it was created.
    usermodified: number; // User that updated the post.
    summaryfiles: CoreWSExternalFile[]; // Summaryfiles.
    attachmentfiles?: CoreWSExternalFile[]; // Attachmentfiles.
    tags?: CoreTagItem[]; // @since 3.7. Tags.
};

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
