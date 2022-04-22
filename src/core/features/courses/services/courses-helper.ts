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
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import {
    CoreCourseAnyCourseDataWithOptions,
    CoreCourses,
    CoreCourseSearchedData,
    CoreCourseUserAdminOrNavOptionIndexed,
    CoreEnrolledCourseData,
} from './courses';
import { makeSingleton, Translate } from '@singletons';
import { CoreWSExternalFile } from '@services/ws';
import { AddonCourseCompletion } from '@addons/coursecompletion/services/coursecompletion';
import moment from 'moment';

/**
 * Helper to gather some common courses functions.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursesHelperProvider {

    protected courseSiteColors: Record<string, (string | undefined)[]> = {};

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
    protected loadCourseExtraInfo(
        course: CoreEnrolledCourseDataWithExtraInfo,
        courseByField: CoreCourseSearchedData,
        addCategoryName: boolean = false,
    ): void {
        if (courseByField) {
            course.displayname = courseByField.displayname;
            course.categoryname = addCategoryName ? courseByField.categoryname : undefined;
            course.overviewfiles = course.overviewfiles || courseByField.overviewfiles;
        } else {
            delete course.displayname;
        }
    }

    /**
     * Loads the color of courses or the thumb image.
     *
     * @param courses List of courses.
     * @return Promise resolved when done.
     */
    async loadCoursesColorAndImage(courses: CoreCourseSearchedData[]): Promise<void> {
        if (!courses.length) {
            return;
        }

        await Promise.all(courses.map((course) => this.loadCourseColorAndImage(course)));
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

        if (loadCategoryNames || (courses[0].overviewfiles === undefined && courses[0].displayname === undefined)) {
            const courseIds = courses.map((course) => course.id).join(',');

            courseInfoAvailable = true;

            // Get the extra data for the courses.
            const coursesInfosArray = await CoreCourses.getCoursesByField('ids', courseIds);

            coursesInfo = CoreUtils.arrayToObject(coursesInfosArray, 'id');
        }

        courses.forEach((course) => {
            this.loadCourseExtraInfo(course, courseInfoAvailable ? coursesInfo[course.id] : course, loadCategoryNames);
        });
    }

    /**
     * Load course colors from site config.
     *
     * @return course colors RGB.
     */
    protected async loadCourseSiteColors(): Promise<(string | undefined)[]> {
        const site = CoreSites.getRequiredCurrentSite();
        const siteId = site.getId();

        if (this.courseSiteColors[siteId] !== undefined) {
            return this.courseSiteColors[siteId];
        }

        if (!site.isVersionGreaterEqualThan('3.8')) {
            this.courseSiteColors[siteId] = [];

            return [];
        }

        const colors: (string | undefined)[] = [];

        try {
            const configs = await site.getConfig();
            for (let x = 0; x < 10; x++) {
                colors[x] = configs['core_admin_coursecolor' + (x + 1)] || undefined;
            }

            this.courseSiteColors[siteId] = colors;
        } catch {
            // Ignore errors.
        }

        return colors;
    }

    /**
     * Loads the color of the course or the thumb image.
     *
     * @param course Course data.
     */
    async loadCourseColorAndImage(course: CoreCourseWithImageAndColor): Promise<void> {
        if (course.overviewfiles && course.overviewfiles[0]) {
            course.courseImage = course.overviewfiles[0].fileurl;

            return;
        }

        const colors = await this.loadCourseSiteColors();

        course.colorNumber = course.id % 10;
        course.color = colors.length ? colors[course.colorNumber] : undefined;
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
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreEnrolledCourseDataWithOptions[]> {

        let courses: CoreEnrolledCourseDataWithOptions[] = await CoreCourses.getUserCourses(
            false,
            options.siteId,
            options.readingStrategy,
        );
        if (courses.length <= 0) {
            return [];
        }

        const promises: Promise<void>[] = [];
        const courseIds = courses.map((course) => course.id);

        // Load course options of the course.
        promises.push(CoreCourses.getCoursesAdminAndNavOptions(courseIds, options.siteId).then((options) => {
            courses.forEach((course) => {
                course.navOptions = options.navOptions[course.id];
                course.admOptions = options.admOptions[course.id];
            });

            return;
        }));

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
            // Time modified property is defined on Moodle 4.0.
            case 'timemodified':
                courses.sort((a, b) => (b.timemodified || 0) - (a.timemodified || 0));
                break;
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
            if (course.completed !== undefined) {
                // The WebService already returns the completed status, no need to fetch it.
                return course;
            }

            if (course.enablecompletion !== undefined && !course.enablecompletion) {
                // Completion is disabled for this course, there is no need to fetch the completion status.
                return course;
            }

            try {
                const completion = await AddonCourseCompletion.getCompletion(course.id, undefined, undefined, options.siteId);

                course.completed = completion?.completed;
            } catch {
                // Ignore error, maybe course completion is disabled or user has no permission.
                course.completed = false;
            }

            return course;
        }));
    }

    /**
     * Calculates if course date is past.
     *
     * @param course Course Object.
     * @param gradePeriodAfter Classify past courses as in progress for these many days after the course end date.
     * @return Wether the course is past.
     */
    isPastCourse(course: CoreEnrolledCourseDataWithOptions, gradePeriodAfter = 0): boolean {
        if (course.completed) {
            return true;
        }

        if (!course.enddate) {
            return false;
        }

        // Calculate the end date to use for display classification purposes, incorporating the grace period, if any.
        const endDate = moment(course.enddate * 1000).add(gradePeriodAfter, 'days').valueOf();

        return endDate < Date.now();
    }

    /**
     * Calculates if course date is future.
     *
     * @param course Course Object.
     * @param gradePeriodAfter Classify past courses as in progress for these many days after the course end date.
     * @param gradePeriodBefore Classify future courses as in progress for these many days prior to the course start date.
     * @return Wether the course is future.
     */
    isFutureCourse(
        course: CoreEnrolledCourseDataWithOptions,
        gradePeriodAfter = 0,
        gradePeriodBefore = 0,
    ): boolean {
        if (this.isPastCourse(course, gradePeriodAfter) || !course.startdate) {
            return false;
        }

        // Calculate the start date to use for display classification purposes, incorporating the grace period, if any.
        const startDate = moment(course.startdate * 1000).subtract(gradePeriodBefore, 'days').valueOf();

        return startDate > Date.now();
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
 * Course summary data with admin and navigation option availability.
 */
export type CoreCourseSearchedDataWithOptions = CoreCourseSearchedData & {
    navOptions?: CoreCourseUserAdminOrNavOptionIndexed;
    admOptions?: CoreCourseUserAdminOrNavOptionIndexed;
};

/**
 * Enrolled course data with admin and navigation option availability and extra rendering info.
 */
export type CoreEnrolledCourseDataWithExtraInfoAndOptions = CoreEnrolledCourseDataWithExtraInfo & CoreEnrolledCourseDataWithOptions;

/**
 * Searched course data with admin and navigation option availability and extra rendering info.
 */
export type CoreCourseSearchedDataWithExtraInfoAndOptions = CoreCourseWithImageAndColor & CoreCourseSearchedDataWithOptions;

/**
 * Any course data with admin and navigation option availability and extra rendering info.
 */
export type CoreCourseAnyCourseDataWithExtraInfoAndOptions = CoreCourseWithImageAndColor & CoreCourseAnyCourseDataWithOptions & {
    categoryname?: string; // Category name,
};
