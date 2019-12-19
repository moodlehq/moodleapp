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

import { Injectable, Injector } from '@angular/core';
import { CoreCourseOptionsHandler, CoreCourseOptionsHandlerData } from '@core/course/providers/options-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreGradesProvider } from './grades';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreGradesCourseComponent } from '../components/course/course';

/**
 * Course nav handler.
 */
@Injectable()
export class CoreGradesCourseOptionHandler implements CoreCourseOptionsHandler {
    name = 'CoreGrades';
    priority = 400;

    constructor(private gradesProvider: CoreGradesProvider, private coursesProvider: CoreCoursesProvider) {}

    /**
     * Should invalidate the data to determine if the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved when done.
     */
    invalidateEnabledForCourse(courseId: number, navOptions?: any, admOptions?: any): Promise<any> {
        if (navOptions && typeof navOptions.grades != 'undefined') {
            // No need to invalidate anything.
            return Promise.resolve();
        }

        return this.coursesProvider.invalidateUserCourses();
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether or not the handler is enabled for a certain course.
     *
     * @param courseId The course ID.
     * @param accessData Access type and data. Default, guest, ...
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return True or promise resolved with true if enabled.
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        if (accessData && accessData.type == CoreCourseProvider.ACCESS_GUEST) {
            return false; // Not enabled for guests.
        }

        if (navOptions && typeof navOptions.grades != 'undefined') {
            return navOptions.grades;
        }

        return this.gradesProvider.isPluginEnabledForCourse(courseId);
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param injector Injector.
     * @param course The course.
     * @return Data or promise resolved with the data.
     */
    getDisplayData(injector: Injector, course: any): CoreCourseOptionsHandlerData | Promise<CoreCourseOptionsHandlerData> {
        return {
            title: 'core.grades.grades',
            class: 'core-grades-course-handler',
            component: CoreGradesCourseComponent
        };
    }

    /**
     * Called when a course is downloaded. It should prefetch all the data to be able to see the addon in offline.
     *
     * @param course The course.
     * @return Promise resolved when done.
     */
    prefetch(course: any): Promise<any> {
        return this.gradesProvider.getCourseGradesTable(course.id, undefined, undefined, true);
    }
}
