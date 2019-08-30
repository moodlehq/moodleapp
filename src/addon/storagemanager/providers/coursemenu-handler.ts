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

import { Injectable, Injector } from '@angular/core';
import { CoreCourseOptionsMenuHandler, CoreCourseOptionsMenuHandlerData } from '@core/course/providers/options-delegate';

/**
 * Handler to inject an option into course menu so that user can get to the manage storage page.
 */
@Injectable()
export class AddonStorageManagerCourseMenuHandler implements CoreCourseOptionsMenuHandler {
    name = 'AddonStorageManager';
    priority = 500;
    isMenuHandler = true;

    /**
     * Checks if the handler is enabled for specified course. This handler is always available.
     *
     * @param {number} courseId Course id
     * @param {any} accessData Access data
     * @param {any} [navOptions] Navigation options if any
     * @param {any} [admOptions] Admin options if any
     * @return {boolean | Promise<boolean>} True
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean | Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param {Injector} injector Injector.
     * @param {any} course The course.
     * @return {CoreCourseOptionsMenuHandlerData} Data needed to render the handler.
     */
    getMenuDisplayData(injector: Injector, course: any): CoreCourseOptionsMenuHandlerData {
        return {
            icon: 'cube',
            title: 'addon.storagemanager.managestorage',
            page: 'AddonStorageManagerCourseStoragePage',
            class: 'addon-storagemanager-coursemenu-handler'
        };
    }
}
