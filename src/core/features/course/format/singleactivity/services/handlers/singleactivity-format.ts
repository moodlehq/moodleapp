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

import { Injectable, Type } from '@angular/core';

import { CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseFormatHandler } from '@features/course/services/format-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreCourseFormatSingleActivityComponent } from '../../components/singleactivity';
import { makeSingleton } from '@singletons';

/**
 * Handler to support singleactivity course format.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseFormatSingleActivityHandlerService implements CoreCourseFormatHandler {

    name = 'CoreCourseFormatSingleActivity';
    format = 'singleactivity';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can view all sections.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canViewAllSections(course: CoreCourseAnyCourseData): boolean {
        return false;
    }

    /**
     * Whether the option blocks should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can display blocks.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayBlocks(course: CoreCourseAnyCourseData): boolean {
        return false;
    }

    /**
     * Get the title to use in course page. If not defined, course displayname or fullname.
     * This function will be called without sections first, and then call it again when the sections are retrieved.
     *
     * @param course The course.
     * @param sections List of sections.
     * @return Title.
     */
    getCourseTitle(course: CoreCourseAnyCourseData, sections?: CoreCourseWSSection[]): string {
        if (sections?.[0]?.modules?.[0]) {
            return sections[0].modules[0].name;
        }

        if (course.displayname) {
            return course.displayname;
        } else if (course.fullname) {
            return course.fullname;
        }

        return '';
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displayEnableDownload(course: CoreCourseAnyCourseData): boolean {
        return false;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the default section selector should be displayed.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    displaySectionSelector(course: CoreCourseAnyCourseData): boolean {
        return false;
    }

    /**
     * Whether the course refresher should be displayed. If it returns false, a refresher must be included in the course format,
     * and the doRefresh method of CoreCourseSectionPage must be called on refresh. Defaults to true.
     *
     * @param course The course to check.
     * @param sections List of course sections.
     * @return Whether the refresher should be displayed.
     */
    displayRefresher(course: CoreCourseAnyCourseData, sections: CoreCourseWSSection[]): boolean {
        if (sections?.[0]?.modules?.[0]) {
            return CoreCourseModuleDelegate.displayRefresherInSingleActivity(sections[0].modules[0].modname);
        } else {
            return true;
        }
    }

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param course The course to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getCourseFormatComponent(course: CoreCourseAnyCourseData): Promise<Type<unknown>> {
        return CoreCourseFormatSingleActivityComponent;
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
        return false;
    }

}

export const CoreCourseFormatSingleActivityHandler = makeSingleton(CoreCourseFormatSingleActivityHandlerService);
