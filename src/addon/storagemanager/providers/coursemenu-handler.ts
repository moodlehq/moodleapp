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
     * @param courseId Course id
     * @param accessData Access data
     * @param navOptions Navigation options if any
     * @param admOptions Admin options if any
     * @return True
     */
    isEnabledForCourse(courseId: number, accessData: any, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param injector Injector.
     * @param course The course.
     * @return Data needed to render the handler.
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
