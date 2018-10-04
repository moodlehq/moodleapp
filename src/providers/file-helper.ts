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
import { CoreAppProvider } from './app';
import { CoreFileProvider } from './file';
import { CoreFilepoolProvider } from './filepool';
import { CoreSitesProvider } from './sites';
import { CoreUtilsProvider } from './utils/utils';
import { CoreConstants } from '@core/constants';

/**
 * Provider to provide some helper functions regarding files and packages.
 */
@Injectable()
export class CoreFileHelperProvider {

    constructor(private fileProvider: CoreFileProvider, private filepoolProvider: CoreFilepoolProvider,
            private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider, private translate: TranslateService,
            private utils: CoreUtilsProvider) { }

    /**
     * Convenience function to open a file, downloading it if needed.
     *
     * @param {any} file The file to download.
     * @param {string} [component] The component to link the file to.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {string} [state] The file's state. If not provided, it will be calculated.
     * @param {Function} [onProgress] Function to call on progress.
     * @param {string} [siteId] The site ID. If not defined, current site.
     * @return {Promise<any>} Resolved on success.
     */
    downloadAndOpenFile(file: any, component: string, componentId: string | number, state?: string,
            onProgress?: (event: any) => any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const fileUrl = this.getFileUrl(file),
            timemodified = this.getFileTimemodified(file);

        return this.downloadFileIfNeeded(file, fileUrl, component, componentId, timemodified, state, onProgress, siteId)
                .then((url) => {
            if (!url) {
                return;
            }

            if (url.indexOf('http') === 0) {
                /* In iOS, if we use the same URL in embedded browser and background download then the download only
                   downloads a few bytes (cached ones). Add a hash to the URL so both URLs are different. */
                url = url + '#moodlemobile-embedded';

                return this.utils.openOnlineFile(url).catch((error) => {
                    // Error opening the file, some apps don't allow opening online files.
                    if (!this.fileProvider.isAvailable()) {
                        return Promise.reject(error);
                    }

                    let promise;

                    // Get the state.
                    if (state) {
                        promise = Promise.resolve(state);
                    } else {
                        promise = this.filepoolProvider.getFileStateByUrl(siteId, fileUrl, timemodified);
                    }

                    return promise.then((state) => {
                        if (state == CoreConstants.DOWNLOADING) {
                            return Promise.reject(this.translate.instant('core.erroropenfiledownloading'));
                        }

                        let promise;

                        if (state === CoreConstants.NOT_DOWNLOADED) {
                            // File is not downloaded, download and then return the local URL.
                            promise = this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
                        } else {
                            // File is outdated and can't be opened in online, return the local URL.
                            promise = this.filepoolProvider.getInternalUrlByUrl(siteId, fileUrl);
                        }

                        return promise.then((url) => {
                            return this.utils.openFile(url);
                        });
                    });
                });
            } else {
                return this.utils.openFile(url);
            }
        });
    }

    /**
     * Download a file if it needs to be downloaded.
     *
     * @param {any} file The file to download.
     * @param {string} fileUrl The file URL.
     * @param {string} [component] The component to link the file to.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {number} [timemodified] The time this file was modified.
     * @param {string} [state] The file's state. If not provided, it will be calculated.
     * @param {Function} [onProgress] Function to call on progress.
     * @param {string} [siteId] The site ID. If not defined, current site.
     * @return {Promise<string>} Resolved with the URL to use on success.
     */
    protected downloadFileIfNeeded(file: any, fileUrl: string, component?: string, componentId?: string | number,
            timemodified?: number, state?: string, onProgress?: (event: any) => any, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            const fixedUrl = site.fixPluginfileURL(fileUrl);

            if (this.fileProvider.isAvailable()) {
                let promise;
                if (state) {
                    promise = Promise.resolve(state);
                } else {
                    // Calculate the state.
                    promise = this.filepoolProvider.getFileStateByUrl(siteId, fileUrl, timemodified);
                }

                return promise.then((state) => {
                    // The file system is available.
                    const isWifi = this.appProvider.isWifi(),
                        isOnline = this.appProvider.isOnline();

                    if (state == CoreConstants.DOWNLOADED) {
                        // File is downloaded, get the local file URL.
                        return this.filepoolProvider.getUrlByUrl(
                                siteId, fileUrl, component, componentId, timemodified, false, false, file);
                    } else {
                        if (!isOnline && !this.isStateDownloaded(state)) {
                            // Not downloaded and user is offline, reject.
                            return Promise.reject(this.translate.instant('core.networkerrormsg'));
                        }

                        if (onProgress) {
                            // This call can take a while. Send a fake event to notify that we're doing some calculations.
                            onProgress({calculating: true});
                        }

                        return this.filepoolProvider.shouldDownloadBeforeOpen(fixedUrl, file.filesize).then(() => {
                            if (state == CoreConstants.DOWNLOADING) {
                                // It's already downloading, stop.
                                return;
                            }

                            // Download and then return the local URL.
                            return this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
                        }, () => {
                            // Start the download if in wifi, but return the URL right away so the file is opened.
                            if (isWifi) {
                                this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
                            }

                            if (!this.isStateDownloaded(state) || isOnline) {
                                // Not downloaded or online, return the online URL.
                                return fixedUrl;
                            } else {
                                // Outdated but offline, so we return the local URL.
                                return this.filepoolProvider.getUrlByUrl(
                                        siteId, fileUrl, component, componentId, timemodified, false, false, file);
                            }
                        });
                    }
                });
            } else {
                // Use the online URL.
                return fixedUrl;
            }
        });
    }

    /**
     * Download the file.
     *
     * @param {string} fileUrl The file URL.
     * @param {string} [component] The component to link the file to.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {number} [timemodified] The time this file was modified.
     * @param {Function} [onProgress] Function to call on progress.
     * @param {any} [file] The file to download.
     * @param {string} [siteId] The site ID. If not defined, current site.
     * @return {Promise<string>} Resolved with internal URL on success, rejected otherwise.
     */
    downloadFile(fileUrl: string, component?: string, componentId?: string | number, timemodified?: number,
            onProgress?: (event: any) => any, file?: any, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Get the site and check if it can download files.
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.canDownloadFiles()) {
                return Promise.reject(this.translate.instant('core.cannotdownloadfiles'));
            }

            return this.filepoolProvider.downloadUrl(siteId, fileUrl, false, component, componentId,
                    timemodified, onProgress, undefined, file).catch((error) => {

                // Download failed, check the state again to see if the file was downloaded before.
                return this.filepoolProvider.getFileStateByUrl(siteId, fileUrl, timemodified).then((state) => {
                    if (this.isStateDownloaded(state)) {
                        return this.filepoolProvider.getInternalUrlByUrl(siteId, fileUrl);
                    } else {
                        return Promise.reject(error);
                    }
                });
            });
        });
    }

    /**
     * Get the file's URL.
     *
     * @param {any} file The file.
     */
    getFileUrl(file: any): string {
        return file.fileurl || file.url;
    }

    /**
     * Get the file's timemodified.
     *
     * @param {any} file The file.
     */
    getFileTimemodified(file: any): number {
        return file.timemodified || 0;
    }

    /**
     * Check if a state is downloaded or outdated.
     *
     * @param {string} state The state to check.
     */
    isStateDownloaded(state: string): boolean {
        return state === CoreConstants.DOWNLOADED || state === CoreConstants.OUTDATED;
    }

    /**
     * Whether the file has to be opened in browser (external repository).
     * The file must have a mimetype attribute.
     *
     * @param {any} file The file to check.
     * @return {boolean} Whether the file should be opened in browser.
     */
    shouldOpenInBrowser(file: any): boolean {
        if (!file || !file.isexternalfile || !file.mimetype) {
            return false;
        }

        const mimetype = file.mimetype;
        if (mimetype.indexOf('application/vnd.google-apps.') != -1) {
            // Google Docs file, always open in browser.
            return true;
        }

        if (file.repositorytype == 'onedrive') {
            // In OneDrive, open in browser the office docs
            return mimetype.indexOf('application/vnd.openxmlformats-officedocument') != -1 ||
                    mimetype == 'text/plain' || mimetype == 'document/unknown';
        }

        return false;
    }
}
