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
import { NavController } from 'ionic-angular';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreCourseFormatHandler } from './format-delegate';

/**
 * Default handler used when the course format doesn't have a specific implementation.
 */
@Injectable()
export class CoreCourseFormatDefaultHandler implements CoreCourseFormatHandler {
    name = 'CoreCourseFormatDefault';
    format = 'default';

    protected loginHelper: CoreLoginHelperProvider; // Inject it later to prevent circular dependencies.

    constructor(protected coursesProvider: CoreCoursesProvider, protected injector: Injector) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the title to use in course page.
     *
     * @param course The course.
     * @return Title.
     */
    getCourseTitle(course: any): string {
        if (course.displayname) {
            return course.displayname;
        } else if (course.fullname) {
            return course.fullname;
        } else {
            return '';
        }
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can view all sections.
     */
    canViewAllSections(course: any): boolean {
        return true;
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: any): boolean {
        return true;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the default section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return true;
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @return Whether the refresher should be displayed.
     */
    displayRefresher?(course: any, sections: any[]): boolean {
        return true;
    }

    /**
     * Given a list of sections, get the "current" section that should be displayed first.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Current section (or promise resolved with current section).
     */
    getCurrentSection(course: any, sections: any[]): any | Promise<any> {
        let promise;

        // We need the "marker" to determine the current section.
        if (typeof course.marker != 'undefined') {
            // We already have it.
            promise = Promise.resolve(course.marker);
        } else if (!this.coursesProvider.isGetCoursesByFieldAvailable()) {
            // Cannot get the current section, return all of them.
            return sections[0];
        } else {
            // Try to retrieve the marker.
            promise = this.coursesProvider.getCourseByField('id', course.id).catch(() => {
                // Ignore errors.
            }).then((course) => {
                return course && course.marker;
            });
        }

        return promise.then((marker) => {
            if (marker > 0) {
                // Find the marked section.
                const section = sections.find((sect) => {
                        return sect.section == marker;
                    });

                if (section) {
                    return section;
                }
            }

            // Marked section not found or we couldn't retrieve the marker. Return all sections.
            return sections[0];
        });
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved when the data is invalidated.
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
     * @param navCtrl The NavController instance to use. If not defined, please use loginHelper.redirect.
     * @param course The course to open. It should contain a "format" attribute.
     * @param params Params to pass to the course page.
     * @return Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any, params?: any): Promise<any> {
        params = params || {};
        Object.assign(params, { course: course });

        if (navCtrl) {
            // Don't return the .push promise, we don't want to display a loading modal during the page transition.
            navCtrl.push('CoreCourseSectionPage', params);

            return Promise.resolve();
        } else {
            // Open the course in the "phantom" tab.
            this.loginHelper = this.loginHelper || this.injector.get(CoreLoginHelperProvider);

            return this.loginHelper.redirect('CoreCourseSectionPage', params);
        }
    }

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @return Whether course view should be refreshed when an activity completion changes.
     */
    shouldRefreshWhenCompletionChanges(course: any): boolean | Promise<boolean> {
        return true;
    }
}
