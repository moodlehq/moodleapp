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
import { CoreCourseResourcePrefetchHandlerBase } from '@features/course/classes/resource-prefetch-handler';
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { makeSingleton } from '@singletons';
import { AddonModFolder } from '../folder';
import { ADDON_MOD_FOLDER_COMPONENT } from '../../constants';

/**
 * Handler to prefetch folders.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFolderPrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModFolder';
    modName = 'folder';
    component = ADDON_MOD_FOLDER_COMPONENT;

    /**
     * @inheritdoc
     */
    async downloadOrPrefetch(module: CoreCourseModuleData, courseId: number, prefetch?: boolean): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch));
        promises.push(AddonModFolder.getFolder(courseId, module.id));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModFolder.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModFolder.invalidateFolderData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await Promise.all(promises);
    }

}
export const AddonModFolderPrefetchHandler = makeSingleton(AddonModFolderPrefetchHandlerService);
