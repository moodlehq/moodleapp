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
import { CoreUtils } from '@services/utils/utils';
import { CoreSites } from '@services/sites';
import { CoreCourses, CoreCourseSearchedData, CoreCourseUserAdminOrNavOptionIndexed, CoreEnrolledCourseData } from './courses';
import { makeSingleton, Translate } from '@singletons';
import { CoreWSExternalFile } from '@services/ws';
import { AddonCourseCompletion } from '@/addons/coursecompletion/services/coursecompletion';

/**
 * Helper to gather some common courses functions.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesHelperProvider {

    /**
     * Get the courses to display the course picker popover. If a courseId is specified, it will also return its categoryId.
     *
     * @param courseId Course ID to get the category.
     * @return Promise resolved with the list of courses and the category.
     */
    async getCoursesForPopover(courseId?: number): Promise<{courses: Partial<CoreEnrolledCourseData>[]; categoryId?: number}> {
        const courses: Partial<CoreEnrolledCourseData>[] = await CoreCourses.getUserCourses(false);

        // Add "All courses".
        courses.unshift({
            id: -1,
            fullname: Translate.instant('core.fulllistofcourses'),
            categoryid: -1,
        });

        let categoryId: number | undefined;
        if (courseId) {
            // Search the course to get the category.
            const course = courses.find((course) => course.id == courseId);

            if (course) {
                categoryId = course.categoryid;
            }
        }

        return {
            courses: courses,
            categoryId: categoryId,
        };
    }

    /**
     * Given a course object returned by core_enrol_get_users_courses and another one returned by core_course_get_courses_by_field,
     * load some extra data to the first one.
     *
     * @param course Course returned by core_enrol_get_users_courses.
     * @param courseByField Course returned by core_course_get_courses_by_field.
     * @param addCategoryName Whether add category name or not.
     */
    loadCourseExtraInfo(
        course: CoreEnrolledCourseDataWithExtraInfo,
        courseByField: CoreCourseSearchedData,
        addCategoryName: boolean = false,
        colors?: (string | undefined)[],
    ): void {
        if (courseByField) {
            course.displayname = courseByField.displayname;
            course.categoryname = addCategoryName ? courseByField.categoryname : undefined;
            course.overviewfiles = course.overviewfiles || courseByField.overviewfiles;
        } else {
            delete course.displayname;
        }

        this.loadCourseColorAndImage(course, colors);
    }

    /**
     * Given a list of courses returned by core_enrol_get_users_courses, load some extra data using the WebService
     * core_course_get_courses_by_field if available.
     *
     * @param courses List of courses.
     * @param loadCategoryNames Whether load category names or not.
     * @return Promise resolved when done.
     */
    async loadCoursesExtraInfo(courses: CoreEnrolledCourseDataWithExtraInfo[], loadCategoryNames: boolean = false): Promise<void> {
        if (!courses.length ) {
            // No courses or cannot get the data, stop.
            return;
        }

        let coursesInfo = {};
        let courseInfoAvailable = false;

        const promises: Promise<void>[] = [];
        let colors: (string | undefined)[] = [];

        promises.push(this.loadCourseSiteColors().then((loadedColors) => {
            colors = loadedColors;

            return;
        }));

        if (CoreCourses.isGetCoursesByFieldAvailable() && (loadCategoryNames ||
                (typeof courses[0].overviewfiles == 'undefined' && typeof courses[0].displayname == 'undefined'))) {
            const courseIds = courses.map((course) => course.id).join(',');

            courseInfoAvailable = true;

            // Get the extra data for the courses.
            promises.push(CoreCourses.getCoursesByField('ids', courseIds).then((coursesInfos) => {
                coursesInfo = CoreUtils.arrayToObject(coursesInfos, 'id');

                return;
            }));
        }

        await Promise.all(promises);

        courses.forEach((course) => {
            this.loadCourseExtraInfo(course, courseInfoAvailable ? coursesInfo[course.id] : course, loadCategoryNames, colors);
        });
    }

    /**
     * Load course colors from site config.
     *
     * @return course colors RGB.
     */
    protected async loadCourseSiteColors(): Promise<(string | undefined)[]> {
        const site = CoreSites.getCurrentSite();
        const colors: (string | undefined)[] = [];

        if (site?.isVersionGreaterEqualThan('3.8')) {
            try {
                const configs = await site.getConfig();
                for (let x = 0; x < 10; x++) {
                    colors[x] = configs['core_admin_coursecolor' + (x + 1)] || undefined;
                }
            } catch {
                // Ignore errors.
            }
        }

        return colors;
    }

    /**
     * Loads the color of the course or the thumb image.
     *
     * @param course Course data.
     * @param colors Colors loaded.
     */
    async loadCourseColorAndImage(course: CoreCourseWithImageAndColor, colors?: (string | undefined)[]): Promise<void> {
        if (!colors) {
            colors = await this.loadCourseSiteColors();
        }

        if (course.overviewfiles && course.overviewfiles[0]) {
            course.courseImage = course.overviewfiles[0].fileurl;
        } else {
            course.colorNumber = course.id % 10;
            course.color = colors.length ? colors[course.colorNumber] : undefined;
        }
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
    async getUserCoursesWithOptions(
        sort: string = 'fullname',
        slice: number = 0,
        filter?: string,
        loadCategoryNames: boolean = false,
    ): Promise<CoreEnrolledCourseDataWithOptions[]> {

        let courses: CoreEnrolledCourseDataWithOptions[] = await CoreCourses.getUserCourses();
        if (courses.length <= 0) {
            return [];
        }

        const promises: Promise<void>[] = [];
        const courseIds = courses.map((course) => course.id);

        if (CoreCourses.canGetAdminAndNavOptions()) {
            // Load course options of the course.
            promises.push(CoreCourses.getCoursesAdminAndNavOptions(courseIds).then((options) => {
                courses.forEach((course) => {
                    course.navOptions = options.navOptions[course.id];
                    course.admOptions = options.admOptions[course.id];
                });

                return;
            }));
        }

        promises.push(this.loadCoursesExtraInfo(courses, loadCategoryNames));

        await Promise.all(promises);

        switch (filter) {
            case 'isfavourite':
                courses = courses.filter((course) => !!course.isfavourite);
                break;
            default:
            // Filter not implemented.
        }

        switch (sort) {
            case 'fullname':
                courses.sort((a, b) => {
                    const compareA = a.fullname.toLowerCase();
                    const compareB = b.fullname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
                break;
            case 'lastaccess':
                courses.sort((a, b) => (b.lastaccess || 0) - (a.lastaccess || 0));
                break;
            // @todo Time modified property is not defined in CoreEnrolledCourseDataWithOptions, so it won't do nothing.
            // case 'timemodified':
            //    courses.sort((a, b) => b.timemodified - a.timemodified);
            //    break;
            case 'shortname':
                courses.sort((a, b) => {
                    const compareA = a.shortname.toLowerCase();
                    const compareB = b.shortname.toLowerCase();

                    return compareA.localeCompare(compareB);
                });
                break;
            default:
            // Sort not implemented. Do not sort.
        }

        courses = slice > 0 ? courses.slice(0, slice) : courses;

        return Promise.all(courses.map(async (course) => {
            if (typeof course.completed != 'undefined') {
                // The WebService already returns the completed status, no need to fetch it.
                return course;
            }

            if (typeof course.enablecompletion != 'undefined' && !course.enablecompletion) {
                // Completion is disabled for this course, there is no need to fetch the completion status.
                return course;
            }

            try {
                const completion = await AddonCourseCompletion.getCompletion(course.id);

                course.completed = completion?.completed;
            } catch {
                // Ignore error, maybe course completion is disabled or user has no permission.
                course.completed = false;
            }

            return course;
        }));
    }

}

export const CoreCoursesHelper = makeSingleton(CoreCoursesHelperProvider);

/**
 * Course with colors info and course image.
 */
export type CoreCourseWithImageAndColor = {
    id: number; // Course id.
    overviewfiles?: CoreWSExternalFile[];
    colorNumber?: number; // Color index number.
    color?: string; // Color RGB.
    courseImage?: string; // Course thumbnail.
};

/**
 * Enrolled course data with extra rendering info.
 */
export type CoreEnrolledCourseDataWithExtraInfo = CoreCourseWithImageAndColor & CoreEnrolledCourseData & {
    categoryname?: string; // Category name,
};

/**
 * Enrolled course data with admin and navigation option availability.
 */
export type CoreEnrolledCourseDataWithOptions = CoreEnrolledCourseData & {
    navOptions?: CoreCourseUserAdminOrNavOptionIndexed;
    admOptions?: CoreCourseUserAdminOrNavOptionIndexed;
};

/**
 * Enrolled course data with admin and navigation option availability and extra rendering info.
 */
export type CoreEnrolledCourseDataWithExtraInfoAndOptions = CoreEnrolledCourseDataWithExtraInfo & CoreEnrolledCourseDataWithOptions;
