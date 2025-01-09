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
import { ActionSheetButton } from '@ionic/core';
import { CameraOptions } from '@awesome-cordova-plugins/camera/ngx';
import { ChooserResult } from 'cordova-plugin-chooser';
import { FileEntry, IFile } from '@awesome-cordova-plugins/file/ngx';
import { MediaFile } from '@awesome-cordova-plugins/media-capture/ngx';

import { CoreNetwork } from '@services/network';
import { CoreFile, CoreFileProvider, CoreFileProgressEvent } from '@services/file';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreText } from '@singletons/text';
import { CoreArray } from '@singletons/array';
import { makeSingleton, Translate, Camera, ActionSheetController } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreError } from '@classes/errors/error';
import {
    CoreFileUploader,
    CoreFileUploaderProvider,
    CoreFileUploaderOptions,
    CoreFileUploaderAudioRecording,
} from './fileuploader';
import { CoreFileUploaderDelegate } from './fileuploader-delegate';
import { CAPTURE_ERROR_NO_MEDIA_FILES, CoreCaptureError } from '@classes/errors/captureerror';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreWSUploadFileResult } from '@services/ws';
import { CoreSites } from '@services/sites';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';
import { Chooser } from '@features/native/plugins';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreFileUtils } from '@singletons/file-utils';

/**
 * Helper service to upload files.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderHelperProvider {

    protected logger: CoreLogger;
    protected filePickerDeferred?: CorePromisedValue<CoreWSUploadFileResult | FileEntry>;
    protected actionSheet?: HTMLIonActionSheetElement;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFileUploaderHelperProvider');
    }

    /**
     * Choose any type of file and upload it.
     *
     * @param maxSize Max size of the upload. -1 for no max size.
     * @param upload True if the file should be uploaded, false to return the picked file.
     * @param allowOffline True to allow uploading in offline.
     * @returns Promise resolved when done.
     */
    async chooseAndUploadFile(
        maxSize?: number,
        upload?: boolean,
        allowOffline?: boolean,
        mimetypes?: string[],
    ): Promise<CoreWSUploadFileResult | FileEntry> {

        const modal = await CoreLoadings.show();

        const result = await Chooser.getFileMetadata(mimetypes ? mimetypes.join(',') : undefined);

        modal.dismiss();

        if (!result) {
            // User canceled.
            throw new CoreCanceledError();
        }

        if (result.name == 'File') {
            // In some Android 4.4 devices the file name cannot be retrieved. Try to use the one from the URI.
            result.name = this.getChosenFileNameFromPath(result) || result.name;
        }

        // Verify that the mimetype is supported.
        const error = CoreFileUploader.isInvalidMimetype(mimetypes, result.name, result.mediaType);

        if (error) {
            throw new CoreError(error);
        }

        const options = CoreFileUploader.getFileUploadOptions(result.uri, result.name, result.mediaType, true);

        if (upload) {
            return this.uploadFile(result.uri, maxSize || -1, true, options);
        } else {
            return this.copyToTmpFolder(result.uri, false, maxSize, undefined, options);
        }
    }

    /**
     * Show a confirmation modal to the user if the size of the file is bigger than the allowed threshold.
     *
     * @param size File size.
     * @param alwaysConfirm True to show a confirm even if the size isn't high.
     * @param allowOffline True to allow uploading in offline.
     * @param wifiThreshold Threshold for WiFi connection. Default: CoreFileUploaderProvider.WIFI_SIZE_WARNING.
     * @param limitedThreshold Threshold for limited connection. Default: CoreFileUploaderProvider.LIMITED_SIZE_WARNING.
     * @returns Promise resolved when the user confirms or if there's no need to show a modal.
     */
    async confirmUploadFile(
        size: number,
        alwaysConfirm?: boolean,
        allowOffline?: boolean,
        wifiThreshold?: number,
        limitedThreshold?: number,
    ): Promise<void> {
        if (size == 0) {
            return;
        }

        if (!allowOffline && !CoreNetwork.isOnline()) {
            throw new CoreError(Translate.instant('core.fileuploader.errormustbeonlinetoupload'));
        }

        wifiThreshold = wifiThreshold === undefined ? CoreFileUploaderProvider.WIFI_SIZE_WARNING : wifiThreshold;
        limitedThreshold = limitedThreshold === undefined ?
            CoreFileUploaderProvider.LIMITED_SIZE_WARNING : limitedThreshold;

        if (size < 0) {
            return CoreDomUtils.showConfirm(Translate.instant('core.fileuploader.confirmuploadunknownsize'));
        } else if (size >= wifiThreshold || (CoreNetwork.isNetworkAccessLimited() && size >= limitedThreshold)) {
            const readableSize = CoreText.bytesToSize(size, 2);

            return CoreDomUtils.showConfirm(
                Translate.instant('core.fileuploader.confirmuploadfile', { size: readableSize }),
            );
        } else if (alwaysConfirm) {
            return CoreDomUtils.showConfirm(Translate.instant('core.areyousure'));
        }
    }

    /**
     * Create a temporary copy of a file and upload it.
     *
     * @param file File to copy and upload.
     * @param upload True if the file should be uploaded, false to return the copy of the file.
     * @param name Name to use when uploading the file. If not defined, use the file's name.
     * @returns Promise resolved when the file is uploaded.
     */
    async copyAndUploadFile(file: IFile | File, upload?: boolean, name?: string): Promise<CoreWSUploadFileResult | FileEntry> {
        name = name || file.name;

        const modal = await CoreLoadings.show('core.fileuploader.readingfile', true);
        let fileEntry: FileEntry | undefined;

        try {
            // Get unique name for the copy.
            const newName = await CoreFile.getUniqueNameInFolder(CoreFileProvider.TMPFOLDER, name);

            const filePath = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, newName);

            // Write the data into the file.
            fileEntry = await CoreFile.writeFileDataInFile(
                file,
                filePath,
                (progress: CoreFileProgressEvent) => this.showProgressModal(modal, 'core.fileuploader.readingfileperc', progress),
            );
        } catch (error) {
            this.logger.error('Error reading file to upload.', error);
            modal.dismiss();

            throw error;
        }

        modal.dismiss();

        if (upload) {
            // Pass true to delete the copy after the upload.
            return this.uploadGenericFile(CoreFile.getFileEntryURL(fileEntry), name, file.type, true);
        } else {
            return fileEntry;
        }
    }

    /**
     * Copy or move a file to the app temporary folder.
     *
     * @param path Path of the file.
     * @param shouldDelete True if original file should be deleted (move), false otherwise (copy).
     * @param maxSize Max size of the file. If not defined or -1, no max size.
     * @param defaultExt Defaut extension to use if the file doesn't have any.
     * @returns Promise resolved with the copied file.
     */
    protected async copyToTmpFolder(
        path: string,
        shouldDelete: boolean,
        maxSize?: number,
        defaultExt?: string,
        options?: CoreFileUploaderOptions,
    ): Promise<FileEntry> {

        const fileName = options?.fileName || CoreFileUtils.getFileAndDirectoryFromPath(path).name;

        // Check that size isn't too large.
        if (maxSize !== undefined && maxSize != -1) {
            const fileEntry = await CoreFile.getExternalFile(path);

            const fileData = await CoreFile.getFileObjectFromFileEntry(fileEntry);

            if (fileData.size > maxSize) {
                throw this.createMaxBytesError(maxSize, fileEntry.name);
            }
        }

        // File isn't too large.
        // Get a unique name in the folder to prevent overriding another file.
        const newName = await CoreFile.getUniqueNameInFolder(CoreFileProvider.TMPFOLDER, fileName, defaultExt);

        // Now move or copy the file.
        const destPath = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, newName);
        if (shouldDelete) {
            return CoreFile.moveExternalFile(path, destPath);
        } else {
            return CoreFile.copyExternalFile(path, destPath);
        }
    }

    /**
     * Function called when trying to upload a file bigger than max size. Creates an error instance.
     *
     * @param maxSize Max size (bytes).
     * @param fileName Name of the file.
     * @returns Message.
     */
    protected createMaxBytesError(maxSize: number, fileName: string): CoreError {
        return new CoreError(Translate.instant('core.fileuploader.maxbytesfile', {
            $a: {
                file: fileName,
                size: CoreText.bytesToSize(maxSize, 2),
            },
        }));
    }

    /**
     * Function called when the file picker is closed.
     */
    filePickerClosed(): void {
        if (this.filePickerDeferred) {
            this.filePickerDeferred.reject(new CoreCanceledError());
            this.filePickerDeferred = undefined;
        }
    }

    /**
     * Function to call once a file is uploaded using the file picker.
     *
     * @param result Result of the upload process.
     */
    fileUploaded(result: CoreWSUploadFileResult | FileEntry): void {
        if (this.filePickerDeferred) {
            this.filePickerDeferred.resolve(result);
            this.filePickerDeferred = undefined;
        }
        // Close the action sheet if it's opened.
        this.actionSheet?.dismiss();
    }

    /**
     * Given the result of choosing a file, try to get its file name from the path.
     *
     * @param result Chosen file data.
     * @returns File name, undefined if cannot get it.
     */
    protected getChosenFileNameFromPath(result: ChooserResult): string | undefined {
        const nameAndDir = CoreFileUtils.getFileAndDirectoryFromPath(result.uri);

        if (!nameAndDir.name) {
            return;
        }

        let extension = CoreMimetypeUtils.getFileExtension(nameAndDir.name);

        if (!extension) {
            // The URI doesn't have an extension, add it now.
            extension = CoreMimetypeUtils.getExtension(result.mediaType);

            if (extension) {
                nameAndDir.name += '.' + extension;
            }
        }

        return decodeURIComponent(nameAndDir.name);
    }

    /**
     * Open the "file picker" to select and upload a file.
     *
     * @param maxSize Max size of the file to upload. If not defined or -1, no max size.
     * @param title File picker title.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved when a file is uploaded, rejected if file picker is closed without a file uploaded.
     *         The resolve value is the response of the upload request.
     */
    async selectAndUploadFile(maxSize?: number, title?: string, mimetypes?: string[]): Promise<CoreWSUploadFileResult> {
        return <CoreWSUploadFileResult> await this.selectFileWithPicker(maxSize, false, title, mimetypes, true);
    }

    /**
     * Open the "file picker" to select a file without uploading it.
     *
     * @param maxSize Max size of the file. If not defined or -1, no max size.
     * @param allowOffline True to allow selecting in offline, false to require connection.
     * @param title File picker title.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved when a file is selected, rejected if file picker is closed without selecting a file.
     *         The resolve value is the FileEntry of a copy of the picked file, so it can be deleted afterwards.
     */
    async selectFile(maxSize?: number, allowOffline?: boolean, title?: string, mimetypes?: string[]): Promise<FileEntry> {
        return <FileEntry> await this.selectFileWithPicker(maxSize, allowOffline, title, mimetypes, false);
    }

    /**
     * Open the "file picker" to select a file and maybe uploading it.
     *
     * @param maxSize Max size of the file. If not defined or -1, no max size.
     * @param allowOffline True to allow selecting in offline, false to require connection.
     * @param title File picker title.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @param upload Whether the file should be uploaded.
     * @returns Promise resolved when a file is selected/uploaded, rejected if file picker is closed.
     */
    protected async selectFileWithPicker(
        maxSize?: number,
        allowOffline?: boolean,
        title?: string,
        mimetypes?: string[],
        upload?: boolean,
    ): Promise<CoreWSUploadFileResult | FileEntry> {
        // Create the cancel button and get the handlers to upload the file.
        const buttons: ActionSheetButton[] = [{
            text: Translate.instant('core.cancel'),
            role: 'cancel',
            handler: (): void => {
                // User cancelled the action sheet.
                this.filePickerClosed();
            },
        }];
        const handlers = CoreFileUploaderDelegate.getHandlers(mimetypes);

        this.filePickerDeferred = new CorePromisedValue();

        // Create a button for each handler.
        handlers.forEach((handler) => {
            buttons.push({
                text: Translate.instant(handler.title),
                icon: handler.icon,
                cssClass: handler.class,
                handler: async (): Promise<boolean> => {
                    if (!handler.action) {
                        // Nothing to do.
                        return false;
                    }

                    if (!allowOffline && !CoreNetwork.isOnline()) {
                        // Not allowed, show error.
                        CoreDomUtils.showErrorModal('core.fileuploader.errormustbeonlinetoupload', true);

                        return false;
                    }

                    try {
                        const data = await handler.action(maxSize, upload, allowOffline, handler.mimetypes);

                        let result: CoreWSUploadFileResult | FileEntry | undefined;

                        if (data.treated) {
                            // The handler already treated the file. Return the result.
                            result = data.result;
                        } else if (data.fileEntry) {
                            // The handler provided us a fileEntry, use it.
                            result = await this.uploadFileEntry(data.fileEntry, !!data.delete, maxSize, upload, allowOffline);
                        } else if (data.path) {
                            let fileEntry: FileEntry;

                            try {
                                // The handler provided a path. First treat it like it's a relative path.
                                fileEntry = await CoreFile.getFile(data.path);
                            } catch (error) {
                                // File not found, it's probably an absolute path.
                                fileEntry = await CoreFile.getExternalFile(data.path);
                            }

                            // File found, treat it.
                            result = await this.uploadFileEntry(fileEntry, !!data.delete, maxSize, upload, allowOffline);
                        }

                        if (!result) {
                            // Nothing received, fail.
                            throw new CoreError('No file received');
                        }

                        this.fileUploaded(result);

                        return true;
                    } catch (error) {
                        CoreDomUtils.showErrorModalDefault(
                            error,
                            Translate.instant('core.fileuploader.errorreadingfile'),
                        );

                        return false;
                    }
                },
            });
        });

        this.actionSheet = await ActionSheetController.create({
            header: title ? title : Translate.instant('core.fileuploader.' + (upload ? 'uploadafile' : 'selectafile')),
            buttons: buttons,
        });
        await this.actionSheet.present();

        // Call afterRender for each button.
        setTimeout(() => {
            handlers.forEach((handler) => {
                if (handler.afterRender) {
                    handler.afterRender(maxSize, upload, allowOffline, handler.mimetypes);
                }
            });
        }, 500);

        return this.filePickerDeferred;
    }

    /**
     * Convenience function to upload a file on a certain site, showing a confirm if needed.
     *
     * @param fileEntry FileEntry of the file to upload.
     * @param deleteAfterUpload Whether the file should be deleted after upload.
     * @param siteId Id of the site to upload the file to. If not defined, use current site.
     * @returns Promise resolved when the file is uploaded.
     */
    async showConfirmAndUploadInSite(fileEntry: FileEntry, deleteAfterUpload?: boolean, siteId?: string): Promise<void> {
        try {
            const file = await CoreFile.getFileObjectFromFileEntry(fileEntry);

            await this.confirmUploadFile(file.size);

            await this.uploadGenericFile(CoreFile.getFileEntryURL(fileEntry), file.name, file.type, deleteAfterUpload, siteId);

            CoreToasts.show({
                message: 'core.fileuploader.fileuploaded',
                translateMessage: true,
                cssClass: 'core-toast-success',
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.fileuploader.errorreadingfile', true);

            throw error;
        }
    }

    /**
     * Treat a capture audio/video error.
     *
     * @param error Error returned by the Cordova plugin.
     * @param defaultMessage Key of the default message to show.
     */
    protected treatCaptureError(error: CoreCaptureError, defaultMessage: string): void {
        // Cancelled or error. If cancelled, error is an object with code = CAPTURE_EROR_NO_MEDIA_FILES.
        if (error) {
            if (error.code !== CAPTURE_ERROR_NO_MEDIA_FILES) {
                // Error, not cancelled.
                this.logger.error('Error while recording audio/video', error);

                const message = this.isNoAppError(error) ? Translate.instant('core.fileuploader.errornoapp') :
                    (error.message || Translate.instant(defaultMessage));

                throw new CoreError(message);
            } else {
                throw new CoreCanceledError();
            }
        }

        throw new CoreError('Error capturing media');
    }

    /**
     * Check if a capture error is because there is no app to capture.
     *
     * @param error Error.
     * @returns Whether it's because there is no app.
     */
    protected isNoAppError(error: CoreCaptureError): boolean {
        return error && error.code == 20;
    }

    /**
     * Treat a capture image or browse album error.
     *
     * @param error Error returned by the Cordova plugin.
     * @param defaultMessage Key of the default message to show.
     * @returns Rejected promise. If it doesn't have an error message it means it was cancelled.
     */
    protected treatImageError(error: number | string | CoreError | CoreCaptureError, defaultMessage: string): CoreError {
        // Cancelled or error.
        if (!error || typeof error == 'number') {
            return new CoreError(defaultMessage);
        }

        if (typeof error == 'string') {
            if (error.toLowerCase().indexOf('no image selected') > -1) {
                // User cancelled.
                return new CoreCanceledError();
            }

            return new CoreError(error);
        } else if ('code' in error && error.code === CAPTURE_ERROR_NO_MEDIA_FILES) {
            throw new CoreCanceledError();
        } else {
            throw error;
        }

    }

    /**
     * Convenient helper for the user to record and upload a video.
     *
     * @param isAudio True if uploading an audio, false if it's a video.
     * @param maxSize Max size of the upload. -1 for no max size.
     * @param upload True if the file should be uploaded, false to return the picked file.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved when done.
     */
    async uploadAudioOrVideo(
        isAudio: boolean,
        maxSize?: number,
        upload?: boolean,
        mimetypes?: string[],
    ): Promise<CoreWSUploadFileResult | FileEntry> {
        this.logger.debug('Trying to record a ' + (isAudio ? 'audio' : 'video') + ' file');

        let media: MediaFile | CoreFileUploaderAudioRecording;

        try {
            const medias = isAudio
                ? await CoreFileUploader.captureAudio()
                : await CoreFileUploader.captureVideo({ limit: 1 });

            media = medias[0]; // We used limit 1, we only want 1 media.
        } catch (error) {
            const defaultError = isAudio ? 'core.fileuploader.errorcapturingaudio' : 'core.fileuploader.errorcapturingvideo';

            throw this.treatCaptureError(error, defaultError); // Throw the right error.
        }

        let path = media.fullPath;
        const error = CoreFileUploader.isInvalidMimetype(mimetypes, media.fullPath);

        if (error) {
            throw new Error(error);
        }

        // Make sure the path has the protocol. In iOS it doesn't.
        if (CorePlatform.isMobile() && path.indexOf('file://') == -1) {
            path = 'file://' + path;
        }

        const options = CoreFileUploader.getMediaUploadOptions(media);

        if (upload) {
            return this.uploadFile(path, maxSize || -1, true, options);
        } else {
            // Copy or move the file to our temporary folder.
            return this.copyToTmpFolder(path, true, maxSize, undefined, options);
        }
    }

    /**
     * Uploads a file of any type.
     * This function will not check the size of the file, please check it before calling this function.
     *
     * @param uri File URI.
     * @param name File name.
     * @param type File type.
     * @param deleteAfterUpload Whether the file should be deleted after upload.
     * @param siteId Id of the site to upload the file to. If not defined, use current site.
     * @returns Promise resolved when the file is uploaded.
     */
    uploadGenericFile(
        uri: string,
        name: string,
        type: string,
        deleteAfterUpload?: boolean,
        siteId?: string,
    ): Promise<CoreWSUploadFileResult> {
        const options = CoreFileUploader.getFileUploadOptions(uri, name, type, deleteAfterUpload);

        return this.uploadFile(uri, -1, false, options, siteId);
    }

    /**
     * Convenient helper for the user to upload an image, either from the album or taking it with the camera.
     *
     * @param fromAlbum True if the image should be selected from album, false if it should be taken with camera.
     * @param maxSize Max size of the upload. -1 for no max size.
     * @param upload True if the file should be uploaded, false to return the picked file.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns Promise resolved when done.
     */
    async uploadImage(
        fromAlbum: boolean,
        maxSize?: number,
        upload?: boolean,
        mimetypes?: string[],
    ): Promise<CoreWSUploadFileResult | FileEntry> {
        this.logger.debug('Trying to capture an image with camera');

        const options: CameraOptions = {
            quality: 50,
            destinationType: Camera.DestinationType.FILE_URI,
            correctOrientation: true,
        };

        if (fromAlbum) {
            const imageSupported = !mimetypes || CoreArray.indexOfRegexp(mimetypes, /^image\//) > -1;
            const videoSupported = !mimetypes || CoreArray.indexOfRegexp(mimetypes, /^video\//) > -1;

            options.sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
            options.popoverOptions = {
                x: 10,
                y: 10,
                width: CorePlatform.width() - 200,
                height: CorePlatform.height() - 200,
                arrowDir: Camera.PopoverArrowDirection.ARROW_ANY,
            };

            // Determine the mediaType based on the mimetypes.
            if (imageSupported && !videoSupported) {
                options.mediaType = Camera.MediaType.PICTURE;
            } else if (!imageSupported && videoSupported) {
                options.mediaType = Camera.MediaType.VIDEO;
            } else if (CorePlatform.isIOS()) {
                // Only get all media in iOS because in Android using this option allows uploading any kind of file.
                options.mediaType = Camera.MediaType.ALLMEDIA;
            }
        } else if (mimetypes) {
            if (mimetypes.indexOf('image/jpeg') > -1) {
                options.encodingType = Camera.EncodingType.JPEG;
            } else if (mimetypes.indexOf('image/png') > -1) {
                options.encodingType = Camera.EncodingType.PNG;
            }
        }

        let path: string | undefined;

        try {
            path = await CoreFileUploader.getPicture(options);
        } catch (error) {
            const defaultError = fromAlbum ? 'core.fileuploader.errorgettingimagealbum' : 'core.fileuploader.errorcapturingimage';

            throw this.treatImageError(error, Translate.instant(defaultError));
        }

        const error = CoreFileUploader.isInvalidMimetype(mimetypes, path); // Verify that the mimetype is supported.
        if (error) {
            throw new CoreError(error);
        }

        const uploadOptions = CoreFileUploader.getCameraUploadOptions(path, fromAlbum);

        if (upload) {
            return this.uploadFile(path, maxSize || -1, true, uploadOptions);
        } else {
            // Copy or move the file to our temporary folder.
            return this.copyToTmpFolder(path, !fromAlbum, maxSize, 'jpg', uploadOptions);
        }
    }

    /**
     * Upload a file given the file entry.
     *
     * @param fileEntry The file entry.
     * @param deleteAfter True if the file should be deleted once treated.
     * @param maxSize Max size of the file. If not defined or -1, no max size.
     * @param upload True if the file should be uploaded, false to return the picked file.
     * @param allowOffline True to allow selecting in offline, false to require connection.
     * @param name Name to use when uploading the file. If not defined, use the file's name.
     * @returns Promise resolved when done.
     */
    async uploadFileEntry(
        fileEntry: FileEntry,
        deleteAfter: boolean,
        maxSize?: number,
        upload?: boolean,
        allowOffline?: boolean,
        name?: string,
    ): Promise<CoreWSUploadFileResult | FileEntry> {
        const file = await CoreFile.getFileObjectFromFileEntry(fileEntry);

        const result = await this.uploadFileObject(file, maxSize, upload, allowOffline, name);

        if (deleteAfter) {
            // We have uploaded and deleted a copy of the file. Now delete the original one.
            CoreFile.removeFileByFileEntry(fileEntry);
        }

        return result;
    }

    /**
     * Upload a file given the file object.
     *
     * @param file The file object.
     * @param maxSize Max size of the file. If not defined or -1, no max size.
     * @param upload True if the file should be uploaded, false to return the picked file.
     * @param allowOffline True to allow selecting in offline, false to require connection.
     * @param name Name to use when uploading the file. If not defined, use the file's name.
     * @returns Promise resolved when done.
     */
    async uploadFileObject(
        file: IFile | File,
        maxSize?: number,
        upload?: boolean,
        allowOffline?: boolean,
        name?: string,
    ): Promise<CoreWSUploadFileResult | FileEntry> {
        if (maxSize === 0) {
            const siteInfo = CoreSites.getCurrentSite()?.getInfo();

            if (siteInfo && siteInfo.usermaxuploadfilesize) {
                maxSize = siteInfo.usermaxuploadfilesize;
            }
        }

        if (maxSize !== undefined && maxSize != -1 && file.size > maxSize) {
            throw this.createMaxBytesError(maxSize, file.name);
        }

        if (upload) {
            await this.confirmUploadFile(file.size, false, allowOffline);
        }

        // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
        return this.copyAndUploadFile(file, upload, name);
    }

    /**
     * Convenience function to upload a file, allowing to retry if it fails.
     *
     * @param path Absolute path of the file to upload.
     * @param maxSize Max size of the upload. -1 for no max size.
     * @param checkSize True to check size.
     * @param options Options.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if the file is uploaded, rejected otherwise.
     */
    async uploadFile(
        path: string,
        maxSize: number,
        checkSize: boolean,
        options: CoreFileUploaderOptions,
        siteId?: string,
    ): Promise<CoreWSUploadFileResult> {
        const errorStr = Translate.instant('core.error');
        const retryStr = Translate.instant('core.retry');
        const uploadingStr = Translate.instant('core.fileuploader.uploading');
        const errorUploading = async (error): Promise<CoreWSUploadFileResult> => {
            // Allow the user to retry.
            try {
                await CoreDomUtils.showConfirm(error, errorStr, retryStr);
            } catch (error) {
                // User cancelled. Delete the file if needed.
                if (options.deleteAfterUpload) {
                    CoreFile.removeExternalFile(path);
                }

                throw new CoreCanceledError();
            }

            // Try again.
            return this.uploadFile(path, maxSize, checkSize, options, siteId);
        };

        if (!CoreNetwork.isOnline()) {
            return errorUploading(Translate.instant('core.fileuploader.errormustbeonlinetoupload'));
        }

        let file: IFile | undefined;
        let size = 0;

        if (checkSize) {
            try {
                // Check that file size is the right one.
                const fileEntry = await CoreFile.getExternalFile(path);

                file = await CoreFile.getFileObjectFromFileEntry(fileEntry);

                size = file.size;
            } catch {
                // Ignore failures.
            }
        }

        if (maxSize != -1 && size > maxSize && file) {
            throw this.createMaxBytesError(maxSize, file.name);
        }

        if (size > 0) {
            await this.confirmUploadFile(size);
        }

        // File isn't too large and user confirmed, let's upload.
        const modal = await CoreLoadings.show(uploadingStr);

        try {
            return await CoreFileUploader.uploadFile(
                path,
                options,
                (progress: ProgressEvent) => {
                    this.showProgressModal(modal, 'core.fileuploader.uploadingperc', progress);
                },
                siteId,
            );
        } catch (error) {
            this.logger.error('Error uploading file.', error);

            modal.dismiss();

            return errorUploading(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Show a progress modal.
     *
     * @param modal The modal where to show the progress.
     * @param stringKey The key of the string to display.
     * @param progress The progress event.
     */
    protected showProgressModal(
        modal: CoreIonLoadingElement,
        stringKey: string,
        progress: ProgressEvent | CoreFileProgressEvent,
    ): void {
        if (!progress || !progress.lengthComputable || progress.loaded === undefined || !progress.total) {
            return;
        }

        // Calculate the progress percentage.
        const perc = Math.min((progress.loaded / progress.total) * 100, 100);

        if (isNaN(perc) || perc < 0) {
            return;
        }

        modal.updateText(Translate.instant(stringKey, { $a: perc.toFixed(1) }));
    }

}

export const CoreFileUploaderHelper = makeSingleton(CoreFileUploaderHelperProvider);
