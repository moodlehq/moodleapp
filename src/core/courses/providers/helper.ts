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
import { PopoverController } from 'ionic-angular';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesProvider } from './courses';
import { AddonCourseCompletionProvider } from '@addon/coursecompletion/providers/coursecompletion';
import { TranslateService } from '@ngx-translate/core';
import { CoreCoursePickerMenuPopoverComponent } from '@components/course-picker-menu/course-picker-menu-popover';

/**
 * Helper to gather some common courses functions.
 */
@Injectable()
export class CoreCoursesHelperProvider {

    constructor(protected coursesProvider: CoreCoursesProvider,
            protected utils: CoreUtilsProvider,
            protected courseCompletionProvider: AddonCourseCompletionProvider,
            protected translate: TranslateService,
            protected popoverCtrl: PopoverController,
            protected sitesProvider: CoreSitesProvider) { }

    /**
     * Get the courses to display the course picker popover. If a courseId is specified, it will also return its categoryId.
     *
     * @param courseId Course ID to get the category.
     * @return Promise resolved with the list of courses and the category.
     */
    getCoursesForPopover(courseId?: number): Promise<{courses: any[], categoryId: number}> {
        return this.coursesProvider.getUserCourses(false).then((courses) => {
            // Add "All courses".
            courses.unshift({
                id: -1,
                fullname: this.translate.instant('core.fulllistofcourses'),
                category: -1
            });

            let categoryId;

            if (courseId) {
                // Search the course to get the category.
                const course = courses.find((course) => {
                    return course.id == courseId;
                });

                if (course) {
                    categoryId = course.category;
                }
            }

            return {
                courses: courses,
                categoryId: categoryId
            };
        });
    }

    /**
     * Given a course object returned by core_enrol_get_users_courses and another one returned by core_course_get_courses_by_field,
     * load some extra data to the first one.
     *
     * @param course Course returned by core_enrol_get_users_courses.
     * @param courseByField Course returned by core_course_get_courses_by_field.
     * @param addCategoryName Whether add category name or not.
     */
    loadCourseExtraInfo(course: any, courseByField: any, addCategoryName: boolean = false): void {
        if (courseByField) {
            course.displayname = courseByField.displayname;
            course.categoryname = addCategoryName ? courseByField.categoryname : null;

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
     * @param courses List of courses.
     * @param loadCategoryNames Whether load category names or not.
     * @return Promise resolved when done.
     */
    loadCoursesExtraInfo(courses: any[], loadCategoryNames: boolean = false): Promise<any> {
        if (!courses.length ) {
            // No courses or cannot get the data, stop.
            return Promise.resolve();
        }

        let coursesInfo = {},
            courseInfoAvailable = false;

        const site = this.sitesProvider.getCurrentSite(),
            promises = [],
            colors = [];

        if (site.isVersionGreaterEqualThan('3.8')) {
            promises.push(site.getConfig().then((configs) => {
                for (let x = 0; x < 10; x++) {
                    colors[x] = configs['core_admin_coursecolor' + (x + 1)] || null;
                }
            }).catch(() => {
                // Ignore errors.
            }));
        }

        if (this.coursesProvider.isGetCoursesByFieldAvailable() && (loadCategoryNames ||
                (typeof courses[0].overviewfiles == 'undefined' && typeof courses[0].displayname == 'undefined'))) {
            const courseIds = courses.map((course) => {
                return course.id;
            }).join(',');

            courseInfoAvailable = true;

            // Get the extra data for the courses.
            promises.push(this.coursesProvider.getCoursesByField('ids', courseIds).then((coursesInfos) => {
                coursesInfo = this.utils.arrayToObject(coursesInfos, 'id');
            }));
        }

        return Promise.all(promises).then(() => {
            courses.forEach((course) => {
                this.loadCourseExtraInfo(course, courseInfoAvailable ? coursesInfo[course.id] : course, loadCategoryNames);
                if (!course.courseImage) {
                    course.colorNumber = course.id % 10;
                    course.color = colors.length && colors[course.colorNumber];
                }
            });
        });
    }

    /**
     * Get user courses with admin and nav options.
     *
     * @param sort Sort courses after get them. If sort is not defined it won't be sorted.
     * @param slice Slice results to get the X first one. If slice > 0 it will be done after sorting.
     * @param filter Filter using some field.
     * @param loadCategoryNames Whether load category names or not.
     * @return Courses filled with options.
     */
    getUserCoursesWithOptions(sort: string = 'fullname', slice: number = 0, filter?: string, loadCategoryNames: boolean = false):
            Promise<any[]> {
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

            promises.push(this.loadCoursesExtraInfo(courses, loadCategoryNames));

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

    /**
     * Show a context menu to select a course, and return the courseId and categoryId of the selected course (-1 for all courses).
     * Returns an empty object if popover closed without picking a course.
     *
     * @param event Click event.
     * @param courses List of courses, from CoreCoursesHelperProvider.getCoursesForPopover.
     * @param courseId The course to select at start.
     * @return Promise resolved with the course ID and category ID.
     */
    selectCourse(event: MouseEvent, courses: any[], courseId: number): Promise<{courseId?: number, categoryId?: number}> {
        return new Promise((resolve, reject): any => {
            const popover = this.popoverCtrl.create(CoreCoursePickerMenuPopoverComponent, {
                courses: courses,
                courseId: courseId
            });

            popover.onDidDismiss((course) => {
                if (course) {
                    resolve({courseId: course.id, categoryId: course.category});
                } else {
                    resolve({});
                }
            });
            popover.present({
                ev: event
            });
        });
    }
}
