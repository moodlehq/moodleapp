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
import { Platform } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { MediaCapture, MediaFile, CaptureError, CaptureAudioOptions, CaptureVideoOptions } from '@ionic-native/media-capture';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreWSFileUploadOptions } from '@providers/ws';
import { Subject } from 'rxjs';

/**
 * File upload options.
 */
export interface CoreFileUploaderOptions extends CoreWSFileUploadOptions {
    /**
     * Whether the file should be deleted after the upload (if success).
     * @type {boolean}
     */
    deleteAfterUpload?: boolean;
}

/**
 * Service to upload files.
 */
@Injectable()
export class CoreFileUploaderProvider {
    static LIMITED_SIZE_WARNING = 1048576; // 1 MB.
    static WIFI_SIZE_WARNING = 10485760; // 10 MB.

    protected logger;

    // Observers to notify when a media file starts/stops being recorded/selected.
    onGetPicture: Subject<boolean> = new Subject<boolean>();
    onAudioCapture: Subject<boolean> = new Subject<boolean>();
    onVideoCapture: Subject<boolean> = new Subject<boolean>();

    constructor(logger: CoreLoggerProvider, private fileProvider: CoreFileProvider, private textUtils: CoreTextUtilsProvider,
            private utils: CoreUtilsProvider, private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider,
            private mimeUtils: CoreMimetypeUtilsProvider, private filepoolProvider: CoreFilepoolProvider,
            private platform: Platform, private translate: TranslateService, private mediaCapture: MediaCapture,
            private camera: Camera) {
        this.logger = logger.getInstance('CoreFileUploaderProvider');
    }

    /**
     * Add a dot to the beginning of an extension.
     *
     * @param {string} extension Extension.
     * @return {string}           Treated extension.
     */
    protected addDot(extension: string): string {
        return '.' + extension;
    }

    /**
     * Compares two file lists and returns if they are different.
     *
     * @param {any[]} a First file list.
     * @param {any[]} b Second file list.
     * @return {boolean} Whether both lists are different.
     */
    areFileListDifferent(a: any[], b: any[]): boolean {
        a = a || [];
        b = b || [];
        if (a.length != b.length) {
            return true;
        }

        // Currently we are going to compare the order of the files as well.
        // This function can be improved comparing more fields or not comparing the order.
        for (let i = 0; i < a.length; i++) {
            if ((a[i].name || a[i].filename) != (b[i].name || b[i].filename)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @param {CaptureAudioOptions} options Options.
     * @return {Promise<MediaFile[] | CaptureError>} Promise resolved with the result.
     */
    captureAudio(options: CaptureAudioOptions): Promise<MediaFile[] | CaptureError> {
        this.onAudioCapture.next(true);

        return this.mediaCapture.captureAudio(options).finally(() => {
            this.onAudioCapture.next(false);
        });
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param {CaptureVideoOptions} options Options.
     * @return {Promise<MediaFile[] | CaptureError>} Promise resolved with the result.
     */
    captureVideo(options: CaptureVideoOptions): Promise<MediaFile[] | CaptureError> {
        this.onVideoCapture.next(true);

        return this.mediaCapture.captureVideo(options).finally(() => {
            this.onVideoCapture.next(false);
        });
    }

    /**
     * Clear temporary attachments to be uploaded.
     * Attachments already saved in an offline store will NOT be deleted.
     *
     * @param {any[]} files List of files.
     */
    clearTmpFiles(files: any[]): void {
        // Delete the local files.
        files.forEach((file) => {
            if (!file.offline && file.remove) {
                // Pass an empty function to prevent missing parameter error.
                file.remove(() => {
                    // Nothing to do.
                });
            }
        });
    }

    /**
     * Get the upload options for a file taken with the Camera Cordova plugin.
     *
     * @param {string} uri File URI.
     * @param {boolean} [isFromAlbum] True if the image was taken from album, false if it's a new image taken with camera.
     * @return {CoreFileUploaderOptions} Options.
     */
    getCameraUploadOptions(uri: string, isFromAlbum?: boolean): CoreFileUploaderOptions {
        const extension = this.mimeUtils.getExtension(uri),
            mimetype = this.mimeUtils.getMimeType(extension),
            isIOS = this.platform.is('ios'),
            options: CoreFileUploaderOptions = {
                deleteAfterUpload: !isFromAlbum,
                mimeType: mimetype
            };

        if (isIOS && (mimetype == 'image/jpeg' || mimetype == 'image/png')) {
            // In iOS, the pictures can have repeated names, even if they come from the album.
            options.fileName = 'image_' + this.timeUtils.readableTimestamp() + '.' + extension;
        } else {
            // Use the same name that the file already has.
            options.fileName = this.fileProvider.getFileAndDirectoryFromPath(uri).name;
        }

        if (isFromAlbum) {
            // If the file was picked from the album, delete it only if it was copied to the app's folder.
            options.deleteAfterUpload = this.fileProvider.isFileInAppFolder(uri);

            if (this.platform.is('android')) {
                // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
                options.fileName = options.fileName.replace(/(\.[^\.]*)\?[^\.]*$/, '$1');
            }
        }

        return options;
    }

    /**
     * Get the upload options for a file of any type.
     *
     * @param {string} uri File URI.
     * @param {string} name File name.
     * @param {string} type File type.
     * @param {boolean} [deleteAfterUpload] Whether the file should be deleted after upload.
     * @param {string} [fileArea] File area to upload the file to. It defaults to 'draft'.
     * @param {number} [itemId] Draft ID to upload the file to, 0 to create new.
     * @return {CoreFileUploaderOptions} Options.
     */
    getFileUploadOptions(uri: string, name: string, type: string, deleteAfterUpload?: boolean, fileArea?: string, itemId?: number)
            : CoreFileUploaderOptions {
        const options: CoreFileUploaderOptions = {};
        options.fileName = name;
        options.mimeType = type || this.mimeUtils.getMimeType(this.mimeUtils.getFileExtension(options.fileName));
        options.deleteAfterUpload = !!deleteAfterUpload;
        options.itemId = itemId || 0;
        options.fileArea = fileArea;

        return options;
    }

    /**
     * Get the upload options for a file taken with the media capture Cordova plugin.
     *
     * @param {MediaFile} mediaFile File object to upload.
     * @return {CoreFileUploaderOptions} Options.
     */
    getMediaUploadOptions(mediaFile: MediaFile): CoreFileUploaderOptions {
        const options: CoreFileUploaderOptions = {};
        let filename = mediaFile.name,
            split;

        // Add a timestamp to the filename to make it unique.
        split = filename.split('.');
        split[0] += '_' + this.timeUtils.readableTimestamp();
        filename = split.join('.');

        options.fileName = filename;
        options.deleteAfterUpload = true;
        if (mediaFile.type) {
            options.mimeType = mediaFile.type;
        } else {
            options.mimeType = this.mimeUtils.getMimeType(this.mimeUtils.getFileExtension(options.fileName));
        }

        return options;
    }

    /**
     * Take a picture or video, or load one from the library.
     *
     * @param {CameraOptions} options Options.
     * @return {Promise<any>} Promise resolved with the result.
     */
    getPicture(options: CameraOptions): Promise<any> {
        this.onGetPicture.next(true);

        return this.camera.getPicture(options).finally(() => {
            this.onGetPicture.next(false);
        });
    }

    /**
     * Get the files stored in a folder, marking them as offline.
     *
     * @param {string} folderPath Folder where to get the files.
     * @return {Promise<any[]>} Promise resolved with the list of files.
     */
    getStoredFiles(folderPath: string): Promise<any[]> {
        return this.fileProvider.getDirectoryContents(folderPath).then((files) => {
            return this.markOfflineFiles(files);
        });
    }

    /**
     * Get stored files from combined online and offline file object.
     *
     * @param {{online: any[], offline: number}} filesObject The combined offline and online files object.
     * @param {string} folderPath Folder path to get files from.
     * @return {Promise<any[]>} Promise resolved with files.
     */
    getStoredFilesFromOfflineFilesObject(filesObject: { online: any[], offline: number }, folderPath: string): Promise<any[]> {
        let files = [];

        if (filesObject) {
            if (filesObject.online && filesObject.online.length > 0) {
                files = this.utils.clone(filesObject.online);
            }

            if (filesObject.offline > 0) {
                return this.getStoredFiles(folderPath).then((offlineFiles) => {
                    return files.concat(offlineFiles);
                }).catch(() => {
                    // Ignore not found files.
                    return files;
                });
            }
        }

        return Promise.resolve(files);
    }

    /**
     * Check if a file's mimetype is invalid based on the list of accepted mimetypes. This function needs either the file's
     * mimetype or the file's path/name.
     *
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @param {string} [path] File's path or name.
     * @param {string} [mimetype] File's mimetype.
     * @return {string} Undefined if file is valid, error message if file is invalid.
     */
    isInvalidMimetype(mimetypes?: string[], path?: string, mimetype?: string): string {
        let extension;

        if (mimetypes) {
            // Verify that the mimetype of the file is supported.
            if (mimetype) {
                extension = this.mimeUtils.getExtension(mimetype);
            } else {
                extension = this.mimeUtils.getFileExtension(path);
                mimetype = this.mimeUtils.getMimeType(extension);
            }

            if (mimetype && mimetypes.indexOf(mimetype) == -1) {
                extension = extension || this.translate.instant('core.unknown');

                return this.translate.instant('core.fileuploader.invalidfiletype', { $a: extension });
            }
        }
    }

    /**
     * Mark files as offline.
     *
     * @param {any[]} files Files to mark as offline.
     * @return {any[]} Files marked as offline.
     */
    markOfflineFiles(files: any[]): any[] {
        // Mark the files as pending offline.
        files.forEach((file) => {
            file.offline = true;
            file.filename = file.name;
        });

        return files;
    }

    /**
     * Parse filetypeList to get the list of allowed mimetypes and the data to render information.
     *
     * @param {string} filetypeList Formatted string list where the mimetypes can be checked.
     * @return {{info: any[], mimetypes: string[]}}  Mimetypes and the filetypes informations. Undefined if all types supported.
     */
    prepareFiletypeList(filetypeList: string): { info: any[], mimetypes: string[] } {
        filetypeList = filetypeList && filetypeList.trim();

        if (!filetypeList || filetypeList == '*') {
            // All types supported, return undefined.
            return undefined;
        }

        const filetypes = filetypeList.split(/[;, ]+/g),
            mimetypes = {}, // Use an object to prevent duplicates.
            typesInfo = [];

        filetypes.forEach((filetype) => {
            filetype = filetype.trim();

            if (filetype) {
                if (filetype.indexOf('/') != -1) {
                    // It's a mimetype.
                    typesInfo.push({
                        name: this.mimeUtils.getMimetypeDescription(filetype),
                        extlist: this.mimeUtils.getExtensions(filetype).map(this.addDot).join(' ')
                    });

                    mimetypes[filetype] = true;
                } else if (filetype.indexOf('.') === 0) {
                    // It's an extension.
                    const mimetype = this.mimeUtils.getMimeType(filetype);
                    typesInfo.push({
                        name: mimetype ? this.mimeUtils.getMimetypeDescription(mimetype) : false,
                        extlist: filetype
                    });

                    if (mimetype) {
                        mimetypes[mimetype] = true;
                    }
                } else {
                    // It's a group.
                    const groupExtensions = this.mimeUtils.getGroupMimeInfo(filetype, 'extensions'),
                        groupMimetypes = this.mimeUtils.getGroupMimeInfo(filetype, 'mimetypes');

                    if (groupExtensions.length > 0) {
                        typesInfo.push({
                            name: this.mimeUtils.getTranslatedGroupName(filetype),
                            extlist: groupExtensions ? groupExtensions.map(this.addDot).join(' ') : ''
                        });

                        groupMimetypes.forEach((mimetype) => {
                            if (mimetype) {
                                mimetypes[mimetype] = true;
                            }
                        });
                    } else {
                        // Treat them as extensions.
                        filetype = this.addDot(filetype);

                        const mimetype = this.mimeUtils.getMimeType(filetype);
                        typesInfo.push({
                            name: mimetype ? this.mimeUtils.getMimetypeDescription(mimetype) : false,
                            extlist: filetype
                        });

                        if (mimetype) {
                            mimetypes[mimetype] = true;
                        }
                    }
                }
            }
        });

        return {
            info: typesInfo,
            mimetypes: Object.keys(mimetypes)
        };
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be uploaded later.
     *
     * @param {string} folderPath Path of the folder where to store the files.
     * @param {any[]} files List of files.
     * @return {Promise<{online: any[], offline: number}>} Promise resolved if success.
     */
    storeFilesToUpload(folderPath: string, files: any[]): Promise<{ online: any[], offline: number }> {
        const result = {
            online: [],
            offline: 0
        };

        if (!files || !files.length) {
            return Promise.resolve(result);
        }

        // Remove unused files from previous saves.
        return this.fileProvider.removeUnusedFiles(folderPath, files).then(() => {
            const promises = [];

            files.forEach((file) => {
                if (file.filename && !file.name) {
                    // It's an online file, add it to the result and ignore it.
                    result.online.push({
                        filename: file.filename,
                        fileurl: file.fileurl
                    });
                } else if (!file.name) {
                    // Error.
                    promises.push(Promise.reject(null));
                } else if (file.fullPath && file.fullPath.indexOf(folderPath) != -1) {
                    // File already in the submission folder.
                    result.offline++;
                } else {
                    // Local file, copy it.
                    // Use copy instead of move to prevent having a unstable state if some copies succeed and others don't.
                    const destFile = this.textUtils.concatenatePaths(folderPath, file.name);
                    promises.push(this.fileProvider.copyFile(file.toURL(), destFile));
                    result.offline++;
                }
            });

            return Promise.all(promises).then(() => {
                return result;
            });
        });
    }

    /**
     * Upload a file.
     *
     * @param {string} uri File URI.
     * @param {CoreFileUploaderOptions} [options] Options for the upload.
     * @param {Function} [onProgress] Function to call on progress.
     * @param {string} [siteId] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    uploadFile(uri: string, options?: CoreFileUploaderOptions, onProgress?: (event: ProgressEvent) => any,
            siteId?: string): Promise<any> {
        options = options || {};

        const deleteAfterUpload = options.deleteAfterUpload,
            ftOptions = this.utils.clone(options);

        delete ftOptions.deleteAfterUpload;

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.uploadFile(uri, ftOptions, onProgress);
        }).then((result) => {
            if (deleteAfterUpload) {
                setTimeout(() => {
                    // Use set timeout, otherwise in Electron the upload threw an error sometimes.
                    this.fileProvider.removeExternalFile(uri);
                }, 500);
            }

            return result;
        });
    }

    /**
     * Upload a file to a draft area and return the draft ID.
     *
     * If the file is an online file it will be downloaded and then re-uploaded.
     * If the file is a local file it will not be deleted from the device after upload.
     *
     * @param {any} file Online file or local FileEntry.
     * @param {number} [itemId] Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param {string} [component] The component to set to the downloaded files.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the itemId.
     */
    uploadOrReuploadFile(file: any, itemId?: number, component?: string, componentId?: string | number,
            siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let promise,
            fileName;

        const isOnline = file.filename && !file.name;

        if (isOnline) {
            // It's an online file. We need to download it and re-upload it.
            fileName = file.filename;
            promise = this.filepoolProvider.downloadUrl(siteId, file.url || file.fileurl, false, component, componentId,
                file.timemodified, undefined, undefined, file).then((path) => {
                    return this.fileProvider.getExternalFile(path);
                });
        } else {
            // Local file, we already have the file entry.
            fileName = file.name;
            promise = Promise.resolve(file);
        }

        return promise.then((fileEntry) => {
            // Now upload the file.
            const options = this.getFileUploadOptions(fileEntry.toURL(), fileName, fileEntry.type, isOnline, 'draft', itemId);

            return this.uploadFile(fileEntry.toURL(), options, undefined, siteId).then((result) => {
                return result.itemid;
            });
        });
    }

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     *
     * Online files will be downloaded and then re-uploaded.
     * Local files are not deleted from the device after upload.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @param {any[]} files List of files.
     * @param {string} [component] The component to set to the downloaded files.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the itemId.
     */
    uploadOrReuploadFiles(files: any[], component?: string, componentId?: string | number, siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!files || !files.length) {
            // Return fake draft ID.
            return Promise.resolve(1);
        }

        // Upload only the first file first to get a draft id.
        return this.uploadOrReuploadFile(files[0], 0, component, componentId, siteId).then((itemId) => {
            const promises = [];

            for (let i = 1; i < files.length; i++) {
                const file = files[i];
                promises.push(this.uploadOrReuploadFile(file, itemId, component, componentId, siteId));
            }

            return Promise.all(promises).then(() => {
                return itemId;
            });
        });
    }
}
