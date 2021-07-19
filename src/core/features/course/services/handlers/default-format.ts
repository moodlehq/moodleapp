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
import { Params } from '@angular/router';

import { CoreCourseAnyCourseData, CoreCourses } from '@features/courses/services/courses';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourseWSSection } from '../course';
import { CoreCourseSection } from '../course-helper';
import { CoreCourseFormatHandler } from '../format-delegate';

/**
 * Default handler used when the course format doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatDefaultHandler implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatDefault';
    format = 'default';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Get the title to use in course page.
     *
     * @param course The course.
     * @return Title.
     */
    getCourseTitle(course: CoreCourseAnyCourseData): string {
        if (course.displayname) {
            return course.displayname;
        } else if (course.fullname) {
            return course.fullname;
        }

        return '';
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can view all sections.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canViewAllSections(course: CoreCourseAnyCourseData): boolean {
        return true;
    }

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can display blocks.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayBlocks(course: CoreCourseAnyCourseData): boolean {
        return true;
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayEnableDownload(course: CoreCourseAnyCourseData): boolean {
        return true;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the default section selector should be displayed.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displaySectionSelector(course: CoreCourseAnyCourseData): boolean {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayRefresher(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean {
        return true;
    }

    /**
     * Given a list of sections, get the "current" section that should be displayed first.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Current section (or promise resolved with current section).
     */
    async getCurrentSection(course: CoreCourseAnyCourseData, sections: CoreCourseSection[]): Promise<CoreCourseSection> {
        let marker: number | undefined;

        // We need the "marker" to determine the current section.
        if ('marker' in course) {
            // We already have it.
            marker = course.marker;
        } else if (!CoreCourses.isGetCoursesByFieldAvailable()) {
            // Cannot get the current section, return all of them.
            return sections[0];
        } else {
            // Try to retrieve the marker.
            const courseData = await CoreUtils.ignoreErrors(CoreCourses.getCourseByField('id', course.id));

            marker = courseData?.marker;
        }

        if (marker && marker > 0) {
            // Find the marked section.
            const section = sections.find((sect) => sect.section == marker);

            if (section) {
                return section;
            }
        }

        // Marked section not found or we couldn't retrieve the marker. Return all sections.
        return sections[0];
    }

    /**
     * Invalidate the data required to load the course format.
     *
     * @param course The course to get the title.
     * @param sections List of sections.
     * @return Promise resolved when the data is invalidated.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async invalidateData(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): Promise<void> {
        await CoreCourses.invalidateCoursesByField('id', course.id);
    }

    /**
     * Open the page to display a course. If not defined, the page CoreCourseSectionPage will be opened.
     * Implement it only if you want to create your own page to display the course. In general it's better to use the method
     * getCourseFormatComponent because it will display the course handlers at the top.
     * Your page should include the course handlers using CoreCoursesDelegate.
     *
     * @param course The course to open. It should contain a "format" attribute.
     * @param params Params to pass to the course page.
     * @return Promise resolved when done.
     */
    async openCourse(course: CoreCourseAnyCourseData, params?: Params): Promise<void> {
        params = params || {};
        Object.assign(params, { course: course });

        // Don't return the .push promise, we don't want to display a loading modal during the page transition.
        const currentTab = CoreNavigator.getCurrentMainMenuTab();
        const routeDepth = CoreNavigator.getRouteDepth(`/main/${currentTab}/course/${course.id}`);
        const deepPath = '/deep'.repeat(routeDepth);

        CoreNavigator.navigateToSitePath(`course${deepPath}/${course.id}`, { params });
    }

    /**
     * Whether the view should be refreshed when completion changes. If your course format doesn't display
     * activity completion then you should return false.
     *
     * @param course The course.
     * @return Whether course view should be refreshed when an activity completion changes.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async shouldRefreshWhenCompletionChanges(course: CoreCourseAnyCourseData): Promise<boolean> {
        return true;
    }

}
