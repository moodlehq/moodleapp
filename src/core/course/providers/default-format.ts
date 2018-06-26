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
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseFormatHandler } from './format-delegate';
import { CoreCourseProvider } from './course';

/**
 * Default handler used when the course format doesn't have a specific implementation.
 */
@Injectable()
export class CoreCourseFormatDefaultHandler implements CoreCourseFormatHandler {
    name = 'CoreCourseFormatDefault';
    format = 'default';

    constructor(private coursesProvider: CoreCoursesProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the title to use in course page.
     *
     * @param {any} course The course.
     * @return {string} Title.
     */
    getCourseTitle(course: any): string {
        return course.fullname || '';
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether it can view all sections.
     */
    canViewAllSections(course: any): boolean {
        return true;
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: any): boolean {
        return true;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether the default section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return true;
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param {any} course The course to check.
     * @param {any[]} sections List of course sections.
     * @return {boolean} Whether the refresher should be displayed.
     */
    displayRefresher?(course: any, sections: any[]): boolean {
        return true;
    }

    /**
     * Given a list of sections, get the "current" section that should be displayed first.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {any|Promise<any>} Current section (or promise resolved with current section).
     */
    getCurrentSection(course: any, sections: any[]): any | Promise<any> {
        if (!this.coursesProvider.isGetCoursesByFieldAvailable()) {
            // Cannot get the current section, return the first one.
            if (sections[0].id != CoreCourseProvider.ALL_SECTIONS_ID) {
                return sections[0];
            }

            return sections[1];
        }

        // We need the "marker" to determine the current section.
        return this.coursesProvider.getCoursesByField('id', course.id).catch(() => {
            // Ignore errors.
        }).then((courses) => {
            if (courses && courses[0]) {
                // Find the marked section.
                const course = courses[0];
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
                    if (section.section == course.marker) {
                        return section;
                    }
                }
            }

            // Marked section not found or we couldn't retrieve the marker. Return the first section.
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                if (section.id != CoreCourseProvider.ALL_SECTIONS_ID) {
                    return section;
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param {any} course The course to get the title.
     * @param {any[]} sections List of sections.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateData(course: any, sections: any[]): Promise<any> {
        return this.coursesProvider.invalidateCoursesByField('id', course.id);
    }

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param {NavController} navCtrl The NavController instance to use.
     * @param {any} course The course to open. It should contain a "format" attribute.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any): Promise<any> {
        return navCtrl.push('CoreCourseSectionPage', { course: course });
    }
}
