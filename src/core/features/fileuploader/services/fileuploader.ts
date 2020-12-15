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
import { CameraOptions } from '@ionic-native/camera/ngx';
import { FileEntry } from '@ionic-native/file/ngx';
import { MediaFile, CaptureError, CaptureAudioOptions, CaptureVideoOptions } from '@ionic-native/media-capture/ngx';
import { Subject } from 'rxjs';

import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile, CoreWSFileUploadOptions, CoreWSUploadFileResult } from '@services/ws';
import { makeSingleton, Translate, MediaCapture, ModalController, Camera } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreEmulatorCaptureMediaComponent } from '@features/emulator/components/capture-media/capture-media';
import { CoreError } from '@classes/errors/error';

/**
 * File upload options.
 */
export interface CoreFileUploaderOptions extends CoreWSFileUploadOptions {
    /**
     * Whether the file should be deleted after the upload (if success).
     */
    deleteAfterUpload?: boolean;
}

/**
 * Service to upload files.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderProvider {

    static readonly LIMITED_SIZE_WARNING = 1048576; // 1 MB.
    static readonly WIFI_SIZE_WARNING = 10485760; // 10 MB.

    protected logger: CoreLogger;

    // Observers to notify when a media file starts/stops being recorded/selected.
    onGetPicture: Subject<boolean> = new Subject<boolean>();
    onAudioCapture: Subject<boolean> = new Subject<boolean>();
    onVideoCapture: Subject<boolean> = new Subject<boolean>();

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFileUploaderProvider');
    }

    /**
     * Add a dot to the beginning of an extension.
     *
     * @param extension Extension.
     * @return Treated extension.
     */
    protected addDot(extension: string): string {
        return '.' + extension;
    }

    /**
     * Compares two file lists and returns if they are different.
     *
     * @param a First file list.
     * @param b Second file list.
     * @return Whether both lists are different.
     */
    areFileListDifferent(a: (CoreWSExternalFile | FileEntry)[], b: (CoreWSExternalFile | FileEntry)[]): boolean {
        a = a || [];
        b = b || [];
        if (a.length != b.length) {
            return true;
        }

        // Currently we are going to compare the order of the files as well.
        // This function can be improved comparing more fields or not comparing the order.
        for (let i = 0; i < a.length; i++) {
            if (CoreFile.instance.getFileName(a[i]) != CoreFile.instance.getFileName(b[i])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @param options Options.
     * @return Promise resolved with the result.
     */
    async captureAudio(options: CaptureAudioOptions): Promise<MediaFile[] | CaptureError> {
        this.onAudioCapture.next(true);

        try {
            return await MediaCapture.instance.captureAudio(options);
        } finally {
            this.onAudioCapture.next(false);
        }
    }

    /**
     * Record an audio file without using an external app.
     *
     * @return Promise resolved with the file.
     */
    async captureAudioInApp(): Promise<MediaFile> {
        const params = {
            type: 'audio',
        };

        const modal = await ModalController.instance.create({
            component: CoreEmulatorCaptureMediaComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: params,
            backdropDismiss: false,
        });

        await modal.present();

        const result = await modal.onWillDismiss();

        if (result.role == 'success') {
            return result.data[0];
        } else {
            throw result.data;
        }
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param options Options.
     * @return Promise resolved with the result.
     */
    async captureVideo(options: CaptureVideoOptions): Promise<MediaFile[] | CaptureError> {
        this.onVideoCapture.next(true);

        try {
            return await MediaCapture.instance.captureVideo(options);
        } finally {
            this.onVideoCapture.next(false);
        }
    }

    /**
     * Clear temporary attachments to be uploaded.
     * Attachments already saved in an offline store will NOT be deleted.
     *
     * @param files List of files.
     */
    clearTmpFiles(files: (CoreWSExternalFile | FileEntry)[]): void {
        // Delete the local files.
        files.forEach((file) => {
            if ('remove' in file) {
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
     * @param uri File URI.
     * @param isFromAlbum True if the image was taken from album, false if it's a new image taken with camera.
     * @return Options.
     */
    getCameraUploadOptions(uri: string, isFromAlbum?: boolean): CoreFileUploaderOptions {
        const extension = CoreMimetypeUtils.instance.guessExtensionFromUrl(uri);
        const mimetype = CoreMimetypeUtils.instance.getMimeType(extension);
        const isIOS = CoreApp.instance.isIOS();
        const options: CoreFileUploaderOptions = {
            deleteAfterUpload: !isFromAlbum,
            mimeType: mimetype,
        };
        const fileName = CoreFile.instance.getFileAndDirectoryFromPath(uri).name;

        if (isIOS && (mimetype == 'image/jpeg' || mimetype == 'image/png')) {
            // In iOS, the pictures can have repeated names, even if they come from the album.
            // Add a timestamp to the filename to make it unique.
            const split = fileName.split('.');
            split[0] += '_' + CoreTimeUtils.instance.readableTimestamp();

            options.fileName = split.join('.');
        } else {
            // Use the same name that the file already has.
            options.fileName = fileName;
        }

        if (isFromAlbum) {
            // If the file was picked from the album, delete it only if it was copied to the app's folder.
            options.deleteAfterUpload = CoreFile.instance.isFileInAppFolder(uri);

            if (CoreApp.instance.isAndroid()) {
                // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
                options.fileName = options.fileName.replace(/(\.[^.]*)\?[^.]*$/, '$1');
            }
        }

        return options;
    }

    /**
     * Get the upload options for a file of any type.
     *
     * @param uri File URI.
     * @param name File name.
     * @param mimetype File mimetype.
     * @param deleteAfterUpload Whether the file should be deleted after upload.
     * @param fileArea File area to upload the file to. It defaults to 'draft'.
     * @param itemId Draft ID to upload the file to, 0 to create new.
     * @return Options.
     */
    getFileUploadOptions(
        uri: string,
        name: string,
        mimetype?: string,
        deleteAfterUpload?: boolean,
        fileArea?: string,
        itemId?: number,
    ): CoreFileUploaderOptions {
        const options: CoreFileUploaderOptions = {};
        options.fileName = name;
        options.mimeType = mimetype || CoreMimetypeUtils.instance.getMimeType(
            CoreMimetypeUtils.instance.getFileExtension(options.fileName),
        );
        options.deleteAfterUpload = !!deleteAfterUpload;
        options.itemId = itemId || 0;
        options.fileArea = fileArea;

        return options;
    }

    /**
     * Get the upload options for a file taken with the media capture Cordova plugin.
     *
     * @param mediaFile File object to upload.
     * @return Options.
     */
    getMediaUploadOptions(mediaFile: MediaFile): CoreFileUploaderOptions {
        const options: CoreFileUploaderOptions = {};
        let filename = mediaFile.name;

        if (!filename.match(/_\d{14}(\..*)?$/)) {
            // Add a timestamp to the filename to make it unique.
            const split = filename.split('.');
            split[0] += '_' + CoreTimeUtils.instance.readableTimestamp();
            filename = split.join('.');
        }

        options.fileName = filename;
        options.deleteAfterUpload = true;
        if (mediaFile.type) {
            options.mimeType = mediaFile.type;
        } else {
            options.mimeType = CoreMimetypeUtils.instance.getMimeType(
                CoreMimetypeUtils.instance.getFileExtension(options.fileName),
            );
        }

        return options;
    }

    /**
     * Take a picture or video, or load one from the library.
     *
     * @param options Options.
     * @return Promise resolved with the result.
     */
    getPicture(options: CameraOptions): Promise<string> {
        this.onGetPicture.next(true);

        return Camera.instance.getPicture(options).finally(() => {
            this.onGetPicture.next(false);
        });
    }

    /**
     * Get the files stored in a folder, marking them as offline.
     *
     * @param folderPath Folder where to get the files.
     * @return Promise resolved with the list of files.
     */
    async getStoredFiles(folderPath: string): Promise<FileEntry[]> {
        return <FileEntry[]> await CoreFile.instance.getDirectoryContents(folderPath);
    }

    /**
     * Get stored files from combined online and offline file object.
     *
     * @param filesObject The combined offline and online files object.
     * @param folderPath Folder path to get files from.
     * @return Promise resolved with files.
     */
    async getStoredFilesFromOfflineFilesObject(
        filesObject: CoreFileUploaderStoreFilesResult,
        folderPath: string,
    ): Promise<(CoreWSExternalFile | FileEntry)[]> {
        let files: (CoreWSExternalFile | FileEntry)[] = [];

        if (filesObject.online.length > 0) {
            files = CoreUtils.instance.clone(filesObject.online);
        }

        if (filesObject.offline > 0) {
            const offlineFiles = await CoreUtils.instance.ignoreErrors(this.getStoredFiles(folderPath));

            if (offlineFiles) {
                files = files.concat(offlineFiles);
            }
        }

        return files;
    }

    /**
     * Check if a file's mimetype is invalid based on the list of accepted mimetypes. This function needs either the file's
     * mimetype or the file's path/name.
     *
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @param path File's path or name.
     * @param mimetype File's mimetype.
     * @return Undefined if file is valid, error message if file is invalid.
     */
    isInvalidMimetype(mimetypes?: string[], path?: string, mimetype?: string): string | undefined {
        let extension: string | undefined;

        if (mimetypes) {
            // Verify that the mimetype of the file is supported.
            if (mimetype) {
                extension = CoreMimetypeUtils.instance.getExtension(mimetype);

                if (mimetypes.indexOf(mimetype) == -1) {
                    // Get the "main" mimetype of the extension.
                    // It's possible that the list of accepted mimetypes only includes the "main" mimetypes.
                    mimetype = CoreMimetypeUtils.instance.getMimeType(extension);
                }
            } else if (path) {
                extension = CoreMimetypeUtils.instance.getFileExtension(path);
                mimetype = CoreMimetypeUtils.instance.getMimeType(extension);
            } else {
                throw new CoreError('No mimetype or path supplied.');
            }

            if (mimetype && mimetypes.indexOf(mimetype) == -1) {
                extension = extension || Translate.instance.instant('core.unknown');

                return Translate.instance.instant('core.fileuploader.invalidfiletype', { $a: extension });
            }
        }
    }

    /**
     * Mark files as offline.
     *
     * @param files Files to mark as offline.
     * @return Files marked as offline.
     * @deprecated since 3.9.5. Now stored files no longer have an offline property.
     */
    markOfflineFiles(files: FileEntry[]): FileEntry[] {
        return files;
    }

    /**
     * Parse filetypeList to get the list of allowed mimetypes and the data to render information.
     *
     * @param filetypeList Formatted string list where the mimetypes can be checked.
     * @return Mimetypes and the filetypes informations. Undefined if all types supported.
     */
    prepareFiletypeList(filetypeList: string): CoreFileUploaderTypeList | undefined {
        filetypeList = filetypeList?.trim();

        if (!filetypeList || filetypeList == '*') {
            // All types supported, return undefined.
            return;
        }

        const filetypes = filetypeList.split(/[;, ]+/g);
        const mimetypes: Record<string, boolean> = {}; // Use an object to prevent duplicates.
        const typesInfo: CoreFileUploaderTypeListInfoEntry[] = [];

        filetypes.forEach((filetype) => {
            filetype = filetype.trim();

            if (!filetype) {
                return;
            }

            if (filetype.indexOf('/') != -1) {
                // It's a mimetype.
                typesInfo.push({
                    name: CoreMimetypeUtils.instance.getMimetypeDescription(filetype),
                    extlist: CoreMimetypeUtils.instance.getExtensions(filetype).map(this.addDot).join(' '),
                });

                mimetypes[filetype] = true;
            } else if (filetype.indexOf('.') === 0) {
                // It's an extension.
                const mimetype = CoreMimetypeUtils.instance.getMimeType(filetype);
                typesInfo.push({
                    name: mimetype && CoreMimetypeUtils.instance.getMimetypeDescription(mimetype),
                    extlist: filetype,
                });

                if (mimetype) {
                    mimetypes[mimetype] = true;
                }
            } else {
                // It's a group.
                const groupExtensions = CoreMimetypeUtils.instance.getGroupMimeInfo(filetype, 'extensions');
                const groupMimetypes = CoreMimetypeUtils.instance.getGroupMimeInfo(filetype, 'mimetypes');

                if (groupExtensions && groupExtensions.length > 0) {
                    typesInfo.push({
                        name: CoreMimetypeUtils.instance.getTranslatedGroupName(filetype),
                        extlist: groupExtensions.map(this.addDot).join(' '),
                    });

                    groupMimetypes?.forEach((mimetype) => {
                        if (mimetype) {
                            mimetypes[mimetype] = true;
                        }
                    });
                } else {
                    // Treat them as extensions.
                    filetype = this.addDot(filetype);

                    const mimetype = CoreMimetypeUtils.instance.getMimeType(filetype);
                    typesInfo.push({
                        name: mimetype && CoreMimetypeUtils.instance.getMimetypeDescription(mimetype),
                        extlist: filetype,
                    });

                    if (mimetype) {
                        mimetypes[mimetype] = true;
                    }
                }
            }
        });

        return {
            info: typesInfo,
            mimetypes: Object.keys(mimetypes),
        };
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be uploaded later.
     *
     * @param folderPath Path of the folder where to store the files.
     * @param files List of files.
     * @return Promise resolved if success.
     */
    async storeFilesToUpload(
        folderPath: string,
        files: (CoreWSExternalFile | FileEntry)[],
    ): Promise<CoreFileUploaderStoreFilesResult> {
        const result: CoreFileUploaderStoreFilesResult = {
            online: [],
            offline: 0,
        };

        if (!files || !files.length) {
            return result;
        }

        // Remove unused files from previous saves.
        await CoreFile.instance.removeUnusedFiles(folderPath, files);

        await Promise.all(files.map(async (file) => {
            if (!CoreUtils.instance.isFileEntry(file)) {
                // It's an online file, add it to the result and ignore it.
                result.online.push({
                    filename: file.filename,
                    fileurl: file.fileurl,
                });
            } else if (file.fullPath?.indexOf(folderPath) != -1) {
                // File already in the submission folder.
                result.offline++;
            } else {
                // Local file, copy it.
                // Use copy instead of move to prevent having a unstable state if some copies succeed and others don't.
                const destFile = CoreTextUtils.instance.concatenatePaths(folderPath, file.name);
                result.offline++;

                await CoreFile.instance.copyFile(file.toURL(), destFile);
            }
        }));

        return result;
    }

    /**
     * Upload a file.
     *
     * @param uri File URI.
     * @param options Options for the upload.
     * @param onProgress Function to call on progress.
     * @param siteId Id of the site to upload the file to. If not defined, use current site.
     * @return Promise resolved when done.
     */
    async uploadFile(
        uri: string,
        options?: CoreFileUploaderOptions,
        onProgress?: (event: ProgressEvent) => void,
        siteId?: string,
    ): Promise<CoreWSUploadFileResult> {
        options = options || {};

        const deleteAfterUpload = options.deleteAfterUpload;
        const ftOptions = CoreUtils.instance.clone(options);

        delete ftOptions.deleteAfterUpload;

        const site = await CoreSites.instance.getSite(siteId);

        const result = await site.uploadFile(uri, ftOptions, onProgress);

        if (deleteAfterUpload) {
            CoreFile.instance.removeExternalFile(uri);
        }

        return result;
    }

    /**
     * Upload a file to a draft area and return the draft ID.
     *
     * If the file is an online file it will be downloaded and then re-uploaded.
     * If the file is a local file it will not be deleted from the device after upload.
     *
     * @param file Online file or local FileEntry.
     * @param itemId Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param component The component to set to the downloaded files.
     * @param componentId An ID to use in conjunction with the component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the itemId.
     */
    async uploadOrReuploadFile(
        file: CoreWSExternalFile | FileEntry,
        itemId?: number,
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): Promise<number> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        let fileName: string | undefined;
        let fileEntry: FileEntry | undefined;

        const isOnline = !CoreUtils.instance.isFileEntry(file);

        if (CoreUtils.instance.isFileEntry(file)) {
            // Local file, we already have the file entry.
            fileName = file.name;
            fileEntry = file;
        } else {
            // It's an online file. We need to download it and re-upload it.
            fileName = file.filename;

            const path = await CoreFilepool.instance.downloadUrl(
                siteId,
                file.fileurl,
                false,
                component,
                componentId,
                file.timemodified,
                undefined,
                undefined,
                file,
            );

            fileEntry = await CoreFile.instance.getExternalFile(path);
        }

        // Now upload the file.
        const extension = CoreMimetypeUtils.instance.getFileExtension(fileName!);
        const mimetype = extension ? CoreMimetypeUtils.instance.getMimeType(extension) : undefined;
        const options = this.getFileUploadOptions(fileEntry.toURL(), fileName!, mimetype, isOnline, 'draft', itemId);

        const result = await this.uploadFile(fileEntry.toURL(), options, undefined, siteId);

        return result.itemid;
    }

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     *
     * Online files will be downloaded and then re-uploaded.
     * Local files are not deleted from the device after upload.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @param files List of files.
     * @param component The component to set to the downloaded files.
     * @param componentId An ID to use in conjunction with the component.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the itemId.
     */
    async uploadOrReuploadFiles(
        files: (CoreWSExternalFile | FileEntry)[],
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): Promise<number> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        if (!files || !files.length) {
            // Return fake draft ID.
            return 1;
        }

        // Upload only the first file first to get a draft id.
        const itemId = await this.uploadOrReuploadFile(files[0], 0, component, componentId, siteId);

        const promises: Promise<number>[] = [];

        for (let i = 1; i < files.length; i++) {
            const file = files[i];
            promises.push(this.uploadOrReuploadFile(file, itemId, component, componentId, siteId));
        }

        await Promise.all(promises);

        return itemId;
    }

}

export class CoreFileUploader extends makeSingleton(CoreFileUploaderProvider) {}

export type CoreFileUploaderStoreFilesResult = {
    online: CoreWSExternalFile[]; // List of online files.
    offline: number; // Number of offline files.
};

export type CoreFileUploaderTypeList = {
    info: CoreFileUploaderTypeListInfoEntry[];
    mimetypes: string[];
};

export type CoreFileUploaderTypeListInfoEntry = {
    name?: string;
    extlist: string;
};
