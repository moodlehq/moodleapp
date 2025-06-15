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
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreError } from '@classes/errors/error';
import { SafeNumber } from '@/core/utils/types';
import { CoreGradeType } from '../constants';
import { CoreUserParent } from '@features/user/services/parent';

/**
 * Service to provide grade functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesProvider {

    static readonly TYPE_NONE = CoreGradeType.NONE;
    static readonly TYPE_VALUE = CoreGradeType.VALUE;
    static readonly TYPE_SCALE = CoreGradeType.SCALE;
    static readonly TYPE_TEXT = CoreGradeType.TEXT;

    protected static readonly ROOT_CACHE_KEY = 'mmGrades:';

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreGradesProvider');
    }

    /**
     * Get cache key for grade table data WS calls.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from.
     * @returns Cache key.
     */
    protected getCourseGradesCacheKey(courseId: number, userId: number): string {
        return this.getCourseGradesPrefixCacheKey(courseId) + userId;
    }

    /**
     * Get cache key for grade items data WS calls.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from.
     * @param groupId ID of the group to get the grades from. Default: 0.
     * @returns Cache key.
     */
    protected getCourseGradesItemsCacheKey(courseId: number, userId: number, groupId?: number): string {
        groupId = groupId ?? 0;

        return this.getCourseGradesPrefixCacheKey(courseId) + userId + ':' + groupId;
    }

    /**
     * Get prefix cache key for grade table data WS calls.
     *
     * @param courseId ID of the course to get the grades from.
     * @returns Cache key.
     */
    protected getCourseGradesPrefixCacheKey(courseId: number): string {
        return CoreGradesProvider.ROOT_CACHE_KEY + 'items:' + courseId + ':';
    }

    /**
     * Get prefix cache key for grade permissions WS calls.
     *
     * @param courseId ID of the course to check permissions.
     * @returns Cache key.
     */
    protected getCourseGradesPermissionsCacheKey(courseId: number): string {
        return this.getCourseGradesPrefixCacheKey(courseId) + ':canviewallgrades';
    }

    /**
     * Get cache key for courses grade WS calls.
     *
     * @returns Cache key.
     */
    protected getCoursesGradesCacheKey(): string {
        return CoreGradesProvider.ROOT_CACHE_KEY + 'coursesgrades';
    }

    /**
     * Get the grade items for a certain module. Keep in mind that may have more than one item to include outcomes and scales.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from. If not defined use site's current user.
     * @param groupId ID of the group to get the grades from. Not used for old gradebook table.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the grades are retrieved.
     */
    async getGradeItems(
        courseId: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesGradeItem[]> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        return this.getCourseGradesItems(courseId, userId, groupId, siteId, ignoreCache);
    }

    /**
     * Get the grade items for a certain course.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from.
     * @param groupId ID of the group to get the grades from. Default 0.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the grades table is retrieved.
     */
    async getCourseGradesItems(
        courseId: number,
        userId?: number,
        groupId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesGradeItem[]> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        groupId = groupId || 0;

        this.logger.debug(`Get grades for course '${courseId}' and user '${userId}'`);

        const params: CoreGradesGetUserGradeItemsWSParams = {
            courseid: courseId,
            userid: userId,
            groupid: groupId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseGradesItemsCacheKey(courseId, userId, groupId),
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const grades = await site.read<CoreGradesGetUserGradeItemsWSResponse>(
            'gradereport_user_get_grade_items',
            params,
            preSets,
        );

        if (!grades?.usergrades?.[0]) {
            throw new CoreError('Couldn\'t get course grades items');
        }

        return grades.usergrades[0].gradeitems;
    }

    /**
     * Get the grades for a certain course.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from.
     * @param siteId Site ID. If not defined, current site.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise to be resolved when the grades table is retrieved.
     */
    async getCourseGradesTable(
        courseId: number,
        userId?: number,
        siteId?: string,
        ignoreCache: boolean = false,
    ): Promise<CoreGradesTable> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        this.logger.debug(`Get grades for course '${courseId}' and user '${userId}'`);

        const params: CoreGradesGetUserGradesTableWSParams = {
            courseid: courseId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseGradesCacheKey(courseId, userId),
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const table = await site.read<CoreGradesGetUserGradesTableWSResponse>('gradereport_user_get_grades_table', params, preSets);

        if (!table?.tables?.[0]) {
            throw new CoreError('Couldn\'t get course grades table');
        }

        return table.tables[0];
    }

    /**
     * Get the grades for a certain course.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise to be resolved when the grades are retrieved.
     */
    async getCoursesGrades(siteId?: string): Promise<CoreGradesGradeOverview[]> {
        const site = await CoreSites.getSite(siteId);

        this.logger.debug('Get course grades');

        const params: CoreGradesGetOverviewCourseGradesWSParams = {};
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCoursesGradesCacheKey(),
        };

        const data = await site.read<CoreGradesGetOverviewCourseGradesWSResponse>(
            'gradereport_overview_get_course_grades',
            params,
            preSets,
        );

        if (!data?.grades) {
            throw new Error('Couldn\'t get course grades');
        }

        return data.grades;
    }

    /**
     * Invalidates courses grade table and items WS calls for all users.
     *
     * @param courseId ID of the course to get the grades from.
     * @param siteId Site ID (empty for current site).
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllCourseGradesData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getCourseGradesPrefixCacheKey(courseId));
    }

    /**
     * Invalidates grade table data WS calls.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @param siteId Site id (empty for current site).
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCourseGradesData(courseId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCourseGradesCacheKey(courseId, userId));
    }

    /**
     * Invalidates courses grade data WS calls.
     *
     * @param siteId Site id (empty for current site).
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCoursesGradesData(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCoursesGradesCacheKey());
    }

    /**
     * Invalidates courses grade items data WS calls.
     *
     * @param courseId ID of the course to get the grades from.
     * @param userId ID of the user to get the grades from.
     * @param groupId ID of the group to get the grades from. Default: 0.
     * @param siteId Site id (empty for current site).
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCourseGradesItemsData(courseId: number, userId: number, groupId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCourseGradesItemsCacheKey(courseId, userId, groupId));
    }

    /**
     * Invalidates course grade permissions WS calls.
     *
     * @param courseId ID of the course to get the permissions from.
     */
    async invalidateCourseGradesPermissionsData(courseId: number): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();

        await site.invalidateWsCacheForKey(this.getCourseGradesPermissionsCacheKey(courseId));
    }

    /**
     * Returns whether or not the plugin is enabled for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolve with true if plugin is enabled, false otherwise.
     */
    async isCourseGradesEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        // Check that the configurable mygradesurl is pointing to the gradereport_overview plugin.
        const url = site.getStoredConfig('mygradesurl') || '';

        return url.indexOf('/grade/report/overview/') !== -1;
    }

    /**
     * Returns whether or not the grade addon is enabled for a certain course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabledForCourse(courseId?: number, siteId?: string): Promise<boolean> {
        if (!courseId) {
            return false;
        }

        const course = await CoreCourses.getUserCourse(courseId, true, siteId);

        return !(course && course.showgrades !== undefined && !course.showgrades);
    }

    /**
     * Log Course grades view in Moodle.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @returns Promise resolved when done.
     */
    async logCourseGradesView(courseId: number, userId: number): Promise<void> {
        userId = userId || CoreSites.getCurrentSiteUserId();

        const site = CoreSites.getCurrentSite();

        const params: CoreGradesGradereportViewGradeReportWSParams = { courseid: courseId, userid: userId };

        await site?.write('gradereport_user_view_grade_report', params);
    }

    /**
     * Log Courses grades view in Moodle.
     *
     * @param courseId Course ID. If not defined, site Home ID.
     * @returns Promise resolved when done.
     */
    async logCoursesGradesView(courseId?: number): Promise<void> {
        if (!courseId) {
            courseId = CoreSites.getCurrentSiteHomeId();
        }

        const params: CoreGradesGradereportViewGradeReportWSParams = {
            courseid: courseId,
        };

        const site = CoreSites.getCurrentSite();

        await site?.write('gradereport_overview_view_grade_report', params);
    }

    /**
     * Check whether the current user can view all the grades in the course.
     *
     * @param courseId Course id.
     * @returns Whether the current user can view all the grades.
     */
    async canViewAllGrades(courseId: number): Promise<boolean> {
        const site = CoreSites.getRequiredCurrentSite();

        if (!site.wsAvailable('gradereport_user_get_access_information')) {
            return false;
        }

        const params: CoreGradesGetUserAccessInformationWSParams = { courseid: courseId };
        const preSets: CoreSiteWSPreSets = { cacheKey: this.getCourseGradesPermissionsCacheKey(courseId) };
        const access = await site.read<CoreGradesGetUserAccessInformationWSResponse>(
            'gradereport_user_get_access_information',
            params,
            preSets,
        );

        return access.canviewallgrades;
    }

}

export const CoreGrades = makeSingleton(CoreGradesProvider);

/**
 * Params of gradereport_user_view_grade_report and gradereport_overview_view_grade_report WS.
 */
type CoreGradesGradereportViewGradeReportWSParams = {
    courseid: number; // Id of the course.
    userid?: number; // Id of the user, 0 means current user.
};

/**
 * Params of gradereport_user_get_grade_items WS.
 */
type CoreGradesGetUserGradeItemsWSParams = {
    courseid: number; // Course Id.
    userid?: number; // Return grades only for this user (optional).
    groupid?: number; // Get users from this group only.
};

/**
 * Params of gradereport_user_get_grades_table WS.
 */
type CoreGradesGetUserGradesTableWSParams = {
    courseid: number; // Course Id.
    userid?: number; // Return grades only for this user (optional).
    groupid?: number; // Get users from this group only.
};

/**
 * Params of gradereport_overview_get_course_grades WS.
 */
type CoreGradesGetOverviewCourseGradesWSParams = {
    userid?: number; // Get grades for this user (optional, default current).
};

/**
 * Params of gradereport_user_get_access_information WS.
 */
type CoreGradesGetUserAccessInformationWSParams = {
    courseid: number; // Id of the course.
};

/**
 * Data returned by gradereport_user_get_grade_items WS.
 */
export type CoreGradesGetUserGradeItemsWSResponse = {
    usergrades: {
        courseid: number; // Course id.
        userid: number; // User id.
        userfullname: string; // User fullname.
        useridnumber: string; // User idnumber.
        maxdepth: number; // Table max depth (needed for printing it).
        gradeitems: CoreGradesGradeItem[];
    }[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by gradereport_user_get_grades_table WS.
 */
export type CoreGradesGetUserGradesTableWSResponse = {
    tables: CoreGradesTable[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by gradereport_overview_get_course_grades WS.
 */
export type CoreGradesGetOverviewCourseGradesWSResponse = {
    grades: CoreGradesGradeOverview[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Data returned by gradereport_user_get_access_information WS.
 */
type CoreGradesGetUserAccessInformationWSResponse = {
    canviewusergradereport: boolean;
    canviewmygrades: boolean;
    canviewallgrades: boolean;
};

/**
 * Grade item data.
 */
export type CoreGradesGradeItem = {
    id: number; // Grade item id.
    itemname: string; // Grade item name.
    itemtype: string; // Grade item type.
    itemmodule: string; // Grade item module.
    iteminstance: number; // Grade item instance.
    itemnumber: number; // Grade item item number.
    idnumber: string; // Grade item idnumber.
    categoryid: number; // Grade item category id.
    outcomeid: number; // Outcome id.
    scaleid: number; // Scale id.
    locked?: boolean; // Grade item for user locked?.
    cmid?: number; // Course module id (if type mod).
    weightraw?: number; // Weight raw.
    weightformatted?: string; // Weight.
    status?: string; // Status.
    graderaw?: SafeNumber; // Grade raw.
    gradedatesubmitted?: number; // Grade submit date.
    gradedategraded?: number; // Grade graded date.
    gradehiddenbydate?: boolean; // Grade hidden by date?.
    gradeneedsupdate?: boolean; // Grade needs update?.
    gradeishidden?: boolean; // Grade is hidden?.
    gradeislocked?: boolean; // Grade is locked?.
    gradeisoverridden?: boolean; // Grade overridden?.
    gradeformatted?: string; // The grade formatted.
    grademin?: number; // Grade min.
    grademax?: number; // Grade max.
    rangeformatted?: string; // Range formatted.
    percentageformatted?: string; // Percentage.
    lettergradeformatted?: string; // Letter grade.
    rank?: number; // Rank in the course.
    numusers?: number; // Num users in course.
    averageformatted?: string; // Grade average.
    feedback?: string; // Grade feedback.
    feedbackformat?: number; // Feedback format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
};

/**
 * Grade table data.
 */
export type CoreGradesTable = {
    courseid: number; // Course id.
    userid: number; // User id.
    userfullname: string; // User fullname.
    maxdepth: number; // Table max depth (needed for printing it).
    tabledata: CoreGradesTableRow[];
};

/**
 * Grade table data item.
 */
export type CoreGradesTableRow = {
    itemname?: CoreGradesTableItemNameColumn; // The item returned data.
    leader?: CoreGradesTableLeaderColumn; // The item returned data.
    weight?: CoreGradesTableCommonColumn; // Weight column.
    grade?: CoreGradesTableCommonColumn; // Grade column.
    range?: CoreGradesTableCommonColumn; // Range column.
    percentage?: CoreGradesTableCommonColumn; // Percentage column.
    lettergrade?: CoreGradesTableCommonColumn; // Lettergrade column.
    rank?: CoreGradesTableCommonColumn; // Rank column.
    average?: CoreGradesTableCommonColumn; // Average column.
    feedback?: CoreGradesTableCommonColumn; // Feedback column.
    contributiontocoursetotal?: CoreGradesTableCommonColumn; // Contributiontocoursetotal column.
};

/**
 * Grade table common column data.
 */
export type CoreGradesTableCommonColumn = {
    class: string; // Class.
    content: string; // Cell content.
    headers: string; // Headers.
};

/**
 * Grade table item name column.
 */
export type CoreGradesTableItemNameColumn = {
    class: string; // Class.
    colspan: number; // Col span.
    content: string; // Cell content.
    celltype: string; // Cell type.
    id: string; // Id.
};

/**
 * Grade table leader column.
 */
export type CoreGradesTableLeaderColumn = {
    class: string; // Class.
    rowspan: number; // Row span.
    content: undefined; // The WS doesn't return this data, but we declare it to make it coherent with the other columns.
};

/**
 * Grade table column.
 */
export type CoreGradesTableColumn = CoreGradesTableCommonColumn | CoreGradesTableItemNameColumn | CoreGradesTableLeaderColumn;

/**
 * Grade overview data.
 */
export type CoreGradesGradeOverview = {
    courseid: number; // Course id.
    grade: string; // Grade formatted.
    rawgrade: string; // Raw grade, not formatted.
    rank?: number; // Your rank in the course.
};
