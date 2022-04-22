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
import { CoreCourseAnyCourseData, CoreCourses } from '@features/courses/services/courses';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { CoreCourseSection } from '../course-helper';
import { CoreCourseFormatCurrentSectionData, CoreCourseFormatHandler } from '../format-delegate';

/**
 * Default handler used when the course format doesn't have a specific implementation.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatDefaultHandler implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatDefault';
    format = 'default';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getCourseTitle(course: CoreCourseAnyCourseData): string {
        return course.fullname || '';
    }

    /**
     * @inheritdoc
     */
    canViewAllSections(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    displayBlocks(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    displayCourseIndex(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    displayRefresher(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    async getCurrentSection(
        course: CoreCourseAnyCourseData,
        sections: CoreCourseSection[],
    ): Promise<CoreCourseFormatCurrentSectionData<CoreCourseSection>> {
        let marker: number | undefined;

        // We need the "marker" to determine the current section.
        if ('marker' in course) {
            // We already have it.
            marker = course.marker;
        } else {
            // Try to retrieve the marker.
            const courseData = await CoreUtils.ignoreErrors(CoreCourses.getCourseByField('id', course.id));

            marker = courseData?.marker;
        }

        if (marker && marker > 0) {
            // Find the marked section.
            const section = sections.find((sect) => sect.section == marker);

            if (section) {
                return {
                    section,
                    forceSelected: true,
                };
            }
        }

        // Marked section not found or we couldn't retrieve the marker. Return all sections.
        return {
            section: sections[0],
            forceSelected: false,
        };
    }

    /**
     * @inheritdoc
     */
    getSectionHightlightedName(): string {
        return Translate.instant('core.course.highlighted');
    }

    /**
     * @inheritdoc
     */
    async invalidateData(course: CoreCourseAnyCourseData): Promise<void> {
        await CoreCourses.invalidateCoursesByField('id', course.id);
    }

    /**
     * @inheritdoc
     */
    async openCourse(course: CoreCourseAnyCourseData, navOptions?: CoreNavigationOptions): Promise<void> {
        navOptions = navOptions || {};

        navOptions.params = navOptions.params || {};
        Object.assign(navOptions.params, { course: course });

        // When replace is true, disable route depth.
        let routeDepth = 0;
        if (!navOptions.replace) {
            // Don't return the .push promise, we don't want to display a loading modal during the page transition.
            const currentTab = CoreNavigator.getCurrentMainMenuTab();
            routeDepth = CoreNavigator.getRouteDepth(`/main/${currentTab}/course/${course.id}`);
        }
        const deepPath = '/deep'.repeat(routeDepth);

        CoreNavigator.navigateToSitePath(`course${deepPath}/${course.id}`, navOptions);
    }

    /**
     * @inheritdoc
     */
    async shouldRefreshWhenCompletionChanges(): Promise<boolean> {
        return true;
    }

}
