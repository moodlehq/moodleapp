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
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

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

    /**
     * The group ID to use by default. If all participants is visible, 0 will be used. First group ID otherwise.
     * @type {number}
     */
    defaultGroupId?: number;
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

    constructor(private sitesProvider: CoreSitesProvider, private translate: TranslateService,
        private coursesProvider: CoreCoursesProvider) { }

    /**
     * Check if group mode of an activity is enabled.
     *
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<boolean>} Promise resolved with true if the activity has groups, resolved with false otherwise.
     */
    activityHasGroups(cmId: number, siteId?: string, ignoreCache?: boolean): Promise<boolean> {
        return this.getActivityGroupMode(cmId, siteId, ignoreCache).then((groupmode) => {
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any>} Promise resolved when the groups are retrieved.
     */
    getActivityAllowedGroups(cmId: number, userId?: number, siteId?: string, ignoreCache?: boolean): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    cmid: cmId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getActivityAllowedGroupsCacheKey(cmId, userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_group_get_activity_allowed_groups', params, preSets).then((response) => {
                if (!response || !response.groups) {
                    return Promise.reject(null);
                }

                return response;
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
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved. If not allowed, empty array will be returned.
     */
    getActivityAllowedGroupsIfEnabled(cmId: number, userId?: number, siteId?: string, ignoreCache?: boolean): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get real groupmode, in case it's forced by the course.
        return this.activityHasGroups(cmId, siteId, ignoreCache).then((hasGroups) => {
            if (hasGroups) {
                // Get the groups available for the user.
                return this.getActivityAllowedGroups(cmId, userId, siteId, ignoreCache);
            }

            return {
                groups: []
            };
        });
    }

    /**
     * Helper function to get activity group info (group mode and list of groups).
     *
     * @param {number} cmId Course module ID.
     * @param {boolean} [addAllParts] Deprecated.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<CoreGroupInfo>} Promise resolved with the group info.
     */
    getActivityGroupInfo(cmId: number, addAllParts?: boolean, userId?: number, siteId?: string, ignoreCache?: boolean)
            : Promise<CoreGroupInfo> {

        const groupInfo: CoreGroupInfo = {
            groups: []
        };

        return this.getActivityGroupMode(cmId, siteId, ignoreCache).then((groupMode) => {
            groupInfo.separateGroups = groupMode === CoreGroupsProvider.SEPARATEGROUPS;
            groupInfo.visibleGroups = groupMode === CoreGroupsProvider.VISIBLEGROUPS;

            if (groupInfo.separateGroups || groupInfo.visibleGroups) {
                return this.getActivityAllowedGroups(cmId, userId, siteId, ignoreCache);
            }

            return {
                groups: [],
                canaccessallgroups: false
            };
        }).then((result) => {
            if (result.groups.length <= 0) {
                groupInfo.separateGroups = false;
                groupInfo.visibleGroups = false;
                groupInfo.defaultGroupId = 0;
            } else {
                // The "canaccessallgroups" field was added in 3.4. Add all participants for visible groups in previous versions.
                if (result.canaccessallgroups || (typeof result.canaccessallgroups == 'undefined' && groupInfo.visibleGroups)) {
                    groupInfo.groups.push({ id: 0, name: this.translate.instant('core.allparticipants') });
                    groupInfo.defaultGroupId = 0;
                } else {
                    groupInfo.defaultGroupId = result.groups[0].id;
                }

                groupInfo.groups = groupInfo.groups.concat(result.groups);
            }

            return groupInfo;
        });
    }

    /**
     * Get the group mode of an activity.
     *
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise<number>} Promise resolved when the group mode is retrieved.
     */
    getActivityGroupMode(cmId: number, siteId?: string, ignoreCache?: boolean): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    cmid: cmId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getActivityGroupModeCacheKey(cmId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

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
     * Get user groups in all the user enrolled courses.
     *
     * @param {string} [siteId] Site to get the groups from. If not defined, use current site.
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved.
     */
    getAllUserGroups(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = siteId || site.getId();

            if (site.isVersionGreaterEqualThan('3.6')) {
                return this.getUserGroupsInCourse(0, siteId);
            }

            return this.coursesProvider.getUserCourses(false, siteId).then((courses) => {
                courses.push({ id: site.getSiteHomeId() }); // Add front page.

                return this.getUserGroups(courses, siteId);
            });
        });
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
        // Get all courses one by one.
        const promises = courses.map((course) => {
            const courseId = typeof course == 'object' ? course.id : course;

            return this.getUserGroupsInCourse(courseId, siteId, userId);
        });

        return Promise.all(promises).then((courseGroups) => {
            return [].concat(...courseGroups);
        });
    }

    /**
     * Get user groups in a course.
     *
     * @param {number} courseId ID of the course. 0 to get all enrolled courses groups (Moodle version > 3.6).
     * @param {string} [siteId] Site to get the groups from. If not defined, use current site.
     * @param {number} [userId] ID of the user. If not defined, use ID related to siteid.
     * @return {Promise<any[]>} Promise resolved when the groups are retrieved.
     */
    getUserGroupsInCourse(courseId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();
            const data = {
                    userid: userId,
                    courseid: courseId
                },
                preSets = {
                    cacheKey: this.getUserGroupsInCourseCacheKey(courseId, userId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
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
     * Get prefix cache key for  user groups in course WS calls.
     *
     * @return {string} Prefix Cache key.
     */
    protected getUserGroupsInCoursePrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'courseGroups:';
    }

    /**
     * Get cache key for user groups in course WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getUserGroupsInCourseCacheKey(courseId: number, userId: number): string {
        return this.getUserGroupsInCoursePrefixCacheKey() + courseId + ':' + userId;
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
     * Invalidates user groups in all user enrolled courses.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllUserGroups(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (site.isVersionGreaterEqualThan('3.6')) {
                return this.invalidateUserGroupsInCourse(0, siteId);
            }

            return site.invalidateWsCacheForKeyStartingWith(this.getUserGroupsInCoursePrefixCacheKey());
        });
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
            userId = userId || site.getUserId();

            const promises = courses.map((course) => {
                const courseId = typeof course == 'object' ? course.id : course;

                return this.invalidateUserGroupsInCourse(courseId, site.id, userId);
            });

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates user groups in course.
     *
     * @param {number} courseId ID of the course. 0 to get all enrolled courses groups (Moodle version > 3.6).
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

    /**
     * Validate a group ID. If the group is not visible by the user, it will return the first group ID.
     *
     * @param {number} groupId Group ID to validate.
     * @param {CoreGroupInfo} groupInfo Group info.
     * @return {number} Group ID to use.
     */
    validateGroupId(groupId: number, groupInfo: CoreGroupInfo): number {
        if (groupId > 0 && groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
            // Check if the group is in the list of groups.
            if (groupInfo.groups.some((group) => groupId == group.id)) {
                return groupId;
            }
        }

        return groupInfo.defaultGroupId;
    }
}
