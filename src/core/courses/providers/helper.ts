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
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from './courses';

/**
 * Helper to gather some common courses functions.
 */
@Injectable()
export class CoreCoursesHelperProvider {

    constructor(private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider) { }

    /**
     * Given a course object returned by core_enrol_get_users_courses and another one returned by core_course_get_courses_by_field,
     * load some extra data to the first one.
     *
     * @param {any} course Course returned by core_enrol_get_users_courses.
     * @param {any} courseByField Course returned by core_course_get_courses_by_field.
     */
    loadCourseExtraInfo(course: any, courseByField: any): void {
        if (courseByField) {
            course.displayname = courseByField.displayname;

            if (courseByField.overviewfiles && courseByField.overviewfiles[0]) {
                course.imageThumb = courseByField.overviewfiles[0].fileurl;
            } else {
                course.imageThumb = false;
            }
        } else {
            delete course.displayname;
            course.imageThumb = false;
        }
    }

    /**
     * Given a list of courses returned by core_enrol_get_users_courses, load some extra data using the WebService
     * core_course_get_courses_by_field if available.
     *
     * @param {any[]} courses List of courses.
     * @return {Promise<any>} Promise resolved when done.
     */
    loadCoursesExtraInfo(courses: any[]): Promise<any> {
        if (!courses.length || !this.coursesProvider.isGetCoursesByFieldAvailable()) {
            // No courses or cannot get the data, stop.
            return Promise.resolve();
        }

        const courseIds = courses.map((course) => {
                return course.id;
            }).join(',');

        // Get the extra data for the courses.
        return this.coursesProvider.getCoursesByField('ids', courseIds).then((coursesInfo) => {
            coursesInfo = this.utils.arrayToObject(coursesInfo, 'id');

            courses.forEach((course) => {
                this.loadCourseExtraInfo(course, coursesInfo[course.id]);
            });
        });
    }
}
