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
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from './sites';

/**
 * Group info for an activity.
 */
export interface CoreGroupInfo {
    /**
     * List of groups.
     * @type {any[]}
     */
    groups?: any[];

    /**
     * Whether it's separate groups.
     * @type {boolean}
     */
    separateGroups?: boolean;

    /**
     * Whether it's visible groups.
     * @type {boolean}
     */
    visibleGroups?: boolean;
}

/*
 * Service to handle groups.
*/
@Injectable()
export class CoreGroupsProvider {
    // Group mode constants.
    static NOGROUPS = 0;
    static SEPARATEGROUPS = 1;
    static VISIBLEGROUPS = 2;
    protected ROOT_CACHE_KEY = 'mmGroups:';

    constructor(private sitesProvider: CoreSitesProvider, private translate: TranslateService) { }

    /**
     * Check if group mode of an activity is enabled.
     *
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with true if the activity has groups, resolved with false otherwise.
     */
    activityHasGroups(cmId: number, siteId?: string): Promise<boolean> {
        return this.getActivityGroupMode(cmId, siteId).then((groupmode) => {
            return groupmode === CoreGroupsProvider.SEPARATEGROUPS || groupmode === CoreGroupsProvider.VISIBLEGROUPS;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Get the groups allowed in an activity.
     *
     * @param {number} cmId Course module ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the groups are retrieved.
     */
    getActivityAllowedGroups(cmId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    cmid: cmId,
                    userid: userId
                },
                preSets = {
                    cacheKey: this.getActivityAllowedGroupsCacheKey(cmId, userId)
                };

            return site.read('core_group_get_activity_allowed_groups', params, preSets).then((response) => {
                if (!response || !response.groups) {
                    return Promise.reject(null);
                }

                return response.groups;
            });
        });
    }

    /**
     * Get cache key for group mode WS calls.
     *
     * @param {number} cmId Course module ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getActivityAllowedGroupsCacheKey(cmId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'allowedgroups:' + cmId + ':' + userId;
    }

    /**
     * Get the groups allowed in an activity if they are allowed.
     *
     * @param {number} cmId Course module ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved. If not allowed, empty array will be returned.
     */
    getActivityAllowedGroupsIfEnabled(cmId: number, userId?: number, siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get real groupmode, in case it's forced by the course.
        return this.activityHasGroups(cmId, siteId).then((hasGroups) => {
            if (hasGroups) {
                // Get the groups available for the user.
                return this.getActivityAllowedGroups(cmId, userId, siteId);
            }

            return [];
        });
    }

    /**
     * Helper function to get activity group info (group mode and list of groups).
     *
     * @param {number} cmId Course module ID.
     * @param {boolean} [addAllParts=true] Whether to add the all participants option. Always true for visible groups.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreGroupInfo>} Promise resolved with the group info.
     */
    getActivityGroupInfo(cmId: number, addAllParts: boolean = true, userId?: number, siteId?: string): Promise<CoreGroupInfo> {
        const groupInfo: CoreGroupInfo = {
            groups: []
        };

        return this.getActivityGroupMode(cmId, siteId).then((groupMode) => {
            groupInfo.separateGroups = groupMode === CoreGroupsProvider.SEPARATEGROUPS;
            groupInfo.visibleGroups = groupMode === CoreGroupsProvider.VISIBLEGROUPS;

            if (groupInfo.separateGroups || groupInfo.visibleGroups) {
                return this.getActivityAllowedGroups(cmId, userId, siteId);
            }

            return [];
        }).then((groups) => {
            if (groups.length <= 0) {
                groupInfo.separateGroups = false;
                groupInfo.visibleGroups = false;
            } else {
                if (addAllParts || groupInfo.visibleGroups) {
                    groupInfo.groups.push({ id: 0, name: this.translate.instant('core.allparticipants') });
                }
                groupInfo.groups = groupInfo.groups.concat(groups);
            }

            return groupInfo;
        });
    }

    /**
     * Get the group mode of an activity.
     *
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved when the group mode is retrieved.
     */
    getActivityGroupMode(cmId: number, siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    cmid: cmId
                },
                preSets = {
                    cacheKey: this.getActivityGroupModeCacheKey(cmId)
                };

            return site.read('core_group_get_activity_groupmode', params, preSets).then((response) => {
                if (!response || typeof response.groupmode == 'undefined') {
                    return Promise.reject(null);
                }

                return response.groupmode;
            });
        });
    }

    /**
     * Get cache key for group mode WS calls.
     *
     * @param {number} cmId Course module ID.
     * @return {string} Cache key.
     */
    protected getActivityGroupModeCacheKey(cmId: number): string {
        return this.ROOT_CACHE_KEY + 'groupmode:' + cmId;
    }

    /**
     * Get user groups in all the supplied courses.
     *
     * @param {any[]} courses List of courses or course ids to get the groups from.
     * @param {string} [siteId] Site to get the groups from. If not defined, use current site.
     * @param {number} [userId] ID of the user. If not defined, use the userId related to siteId.
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved.
     */
    getUserGroups(courses: any[], siteId?: string, userId?: number): Promise<any[]> {
        const promises = [];
        let groups = [];

        courses.forEach((course) => {
            const courseId = typeof course == 'object' ? course.id : course;
            promises.push(this.getUserGroupsInCourse(courseId, siteId, userId).then((courseGroups) => {
                groups = groups.concat(courseGroups);
            }));
        });

        return Promise.all(promises).then(() => {
            return groups;
        });
    }

    /**
     * Get user groups in a course.
     *
     * @param {number} courseId ID of the course.
     * @param {string} [siteId] Site to get the groups from. If not defined, use current site.
     * @param {number} [userId] ID of the user. If not defined, use ID related to siteid.
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved.
     */
    getUserGroupsInCourse(courseId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    userid: userId || site.getUserId(),
                    courseid: courseId
                },
                preSets = {
                    cacheKey: this.getUserGroupsInCourseCacheKey(courseId, userId)
                };

            return site.read('core_group_get_course_user_groups', data, preSets).then((response) => {
                if (response && response.groups) {
                    return response.groups;
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Get cache key for user groups in course WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getUserGroupsInCourseCacheKey(courseId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'courseGroups:' + courseId + ':' + userId;
    }

    /**
     * Invalidates activity allowed groups.
     *
     * @param {number} cmId Course module ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateActivityAllowedGroups(cmId: number, userId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getActivityAllowedGroupsCacheKey(cmId, userId));
        });
    }

    /**
     * Invalidates activity group mode.
     *
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateActivityGroupMode(cmId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getActivityGroupModeCacheKey(cmId));
        });
    }

    /**
     * Invalidates all activity group info: mode and allowed groups.
     *
     * @param {number} cmId Course module ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateActivityGroupInfo(cmId: number, userId?: number, siteId?: string): Promise<any> {
        const promises = [];
        promises.push(this.invalidateActivityAllowedGroups(cmId, userId, siteId));
        promises.push(this.invalidateActivityGroupMode(cmId, siteId));

        return Promise.all(promises);
    }

    /**
     * Invalidates user groups in courses.
     *
     * @param {any[]} courses List of courses or course ids.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserGroups(courses: any[], siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];

            userId = userId || site.getUserId();

            courses.forEach((course) => {
                const courseId = typeof course == 'object' ? course.id : course;
                promises.push(this.invalidateUserGroupsInCourse(courseId, site.id, userId));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates user groups in course.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateUserGroupsInCourse(courseId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getUserGroupsInCourseCacheKey(courseId, userId));
        });
    }
}
