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
import { CoreCourseProvider } from '@features/course/services/course';
import {
    CoreCourseAccess,
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourses, CoreCourseUserAdminOrNavOptionIndexed } from '@features/courses/services/courses';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions } from '@features/courses/services/courses-helper';
import { makeSingleton } from '@singletons';
import { CoreGrades } from '../grades';

/**
 * Course nav handler.
 */
@Injectable({ providedIn: 'root' })
export class CoreGradesCourseOptionHandlerService implements CoreCourseOptionsHandler {

    name = 'CoreGrades';
    priority = 400;

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @return Promise resolved when done.
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: CoreCourseUserAdminOrNavOptionIndexed): Promise<void> {
        if (navOptions && typeof navOptions.grades != 'undefined') {
            // No need to invalidate anything.
            return Promise.resolve();
        }

        return CoreCourses.invalidateUserCourses();
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @return True or promise resolved with true if enabled.
     */
    isEnabledForCourse(
        courseId: number,
        accessData: CoreCourseAccess,
        navOptions?: CoreCourseUserAdminOrNavOptionIndexed,
    ): boolean | Promise<boolean> {
        if (accessData && accessData.type == CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions && typeof navOptions.grades != 'undefined') {
            return navOptions.grades;
        }

        return CoreGrades.isPluginEnabledForCourse(courseId);
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.grades.grades',
            class: 'core-grades-course-handler',
            page: 'grades',
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @return Promise resolved when done.
     */
    async prefetch(course: CoreEnrolledCourseDataWithExtraInfoAndOptions): Promise<void> {
        await CoreGrades.getCourseGradesTable(course.id, undefined, undefined, true);
    }

}

export const CoreGradesCourseOptionHandler = makeSingleton(CoreGradesCourseOptionHandlerService);
