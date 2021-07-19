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
import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile, CoreWSFileUploadOptions, CoreWSUploadFileResult } from '@services/ws';
import { makeSingleton, Translate, MediaCapture, ModalController, Camera } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreEmulatorCaptureMediaComponent } from '@features/emulator/components/capture-media/capture-media';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/site';
import { CoreFileEntry, CoreFileHelper } from '@services/file-helper';

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
    areFileListDifferent(a: CoreFileEntry[], b: CoreFileEntry[]): boolean {
        a = a || [];
        b = b || [];
        if (a.length != b.length) {
            return true;
        }

        // Currently we are going to compare the order of the files as well.
        // This function can be improved comparing more fields or not comparing the order.
        for (let i = 0; i < a.length; i++) {
            if (CoreFile.getFileName(a[i]) != CoreFile.getFileName(b[i])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a certain site allows deleting draft files.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if can delete.
     * @since 3.10
     */
    async canDeleteDraftFiles(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            return this.canDeleteDraftFilesInSite(site);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a certain site allows deleting draft files.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether draft files can be deleted.
     * @since 3.10
     */
    canDeleteDraftFilesInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site?.wsAvailable('core_files_delete_draft_files'));
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
            return await MediaCapture.captureAudio(options);
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

        const modal = await ModalController.create({
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
            return await MediaCapture.captureVideo(options);
        } finally {
            this.onVideoCapture.next(false);
        }
    }

    /**
     * Clear temporary attachments to be uploaded.
     * Attachments already saved in an offline store will NOT be deleted, only files in tmp folder will be deleted.
     *
     * @param files List of files.
     */
    clearTmpFiles(files: (CoreWSFile | FileEntry)[]): void {
        // Delete the temporary files.
        files.forEach((file) => {
            if ('remove' in file && CoreFile.removeBasePath(file.toURL()).startsWith(CoreFileProvider.TMPFOLDER)) {
                // Pass an empty function to prevent missing parameter error.
                file.remove(() => {
                    // Nothing to do.
                });
            }
        });
    }

    /**
     * Delete draft files.
     *
     * @param draftId Draft ID.
     * @param files Files to delete.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async deleteDraftFiles(draftId: number, files: { filepath: string; filename: string }[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params = {
            draftitemid: draftId,
            files: files,
        };

        return site.write('core_files_delete_draft_files', params);
    }

    /**
     * Get the upload options for a file taken with the Camera Cordova plugin.
     *
     * @param uri File URI.
     * @param isFromAlbum True if the image was taken from album, false if it's a new image taken with camera.
     * @return Options.
     */
    getCameraUploadOptions(uri: string, isFromAlbum?: boolean): CoreFileUploaderOptions {
        const extension = CoreMimetypeUtils.guessExtensionFromUrl(uri);
        const mimetype = CoreMimetypeUtils.getMimeType(extension);
        const isIOS = CoreApp.isIOS();
        const options: CoreFileUploaderOptions = {
            deleteAfterUpload: !isFromAlbum,
            mimeType: mimetype,
        };
        const fileName = CoreFile.getFileAndDirectoryFromPath(uri).name;

        if (isIOS && (mimetype == 'image/jpeg' || mimetype == 'image/png')) {
            // In iOS, the pictures can have repeated names, even if they come from the album.
            // Add a timestamp to the filename to make it unique.
            const split = fileName.split('.');
            split[0] += '_' + CoreTimeUtils.readableTimestamp();

            options.fileName = split.join('.');
        } else {
            // Use the same name that the file already has.
            options.fileName = fileName;
        }

        if (isFromAlbum) {
            // If the file was picked from the album, delete it only if it was copied to the app's folder.
            options.deleteAfterUpload = CoreFile.isFileInAppFolder(uri);

            if (CoreApp.isAndroid()) {
                // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
                options.fileName = options.fileName.replace(/(\.[^.]*)\?[^.]*$/, '$1');
            }
        }

        return options;
    }

    /**
     * Given a list of original files and a list of current files, return the list of files to delete.
     *
     * @param originalFiles Original files.
     * @param currentFiles Current files.
     * @return List of files to delete.
     */
    getFilesToDelete(
        originalFiles: CoreWSFile[],
        currentFiles: CoreFileEntry[],
    ): { filepath: string; filename: string }[] {

        const filesToDelete: { filepath: string; filename: string }[] = [];
        currentFiles = currentFiles || [];

        originalFiles.forEach((file) => {
            const stillInList = currentFiles.some((currentFile) =>
                CoreFileHelper.getFileUrl(<CoreWSFile> currentFile) == CoreFileHelper.getFileUrl(file));

            if (!stillInList) {
                filesToDelete.push({
                    filepath: file.filepath!,
                    filename: file.filename!,
                });
            }
        });

        return filesToDelete;
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
        options.mimeType = mimetype || CoreMimetypeUtils.getMimeType(
            CoreMimetypeUtils.getFileExtension(options.fileName),
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
            split[0] += '_' + CoreTimeUtils.readableTimestamp();
            filename = split.join('.');
        }

        options.fileName = filename;
        options.deleteAfterUpload = true;
        if (mediaFile.type) {
            options.mimeType = mediaFile.type;
        } else {
            options.mimeType = CoreMimetypeUtils.getMimeType(
                CoreMimetypeUtils.getFileExtension(options.fileName),
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

        return Camera.getPicture(options).finally(() => {
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
        return <FileEntry[]> await CoreFile.getDirectoryContents(folderPath);
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
    ): Promise<CoreFileEntry[]> {
        let files: CoreFileEntry[] = [];

        if (filesObject.online.length > 0) {
            files = CoreUtils.clone(filesObject.online);
        }

        if (filesObject.offline > 0) {
            const offlineFiles = await CoreUtils.ignoreErrors(this.getStoredFiles(folderPath));

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
                extension = CoreMimetypeUtils.getExtension(mimetype);

                if (mimetypes.indexOf(mimetype) == -1) {
                    // Get the "main" mimetype of the extension.
                    // It's possible that the list of accepted mimetypes only includes the "main" mimetypes.
                    mimetype = CoreMimetypeUtils.getMimeType(extension);
                }
            } else if (path) {
                extension = CoreMimetypeUtils.getFileExtension(path);
                mimetype = CoreMimetypeUtils.getMimeType(extension);
            } else {
                throw new CoreError('No mimetype or path supplied.');
            }

            if (mimetype && mimetypes.indexOf(mimetype) == -1) {
                extension = extension || Translate.instant('core.unknown');

                return Translate.instant('core.fileuploader.invalidfiletype', { $a: extension });
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
                    name: CoreMimetypeUtils.getMimetypeDescription(filetype),
                    extlist: CoreMimetypeUtils.getExtensions(filetype).map(this.addDot).join(' '),
                });

                mimetypes[filetype] = true;
            } else if (filetype.indexOf('.') === 0) {
                // It's an extension.
                const mimetype = CoreMimetypeUtils.getMimeType(filetype);
                typesInfo.push({
                    name: mimetype && CoreMimetypeUtils.getMimetypeDescription(mimetype),
                    extlist: filetype,
                });

                if (mimetype) {
                    mimetypes[mimetype] = true;
                }
            } else {
                // It's a group.
                const groupExtensions = CoreMimetypeUtils.getGroupMimeInfo(filetype, 'extensions');
                const groupMimetypes = CoreMimetypeUtils.getGroupMimeInfo(filetype, 'mimetypes');

                if (groupExtensions && groupExtensions.length > 0) {
                    typesInfo.push({
                        name: CoreMimetypeUtils.getTranslatedGroupName(filetype),
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

                    const mimetype = CoreMimetypeUtils.getMimeType(filetype);
                    typesInfo.push({
                        name: mimetype && CoreMimetypeUtils.getMimetypeDescription(mimetype),
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
        files: CoreFileEntry[],
    ): Promise<CoreFileUploaderStoreFilesResult> {
        const result: CoreFileUploaderStoreFilesResult = {
            online: [],
            offline: 0,
        };

        if (!files || !files.length) {
            return result;
        }

        // Remove unused files from previous saves.
        await CoreFile.removeUnusedFiles(folderPath, files);

        await Promise.all(files.map(async (file) => {
            if (!CoreUtils.isFileEntry(file)) {
                // It's an online file, add it to the result and ignore it.
                result.online.push({
                    filename: file.filename,
                    fileurl: CoreFileHelper.getFileUrl(file),
                });
            } else if (file.fullPath?.indexOf(folderPath) != -1) {
                // File already in the submission folder.
                result.offline++;
            } else {
                // Local file, copy it.
                // Use copy instead of move to prevent having a unstable state if some copies succeed and others don't.
                const destFile = CoreTextUtils.concatenatePaths(folderPath, file.name);
                result.offline++;

                await CoreFile.copyFile(file.toURL(), destFile);
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
        const ftOptions = CoreUtils.clone(options);

        delete ftOptions.deleteAfterUpload;

        const site = await CoreSites.getSite(siteId);

        const result = await site.uploadFile(uri, ftOptions, onProgress);

        if (deleteAfterUpload) {
            CoreFile.removeExternalFile(uri);
        }

        return result;
    }

    /**
     * Given a list of files (either online files or local files), upload the local files to the draft area.
     * Local files are not deleted from the device after upload.
     *
     * @param itemId Draft ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the itemId.
     */
    async uploadFiles(itemId: number, files: CoreFileEntry[], siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!files || !files.length) {
            return;
        }

        // Index the online files by name.
        const usedNames: {[name: string]: CoreFileEntry} = {};
        const filesToUpload: FileEntry[] = [];
        files.forEach((file) => {
            if (CoreUtils.isFileEntry(file)) {
                filesToUpload.push(<FileEntry> file);
            } else {
                // It's an online file.
                usedNames[file.filename!.toLowerCase()] = file;
            }
        });

        await Promise.all(filesToUpload.map(async (file) => {
            // Make sure the file name is unique in the area.
            const name = CoreFile.calculateUniqueName(usedNames, file.name);
            usedNames[name] = file;

            // Now upload the file.
            const options = this.getFileUploadOptions(file.toURL(), name, undefined, false, 'draft', itemId);

            await this.uploadFile(file.toURL(), options, undefined, siteId);
        }));
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
        file: CoreFileEntry,
        itemId?: number,
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): Promise<number> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        let fileName: string | undefined;
        let fileEntry: FileEntry | undefined;

        const isOnline = !CoreUtils.isFileEntry(file);

        if (CoreUtils.isFileEntry(file)) {
            // Local file, we already have the file entry.
            fileName = file.name;
            fileEntry = file;
        } else {
            // It's an online file. We need to download it and re-upload it.
            fileName = file.filename;

            const path = await CoreFilepool.downloadUrl(
                siteId,
                CoreFileHelper.getFileUrl(file),
                false,
                component,
                componentId,
                file.timemodified,
                undefined,
                undefined,
                file,
            );

            fileEntry = await CoreFile.getExternalFile(path);
        }

        // Now upload the file.
        const extension = CoreMimetypeUtils.getFileExtension(fileName!);
        const mimetype = extension ? CoreMimetypeUtils.getMimeType(extension) : undefined;
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
        files: CoreFileEntry[],
        component?: string,
        componentId?: string | number,
        siteId?: string,
    ): Promise<number> {
        siteId = siteId || CoreSites.getCurrentSiteId();

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

export const CoreFileUploader = makeSingleton(CoreFileUploaderProvider);

export type CoreFileUploaderStoreFilesResult = {
    online: CoreWSFile[]; // List of online files.
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
