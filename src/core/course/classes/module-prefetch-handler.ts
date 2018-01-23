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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../../../providers/app';
import { CoreFilepoolProvider } from '../../../providers/filepool';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreCourseProvider } from '../providers/course';
import { CoreCourseModulePrefetchHandler } from '../providers/module-prefetch-delegate';
import { CoreConstants } from '../../constants';

/**
 * A prefetch function to be passed to prefetchPackage.
 * This function should NOT call storePackageStatus, downloadPackage or prefetchPakage from filepool.
 * It receives the same params as prefetchPackage except the function itself. This includes all extra parameters sent after siteId.
 * The string returned by this function will be stored as "extra" data in the filepool package. If you don't need to store
 * extra data, don't return anything.
 *
 * @param {any} module Module.
 * @param {number} courseId Course ID the module belongs to.
 * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
 * @param {string} siteId Site ID. If not defined, current site.
 * @return {Promise<string>} Promise resolved when the prefetch finishes. The string returned will be stored as "extra" data in the
 *                           filepool package. If you don't need to store extra data, don't return anything.
 */
export type prefetchFunction = (module: any, courseId: number, single: boolean, siteId: string, ...args) => Promise<string>;

/**
 * Base prefetch handler to be registered in CoreCourseModulePrefetchDelegate. It is useful to minimize the amount of
 * functions that handlers need to implement. It also provides some helper features like preventing a module to be
 * downloaded twice at the same time.
 *
 * If your handler inherits from this service, you just need to override the functions that you want to change.
 *
 * The implementation of this default handler is aimed for resources that only need to prefetch files, not WebService calls.
 *
 * By default, prefetching a module will only download its files (downloadOrPrefetch). This might be enough for resources.
 * If you need to prefetch WebServices, then you need to override the "download" and "prefetch" functions. In this case, it's
 * recommended to call the prefetchPackage function since it'll handle changing the status of the module.
 */
export class CoreCourseModulePrefetchHandlerBase implements CoreCourseModulePrefetchHandler {
    /**
     * A name to identify the addon.
     * @type {string}
     */
    name = 'CoreCourseModulePrefetchHandlerBase';

    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     * @type {string}
     */
    modname = '';

    /**
     * The handler's component.
     * @type {string}
     */
    component = 'core_module';

    /**
     * The RegExp to check updates. If a module has an update whose name matches this RegExp, the module will be marked
     * as outdated. This RegExp is ignored if hasUpdates function is defined.
     * @type {RegExp}
     */
    updatesNames = /^.*files$/;

    /**
     * Whether the module is a resource (true) or an activity (false).
     * @type {boolean}
     */
    isResource: boolean;

    /**
     * List of download promises to prevent downloading the module twice at the same time.
     * @type {{[s: string]: {[s: string]: Promise<any>}}}
     */
    protected downloadPromises: {[s: string]: {[s: string]: Promise<any>}} = {};

    // List of services that will be injected using injector. It's done like this so subclasses don't have to send all the
    // services to the parent in the constructor.
    protected translate: TranslateService;
    protected appProvider: CoreAppProvider;
    protected courseProvider: CoreCourseProvider;
    protected filepoolProvider: CoreFilepoolProvider;
    protected sitesProvider: CoreSitesProvider;
    protected domUtils: CoreDomUtilsProvider;
    protected utils: CoreUtilsProvider;

    constructor(injector: Injector) {
        this.translate = injector.get(TranslateService);
        this.appProvider = injector.get(CoreAppProvider);
        this.courseProvider = injector.get(CoreCourseProvider);
        this.filepoolProvider = injector.get(CoreFilepoolProvider);
        this.sitesProvider = injector.get(CoreSitesProvider);
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.utils = injector.get(CoreUtilsProvider);
    }

    /**
     * Add an ongoing download to the downloadPromises list. When the promise finishes it will be removed.
     *
     * @param {number} id Unique identifier per component.
     * @param {Promise<any>} promise Promise to add.
     * @param {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise of the current download.
     */
    addOngoingDownload(id: number, promise: Promise<any>, siteId?: string) : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const uniqueId = this.getUniqueId(id);

        if (!this.downloadPromises[siteId]) {
            this.downloadPromises[siteId] = {};
        }

        this.downloadPromises[siteId][uniqueId] = promise.finally(() => {
            delete this.downloadPromises[siteId][uniqueId];
        });

        return this.downloadPromises[siteId][uniqueId];
    }

    /**
     * Download the module.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Promise resolved when all content is downloaded.
     */
    download(module: any, courseId: number) : Promise<any> {
        return this.downloadOrPrefetch(module, courseId, false);
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
    downloadOrPrefetch(module: any, courseId: number, prefetch?: boolean, dirPath?: string) : Promise<any> {
        if (!this.appProvider.isOnline()) {
            // Cannot download in offline.
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        }

        const siteId = this.sitesProvider.getCurrentSiteId();

        // Load module contents (ignore cache so we always have the latest data).
        return this.loadContents(module, courseId, true).then(() => {
            // Get the intro files.
            return this.getIntroFiles(module, courseId);
        }).then((introFiles) => {
            let downloadFn = prefetch ? this.filepoolProvider.prefetchPackage.bind(this.filepoolProvider) :
                                        this.filepoolProvider.downloadPackage.bind(this.filepoolProvider),
                contentFiles = this.getContentDownloadableFiles(module),
                promises = [];

            if (dirPath) {
                // Download intro files in filepool root folder.
                promises.push(this.filepoolProvider.downloadOrPrefetchFiles(siteId, introFiles, prefetch, false,
                        this.component, module.id));

                // Download content files inside dirPath.
                promises.push(downloadFn(siteId, contentFiles, this.component, module.id, undefined, dirPath));
            } else {
                // No dirPath, download everything in filepool root folder.
                let files = introFiles.concat(contentFiles);
                promises.push(downloadFn(siteId, files, this.component, module.id));
            }

            return Promise.all(promises);
        });
    }

    /**
     * Returns a list of content files that can be downloaded.
     *
     * @param {any} module The module object returned by WS.
     * @return {any[]} List of files.
     */
    getContentDownloadableFiles(module: any) {
        let files = [];

        if (module.contents && module.contents.length) {
            module.contents.forEach((content) => {
                if (this.isFileDownloadable(content)) {
                    files.push(content);
                }
            });
        }

        return files;
    }

    /**
     * Get the download size of a module.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<{size: number, total: boolean}>} Promise resolved with the size and a boolean indicating if it was able
     *                                                   to calculate the total size.
     */
    getDownloadSize(module: any, courseId: number, single?: boolean) : Promise<{size: number, total: boolean}> {
        return this.getFiles(module, courseId).then((files) => {
            return this.utils.sumFileSizes(files);
        }).catch(() => {
            return {size: -1, total: false};
        });
    }

    /**
     * Get the downloaded size of a module. If not defined, we'll use getFiles to calculate it (it can be slow).
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {number|Promise<number>} Size, or promise resolved with the size.
     */
    getDownloadedSize?(module: any, courseId: number) : number|Promise<number> {
        const siteId = this.sitesProvider.getCurrentSiteId();
        return this.filepoolProvider.getFilesSizeByComponent(siteId, this.component, module.id);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any[]>} Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean) : Promise<any[]> {
        // Load module contents if needed.
        return this.loadContents(module, courseId).then(() => {
            return this.getIntroFiles(module, courseId).then((files) => {
                return files.concat(this.getContentDownloadableFiles(module));
            });
        });
    }

    /**
     * Returns module intro files.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID.
     * @return {Promise<any[]>} Promise resolved with list of intro files.
     */
    getIntroFiles(module: any, courseId: number) : Promise<any[]> {
        return Promise.resolve(this.getIntroFilesFromInstance(module));
    }

    /**
     * Returns module intro files from instance.
     *
     * @param {any} module The module object returned by WS.
     * @param {any} [instance] The instance to get the intro files (book, assign, ...). If not defined, module will be used.
     * @return {any[]} List of intro files.
     */
    getIntroFilesFromInstance(module: any, instance?: any) {
        if (instance) {
            if (typeof instance.introfiles != 'undefined') {
                return instance.introfiles;
            } else if (instance.intro) {
                return this.domUtils.extractDownloadableFilesFromHtmlAsFakeFileObjects(instance.intro);
            }
        }

        if (module.description) {
            return this.domUtils.extractDownloadableFilesFromHtmlAsFakeFileObjects(module.description);
        }

        return [];
    }

    /**
     * If there's an ongoing download for a certain identifier return it.
     *
     * @param {number} id Unique identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise of the current download.
     */
    getOngoingDownload(id: number, siteId?: string) : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.isDownloading(id, siteId)) {
            // There's already a download ongoing, return the promise.
            return this.downloadPromises[siteId][this.getUniqueId(id)];
        }
        return Promise.resolve();
    }

    /**
     * Create unique identifier using component and id.
     *
     * @param {number} id Unique ID inside component.
     * @return {string} Unique ID.
     */
    getUniqueId(id: number) {
        return this.component + '#' + id;
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number) : Promise<any> {
        const promises = [],
            siteId = this.sitesProvider.getCurrentSiteId();

        promises.push(this.courseProvider.invalidateModule(moduleId));
        promises.push(this.filepoolProvider.invalidateFilesByComponent(siteId, this.component, moduleId));

        return Promise.all(promises);
    }

    /**
     * Invalidate WS calls needed to determine module status. It doesn't need to invalidate check updates.
     * It should NOT invalidate files nor all the prefetched data.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when invalidated.
     */
    invalidateModule(module: any, courseId: number) : Promise<any> {
        return this.courseProvider.invalidateModule(module.id);
    }

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {boolean|Promise<boolean>} Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable(module: any, courseId: number) : boolean|Promise<boolean> {
        // By default, mark all instances as downloadable.
        return true;
    }

    /**
     * Check if a there's an ongoing download for the given identifier.
     *
     * @param {number} id       Unique identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if downloading, false otherwise.
     */
    isDownloading(id: number, siteId?: string) : boolean {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        return !!(this.downloadPromises[siteId] && this.downloadPromises[siteId][this.getUniqueId(id)]);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} A boolean, or a promise resolved with a boolean, indicating if the handler is enabled.
     */
    isEnabled() : boolean|Promise<boolean> {
        return true;
    }

    /**
     * Check if a file is downloadable.
     *
     * @param {any} file File to check.
     * @return {boolean} Whether the file is downloadable.
     */
    isFileDownloadable(file: any) : boolean {
        return file.type === 'file';
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param {any} module Module to load the contents.
     * @param {number} [courseId] The course ID. Recommended to speed up the process and minimize data usage.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @return {Promise}           Promise resolved when loaded.
     */
    loadContents(module: any, courseId: number, ignoreCache?: boolean) : Promise<void> {
        if (this.isResource) {
            return this.courseProvider.loadModuleContents(module, courseId, undefined, false, ignoreCache);
        }
        return Promise.resolve();
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean): Promise<any> {
        return this.downloadOrPrefetch(module, courseId, true);
    }

    /**
     * Prefetch the module, setting package status at start and finish.
     *
     * Example usage from a child instance:
     *     return this.prefetchPackage(module, courseId, single, this.prefetchModule.bind(this), siteId, someParam, anotherParam);
     *
     * Then the function "prefetchModule" will receive params:
     *     prefetchModule(module, courseId, single, siteId, someParam, anotherParam)
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {prefetchFunction} downloadFn Function to perform the prefetch. Please check the documentation of prefetchFunction.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the module has been downloaded. Data returned is not reliable.
     */
    prefetchPackage(module: any, courseId: number, single: boolean, downloadFn: prefetchFunction, siteId?: string, ...args) :
            Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!this.appProvider.isOnline()) {
            // Cannot prefetch in offline.
            return Promise.reject(this.translate.instant('core.networkerrormsg'));
        }

        if (this.isDownloading(module.id, siteId)) {
            // There's already a download ongoing for this module, return the promise.
            return this.getOngoingDownload(module.id, siteId);
        }

        const prefetchPromise = this.setDownloading(module.id, siteId).then(() => {
            // Package marked as downloading, call the download function.
            // Send all the params except downloadFn. This includes all params passed after siteId.
            return downloadFn.apply(downloadFn, [module, courseId, single, siteId].concat(args));
        }).then((extra: string) => {
            // Prefetch finished, mark as downloaded.
            return this.setDownloaded(module.id, siteId, extra);
        }).catch((error) => {
            // Error prefetching, go back to previous status and reject the promise.
            return this.setPreviousStatusAndReject(module.id, error, siteId);
        });

        return this.addOngoingDownload(module.id, prefetchPromise, siteId);
    }

    /**
     * Mark the module as downloaded.
     *
     * @param {number} id Unique identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [extra] Extra data to store.
     * @return {Promise<any>} Promise resolved when done.
     */
    setDownloaded(id: number, siteId?: string, extra?: string) : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        return this.filepoolProvider.storePackageStatus(siteId, CoreConstants.DOWNLOADED, this.component, id, extra);
    }

    /**
     * Mark the module as downloading.
     *
     * @param {number} id Unique identifier per component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    setDownloading(id: number, siteId?: string) : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        return this.filepoolProvider.storePackageStatus(siteId, CoreConstants.DOWNLOADING, this.component, id);
    }

    /**
     * Set previous status and return a rejected promise.
     *
     * @param {number} id Unique identifier per component.
     * @param {any} [error] Error to return.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<never>} Rejected promise.
     */
    setPreviousStatusAndReject(id: number, error?: any, siteId?: string) : Promise<never> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        return this.filepoolProvider.setPackagePreviousStatus(siteId, this.component, id).then(() => {
            return Promise.reject(error);
        });
    }

    /**
     * Remove module downloaded files. If not defined, we'll use getFiles to remove them (slow).
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when done.
     */
    removeFiles(module: any, courseId: number) : Promise<any> {
        return this.filepoolProvider.removeFilesByComponent(this.sitesProvider.getCurrentSiteId(), this.component, module.id);
    }
}
