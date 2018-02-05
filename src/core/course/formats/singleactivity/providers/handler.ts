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
import { CoreCourseFormatHandler } from '../../../providers/format-delegate';
import { CoreCourseFormatSingleActivityComponent } from '../components/singleactivity';

/**
 * Handler to support singleactivity course format.
 */
@Injectable()
export class CoreCourseFormatSingleActivityHandler implements CoreCourseFormatHandler {
    name = 'singleactivity';

    constructor() {
        // Nothing to do.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether it can view all sections.
     */
    canViewAllSections(course: any): boolean {
        return false;
    }

    /**
     * Get the title to use in course page. If not defined, course fullname.
     * This function will be called without sections first, and then call it again when the sections are retrieved.
     *
     * @param {any} course The course.
     * @param {any[]} [sections] List of sections.
     * @return {string} Title.
     */
    getCourseTitle(course: any, sections?: any[]): string {
        if (sections && sections[0] && sections[0].modules && sections[0].modules[0]) {
            return sections[0].modules[0].name;
        }

        return course.fullname || '';
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @return {boolean} Whether the option to enable section/module download should be displayed
     */
    displayEnableDownload(course: any): boolean {
        return false;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param {any} course The course to check.
     * @type {boolean} Whether the default section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return false;
    }

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     *
     * @param {any} course The course to render.
     * @return {any} The component to use, undefined if not found.
     */
    getCourseFormatComponent(course: any): any {
        return CoreCourseFormatSingleActivityComponent;
    }
}
