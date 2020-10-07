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

import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreWS } from '@services/ws';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@core/constants';
import { makeSingleton, Translate } from '@singletons/core.singletons';

/**
 * Provider to provide some helper functions regarding files and packages.
 */
@Injectable()
export class CoreFileHelperProvider {

    /**
     * Convenience function to open a file, downloading it if needed.
     *
     * @param file The file to download.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param state The file's state. If not provided, it will be calculated.
     * @param onProgress Function to call on progress.
     * @param siteId The site ID. If not defined, current site.
     * @return Resolved on success.
     */
    async downloadAndOpenFile(file: any, component: string, componentId: string | number, state?: string,
            onProgress?: (event: any) => any, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const fileUrl = this.getFileUrl(file);
        const timemodified = this.getFileTimemodified(file);

        if (!this.isOpenableInApp(file)) {
            await this.showConfirmOpenUnsupportedFile();
        }

        let url = await this.downloadFileIfNeeded(file, fileUrl, component, componentId, timemodified, state, onProgress, siteId);

        if (!url) {
            return;
        }

        if (!CoreUrlUtils.instance.isLocalFileUrl(url)) {
            /* In iOS, if we use the same URL in embedded browser and background download then the download only
               downloads a few bytes (cached ones). Add a hash to the URL so both URLs are different. */
            url = url + '#moodlemobile-embedded';

            try {
                await CoreUtils.instance.openOnlineFile(url);

                return;
            } catch (error) {
                // Error opening the file, some apps don't allow opening online files.
                if (!CoreFile.instance.isAvailable()) {
                    throw error;
                }

                // Get the state.
                if (!state) {
                    state = await CoreFilepool.instance.getFileStateByUrl(siteId, fileUrl, timemodified);
                }

                if (state == CoreConstants.DOWNLOADING) {
                    throw new Error(Translate.instance.instant('core.erroropenfiledownloading'));
                }

                if (state === CoreConstants.NOT_DOWNLOADED) {
                    // File is not downloaded, download and then return the local URL.
                    url = await this.downloadFile(fileUrl, component, componentId, timemodified, onProgress, file, siteId);
                } else {
                    // File is outdated and can't be opened in online, return the local URL.
                    url = await CoreFilepool.instance.getInternalUrlByUrl(siteId, fileUrl);
                }
            }
        }

        return CoreUtils.instance.openFile(url);
    }

    /**
     * Download a file if it needs to be downloaded.
     *
     * @param file The file to download.
     * @param fileUrl The file URL.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param state The file's state. If not provided, it will be calculated.
     * @param onProgress Function to call on progress.
     * @param siteId The site ID. If not defined, current site.
     * @return Resolved with the URL to use on success.
     */
    protected downloadFileIfNeeded(file: any, fileUrl: string, component?: string, componentId?: string | number,
            timemodified?: number, state?: string, onProgress?: (event: any) => any, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        return CoreSites.instance.getSite(siteId).then((site) => {
            return site.checkAndFixPluginfileURL(fileUrl);
        }).then((fixedUrl) => {

            if (CoreFile.instance.isAvailable()) {
                let promise;
                if (state) {
                    promise = Promise.resolve(state);
                } else {
                    // Calculate the state.
                    promise = CoreFilepool.instance.getFileStateByUrl(siteId, fileUrl, timemodified);
                }

                return promise.then((state) => {
                    // The file system is available.
                    const isWifi = CoreApp.instance.isWifi();
                    const isOnline = CoreApp.instance.isOnline();

                    if (state == CoreConstants.DOWNLOADED) {
                        // File is downloaded, get the local file URL.
                        return CoreFilepool.instance.getUrlByUrl(
                                siteId, fileUrl, component, componentId, timemodified, false, false, file);
                    } else {
                        if (!isOnline && !this.isStateDownloaded(state)) {
                            // Not downloaded and user is offline, reject.
                            return Promise.reject(Translate.instance.instant('core.networkerrormsg'));
                        }

                        if (onProgress) {
                            // This call can take a while. Send a fake event to notify that we're doing some calculations.
                            onProgress({calculating: true});
                        }

                        return CoreFilepool.instance.shouldDownloadBeforeOpen(fixedUrl, file.filesize).then(() => {
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
                                return CoreFilepool.instance.getUrlByUrl(
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
     * @param fileUrl The file URL.
     * @param component The component to link the file to.
     * @param componentId An ID to use in conjunction with the component.
     * @param timemodified The time this file was modified.
     * @param onProgress Function to call on progress.
     * @param file The file to download.
     * @param siteId The site ID. If not defined, current site.
     * @return Resolved with internal URL on success, rejected otherwise.
     */
    downloadFile(fileUrl: string, component?: string, componentId?: string | number, timemodified?: number,
            onProgress?: (event: any) => any, file?: any, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        // Get the site and check if it can download files.
        return CoreSites.instance.getSite(siteId).then((site) => {
            if (!site.canDownloadFiles()) {
                return Promise.reject(Translate.instance.instant('core.cannotdownloadfiles'));
            }

            return CoreFilepool.instance.downloadUrl(siteId, fileUrl, false, component, componentId,
                    timemodified, onProgress, undefined, file).catch((error) => {

                // Download failed, check the state again to see if the file was downloaded before.
                return CoreFilepool.instance.getFileStateByUrl(siteId, fileUrl, timemodified).then((state) => {
                    if (this.isStateDownloaded(state)) {
                        return CoreFilepool.instance.getInternalUrlByUrl(siteId, fileUrl);
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
     * @param file The file.
     */
    getFileUrl(file: any): string {
        return file.fileurl || file.url;
    }

    /**
     * Get the file's timemodified.
     *
     * @param file The file.
     */
    getFileTimemodified(file: any): number {
        return file.timemodified || 0;
    }

    /**
     * Check if a state is downloaded or outdated.
     *
     * @param state The state to check.
     */
    isStateDownloaded(state: string): boolean {
        return state === CoreConstants.DOWNLOADED || state === CoreConstants.OUTDATED;
    }

    /**
     * Whether the file has to be opened in browser (external repository).
     * The file must have a mimetype attribute.
     *
     * @param file The file to check.
     * @return Whether the file should be opened in browser.
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

    /**
     * Calculate the total size of the given files.
     *
     * @param files The files to check.
     * @return Total files size.
     */
    async getTotalFilesSize(files: any[]): Promise<number> {
        let totalSize = 0;

        for (const file of files) {
            totalSize += await this.getFileSize(file);
        }

        return totalSize;
    }

    /**
     * Calculate the file size.
     *
     * @param file The file to check.
     * @return File size.
     */
    async getFileSize(file: any): Promise<number> {
        if (file.filesize) {
            return file.filesize;
        }

        // If it's a remote file. First check if we have the file downloaded since it's more reliable.
        if (file.filename && !file.name) {
            try {
                const siteId = CoreSites.instance.getCurrentSiteId();

                const path = await CoreFilepool.instance.getFilePathByUrl(siteId, file.fileurl);
                const fileEntry = await CoreFile.instance.getFile(path);
                const fileObject = await CoreFile.instance.getFileObjectFromFileEntry(fileEntry);

                return fileObject.size;
            } catch (error) {
                // Error getting the file, maybe it's not downloaded. Get remote size.
                const size = await CoreWS.instance.getRemoteFileSize(file.fileurl);

                if (size === -1) {
                    throw new Error('Couldn\'t determine file size: ' + file.fileurl);
                }

                return size;
            }
        }

        // If it's a local file, get its size.
        if (file.name) {
            const fileObject = await CoreFile.instance.getFileObjectFromFileEntry(file);

            return fileObject.size;
        }

        throw new Error('Couldn\'t determine file size: ' + file.fileurl);
    }

    /**
     * Is the file openable in app.
     *
     * @param file The file to check.
     * @return bool.
     */
    isOpenableInApp(file: {filename?: string, name?: string}): boolean {
        const re = /(?:\.([^.]+))?$/;

        const ext = re.exec(file.filename || file.name)[1];

        return !this.isFileTypeExcludedInApp(ext);
    }

    /**
     * Show a confirm asking the user if we wants to open the file.
     *
     * @param onlyDownload Whether the user is only downloading the file, not opening it.
     * @return Promise resolved if confirmed, rejected otherwise.
     */
    showConfirmOpenUnsupportedFile(onlyDownload?: boolean): Promise<void> {
        const message = Translate.instance.instant('core.cannotopeninapp' + (onlyDownload ? 'download' : ''));
        const okButton = Translate.instance.instant(onlyDownload ? 'core.downloadfile' : 'core.openfile');

        return CoreDomUtils.instance.showConfirm(message, undefined, okButton, undefined, { cssClass: 'core-modal-force-on-top' });
    }

    /**
     * Is the file type excluded to open in app.
     *
     * @param file The file to check.
     * @return bool.
     */
    isFileTypeExcludedInApp(fileType: string): boolean {
        const currentSite = CoreSites.instance.getCurrentSite();
        const fileTypeExcludeList = currentSite && currentSite.getStoredConfig('tool_mobile_filetypeexclusionlist');

        if (!fileTypeExcludeList) {
            return false;
        }

        const regEx = new RegExp('(,|^)' + fileType + '(,|$)', 'g');

        return !!fileTypeExcludeList.match(regEx);
    }
}

export class CoreFileHelper extends makeSingleton(CoreFileHelperProvider) {}
