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
import { CoreLogger } from '@singletons/logger';
import { CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';

const ROOT_CACHE_KEY = 'mmaCourseCompletion:';

/**
 * Service to handle course completion.
 */
@Injectable({ providedIn: 'root' })
export class AddonCourseCompletionProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonCourseCompletion');
    }

    /**
     * Returns whether or not the user can mark a course as self completed.
     * It can if it's configured in the course and it hasn't been completed yet.
     *
     * @param userId User ID.
     * @param completion Course completion.
     * @return True if user can mark course as self completed, false otherwise.
     */
    canMarkSelfCompleted(userId: number, completion: AddonCourseCompletionCourseCompletionStatus): boolean {
        if (CoreSites.getCurrentSiteUserId() != userId) {
            return false;
        }

        let selfCompletionActive = false;
        let alreadyMarked = false;

        completion.completions.forEach((criteria) => {
            if (criteria.type === 1) {
                // Self completion criteria found.
                selfCompletionActive = true;
                alreadyMarked = criteria.complete;
            }
        });

        return selfCompletionActive && !alreadyMarked;
    }

    /**
     * Get completed status text. The language code returned is meant to be translated.
     *
     * @param completion Course completion.
     * @return Language code of the text to show.
     */
    getCompletedStatusText(completion: AddonCourseCompletionCourseCompletionStatus): string {
        if (completion.completed) {
            return 'addon.coursecompletion.completed';
        }

        // Let's calculate status.
        const hasStarted = completion.completions.some((criteria) => criteria.timecompleted || criteria.complete);

        if (hasStarted) {
            return 'addon.coursecompletion.inprogress';
        }

        return 'addon.coursecompletion.notyetstarted';
    }

    /**
     * Get course completion status for a certain course and user.
     *
     * @param courseId Course ID.
     * @param userId User ID. If not defined, use current user.
     * @param preSets Presets to use when calling the WebService.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise to be resolved when the completion is retrieved.
     */
    async getCompletion(
        courseId: number,
        userId?: number,
        preSets: CoreSiteWSPreSets = {},
        siteId?: string,
    ): Promise<AddonCourseCompletionCourseCompletionStatus> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();
        this.logger.debug('Get completion for course ' + courseId + ' and user ' + userId);

        const data: AddonCourseCompletionGetCourseCompletionStatusWSParams = {
            courseid: courseId,
            userid: userId,
        };

        preSets.cacheKey = this.getCompletionCacheKey(courseId, userId);
        preSets.updateFrequency = preSets.updateFrequency || CoreSite.FREQUENCY_SOMETIMES;
        preSets.cacheErrors = ['notenroled'];

        const result: AddonCourseCompletionGetCourseCompletionStatusWSResponse =
            await site.read('core_completion_get_course_completion_status', data, preSets);
        if (result.completionstatus) {
            return result.completionstatus;
        }

        throw new CoreError('Cannot fetch course completion status');
    }

    /**
     * Get cache key for get completion WS calls.
     *
     * @param courseId Course ID.
     * @param useIid User ID.
     * @return Cache key.
     */
    protected getCompletionCacheKey(courseId: number, userId: number): string {
        return ROOT_CACHE_KEY + 'view:' + courseId + ':' + userId;
    }

    /**
     * Invalidates view course completion WS call.
     *
     * @param courseId Course ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the list is invalidated.
     */
    async invalidateCourseCompletion(courseId: number, userId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCompletionCacheKey(courseId, userId));
    }

    /**
     * Returns whether or not the view course completion plugin is enabled for the current site.
     *
     * @return True if plugin enabled, false otherwise.
     */
    isPluginViewEnabled(): boolean {
        return CoreSites.isLoggedIn();
    }

    /**
     * Returns whether or not the view course completion plugin is enabled for a certain course.
     *
     * @param courseId Course ID.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginViewEnabledForCourse(courseId?: number, preferCache: boolean = true): Promise<boolean> {
        if (!courseId) {
            return false;
        }

        const course = await CoreCourses.getUserCourse(courseId, preferCache);

        if (course) {
            if (typeof course.enablecompletion != 'undefined' && !course.enablecompletion) {
                // Completion not enabled for the course.
                return false;
            }

            if (typeof course.completionhascriteria != 'undefined' && !course.completionhascriteria) {
                // No criteria, cannot view completion.
                return false;
            }
        }

        return true;
    }

    /**
     * Returns whether or not the view course completion plugin is enabled for a certain user.
     *
     * @param courseId Course ID.
     * @param userId User ID. If not defined, use current user.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    async isPluginViewEnabledForUser(courseId: number, userId?: number, siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        const currentUserId = site.getUserId();

        // Check if user wants to view his own completion.
        try {
            if (!userId || userId == currentUserId) {
                // Viewing own completion. Get the course to check if it has completion criteria.
                const course = await CoreCourses.getUserCourse(courseId, true);

                // If the site is returning the completionhascriteria then the user can view his own completion.
                // We already checked the value in isPluginViewEnabledForCourse.
                if (course && typeof course.completionhascriteria != 'undefined') {
                    return true;
                }
            }
        } catch {
            // Ignore errors.
        }

        // User not viewing own completion or the site doesn't tell us if the course has criteria.
        // The only way to know if completion can be viewed is to call the WS.
        // Disable emergency cache to be able to detect that the plugin has been disabled (WS will fail).
        const preSets: CoreSiteWSPreSets = {
            emergencyCache: false,
        };

        try {
            await this.getCompletion(courseId, userId, preSets);

            return true;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WS returned an error, plugin is not enabled.
                return false;
            }
        }

        try {
            // Not a WS error. Check if we have a cached value.
            preSets.omitExpires = true;

            await this.getCompletion(courseId, userId, preSets);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Mark a course as self completed.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved on success.
     */
    async markCourseAsSelfCompleted(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonCourseCompletionMarkCourseSelfCompletedWSParams = {
            courseid: courseId,
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('core_completion_mark_course_self_completed', params);

        if (!response.status) {
            throw new CoreError('Cannot mark course as self completed');
        }
    }

}

export const AddonCourseCompletion = makeSingleton(AddonCourseCompletionProvider);

/**
 * Completion status returned by core_completion_get_course_completion_status.
 */
export type AddonCourseCompletionCourseCompletionStatus = {
    completed: boolean; // True if the course is complete, false otherwise.
    aggregation: number; // Aggregation method 1 means all, 2 means any.
    completions: {
        type: number; // Completion criteria type.
        title: string; // Completion criteria Title.
        status: string; // Completion status (Yes/No) a % or number.
        complete: boolean; // Completion status (true/false).
        timecompleted: number; // Timestamp for criteria completetion.
        details: {
            type: string; // Type description.
            criteria: string; // Criteria description.
            requirement: string; // Requirement description.
            status: string; // Status description, can be anything.
        }; // Details.
    }[];
};

/**
 * Params of core_completion_get_course_completion_status WS.
 */
export type AddonCourseCompletionGetCourseCompletionStatusWSParams = {
    courseid: number; // Course ID.
    userid: number; // User ID.
};

/**
 * Data returned by core_completion_get_course_completion_status WS.
 */
export type AddonCourseCompletionGetCourseCompletionStatusWSResponse = {
    completionstatus: AddonCourseCompletionCourseCompletionStatus; // Course status.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_completion_mark_course_self_completed WS.
 */
export type AddonCourseCompletionMarkCourseSelfCompletedWSParams = {
    courseid: number; // Course ID.
};
