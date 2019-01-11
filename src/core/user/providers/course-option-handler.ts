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

import { Injectable, Injector } from '@angular/core';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreUserProvider } from './user';
import { CoreUserParticipantsComponent } from '../components/participants/participants';

/**
 * Course nav handler.
 */
@Injectable()
export class CoreUserParticipantsCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'CoreUserParticipants';
    priority = 600;

    constructor(private userProvider: CoreUserProvider) {}

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: any, admOptions?: any): Promise<any> {
        if (navOptions && typeof navOptions.participants != 'undefined') {
            // No need to invalidate anything.
            return Promise.resolve();
        }

        return this.userProvider.invalidateParticipantsList(courseId);
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param {number} courseId The course ID.
     * @param {any} accessData Access type and data. Default, guest, ...
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        if (accessData && accessData.type == CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions && typeof navOptions.participants != 'undefined') {
            return navOptions.participants;
        }

        return this.userProvider.isPluginEnabledForCourse(courseId);
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param {Injector} injector Injector.
     * @param {number} courseId The course ID.
     * @return {CoreCourseOptionsHandlerData|Promise<CoreCourseOptionsHandlerData>} Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, courseId: number): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.user.participants',
            class: 'core-user-participants-handler',
            component: CoreUserParticipantsComponent
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        return this.getParticipantsPage(course.id, 0);
    }

    /**
     * Get a participant page and, if there are more participants, call the function again to get it too.
     *
     * @param {number} courseId Course ID.
     * @param {number} limitFrom The number of participants already loaded.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected getParticipantsPage(courseId: number, limitFrom: number): Promise<any> {
        return this.userProvider.getParticipants(courseId, limitFrom, undefined, undefined, true).then((result) => {
            if (result.canLoadMore) {
                // There are more participants, load the next ones.
                return this.getParticipantsPage(courseId, limitFrom + result.participants.length);
            }
        });
    }
}
