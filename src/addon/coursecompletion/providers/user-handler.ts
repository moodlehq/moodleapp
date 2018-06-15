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
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreEventsProvider } from '@providers/events';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonCourseCompletionProvider } from './coursecompletion';

/**
 * Profile course completion handler.
 */
@Injectable()
export class AddonCourseCompletionUserHandler implements CoreUserProfileHandler {
    name = 'AddonCourseCompletion';
    type = CoreUserDelegate.TYPE_NEW_PAGE;
    priority = 200;

    protected enabledCache = {};

    constructor(eventsProvider: CoreEventsProvider, private courseCompletionProvider: AddonCourseCompletionProvider) {
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            this.enabledCache = {};
        });
        eventsProvider.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            const cacheKey = data.userId + '-' + data.courseId;

            delete this.enabledCache[cacheKey];
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.courseCompletionProvider.isPluginViewEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param {any} user User to check.
     * @param {number} courseId Course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        if (!courseId) {
            return false;
        }

        return this.courseCompletionProvider.isPluginViewEnabledForCourse(courseId).then((courseEnabled) => {
            // If is not enabled in the course, is not enabled for the user.
            if (!courseEnabled) {
                return false;
            }

            const cacheKey = user.id + '-' + courseId;
            if (typeof this.enabledCache[cacheKey] !== 'undefined') {
                return this.enabledCache[cacheKey];
            }

            return this.courseCompletionProvider.isPluginViewEnabledForUser(courseId, user.id).then((enabled) => {
                this.enabledCache[cacheKey] = enabled;

                return enabled;
            });
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreUserProfileHandlerData} Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'checkbox-outline',
            title: 'addon.coursecompletion.coursecompletion',
            class: 'addon-coursecompletion-handler',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                navCtrl.push('AddonCourseCompletionReportPage', {courseId: courseId, userId: user.id });
            }
        };
    }
}
