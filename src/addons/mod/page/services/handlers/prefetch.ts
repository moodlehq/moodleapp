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
import { CorePromiseUtils } from '@static/promise-utils';
import { makeSingleton } from '@singletons';
import { AddonModPage } from '../page';
import { ADDON_MOD_PAGE_COMPONENT, ADDON_MOD_PAGE_COMPONENT_LEGACY, ADDON_MOD_PAGE_MODNAME } from '../../constants';

/**
 * Handler to prefetch pages.
 */
@Injectable({ providedIn: 'root' })
export class AddonModPagePrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = ADDON_MOD_PAGE_COMPONENT;
    modName = ADDON_MOD_PAGE_MODNAME;
    component = ADDON_MOD_PAGE_COMPONENT_LEGACY;
    updatesNames = /^configuration$|^.*files$/;

    /**
     * @inheritdoc
     */
    async downloadOrPrefetch(module: CoreCourseModuleData, courseId: number, prefetch?: boolean): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch));
        promises.push(AddonModPage.getPageData(courseId, module.id));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModPage.invalidateContent(moduleId, courseId);
    }

    /**
     * @inheritdoc
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModPage.invalidatePageData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonModPage.isPluginEnabled();
    }

}
export const AddonModPagePrefetchHandler = makeSingleton(AddonModPagePrefetchHandlerService);
