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
import { AddonNotesProvider } from './notes';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { AddonNotesListComponent } from '../components/list/list';

/**
 * Handler to inject an option into the course main menu.
 */
@Injectable()
export class AddonNotesCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'AddonNotes';
    priority = 200;

    constructor(private notesProvider: AddonNotesProvider) {
    }

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.notesProvider.isPluginEnabled();
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

        if (navOptions && typeof navOptions.notes != 'undefined') {
            return navOptions.notes;
        }

        return this.notesProvider.isPluginViewNotesEnabledForCourse(courseId);
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param {number} courseId The course ID.
     * @return {CoreCourseOptionsHandlerData} Data.
     */
    getDisplayData?(injector: Injector, courseId: number): CoreCourseOptionsHandlerData {
        return {
            title: 'addon.notes.notes',
            class: 'addon-notes-course-handler',
            component: AddonNotesListComponent,
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param {any} course The course.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        return this.notesProvider.getNotes(course.id, undefined, true);
    }
}
