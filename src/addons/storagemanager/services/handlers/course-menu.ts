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
import { CoreCourseOptionsMenuHandler, CoreCourseOptionsMenuHandlerData } from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseDataWithOptions } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';

/**
 * Handler to inject an option into course menu so that user can get to the manage storage page.
 */
@Injectable( { providedIn: 'root' })
export class AddonStorageManagerCourseMenuHandlerService implements CoreCourseOptionsMenuHandler {

    name = 'AddonStorageManager';
    priority = 500;
    isMenuHandler = true;

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getMenuDisplayData(
        course: CoreCourseAnyCourseDataWithOptions,
    ): CoreCourseOptionsMenuHandlerData {
        return {
            icon: 'fas-archive',
            title: 'addon.storagemanager.managestorage',
            page: 'storage/' + course.id,
            class: 'addon-storagemanager-coursemenu-handler',
        };
    }

}
export const AddonStorageManagerCourseMenuHandler = makeSingleton(AddonStorageManagerCourseMenuHandlerService);
