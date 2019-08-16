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
import { CoreSite } from '@classes/site';

/**
 * Service to handle badges.
 */
@Injectable()
export class AddonBadgesProvider {
    protected logger;
    protected ROOT_CACHE_KEY = 'mmaBadges:';

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider) {
        this.logger = logger.getInstance('AddonBadgesProvider');
    }

    /**
     * Returns whether or not the badge plugin is enabled for a certain site.
     *
     * This method is called quite often and thus should only perform a quick
     * check, we should not be calling WS from here.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if enabled, false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<boolean> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.canUseAdvancedFeature('enablebadges')) {
                return false;
            } else if (!site.wsAvailable('core_course_get_user_navigation_options')) {
                return false;
            }

            return true;
        });
    }

    /**
     * Get the cache key for the get badges call.
     *
     * @param {number} courseId ID of the course to get the badges from.
     * @param {number} userId ID of the user to get the badges from.
     * @return {string} Cache key.
     */
    protected getBadgesCacheKey(courseId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'badges:' + courseId + ':' + userId;
    }

    /**
     * Get issued badges for a certain user in a course.
     *
     * @param {number} courseId ID of the course to get the badges from.
     * @param {number} userId ID of the user to get the badges from.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}Promise to be resolved when the badges are retrieved.
     */
    getUserBadges(courseId: number, userId: number, siteId?: string): Promise<any> {

        this.logger.debug('Get badges for course ' + courseId);

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data = {
                    courseid : courseId,
                    userid : userId
                },
                preSets = {
                    cacheKey: this.getBadgesCacheKey(courseId, userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_badges_get_user_badges', data, preSets).then((response) => {
                if (response && response.badges) {
                    return response.badges;
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Invalidate get badges WS call.
     *
     * @param {number} courseId Course ID.
     * @param {number} userId ID of the user to get the badges from.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data is invalidated.
     */
    invalidateUserBadges(courseId: number, userId: number, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getBadgesCacheKey(courseId, userId));
        });
    }
}
