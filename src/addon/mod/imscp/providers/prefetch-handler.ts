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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseResourcePrefetchHandlerBase } from '@core/course/classes/resource-prefetch-handler';
import { AddonModImscpProvider } from './imscp';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch IMSCPs.
 */
@Injectable()
export class AddonModImscpPrefetchHandler extends CoreCourseResourcePrefetchHandlerBase {
    name = 'AddonModImscp';
    modName = 'imscp';
    component = AddonModImscpProvider.COMPONENT;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected imscpProvider: AddonModImscpProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Download or prefetch the content.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param prefetch True to prefetch, false to download right away.
     * @param dirPath Path of the directory where to store all the content files. This is to keep the files
     *                relative paths and make the package work in an iframe. Undefined to download the files
     *                in the filepool root folder.
     * @return Promise resolved when all content is downloaded. Data returned is not reliable.
     */
    downloadOrPrefetch(module: any, courseId: number, prefetch?: boolean, dirPath?: string): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.filepoolProvider.getPackageDirPathByUrl(siteId, module.url).then((dirPath) => {
            const promises = [];

            promises.push(super.downloadOrPrefetch(module, courseId, prefetch, dirPath));
            promises.push(this.imscpProvider.getImscp(courseId, module.id, siteId));

            return Promise.all(promises);
        });
    }

    /**
     * Returns module intro files.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @return Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number): Promise<any[]> {
        return this.imscpProvider.getImscp(courseId, module.id).catch(() => {
            // Not found, return undefined so module description is used.
        }).then((imscp) => {
            return this.getIntroFilesFromInstance(module, imscp);
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.imscpProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number): Promise<any> {
        const promises = [];

        promises.push(this.imscpProvider.invalidateImscpData(courseId));
        promises.push(this.courseProvider.invalidateModule(module.id));

        return Promise.all(promises);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.imscpProvider.isPluginEnabled();
    }

    /**
     * Check if a file is downloadable.
     *
     * @param file File to check.
     * @return Whether the file is downloadable.
     */
    isFileDownloadable(file: any): boolean {
        return this.imscpProvider.isFileDownloadable(file);
    }
}
