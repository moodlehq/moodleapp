// (C) Copyright 2015 Martin Dougiamas
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
     * @param  {string} [siteId]  Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if enabled, resolved with false or rejected otherwise.
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
     * @param  {any}     [filter]     Filter to apply on search.
     * @return {string}          Cache key.
     */
    getEntriesCacheKey(filter: any = {}): string {
        return this.ROOT_CACHE_KEY + this.utils.sortAndStringify(filter);
    }

    /**
     * Get blog entries.
     *
     * @param  {any}     [filter]     Filter to apply on search.
     * @param  {any}     [page=0]     Page of the blog entries to fetch.
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise to be resolved when the entries are retrieved.
     */
    getEntries(filter: any = {}, page: number = 0, siteId?: string): Promise<any> {
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
     * @param  {any}     [filter]     Filter to apply on search
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved when data is invalidated.
     */
    invalidateEntries(filter: any = {}, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEntriesCacheKey(filter));
        });
    }

    /**
     * Trigger the blog_entries_viewed event.
     *
     * @param  {any}     [filter]     Filter to apply on search.
     * @param  {string}  [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise to be resolved when done.
     */
    logView(filter: any = {}, siteId?: string): Promise<any> {
        this.pushNotificationsProvider.logViewListEvent('blog', 'core_blog_view_entries', filter, siteId);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                filters: this.utils.objectToArrayOfObjects(filter, 'name', 'value')
            };

            return site.write('core_blog_view_entries', data);
        });
    }
}
