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

import { Injector } from '@angular/core';
import { CoreSitePluginsProvider } from '../providers/siteplugins';
import { CoreCourseModulePrefetchHandlerBase } from '@core/course/classes/module-prefetch-handler';

/**
 * Handler to prefetch a module site plugin.
 */
export class CoreSitePluginsModulePrefetchHandler extends CoreCourseModulePrefetchHandlerBase {
    protected ROOT_CACHE_KEY = 'CoreSitePluginsModulePrefetchHandler:';

    constructor(injector: Injector, protected sitePluginsProvider: CoreSitePluginsProvider, component: string, modName: string,
            protected handlerSchema: any) {
        super(injector);

        this.component = component;
        this.name = modName;
        this.isResource = handlerSchema.isresource;

        if (handlerSchema.updatesnames) {
            try {
                this.updatesNames = new RegExp(handlerSchema.updatesnames);
            } catch (ex) {
                // Ignore errors.
            }
        }
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
        return this.prefetchPackage(module, courseId, false, this.downloadPrefetchPlugin.bind(this), undefined, prefetch, dirPath);
    }

    /**
     * Download or prefetch the plugin, downloading the files and calling the needed WS.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [prefetch] True to prefetch, false to download right away.
     * @param {string} [dirPath] Path of the directory where to store all the content files. @see downloadOrPrefetch.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected downloadPrefetchPlugin(module: any, courseId: number, single?: boolean, siteId?: string, prefetch?: boolean,
            dirPath?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            const promises = [],
                args = {
                    courseid: courseId,
                    cmid: module.id,
                    userid: site.getUserId()
                };

            // Download the files (if any).
            promises.push(this.downloadOrPrefetchFiles(site.id, module, courseId, prefetch, dirPath));

            // Call all the offline functions.
            promises.push(this.sitePluginsProvider.prefetchFunctions(this.component, args, this.handlerSchema, courseId,
                    module, prefetch, dirPath, site));

            return Promise.all(promises);
        });
    }

    /**
     * Download or prefetch the plugin files.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @param {boolean} [prefetch] True to prefetch, false to download right away.
     * @param {string} [dirPath] Path of the directory where to store all the content files. @see downloadOrPrefetch.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected downloadOrPrefetchFiles(siteId: string, module: any, courseId: number, prefetch?: boolean, dirPath?: string)
            : Promise<any> {
        // Load module contents (ignore cache so we always have the latest data).
        return this.loadContents(module, courseId, true).then(() => {
            // Get the intro files.
            return this.getIntroFiles(module, courseId);
        }).then((introFiles) => {
            const contentFiles = this.getContentDownloadableFiles(module),
                promises = [];

            if (dirPath) {
                // Download intro files in filepool root folder.
                promises.push(this.filepoolProvider.downloadOrPrefetchFiles(siteId, introFiles, prefetch, false,
                    this.component, module.id));

                // Download content files inside dirPath.
                promises.push(this.filepoolProvider.downloadOrPrefetchFiles(siteId, contentFiles, prefetch, false,
                    this.component, module.id, dirPath));
            } else {
                // No dirPath, download everything in filepool root folder.
                const files = introFiles.concat(contentFiles);
                promises.push(this.filepoolProvider.downloadOrPrefetchFiles(siteId, files, prefetch, false,
                    this.component, module.id));
            }

            return Promise.all(promises);
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
        const promises = [],
            currentSite = this.sitesProvider.getCurrentSite(),
            siteId = currentSite.getId(),
            args = {
                courseid: courseId,
                cmid: moduleId,
                userid: currentSite.getUserId()
            };

        // Invalidate files and the module.
        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, this.component, moduleId));
        promises.push(this.courseProvider.invalidateModule(moduleId, siteId));

        // Also invalidate all the WS calls.
        for (const method in this.handlerSchema.offlinefunctions) {
            if (currentSite.wsAvailable(method)) {
                // The method is a WS.
                promises.push(currentSite.invalidateWsCacheForKey(this.sitePluginsProvider.getCallWSCacheKey(method, args)));
            } else {
                // It's a method to get content.
                promises.push(this.sitePluginsProvider.invalidateContent(this.component, method, args));
            }
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
