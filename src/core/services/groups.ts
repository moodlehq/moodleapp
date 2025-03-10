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
import { CoreError } from '@classes/errors/error';
import { makeSingleton, Translate } from '@singletons';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '../constants';
import { CoreTextFormat } from '@singletons/text';

/*
 * Service to handle groups.
*/
@Injectable({ providedIn: 'root' })
export class CoreGroupsProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmGroups:';

    // Group mode constants.
    static readonly NOGROUPS = 0;
    static readonly SEPARATEGROUPS = 1;
    static readonly VISIBLEGROUPS = 2;

    /**
     * Check if group mode of an activity is enabled.
     *
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved with true if the activity has groups, resolved with false otherwise.
     */
    async activityHasGroups(cmId: number, siteId?: string, ignoreCache?: boolean): Promise<boolean> {
        try {
            const groupmode = await this.getActivityGroupMode(cmId, siteId, ignoreCache);

            return groupmode === CoreGroupsProvider.SEPARATEGROUPS || groupmode === CoreGroupsProvider.VISIBLEGROUPS;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the groups allowed in an activity.
     *
     * @param cmId Course module ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved when the groups are retrieved.
     */
    async getActivityAllowedGroups(
        cmId: number,
        userId?: number,
        siteId?: string,
        ignoreCache?: boolean,
    ): Promise<CoreGroupGetActivityAllowedGroupsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const params: CoreGroupGetActivityAllowedGroupsWSParams = {
            cmid: cmId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActivityAllowedGroupsCacheKey(cmId, userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response: CoreGroupGetActivityAllowedGroupsWSResponse =
            await site.read('core_group_get_activity_allowed_groups', params, preSets);

        if (!response || !response.groups) {
            throw new CoreError('Activity allowed groups not found.');
        }

        return response;
    }

    /**
     * Get cache key for group mode WS calls.
     *
     * @param cmId Course module ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getActivityAllowedGroupsCacheKey(cmId: number, userId: number): string {
        return `${CoreGroupsProvider.ROOT_CACHE_KEY}allowedgroups:${cmId}:${userId}`;
    }

    /**
     * Get the groups allowed in an activity if they are allowed.
     *
     * @param cmId Course module ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved when the groups are retrieved. If not allowed, empty array will be returned.
     */
    async getActivityAllowedGroupsIfEnabled(cmId: number, userId?: number, siteId?: string, ignoreCache?: boolean):
    Promise<CoreGroupGetActivityAllowedGroupsWSResponse> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Get real groupmode, in case it's forced by the course.
        const hasGroups = await this.activityHasGroups(cmId, siteId, ignoreCache);
        if (hasGroups) {
            // Get the groups available for the user.
            return this.getActivityAllowedGroups(cmId, userId, siteId, ignoreCache);
        }

        return {
            groups: [],
        };
    }

    /**
     * Helper function to get activity group info (group mode and list of groups).
     *
     * @param cmId Course module ID.
     * @param addAllParts Deprecated.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved with the group info.
     */
    async getActivityGroupInfo(
        cmId: number,
        addAllParts?: boolean,
        userId?: number,
        siteId?: string,
        ignoreCache?: boolean,
    ): Promise<CoreGroupInfo> {
        const groupInfo: CoreGroupInfo = {
            groups: [],
            defaultGroupId: 0,
            canAccessAllGroups: false,
        };

        const groupMode = await this.getActivityGroupMode(cmId, siteId, ignoreCache);

        groupInfo.separateGroups = groupMode === CoreGroupsProvider.SEPARATEGROUPS;
        groupInfo.visibleGroups = groupMode === CoreGroupsProvider.VISIBLEGROUPS;

        let result: CoreGroupGetActivityAllowedGroupsWSResponse;
        if (groupInfo.separateGroups || groupInfo.visibleGroups) {
            result = await this.getActivityAllowedGroups(cmId, userId, siteId, ignoreCache);

            groupInfo.canAccessAllGroups = !!result.canaccessallgroups;
        } else {
            result = {
                groups: [],
            };
        }

        if (!result.groups.length) {
            groupInfo.defaultGroupId = 0;
        } else {
            if (result.canaccessallgroups || groupInfo.visibleGroups) {
                groupInfo.groups.push({ id: 0, name: Translate.instant('core.allparticipants') });
                groupInfo.defaultGroupId = 0;
            } else {
                groupInfo.defaultGroupId = result.groups[0].id;
            }

            groupInfo.groups = groupInfo.groups.concat(result.groups);
        }

        return groupInfo;
    }

    /**
     * Get the group mode of an activity.
     *
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved when the group mode is retrieved.
     */
    async getActivityGroupMode(cmId: number, siteId?: string, ignoreCache?: boolean): Promise<number> {
        const site = await CoreSites.getSite(siteId);
        const params: CoreGroupGetActivityGroupmodeWSParams = {
            cmid: cmId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActivityGroupModeCacheKey(cmId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response: CoreGroupGetActivityGroupModeWSResponse =
            await site.read('core_group_get_activity_groupmode', params, preSets);

        if (!response || response.groupmode === undefined) {
            throw new CoreError('Activity group mode not found.');
        }

        return response.groupmode;
    }

    /**
     * Get cache key for group mode WS calls.
     *
     * @param cmId Course module ID.
     * @returns Cache key.
     */
    protected getActivityGroupModeCacheKey(cmId: number): string {
        return `${CoreGroupsProvider.ROOT_CACHE_KEY}groupmode:${cmId}`;
    }

    /**
     * Get user groups in all the user enrolled courses.
     *
     * @param siteId Site to get the groups from. If not defined, use current site.
     * @returns Promise resolved when the groups are retrieved.
     */
    async getAllUserGroups(siteId?: string): Promise<CoreGroup[]> {
        const site = await CoreSites.getSite(siteId);
        siteId = siteId || site.getId();

        if (site.isVersionGreaterEqualThan('3.6')) {
            return this.getUserGroupsInCourse(0, siteId);
        }

        const courses = <CoreCourseBase[]> await CoreCourses.getUserCourses(false, siteId);

        courses.push({ id: site.getSiteHomeId() }); // Add site home.

        return this.getUserGroups(courses, siteId);
    }

    /**
     * Get user groups in all the supplied courses.
     *
     * @param courses List of courses or course ids to get the groups from.
     * @param siteId Site to get the groups from. If not defined, use current site.
     * @param userId ID of the user. If not defined, use the userId related to siteId.
     * @returns Promise resolved when the groups are retrieved.
     */
    async getUserGroups(courses: CoreCourseBase[] | number[], siteId?: string, userId?: number): Promise<CoreGroup[]> {
        // Get all courses one by one.
        const promises = this.getCourseIds(courses).map((courseId) => this.getUserGroupsInCourse(courseId, siteId, userId));

        const courseGroups = await Promise.all(promises);

        return (<CoreGroup[]>[]).concat(...courseGroups);
    }

    /**
     * Get user groups in a course.
     *
     * @param courseId ID of the course. 0 to get all enrolled courses groups (Moodle version > 3.6).
     * @param siteId Site to get the groups from. If not defined, use current site.
     * @param userId ID of the user. If not defined, use ID related to siteid.
     * @returns Promise resolved when the groups are retrieved.
     */
    async getUserGroupsInCourse(courseId: number, siteId?: string, userId?: number): Promise<CoreGroup[]> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();
        const data: CoreGroupGetCourseUserGroupsWSParams = {
            userid: userId,
            courseid: courseId,
        };
        const preSets = {
            cacheKey: this.getUserGroupsInCourseCacheKey(courseId, userId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
        };

        const response: CoreGroupGetCourseUserGroupsWSResponse =
            await site.read('core_group_get_course_user_groups', data, preSets);

        if (!response || !response.groups) {
            throw new CoreError('User groups in course not found.');
        }

        return response.groups;
    }

    /**
     * Get prefix cache key for user groups in course WS calls.
     *
     * @returns Prefix Cache key.
     */
    protected getUserGroupsInCoursePrefixCacheKey(): string {
        return `${CoreGroupsProvider.ROOT_CACHE_KEY}courseGroups:`;
    }

    /**
     * Get cache key for user groups in course WS calls.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserGroupsInCourseCacheKey(courseId: number, userId: number): string {
        return this.getUserGroupsInCoursePrefixCacheKey() + courseId + ':' + userId;
    }

    /**
     * Invalidates activity allowed groups.
     *
     * @param cmId Course module ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateActivityAllowedGroups(cmId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getActivityAllowedGroupsCacheKey(cmId, userId));
    }

    /**
     * Invalidates activity group mode.
     *
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateActivityGroupMode(cmId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getActivityGroupModeCacheKey(cmId));
    }

    /**
     * Invalidates all activity group info: mode and allowed groups.
     *
     * @param cmId Course module ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateActivityGroupInfo(cmId: number, userId?: number, siteId?: string): Promise<void> {
        const promises = <Promise<void>[]>[];
        promises.push(this.invalidateActivityAllowedGroups(cmId, userId, siteId));
        promises.push(this.invalidateActivityGroupMode(cmId, siteId));

        await Promise.all(promises);
    }

    /**
     * Invalidates user groups in all user enrolled courses.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateAllUserGroups(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        if (site.isVersionGreaterEqualThan('3.6')) {
            await this.invalidateUserGroupsInCourse(0, siteId);

            return;
        }

        await site.invalidateWsCacheForKeyStartingWith(this.getUserGroupsInCoursePrefixCacheKey());
    }

    /**
     * Invalidates user groups in courses.
     *
     * @param courses List of courses or course ids.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, use current user.
     */
    async invalidateUserGroups(courses: CoreCourseBase[] | number[], siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const promises = this.getCourseIds(courses).map((courseId) => this.invalidateUserGroupsInCourse(courseId, site.id, userId));

        await Promise.all(promises);
    }

    /**
     * Invalidates user groups in course.
     *
     * @param courseId ID of the course. 0 to get all enrolled courses groups (Moodle version > 3.6).
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, use current user.
     */
    async invalidateUserGroupsInCourse(courseId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getUserGroupsInCourseCacheKey(courseId, userId));
    }

    /**
     * Validate a group ID. If the group is not visible by the user, it will return the first group ID.
     *
     * @param groupId Group ID to validate.
     * @param groupInfo Group info.
     * @returns Group ID to use.
     */
    validateGroupId(groupId = 0, groupInfo: CoreGroupInfo): number {
        if (groupId > 0 && groupInfo && groupInfo.groups && groupInfo.groups.length > 0) {
            // Check if the group is in the list of groups.
            if (groupInfo.groups.some((group) => groupId == group.id)) {
                return groupId;
            }
        }

        return groupInfo.defaultGroupId;
    }

    protected getCourseIds(courses: CoreCourseBase[] | number[]): number[] {
        return courses.length > 0 && typeof courses[0] === 'object'
            ? (courses as CoreCourseBase[]).map((course) => course.id)
            : courses as number[];
    }

}

export const CoreGroups = makeSingleton(CoreGroupsProvider);

/**
 * Specific group info.
 */
export type CoreGroup = {
    id: number; // Group ID.
    name: string; // Multilang compatible name, course unique'.
    description?: string; // Group description text.
    descriptionformat?: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    idnumber?: string; // Id number.
    courseid?: number; // Coure Id.
};

/**
 * Group info for an activity.
 */
export type CoreGroupInfo = {
    /**
     * List of groups.
     */
    groups: CoreGroup[];

    /**
     * Whether it's separate groups.
     */
    separateGroups?: boolean;

    /**
     * Whether it's visible groups.
     */
    visibleGroups?: boolean;

    /**
     * The group ID to use by default. If all participants is visible, 0 will be used. First group ID otherwise.
     */
    defaultGroupId: number;

    /**
     * Whether the user has the capability to access all groups in the context.
     */
    canAccessAllGroups: boolean;
};

/**
 * WS core_group_get_activity_allowed_groups response type.
 */
export type CoreGroupGetActivityAllowedGroupsWSResponse = {
    groups: CoreGroup[]; // List of groups.
    canaccessallgroups?: boolean; // Whether the user will be able to access all the activity groups.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_group_get_activity_groupmode WS.
 */
type CoreGroupGetActivityGroupmodeWSParams = {
    cmid: number; // Course module id.
};

/**
 * Result of WS core_group_get_activity_groupmode.
 */
export type CoreGroupGetActivityGroupModeWSResponse = {
    groupmode: number; // Group mode: 0 for no groups, 1 for separate groups, 2 for visible groups.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_group_get_activity_allowed_groups WS.
 */
type CoreGroupGetActivityAllowedGroupsWSParams = {
    cmid: number; // Course module id.
    userid?: number; // Id of user, empty for current user.
};

/**
 * Params of core_group_get_course_user_groups WS.
 */
type CoreGroupGetCourseUserGroupsWSParams = {
    courseid?: number; // Id of course (empty or 0 for all the courses where the user is enrolled).
    userid?: number; // Id of user (empty or 0 for current user).
    groupingid?: number; // Returns only groups in the specified grouping.
};

/**
 * Result of WS core_group_get_course_user_groups.
 */
export type CoreGroupGetCourseUserGroupsWSResponse = {
    groups: {
        id: number; // Group record id.
        name: string; // Multilang compatible name, course unique.
        description: string; // Group description text.
        descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
        idnumber: string; // Id number.
        courseid?: number; // Course id.
    }[];
    warnings?: CoreWSExternalWarning[];
};
