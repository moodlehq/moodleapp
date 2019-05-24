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
import { CoreSite } from '@classes/site';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable()
export class CoreCoursesDashboardProvider {

    constructor(private sitesProvider: CoreSitesProvider) { }

    protected ROOT_CACHE_KEY = 'CoreCoursesDashboard:';

    /**
     * Get cache key for dashboard blocks WS calls.
     *
     * @param {number} [userId] User ID. Default, 0 means current user.
     * @return {string} Cache key.
     */
    protected getDashboardBlocksCacheKey(userId: number = 0): string {
        return this.ROOT_CACHE_KEY + 'blocks:' + userId;
    }

    /**
     * Get dashboard blocks.
     *
     * @param {number} [userId] User ID. Default, current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of blocks.
     * @since 3.6
     */
    getDashboardBlocks(userId?: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                },
                preSets = {
                    cacheKey: this.getDashboardBlocksCacheKey(userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (userId) {
                params['userid'] = userId;
            }

            return site.read('core_block_get_dashboard_blocks', params, preSets).then((result) => {
                return result.blocks || [];
            });
        });
    }

    /**
     * Invalidates dashboard blocks WS call.
     *
     * @param {number} [userId] User ID. Default, current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateDashboardBlocks(userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getDashboardBlocksCacheKey(userId));
        });
    }

    /**
     * Returns whether or not block based Dashboard is available for a certain site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.6
     */
    isAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // First check if it's disabled.
            if (this.isDisabledInSite(site)) {
                return false;
            }

            return site.wsAvailable('core_block_get_dashboard_blocks');
        });
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>} Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isDisabledInSite(site);
        });
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_CoreCoursesDashboard');
    }
}
