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
import { CoreSites } from '@services/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { makeSingleton } from '@singletons';

const ROOT_CACHE_KEY = 'CoreCoursesDashboard:';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesDashboardProvider {

    /**
     * Get cache key for dashboard blocks WS calls.
     *
     * @param userId User ID. Default, 0 means current user.
     * @return Cache key.
     */
    protected getDashboardBlocksCacheKey(userId: number = 0): string {
        return ROOT_CACHE_KEY + 'blocks:' + userId;
    }

    /**
     * Get dashboard blocks.
     *
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of blocks.
     * @since 3.6
     */
    async getDashboardBlocks(userId?: number, siteId?: string): Promise<CoreCourseBlock[]> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreBlockGetDashboardBlocksWSParams = {
            returncontents: true,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getDashboardBlocksCacheKey(userId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
        };
        if (userId) {
            params.userid = userId;
        }
        const result = await site.read<CoreBlockGetDashboardBlocksWSResponse>('core_block_get_dashboard_blocks', params, preSets);

        return result.blocks || [];
    }

    /**
     * Invalidates dashboard blocks WS call.
     *
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    async invalidateDashboardBlocks(userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return await site.invalidateWsCacheForKey(this.getDashboardBlocksCacheKey(userId));
    }

    /**
     * Returns whether or not block based Dashboard is available for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.6
     */
    async isAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // First check if it's disabled.
        if (this.isDisabledInSite(site)) {
            return false;
        }

        return site.wsAvailable('core_block_get_dashboard_blocks');
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled('CoreMainMenuDelegate_CoreCoursesDashboard');
    }

}

export const CoreCoursesDashboard = makeSingleton(CoreCoursesDashboardProvider);

/**
 * Params of core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetDashboardBlocksWSParams = {
    userid?: number; // User id (optional), default is current user.
    returncontents?: boolean; // Whether to return the block contents.
};

/**
 * Data returned by core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetDashboardBlocksWSResponse = {
    blocks: CoreCourseBlock[]; // List of blocks in the course.
    warnings?: CoreStatusWithWarningsWSResponse[];
};
