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
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModPage } from '../page';
import { ADDON_MOD_PAGE_COMPONENT } from '../../constants';

/**
 * Handler to prefetch pages.
 */
@Injectable({ providedIn: 'root' })
export class AddonModPagePrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModPage';
    modName = 'page';
    component = ADDON_MOD_PAGE_COMPONENT;
    updatesNames = /^configuration$|^.*files$/;

    /**
     * Download or prefetch the content.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @returns Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    async downloadOrPrefetch(module: CoreCourseModuleData, courseId: number, prefetch?: boolean): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch));
        promises.push(AddonModPage.getPageData(courseId, module.id));

        await Promise.all(promises);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModPage.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when invalidated.
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModPage.invalidatePageData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await CoreUtils.allPromises(promises);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): Promise<boolean> {
        return AddonModPage.isPluginEnabled();
    }

}
export const AddonModPagePrefetchHandler = makeSingleton(AddonModPagePrefetchHandlerService);
