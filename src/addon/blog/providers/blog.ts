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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { CoreTagItem } from '@core/tag/providers/tag';

/**
 * Service to handle blog entries.
 */
@Injectable()
export class AddonBlogProvider {
    static ENTRIES_PER_PAGE = 10;
    static COMPONENT = 'blog';
    protected ROOT_CACHE_KEY = 'addonBlog:';
    protected logger;

    constructor(logger: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider, protected utils: CoreUtilsProvider,
            protected pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = logger.getInstance('AddonBlogProvider');
    }

    /**
     * Returns whether or not the blog plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if enabled, resolved with false or rejected otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('core_blog_get_entries') &&
                site.canUseAdvancedFeature('enableblogs');
        });
    }

    /**
     * Get the cache key for the blog entries.
     *
     * @param filter Filter to apply on search.
     * @return Cache key.
     */
    getEntriesCacheKey(filter: any = {}): string {
        return this.ROOT_CACHE_KEY + this.utils.sortAndStringify(filter);
    }

    /**
     * Get blog entries.
     *
     * @param filter Filter to apply on search.
     * @param page Page of the blog entries to fetch.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise to be resolved when the entries are retrieved.
     */
    getEntries(filter: any = {}, page: number = 0, siteId?: string): Promise<AddonBlogGetEntriesResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                filters: this.utils.objectToArrayOfObjects(filter, 'name', 'value'),
                page: page,
                perpage: AddonBlogProvider.ENTRIES_PER_PAGE
            };

            const preSets = {
                cacheKey: this.getEntriesCacheKey(filter),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            return site.read('core_blog_get_entries', data, preSets);
        });
    }

    /**
     * Invalidate blog entries WS call.
     *
     * @param filter Filter to apply on search
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateEntries(filter: any = {}, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEntriesCacheKey(filter));
        });
    }

    /**
     * Trigger the blog_entries_viewed event.
     *
     * @param filter Filter to apply on search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise to be resolved when done.
     */
    logView(filter: any = {}, siteId?: string): Promise<AddonBlogViewEntriesResult> {
        this.pushNotificationsProvider.logViewListEvent('blog', 'core_blog_view_entries', filter, siteId);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                filters: this.utils.objectToArrayOfObjects(filter, 'name', 'value')
            };

            return site.write('core_blog_view_entries', data);
        });
    }
}

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
    summaryformat: number; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Result of WS core_blog_get_entries.
 */
export type AddonBlogGetEntriesResult = {
    entries: AddonBlogPost[];
    totalentries: number; // The total number of entries found.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_blog_view_entries.
 */
export type AddonBlogViewEntriesResult = {
    status: boolean; // Status: true if success.
    warnings?: CoreWSExternalWarning[];
};
