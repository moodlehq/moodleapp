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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreGradesProvider } from './grades';

/**
 * Profile grades handler.
 */
@Injectable()
export class CoreGradesUserHandler implements CoreUserProfileHandler {
    name = 'CoreGrades:viewGrades';
    priority = 400;
    type = CoreUserDelegate.TYPE_NEW_PAGE;
    viewGradesEnabledCache = {};

    constructor(private linkHelper: CoreContentLinksHelperProvider, protected sitesProvider: CoreSitesProvider,
        private gradesProvider: CoreGradesProvider) { }

    /**
     * Clear view grades cache.
     * If a courseId and userId are specified, it will only delete the entry for that user and course.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     */
    clearViewGradesCache(courseId?: number, userId?: number): void {
        if (courseId && userId) {
            delete this.viewGradesEnabledCache[this.getCacheKey(courseId, userId)];
        } else {
            this.viewGradesEnabledCache = {};
        }
    }

    /**
     * Get a cache key to identify a course and a user.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCacheKey(courseId: number, userId: number): string {
        return courseId + '#' + userId;
    }

    /**
     * Check if handler is enabled.
     *
     * @return Always enabled.
     */
    isEnabled(): boolean {
        return true;
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        const cacheKey = this.getCacheKey(courseId, user.id),
            cache = this.viewGradesEnabledCache[cacheKey];
        if (typeof cache != 'undefined') {
            return cache;
        }

        return this.gradesProvider.isPluginEnabledForCourse(courseId).then(() => {
            return this.gradesProvider.getCourseGradesTable(courseId, user.id).then(() => {
                this.viewGradesEnabledCache[cacheKey] = true;

                return true;
            }).catch(() => {
                this.viewGradesEnabledCache[cacheKey] = false;

                return false;
            });
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'stats',
            title: 'core.grades.grades',
            class: 'core-grades-user-handler',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                const pageParams = {
                    courseId: courseId,
                    userId: user.id
                };
                this.linkHelper.goInSite(navCtrl, 'CoreGradesCoursePage', pageParams);
            }
        };
    }
}
