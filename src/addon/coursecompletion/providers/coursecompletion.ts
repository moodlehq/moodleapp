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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreSite } from '@classes/site';

/**
 * Service to handle course completion.
 */
@Injectable()
export class AddonCourseCompletionProvider {

    protected ROOT_CACHE_KEY = 'mmaCourseCompletion:';
    protected logger;

    constructor(logger: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider,
            private coursesProvider: CoreCoursesProvider,
            private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('AddonCourseCompletionProvider');
    }

    /**
     * Returns whether or not the user can mark a course as self completed.
     * It can if it's configured in the course and it hasn't been completed yet.
     *
     * @param {number} userId     User ID.
     * @param {any}    completion Course completion.
     * @return {boolean} True if user can mark course as self completed, false otherwise.
     */
    canMarkSelfCompleted(userId: number, completion: any): boolean {
        let selfCompletionActive = false,
            alreadyMarked = false;

        if (this.sitesProvider.getCurrentSiteUserId() != userId) {
            return false;
        }

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
     * @param {any} completion Course completion.
     * @return {string} Language code of the text to show.
     */
    getCompletedStatusText(completion: any): string {
        if (completion.completed) {
            return 'addon.coursecompletion.completed';
        } else {
            // Let's calculate status.
            let hasStarted = false;
            completion.completions.forEach((criteria) => {
                if (criteria.timecompleted || criteria.complete) {
                    hasStarted = true;
                }
            });
            if (hasStarted) {
                return 'addon.coursecompletion.inprogress';
            } else {
                return 'addon.coursecompletion.notyetstarted';
            }
        }
    }

    /**
     * Get course completion status for a certain course and user.
     *
     * @param {number} courseId  Course ID.
     * @param {number} [userId]  User ID. If not defined, use current user.
     * @param {any}    [preSets] Presets to use when calling the WebService.
     * @param {string} [siteId]  Site ID. If not defined, use current site.
     * @return {Promise<any>} Promise to be resolved when the completion is retrieved.
     */
    getCompletion(courseId: number, userId?: number, preSets?: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();
            preSets = preSets || {};

            this.logger.debug('Get completion for course ' + courseId + ' and user ' + userId);

            const data = {
                courseid: courseId,
                userid: userId
            };

            preSets.cacheKey = this.getCompletionCacheKey(courseId, userId);
            preSets.updateFrequency = preSets.updateFrequency || CoreSite.FREQUENCY_SOMETIMES;
            preSets.cacheErrors = ['notenroled'];

            return site.read('core_completion_get_course_completion_status', data, preSets).then((data) => {
                if (data.completionstatus) {
                    return data.completionstatus;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get completion WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {number} useIid   User ID.
     * @return {string} Cache key.
     */
    protected getCompletionCacheKey(courseId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'view:' + courseId + ':' + userId;
    }

    /**
     * Invalidates view course completion WS call.
     *
     * @param {number} courseId Course ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @return {Promise<any>} Promise resolved when the list is invalidated.
     */
    invalidateCourseCompletion(courseId: number, userId?: number): Promise<any> {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();

        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getCompletionCacheKey(courseId, userId));
    }

    /**
     * Returns whether or not the view course completion plugin is enabled for the current site.
     *
     * @return {boolean} True if plugin enabled, false otherwise.
     */
   isPluginViewEnabled(): boolean {
       return this.sitesProvider.isLoggedIn();
   }

    /**
     * Returns whether or not the view course completion plugin is enabled for a certain course.
     *
     * @param {number}  courseId           Course ID.
     * @param {boolean} [preferCache=true] True if shouldn't call WS if data is cached, false otherwise.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginViewEnabledForCourse(courseId: number, preferCache: boolean = true): Promise<boolean> {
        if (!courseId) {
            return Promise.reject(null);
        }

        return this.coursesProvider.getUserCourse(courseId, preferCache).then((course) => {
            if (course) {
                if (typeof course.enablecompletion != 'undefined' && course.enablecompletion == 0) {
                    // Completion not enabled for the course.
                    return false;
                }

                if (typeof course.completionhascriteria != 'undefined' && course.completionhascriteria == 0) {
                    // No criteria, cannot view completion.
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Returns whether or not the view course completion plugin is enabled for a certain user.
     *
     * @param {number} courseId Course ID.
     * @param {number} [userId] User ID. If not defined, use current user.
     * @return {Promise<boolean>} Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    isPluginViewEnabledForUser(courseId: number, userId?: number): Promise<boolean> {
        // Check if user wants to view his own completion.
        const currentUserId = this.sitesProvider.getCurrentSiteUserId();
        let promise;

        if (!userId || userId == currentUserId) {
            // Viewing own completion. Get the course to check if it has completion criteria.
            promise = this.coursesProvider.getUserCourse(courseId, true).then((course): any => {
                // If the site is returning the completionhascriteria then the user can view his own completion.
                // We already checked the value in isPluginViewEnabledForCourse.
                if (course && typeof course.completionhascriteria != 'undefined') {
                    return true;
                }

                return Promise.reject(null);
            });
        } else {
            promise = Promise.reject(null);
        }

        return promise.catch(() => {
            // User not viewing own completion or the site doesn't tell us if the course has criteria.
            // The only way to know if completion can be viewed is to call the WS.
            // Disable emergency cache to be able to detect that the plugin has been disabled (WS will fail).
            const preSets: any = {
                emergencyCache: 0
            };

            return this.getCompletion(courseId, userId, preSets).then(() => {
                return true;
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // The WS returned an error, plugin is not enabled.
                    return false;
                } else {
                    // Not a WS error. Check if we have a cached value.
                    preSets.omitExpires = true;

                    return this.getCompletion(courseId, userId, preSets).then(() => {
                        return true;
                    }).catch(() => {
                        return false;
                    });
                }
            });
        });
    }

    /**
     * Mark a course as self completed.
     *
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Resolved on success.
     */
    markCourseAsSelfCompleted(courseId: number): Promise<any> {
        const params = {
            courseid: courseId
        };

        return this.sitesProvider.getCurrentSite().write('core_completion_mark_course_self_completed', params).then((response) => {
            if (!response.status) {
                return Promise.reject(null);
            }
        });
    }
}
