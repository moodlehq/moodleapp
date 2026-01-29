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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { asyncObservable } from '@/core/utils/rxjs';
import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CORE_COURSES_DASHBOARD_MENU_FEATURE_NAME, CoreCoursesMyPageName } from '../constants';
import { CORE_BLOCKS_DASHBOARD_FALLBACK_MYOVERVIEW_BLOCK, CoreBlocksRegion } from '@features/block/constants';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesDashboardProvider {

    protected static readonly ROOT_CACHE_KEY = 'CoreCoursesDashboard:';

    /**
     * @deprecated since 5.0. Use CoreCoursesMyPageName.DEFAULT enum instead.
     */
    static readonly MY_PAGE_DEFAULT = '__default';
    /**
     * @deprecated since 5.0. Use CoreCoursesMyPageName.COURSES enum instead.
     */
    static readonly MY_PAGE_COURSES = '__courses';

    /**
     * Get cache key for dashboard blocks WS calls.
     *
     * @param myPage What my page to return blocks of. Default CoreCoursesMyPageName.DEFAULT.
     * @param userId User ID. Default, 0 means current user.
     * @returns Cache key.
     */
    protected getDashboardBlocksCacheKey(myPage = CoreCoursesMyPageName.DEFAULT, userId = 0): string {
        return `${CoreCoursesDashboardProvider.ROOT_CACHE_KEY}blocks:${myPage}:${userId}`;
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param myPage What my page to return blocks of. Default CoreCoursesMyPageName.DEFAULT.
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of blocks.
     * @since 3.6
     */
    async getDashboardBlocksFromWS(
        myPage = CoreCoursesMyPageName.DEFAULT,
        userId?: number,
        siteId?: string,
    ): Promise<CoreCourseBlock[]> {
        return await firstValueFrom(this.getDashboardBlocksFromWSObservable({
            myPage,
            userId,
            siteId,
        }));
    }

    /**
     * Get dashboard blocks from WS.
     *
     * @param options Options.
     * @returns Observable that returns the list of blocks.
     * @since 3.6
     */
    getDashboardBlocksFromWSObservable(options: GetDashboardBlocksOptions = {}): WSObservable<CoreCourseBlock[]> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const myPage = options.myPage ?? CoreCoursesMyPageName.DEFAULT;
            const params: CoreBlockGetDashboardBlocksWSParams = {
                returncontents: true,
            };
            if (CoreSites.getRequiredCurrentSite().isVersionGreaterEqualThan('4.0')) {
                params.mypage = myPage;
            } else if (myPage !== CoreCoursesMyPageName.DEFAULT) {
                throw new CoreError('mypage param is not accessible on core_block_get_dashboard_blocks');
            }

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getDashboardBlocksCacheKey(myPage, options.userId),
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };
            if (options.userId) {
                params.userid = options.userId;
            }

            const observable = site.readObservable<CoreBlockGetDashboardBlocksWSResponse>(
                'core_block_get_dashboard_blocks',
                params,
                preSets,
            );

            return observable.pipe(map(result => {
                if (site.isVersionGreaterEqualThan('4.0')) {
                    // Temporary hack to have course overview on 3.9.5 but not on 4.0 onwards.
                    // To be removed in a near future.
                    // Remove myoverview when is forced. See MDL-72092.
                    result.blocks = result.blocks.filter((block) =>
                        block.instanceid !== 0 ||
                        block.name !== CORE_BLOCKS_DASHBOARD_FALLBACK_MYOVERVIEW_BLOCK ||
                        block.region !== CoreBlocksRegion.FORCED);
                }

                return result.blocks || [];
            }));
        });
    }

    /**
     * Get dashboard blocks.
     *
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     * @param myPage What my page to return blocks of. Default CoreCoursesMyPageName.DEFAULT.
     * @returns Promise resolved with the list of blocks.
     */
    async getDashboardBlocks(
        userId?: number,
        siteId?: string,
        myPage = CoreCoursesMyPageName.DEFAULT,
    ): Promise<CoreCoursesDashboardBlocks> {
        return await firstValueFrom(this.getDashboardBlocksObservable({
            myPage,
            userId,
            siteId,
        }));
    }

    /**
     * Get dashboard blocks.
     *
     * @param options Options.
     * @returns observable that returns the list of blocks.
     */
    getDashboardBlocksObservable(options: GetDashboardBlocksOptions = {}): WSObservable<CoreCoursesDashboardBlocks> {
        return this.getDashboardBlocksFromWSObservable(options).pipe(map(blocks => {
            let mainBlocks: CoreCourseBlock[] = [];
            let sideBlocks: CoreCourseBlock[] = [];

            blocks.forEach((block) => {
                if (block.region === CoreBlocksRegion.CONTENT || block.region === CoreBlocksRegion.MAIN) {
                    mainBlocks.push(block);
                } else {
                    sideBlocks.push(block);
                }
            });

            if (mainBlocks.length == 0) {
                mainBlocks = [];
                sideBlocks = [];

                blocks.forEach((block) => {
                    if (block.region.includes(CoreBlocksRegion.SIDE)) {
                        sideBlocks.push(block);
                    } else {
                        mainBlocks.push(block);
                    }
                });
            }

            return { mainBlocks, sideBlocks };
        }));
    }

    /**
     * Invalidates dashboard blocks WS call.
     *
     * @param myPage What my page to return blocks of. Default CoreCoursesMyPageName.DEFAULT.
     * @param userId User ID. Default, current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateDashboardBlocks(
        myPage = CoreCoursesMyPageName.DEFAULT,
        userId?: number,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getDashboardBlocksCacheKey(myPage, userId));
    }

    /**
     * Returns whether or not block based Dashboard is available for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if available, resolved with false or rejected otherwise.
     * @since 3.6
     */
    async isAvailable(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.wsAvailable('core_block_get_dashboard_blocks');
    }

    /**
     * Check if Site Home is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @returns Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    async isDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.isDisabledInSite(site);
    }

    /**
     * Check if Dashboard is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @returns Whether it's disabled.
     */
    isDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isFeatureDisabled(CORE_COURSES_DASHBOARD_MENU_FEATURE_NAME);
    }

}

export const CoreCoursesDashboard = makeSingleton(CoreCoursesDashboardProvider);

export type CoreCoursesDashboardBlocks = {
    mainBlocks: CoreCourseBlock[];
    sideBlocks: CoreCourseBlock[];
};

/**
 * Options for some get dashboard blocks calls.
 */
export type GetDashboardBlocksOptions = CoreSitesCommonWSOptions & {
    userId?: number; // User ID. If not defined, current user.
    myPage?: CoreCoursesMyPageName; // Page to get. If not defined, CoreCoursesMyPageName.DEFAULT.
};

/**
 * Params of core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetDashboardBlocksWSParams = {
    userid?: number; // User id (optional), default is current user.
    returncontents?: boolean; // Whether to return the block contents.
    mypage?: CoreCoursesMyPageName; // @since 4.0. What my page to return blocks of. Default CoreCoursesMyPageName.DEFAULT.
};

/**
 * Data returned by core_block_get_dashboard_blocks WS.
 */
type CoreBlockGetDashboardBlocksWSResponse = {
    blocks: CoreCourseBlock[]; // List of blocks in the course.
    warnings?: CoreStatusWithWarningsWSResponse[];
};
