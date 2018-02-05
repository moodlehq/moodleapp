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
import { NavController } from 'ionic-angular';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '../../course/providers/options-delegate';
import { CoreCourseProvider } from '../../course/providers/course';
import { CoreUserProvider } from './user';
import { CoreLoginHelperProvider } from '../../login/providers/helper';
import { CoreUserParticipantsComponent } from '../components/participants/participants';

/**
 * Course nav handler.
 */
@Injectable()
export class CoreUserParticipantsCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'AddonParticipants';
    priority = 600;

    constructor(private userProvider: CoreUserProvider, private loginHelper: CoreLoginHelperProvider) {}

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
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreCourseOptionsHandlerData {
        return {
            title: 'core.user.participants',
            class: 'core-user-participants-handler',
            component: CoreUserParticipantsComponent
        };
    }
}
