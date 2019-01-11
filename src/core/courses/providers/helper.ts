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
import { AddonCourseCompletionProvider } from '@addon/coursecompletion/providers/coursecompletion';

/**
 * Helper to gather some common courses functions.
 */
@Injectable()
export class CoreCoursesHelperProvider {

    constructor(private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider,
        private courseCompletionProvider: AddonCourseCompletionProvider) { }

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
                course.courseImage = courseByField.overviewfiles[0].fileurl;
            } else {
                course.courseImage = false;
            }
        } else {
            delete course.displayname;
            course.courseImage = false;
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
        if (courses[0] && typeof courses[0].overviewfiles != 'undefined' && typeof courses[0].displayname != 'undefined') {
            // We already have the extra data. Call loadCourseExtraInfo to load the calculated fields.
            courses.forEach((course) => {
                this.loadCourseExtraInfo(course, course);
            });

            return Promise.resolve();
        }

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

    /**
     * Get user courses with admin and nav options.
     *
     * @param  {string}  [sort=fullname] Sort courses after get them. If sort is not defined it won't be sorted.
     * @param  {number}  [slice=0]    Slice results to get the X first one. If slice > 0 it will be done after sorting.
     * @param  {string}  [filter]    Filter using some field.
     * @return {Promise<any[]>} Courses filled with options.
     */
    getUserCoursesWithOptions(sort: string = 'fullname', slice: number = 0, filter?: string): Promise<any[]> {
        return this.coursesProvider.getUserCourses().then((courses) => {
            const promises = [],
                courseIds = courses.map((course) => {
                    return course.id;
                });

            if (this.coursesProvider.canGetAdminAndNavOptions()) {
                // Load course options of the course.
                promises.push(this.coursesProvider.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                    courses.forEach((course) => {
                        course.navOptions = options.navOptions[course.id];
                        course.admOptions = options.admOptions[course.id];
                    });
                }));
            }

            promises.push(this.loadCoursesExtraInfo(courses));

            return Promise.all(promises).then(() => {
                if (courses.length <= 0) {
                    return [];
                }

                switch (filter) {
                    case 'isfavourite':
                        courses = courses.filter((course) => {
                            return !!course.isfavourite;
                        });
                        break;
                    default:
                        // Filter not implemented.
                }

                switch (sort) {
                    case 'fullname':
                        courses.sort((a, b) => {
                            const compareA = a.fullname.toLowerCase(),
                                compareB = b.fullname.toLowerCase();

                            return compareA.localeCompare(compareB);
                        });
                        break;
                    case 'lastaccess':
                        courses.sort((a, b) => {
                            return b.lastaccess - a.lastaccess;
                        });
                        break;
                    case 'timemodified':
                        courses.sort((a, b) => {
                            return b.timemodified - a.timemodified;
                        });
                        break;
                    default:
                        // Sort not implemented. Do not sort.
                }

                courses = slice > 0 ? courses.slice(0, slice) : courses;

                // Fetch course completion status if needed.
                return Promise.all(courses.map((course) => {
                    if (typeof course.completed != 'undefined') {
                        // The WebService already returns the completed status, no need to fetch it.
                        return Promise.resolve(course);
                    }

                    if (typeof course.enablecompletion != 'undefined' && course.enablecompletion == 0) {
                        // Completion is disabled for this course, there is no need to fetch the completion status.
                        return Promise.resolve(course);
                    }

                    return this.courseCompletionProvider.getCompletion(course.id).catch(() => {
                        // Ignore error, maybe course completion is disabled or user has no permission.
                    }).then((completion) => {
                        course.completed = completion && completion.completed;

                        return course;
                    });
                }));
            });
        });
    }
}
