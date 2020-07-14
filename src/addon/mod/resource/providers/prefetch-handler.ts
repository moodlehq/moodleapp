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
import { AddonModResourceProvider } from './resource';
import { AddonModResourceHelperProvider } from './helper';
import { CoreConstants } from '@core/constants';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

/**
 * Handler to prefetch resources.
 */
@Injectable()
export class AddonModResourcePrefetchHandler extends CoreCourseResourcePrefetchHandlerBase {
    name = 'AddonModResource';
    modName = 'resource';
    component = AddonModResourceProvider.COMPONENT;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            filterHelper: CoreFilterHelperProvider,
            pluginFileDelegate: CorePluginFileDelegate,
            protected resourceProvider: AddonModResourceProvider,
            protected resourceHelper: AddonModResourceHelperProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils, filterHelper,
                pluginFileDelegate);
    }

    /**
     * Return the status to show based on current status.
     *
     * @param module Module.
     * @param status The current status.
     * @param canCheck Whether the site allows checking for updates.
     * @return Status to display.
     */
    determineStatus(module: any, status: string, canCheck: boolean): string {
        if (status == CoreConstants.DOWNLOADED && module) {
            // If the main file is an external file, always display the module as outdated.
            if (module.contentsinfo) {
                if (module.contentsinfo.repositorytype) {
                    // It's an external file.
                    return CoreConstants.OUTDATED;
                }
            } else if (module.contents) {
                const mainFile = module.contents[0];
                if (mainFile && mainFile.isexternalfile) {
                    return CoreConstants.OUTDATED;
                }
            }
        }

        return status;
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
        let promise;

        if (this.resourceHelper.isDisplayedInIframe(module)) {
            promise = this.filepoolProvider.getPackageDirPathByUrl(this.sitesProvider.getCurrentSiteId(), module.url);
        } else {
            promise = Promise.resolve();
        }

        return promise.then((dirPath) => {
            const promises = [];

            promises.push(super.downloadOrPrefetch(module, courseId, prefetch, dirPath));

            if (this.resourceProvider.isGetResourceWSAvailable()) {
                promises.push(this.resourceProvider.getResourceData(courseId, module.id));
            }

            return Promise.all(promises);
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
        return this.resourceProvider.invalidateContent(moduleId, courseId);
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

        promises.push(this.resourceProvider.invalidateResourceData(courseId));
        promises.push(this.courseProvider.invalidateModule(module.id, undefined, this.modName));

        return Promise.all(promises);
    }

    /**
     * Check if a resource is downloadable.
     *
     * @param module Module to check.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with true if downloadable, resolved with false otherwise.
     */
    isDownloadable(module: any, courseId: number): Promise<boolean> {
        if (this.sitesProvider.getCurrentSite() && this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.7')) {
            // Nextcloud files are downloadable from 3.7 onwards.
            return Promise.resolve(true);
        }

        // Don't allow downloading Nextcloud files in older sites.
        return this.loadContents(module, courseId, false).then(() => {
            return !this.resourceHelper.isNextcloudFile(module);
        });
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.resourceProvider.isPluginEnabled();
    }
}
