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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseResourcePrefetchHandlerBase } from '@core/course/classes/resource-prefetch-handler';
import { AddonModBookProvider } from './book';

/**
 * Handler to prefetch books.
 */
@Injectable()
export class AddonModBookPrefetchHandler extends CoreCourseResourcePrefetchHandlerBase {
    name = 'AddonModBook';
    modName = 'book';
    component = AddonModBookProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^entries$/;

    constructor(translate: TranslateService, appProvider: CoreAppProvider, utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider, filepoolProvider: CoreFilepoolProvider, sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider, protected bookProvider: AddonModBookProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Download or prefetch the content.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @param {boolean} [prefetch] True to prefetch, false to download right away.
     * @param {string} [dirPath] Path of the directory where to store all the content files. This is to keep the files
     *                           relative paths and make the package work in an iframe. Undefined to download the files
     *                           in the filepool root folder.
     * @return {Promise<any>} Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    downloadOrPrefetch(module: any, courseId: number, prefetch?: boolean, dirPath?: string): Promise<any> {
        const promises = [];

        promises.push(super.downloadOrPrefetch(module, courseId, prefetch));
        promises.push(this.bookProvider.getBook(courseId, module.id).catch(() => {
            // Ignore errors since this WS isn't available in some Moodle versions.
        }));

        return Promise.all(promises);
    }

    /**
     * Returns module intro files.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @return {Promise<any[]>} Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number): Promise<any[]> {
        return this.bookProvider.getBook(courseId, module.id).catch(() => {
            // Not found, return undefined so module description is used.
        }).then((book) => {
            return this.getIntroFilesFromInstance(module, book);
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.bookProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.bookProvider.isPluginEnabled();
    }
}
