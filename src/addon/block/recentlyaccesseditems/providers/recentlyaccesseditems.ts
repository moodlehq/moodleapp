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
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Service that provides some features regarding recently accessed items.
 */
@Injectable()
export class AddonBlockRecentlyAccessedItemsProvider {
    protected ROOT_CACHE_KEY = 'AddonBlockRecentlyAccessedItems:';

    constructor(private sitesProvider: CoreSitesProvider, private courseProvider: CoreCourseProvider,
        private domUtils: CoreDomUtilsProvider) { }

    /**
     * Get cache key for get last accessed items value WS call.
     *
     * @return {string} Cache key.
     */
    protected getRecentItemsCacheKey(): string {
        return this.ROOT_CACHE_KEY + ':recentitems';
    }

    /**
     * Get last accessed items.
     *
     * @param {string} [siteId] Site ID. If not defined, use current site.
     * @return {Promise<any[]>} Promise resolved when the info is retrieved.
     */
    getRecentItems(siteId?: string): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                    cacheKey: this.getRecentItemsCacheKey()
                };

            return site.read('block_recentlyaccesseditems_get_recent_items', undefined, preSets).then((items) => {
                return items.map((item) => {
                    const modicon = item.icon && this.domUtils.getHTMLElementAttribute(item.icon, 'src');
                    item.iconUrl = this.courseProvider.getModuleIconSrc(item.modname, modicon);

                    return item;
                });
            });
        });
    }

    /**
     * Invalidates get last accessed items WS call.
     *
     * @param {string} [siteId] Site ID to invalidate. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateRecentItems(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getRecentItemsCacheKey());
        });
    }
}
