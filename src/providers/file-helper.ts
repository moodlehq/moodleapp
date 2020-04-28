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
import { CoreAppProvider } from './app';
import { CoreConfigProvider } from './config';
import { CoreFileProvider, CoreFileProgressFunction } from './file';
import { CoreFilepoolProvider } from './filepool';
import { CoreSitesProvider } from './sites';
import { CoreWSProvider } from './ws';
import { CoreDomUtilsProvider } from './utils/dom';
import { CoreUtilsProvider } from './utils/utils';
import { CoreConstants } from '@core/constants';
import { FileEntry } from '@ionic-native/file';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Provider to provide some helper functions regarding files and packages.
 */
@Injectable()
export class CoreFileHelperProvider {

    // Variables for reading files in chunks.
    protected MAX_CHUNK_SIZE_NAME = 'file_max_chunk_size';
    protected READ_CHUNK_ATTEMPT_NAME = 'file_read_chunk_attempt';
    protected maxChunkSize = -1;

    constructor(protected fileProvider: CoreFileProvider,
            protected filepoolProvider: CoreFilepoolProvider,
            protected sitesProvider: CoreSitesProvider,
            protected appProvider: CoreAppProvider,
            protected translate: TranslateService,
            protected utils: CoreUtilsProvider,
            protected wsProvider: CoreWSProvider,
            protected configProvider: CoreConfigProvider,
            protected domUtils: CoreDomUtilsProvider) {

        this.initMaxChunkSize();
    }

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
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.checkAndFixPluginfileURL(fileUrl);
        }).then((fixedUrl) => {

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
     * Initialize the max chunk size.
     *
     * @return Promise resolved when done.
     */
    protected async initMaxChunkSize(): Promise<void> {
        const sizes = await Promise.all([
            await this.configProvider.get(this.READ_CHUNK_ATTEMPT_NAME, -1), // Check if there is any attempt pending.
            await this.configProvider.get(this.MAX_CHUNK_SIZE_NAME, -1), // Retrieve current max chunk size from DB.
        ]);

        const attemptSize = sizes[0];
        const maxChunkSize = sizes[1];

        if (attemptSize != -1 && (maxChunkSize == -1 || attemptSize < maxChunkSize)) {
            // Store the attempt's size as the max size.
            this.storeMaxChunkSize(attemptSize);
        } else {
            // No attempt or the max size is already lower. Keep current max size.
            this.maxChunkSize = maxChunkSize;
        }

        if (attemptSize != -1) {
            // Clean pending attempt.
            await this.configProvider.delete(this.READ_CHUNK_ATTEMPT_NAME);
        }
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
                const siteId = this.sitesProvider.getCurrentSiteId();

                const path = await this.filepoolProvider.getFilePathByUrl(siteId, file.fileurl);
                const fileEntry = await this.fileProvider.getFile(path);
                const fileObject = await this.fileProvider.getFileObjectFromFileEntry(fileEntry);

                return fileObject.size;
            } catch (error) {
                // Error getting the file, maybe it's not downloaded. Get remote size.
                const size = await this.wsProvider.getRemoteFileSize(file.fileurl);

                if (size === -1) {
                    throw new Error('Couldn\'t determine file size: ' + file.fileurl);
                }

                return size;
            }
        }

        // If it's a local file, get its size.
        if (file.name) {
            const fileObject = await this.fileProvider.getFileObjectFromFileEntry(file);

            return fileObject.size;
        }

        throw new Error('Couldn\'t determine file size: ' + file.fileurl);
    }

    /**
     * Save max chunk size.
     *
     * @param size Size to store.
     * @return Promise resolved when done.
     */
    protected async storeMaxChunkSize(size: number): Promise<void> {
        this.maxChunkSize = size;

        await this.configProvider.set(this.MAX_CHUNK_SIZE_NAME, size);
    }

    /**
     * Write some file data into a filesystem file.
     * It's done in chunks to prevent crashing the app for big files.
     *
     * @param file The data to write.
     * @param path Path where to store the data.
     * @param onProgress Function to call on progress.
     * @param offset Offset where to start reading from.
     * @param append Whether to append the data to the end of the file.
     * @return Promise resolved when done.
     */
    async writeFileDataInFile(file: Blob, path: string, onProgress?: CoreFileProgressFunction, offset: number = 0,
            append?: boolean): Promise<FileEntry> {

        offset = offset || 0;

        // Get the chunk to read and write.
        const readWholeFile = offset === 0 && CoreFileProvider.CHUNK_SIZE >= file.size;
        const chunk = readWholeFile ? file : file.slice(offset, Math.min(offset + CoreFileProvider.CHUNK_SIZE, file.size));

        try {
            const fileEntry = await this.fileProvider.writeFileDataInFileChunk(chunk, path, append);

            offset += CoreFileProvider.CHUNK_SIZE;

            onProgress && onProgress({
                lengthComputable: true,
                loaded: offset,
                total: file.size
            });

            if (offset >= file.size) {
                // Done, stop.
                return fileEntry;
            }

            // Read the next chunk.
            return this.writeFileDataInFile(file, path, onProgress, offset, true);
        } catch (error) {
            if (readWholeFile || !error || error.name != 'NotReadableError') {
                return Promise.reject(error);
            }

            // Permission error when reading file in chunks. This usually happens with Google Drive files.
            // Try to read the whole file at once.
            return this.writeBigFileDataInFile(file, path, onProgress);
        }
    }

    /**
     * Writes a big file data into a filesystem file without using chunks.
     * The app can crash when doing this with big files, so this function will try to control the max size that works
     * and warn the user if he's trying to upload a file that is too big.
     *
     * @param file The data to write.
     * @param path Path where to store the data.
     * @param onProgress Function to call on progress.
     * @return Promise resolved with the file.
     */
    protected async writeBigFileDataInFile(file: Blob, path: string, onProgress?: CoreFileProgressFunction): Promise<FileEntry> {
        if (this.maxChunkSize != -1 && file.size >= this.maxChunkSize) {
            // The file size is bigger than the max allowed size. Ask the user to confirm.
            await this.domUtils.showConfirm(this.translate.instant('core.confirmreadfiletoobig'));
        }

        // Store the "attempt".
        await this.configProvider.set(this.READ_CHUNK_ATTEMPT_NAME, file.size);

        // Write the whole file.
        const fileEntry = await this.fileProvider.writeFileDataInFileChunk(file, path, false);

        // Success, remove the attempt and increase the max chunk size if needed.
        await this.configProvider.delete(this.READ_CHUNK_ATTEMPT_NAME);

        if (file.size > this.maxChunkSize) {
            await this.storeMaxChunkSize(file.size + 1);
        }

        return fileEntry;
    }
}

export class CoreFileHelper extends makeSingleton(CoreFileHelperProvider) {}
