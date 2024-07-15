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
import { CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonModBook } from '../book';
import { ADDON_MOD_BOOK_COMPONENT } from '../../constants';

/**
 * Handler to prefetch books.
 */
@Injectable({ providedIn: 'root' })
export class AddonModBookPrefetchHandlerService extends CoreCourseResourcePrefetchHandlerBase {

    name = 'AddonModBook';
    modName = 'book';
    component = ADDON_MOD_BOOK_COMPONENT;
    updatesNames = /^configuration$|^.*files$|^entries$/;

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
        // Ignore errors since this WS isn't available in some Moodle versions.
        promises.push(CoreUtils.ignoreErrors(AddonModBook.getBook(courseId, module.id)));
        await Promise.all(promises);
    }

    /**
     * Returns module intro files.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @returns Promise resolved with list of intro files.
     */
    async getIntroFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        const book = await CoreUtils.ignoreErrors(AddonModBook.getBook(courseId, module.id));

        return this.getIntroFilesFromInstance(module, book);
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        await AddonModBook.invalidateContent(moduleId, courseId);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): Promise<boolean> {
        return AddonModBook.isPluginEnabled();
    }

}

export const AddonModBookPrefetchHandler = makeSingleton(AddonModBookPrefetchHandlerService);
