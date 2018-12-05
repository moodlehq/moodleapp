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
import { ActionSheetController, ActionSheet, Platform, Loading } from 'ionic-angular';
import { MediaFile } from '@ionic-native/media-capture';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider, CoreFileProgressEvent } from '@providers/file';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUtilsProvider, PromiseDefer } from '@providers/utils/utils';
import { CoreFileUploaderProvider, CoreFileUploaderOptions } from './fileuploader';
import { CoreFileUploaderDelegate } from './delegate';

/**
 * Helper service to upload files.
 */
@Injectable()
export class CoreFileUploaderHelperProvider {

    protected logger;
    protected filePickerDeferred: PromiseDefer;
    protected actionSheet: ActionSheet;

    constructor(logger: CoreLoggerProvider, private appProvider: CoreAppProvider, private translate: TranslateService,
            private fileUploaderProvider: CoreFileUploaderProvider, private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider, private fileProvider: CoreFileProvider, private utils: CoreUtilsProvider,
            private actionSheetCtrl: ActionSheetController, private uploaderDelegate: CoreFileUploaderDelegate,
            private camera: Camera, private platform: Platform) {
        this.logger = logger.getInstance('CoreFileUploaderProvider');
    }

    /**
     * Show a confirmation modal to the user if the size of the file is bigger than the allowed threshold.
     *
     * @param {number} size File size.
     * @param {boolean} [alwaysConfirm] True to show a confirm even if the size isn't high.
     * @param {boolean} [allowOffline] True to allow uploading in offline.
     * @param {number} [wifiThreshold] Threshold for WiFi connection. Default: CoreFileUploaderProvider.WIFI_SIZE_WARNING.
     * @param {number} [limitedThreshold] Threshold for limited connection. Default: CoreFileUploaderProvider.LIMITED_SIZE_WARNING.
     * @return {Promise<void>} Promise resolved when the user confirms or if there's no need to show a modal.
     */
    confirmUploadFile(size: number, alwaysConfirm?: boolean, allowOffline?: boolean, wifiThreshold?: number,
            limitedThreshold?: number): Promise<void> {
        if (size == 0) {
            return Promise.resolve();
        }

        if (!allowOffline && !this.appProvider.isOnline()) {
            return Promise.reject(this.translate.instant('core.fileuploader.errormustbeonlinetoupload'));
        }

        wifiThreshold = typeof wifiThreshold == 'undefined' ? CoreFileUploaderProvider.WIFI_SIZE_WARNING : wifiThreshold;
        limitedThreshold = typeof limitedThreshold == 'undefined' ?
            CoreFileUploaderProvider.LIMITED_SIZE_WARNING : limitedThreshold;

        if (size < 0) {
            return this.domUtils.showConfirm(this.translate.instant('core.fileuploader.confirmuploadunknownsize'));
        } else if (size >= wifiThreshold || (this.appProvider.isNetworkAccessLimited() && size >= limitedThreshold)) {
            const readableSize = this.textUtils.bytesToSize(size, 2);

            return this.domUtils.showConfirm(this.translate.instant('core.fileuploader.confirmuploadfile', { size: readableSize }));
        } else if (alwaysConfirm) {
            return this.domUtils.showConfirm(this.translate.instant('core.areyousure'));
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Create a temporary copy of a file and upload it.
     *
     * @param {any} file File to copy and upload.
     * @param {boolean} [upload] True if the file should be uploaded, false to return the copy of the file.
     * @param {string} [name] Name to use when uploading the file. If not defined, use the file's name.
     * @return {Promise<any>} Promise resolved when the file is uploaded.
     */
    copyAndUploadFile(file: any, upload?: boolean, name?: string): Promise<any> {
        name = name || file.name;

        const modal = this.domUtils.showModalLoading('core.fileuploader.readingfile', true);

        // Get unique name for the copy.
        return this.fileProvider.getUniqueNameInFolder(CoreFileProvider.TMPFOLDER, name).then((newName) => {
            const filePath = this.textUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, newName);

            // Write the data into the file.
            return this.fileProvider.writeFileDataInFile(file, filePath, (progress: CoreFileProgressEvent) => {
                this.showProgressModal(modal, 'core.fileuploader.readingfileperc', progress);
            });
        }).catch((error) => {
            this.logger.error('Error reading file to upload.', error);
            modal.dismiss();

            return Promise.reject(this.translate.instant('core.fileuploader.errorreadingfile'));
        }).then((fileEntry) => {
            modal.dismiss();

            if (upload) {
                // Pass true to delete the copy after the upload.
                return this.uploadGenericFile(fileEntry.toURL(), name, file.type, true);
            } else {
                return fileEntry;
            }
        });
    }

    /**
     * Copy or move a file to the app temporary folder.
     *
     * @param {string} path  Path of the file.
     * @param {boolean} shouldDelete True if original file should be deleted (move), false otherwise (copy).
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {string} [defaultExt] Defaut extension to use if the file doesn't have any.
     * @return {Promise<any>} Promise resolved with the copied file.
     */
    protected copyToTmpFolder(path: string, shouldDelete: boolean, maxSize?: number, defaultExt?: string): Promise<any> {
        let fileName = this.fileProvider.getFileAndDirectoryFromPath(path).name,
            promise,
            fileTooLarge;

        // Check that size isn't too large.
        if (typeof maxSize != 'undefined' && maxSize != -1) {
            promise = this.fileProvider.getExternalFile(path).then((fileEntry) => {
                return this.fileProvider.getFileObjectFromFileEntry(fileEntry).then((file) => {
                    if (file.size > maxSize) {
                        fileTooLarge = file;
                    }
                });
            }).catch(() => {
                // Ignore failures.
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            if (fileTooLarge) {
                return this.errorMaxBytes(maxSize, fileTooLarge.name);
            }

            // File isn't too large.
            // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
            fileName = fileName.replace(/(\.[^\.]*)\?[^\.]*$/, '$1');

            // Get a unique name in the folder to prevent overriding another file.
            return this.fileProvider.getUniqueNameInFolder(CoreFileProvider.TMPFOLDER, fileName, defaultExt);
        }).then((newName) => {
            // Now move or copy the file.
            const destPath = this.textUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, newName);
            if (shouldDelete) {
                return this.fileProvider.moveExternalFile(path, destPath);
            } else {
                return this.fileProvider.copyExternalFile(path, destPath);
            }
        });
    }

    /**
     * Function called when trying to upload a file bigger than max size. Shows an error.
     *
     * @param {number} maxSize Max size (bytes).
     * @param {string} fileName Name of the file.
     * @return {Promise<any>} Rejected promise.
     */
    protected errorMaxBytes(maxSize: number, fileName: string): Promise<any> {
        const errorMessage = this.translate.instant('core.fileuploader.maxbytesfile', {
            $a: {
                file: fileName,
                size: this.textUtils.bytesToSize(maxSize, 2)
            }
        });

        this.domUtils.showErrorModal(errorMessage);

        return Promise.reject(null);
    }

    /**
     * Function called when the file picker is closed.
     */
    filePickerClosed(): void {
        if (this.filePickerDeferred) {
            this.filePickerDeferred.reject(this.domUtils.createCanceledError());
            this.filePickerDeferred = undefined;
        }
    }

    /**
     * Function to call once a file is uploaded using the file picker.
     *
     * @param {any} result Result of the upload process.
     */
    fileUploaded(result: any): void {
        if (this.filePickerDeferred) {
            this.filePickerDeferred.resolve(result);
            this.filePickerDeferred = undefined;
        }
        // Close the action sheet if it's opened.
        if (this.actionSheet) {
            this.actionSheet.dismiss();
        }
    }

    /**
     * Open the "file picker" to select and upload a file.
     *
     * @param {number} [maxSize] Max size of the file to upload. If not defined or -1, no max size.
     * @param {string} [title] File picker title.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<any>} Promise resolved when a file is uploaded, rejected if file picker is closed without a file uploaded.
     *                        The resolve value is the response of the upload request.
     */
    selectAndUploadFile(maxSize?: number, title?: string, mimetypes?: string[]): Promise<any> {
        return this.selectFileWithPicker(maxSize, false, title, mimetypes, true);
    }

    /**
     * Open the "file picker" to select a file without uploading it.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string} [title] File picker title.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<any>} Promise resolved when a file is selected, rejected if file picker is closed without selecting a file.
     *                        The resolve value is the FileEntry of a copy of the picked file, so it can be deleted afterwards.
     */
    selectFile(maxSize?: number, allowOffline?: boolean, title?: string, mimetypes?: string[])
            : Promise<any> {
        return this.selectFileWithPicker(maxSize, allowOffline, title, mimetypes, false);
    }

    /**
     * Open the "file picker" to select a file and maybe uploading it.
     *
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string} [title] File picker title.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @param {boolean} [upload] Whether the file should be uploaded.
     * @return {Promise<any>} Promise resolved when a file is selected/uploaded, rejected if file picker is closed.
     */
    protected selectFileWithPicker(maxSize?: number, allowOffline?: boolean, title?: string, mimetypes?: string[],
            upload?: boolean): Promise<any> {
        // Create the cancel button and get the handlers to upload the file.
        const buttons: any[] = [{
                text: this.translate.instant('core.cancel'),
                role: 'cancel',
                handler: (): void => {
                    // User cancelled the action sheet.
                    this.filePickerClosed();
                }
            }],
            handlers = this.uploaderDelegate.getHandlers(mimetypes);

        this.filePickerDeferred = this.utils.promiseDefer();

        // Sort the handlers by priority.
        handlers.sort((a, b) => {
            return a.priority <= b.priority ? 1 : -1;
        });

        // Create a button for each handler.
        handlers.forEach((handler) => {
            buttons.push({
                text: this.translate.instant(handler.title),
                icon: handler.icon,
                cssClass: handler.class,
                handler: (): boolean => {
                    if (!handler.action) {
                        // Nothing to do.
                        return false;
                    }

                    if (!allowOffline && !this.appProvider.isOnline()) {
                        // Not allowed, show error.
                        this.domUtils.showErrorModal('core.fileuploader.errormustbeonlinetoupload', true);

                        return false;
                    }

                    handler.action(maxSize, upload, allowOffline, handler.mimetypes).then((data) => {
                        if (data.treated) {
                            // The handler already treated the file. Return the result.
                            return data.result;
                        } else {
                            // The handler didn't treat the file, we need to do it.
                            if (data.fileEntry) {
                                // The handler provided us a fileEntry, use it.
                                return this.uploadFileEntry(data.fileEntry, data.delete, maxSize, upload, allowOffline);
                            } else if (data.path) {
                                // The handler provided a path. First treat it like it's a relative path.
                                return this.fileProvider.getFile(data.path).catch(() => {
                                    // File not found, it's probably an absolute path.
                                    return this.fileProvider.getExternalFile(data.path);
                                }).then((fileEntry) => {
                                    // File found, treat it.
                                    return this.uploadFileEntry(fileEntry, data.delete, maxSize, upload, allowOffline);
                                });
                            }

                            // Nothing received, fail.
                            return Promise.reject('No file received');
                        }
                    }).then((result) => {
                        // Success uploading or picking, return the result.
                        this.fileUploaded(result);
                    }).catch((error) => {
                        if (error) {
                            this.domUtils.showErrorModal(error);
                        }
                    });

                    // Do not close the action sheet, it will be closed if success.
                    return false;
                }
            });
        });

        this.actionSheet = this.actionSheetCtrl.create({
            title: title ? title : this.translate.instant('core.fileuploader.' + (upload ? 'uploadafile' : 'selectafile')),
            buttons: buttons
        });
        this.actionSheet.present();

        // Call afterRender for each button.
        setTimeout(() => {
            handlers.forEach((handler) => {
                if (handler.afterRender) {
                    handler.afterRender(maxSize, upload, allowOffline, handler.mimetypes);
                }
            });
        }, 500);

        return this.filePickerDeferred.promise;
    }

    /**
     * Convenience function to upload a file on a certain site, showing a confirm if needed.
     *
     * @param {any} fileEntry FileEntry of the file to upload.
     * @param {boolean} [deleteAfterUpload] Whether the file should be deleted after upload.
     * @param {string} [siteId] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the file is uploaded.
     */
    showConfirmAndUploadInSite(fileEntry: any, deleteAfterUpload?: boolean, siteId?: string): Promise<void> {
        return this.fileProvider.getFileObjectFromFileEntry(fileEntry).then((file) => {
            return this.confirmUploadFile(file.size).then(() => {
                return this.uploadGenericFile(fileEntry.toURL(), file.name, file.type, deleteAfterUpload, siteId).then(() => {
                    this.domUtils.showToast('core.fileuploader.fileuploaded', true, undefined, 'core-toast-success');
                });
            }).catch((err) => {
                if (err) {
                    this.domUtils.showErrorModal(err);
                }

                return Promise.reject(null);
            });
        }, () => {
            this.domUtils.showErrorModal('core.fileuploader.errorreadingfile', true);

            return Promise.reject(null);
        });
    }

    /**
     * Treat a capture audio/video error.
     *
     * @param {any} error Error returned by the Cordova plugin. Can be a string or an object.
     * @param {string} defaultMessage Key of the default message to show.
     * @return {Promise<any>} Rejected promise. If it doesn't have an error message it means it was cancelled.
     */
    protected treatCaptureError(error: any, defaultMessage: string): Promise<any> {
        // Cancelled or error. If cancelled, error is an object with code = 3.
        if (error) {
            if (typeof error === 'string') {
                this.logger.error('Error while recording audio/video: ' + error);
                if (error.indexOf('No Activity found') > -1) {
                    // User doesn't have an app to do this.
                    return Promise.reject(this.translate.instant('core.fileuploader.errornoapp'));
                } else {
                    return Promise.reject(this.translate.instant(defaultMessage));
                }
            } else {
                if (error.code != 3) {
                    // Error, not cancelled.
                    this.logger.error('Error while recording audio/video', error);

                    return Promise.reject(this.translate.instant(defaultMessage));
                } else {
                    this.logger.debug('Cancelled');
                }
            }
        }

        return Promise.reject(null);
    }

    /**
     * Treat a capture image or browse album error.
     *
     * @param {string} error Error returned by the Cordova plugin.
     * @param {string} defaultMessage Key of the default message to show.
     * @return {Promise<any>} Rejected promise. If it doesn't have an error message it means it was cancelled.
     */
    protected treatImageError(error: string, defaultMessage: string): Promise<any> {
        // Cancelled or error.
        if (error) {
            if (typeof error == 'string') {
                if (error.toLowerCase().indexOf('error') > -1 || error.toLowerCase().indexOf('unable') > -1) {
                    this.logger.error('Error getting image: ' + error);

                    return Promise.reject(error);
                } else {
                    // User cancelled.
                    this.logger.debug('Cancelled');
                }
            } else {
                return Promise.reject(this.translate.instant(defaultMessage));
            }
        }

        return Promise.reject(null);
    }

    /**
     * Convenient helper for the user to record and upload a video.
     *
     * @param {boolean} isAudio True if uploading an audio, false if it's a video.
     * @param {number} maxSize Max size of the upload. -1 for no max size.
     * @param {boolean} [upload] True if the file should be uploaded, false to return the picked file.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<any>} Promise resolved when done.
     */
    uploadAudioOrVideo(isAudio: boolean, maxSize: number, upload?: boolean, mimetypes?: string[]): Promise<any> {
        this.logger.debug('Trying to record a ' + (isAudio ? 'audio' : 'video') + ' file');

        const options = { limit: 1, mimetypes: mimetypes },
            promise = isAudio ? this.fileUploaderProvider.captureAudio(options) : this.fileUploaderProvider.captureVideo(options);

        // The mimetypes param is only for desktop apps, the Cordova plugin doesn't support it.
        return promise.then((medias) => {
            // We used limit 1, we only want 1 media.
            const media: MediaFile = medias[0];
            let path = media.fullPath;
            const error = this.fileUploaderProvider.isInvalidMimetype(mimetypes, path); // Verify that the mimetype is supported.

            if (error) {
                return Promise.reject(error);
            }

            // Make sure the path has the protocol. In iOS it doesn't.
            if (this.appProvider.isMobile() && path.indexOf('file://') == -1) {
                path = 'file://' + path;
            }

            if (upload) {
                return this.uploadFile(path, maxSize, true, this.fileUploaderProvider.getMediaUploadOptions(media));
            } else {
                // Copy or move the file to our temporary folder.
                return this.copyToTmpFolder(path, true, maxSize);
            }
        }, (error) => {
            const defaultError = isAudio ? 'core.fileuploader.errorcapturingaudio' : 'core.fileuploader.errorcapturingvideo';

            return this.treatCaptureError(error, defaultError);
        });
    }

    /**
     * Uploads a file of any type.
     * This function will not check the size of the file, please check it before calling this function.
     *
     * @param {string} uri File URI.
     * @param {string} name File name.
     * @param {string} type File type.
     * @param {boolean} [deleteAfterUpload] Whether the file should be deleted after upload.
     * @param {string} [siteId] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the file is uploaded.
     */
    uploadGenericFile(uri: string, name: string, type: string, deleteAfterUpload?: boolean, siteId?: string): Promise<any> {
        const options = this.fileUploaderProvider.getFileUploadOptions(uri, name, type, deleteAfterUpload);

        return this.uploadFile(uri, -1, false, options, siteId);
    }

    /**
     * Convenient helper for the user to upload an image, either from the album or taking it with the camera.
     *
     * @param {boolean} fromAlbum True if the image should be selected from album, false if it should be taken with camera.
     * @param {number} maxSize Max size of the upload. -1 for no max size.
     * @param {boolean} [upload] True if the file should be uploaded, false to return the picked file.
     * @param {string[]} [mimetypes] List of supported mimetypes. If undefined, all mimetypes supported.
     * @return {Promise<any>} Promise resolved when done.
     */
    uploadImage(fromAlbum: boolean, maxSize: number, upload?: boolean, mimetypes?: string[]): Promise<any> {
        this.logger.debug('Trying to capture an image with camera');

        const options: CameraOptions = {
            quality: 50,
            destinationType: this.camera.DestinationType.FILE_URI,
            correctOrientation: true
        };

        if (fromAlbum) {
            const imageSupported = !mimetypes || this.utils.indexOfRegexp(mimetypes, /^image\//) > -1,
                videoSupported = !mimetypes || this.utils.indexOfRegexp(mimetypes, /^video\//) > -1;

            options.sourceType = this.camera.PictureSourceType.PHOTOLIBRARY;
            options.popoverOptions = {
                x: 10,
                y: 10,
                width: this.platform.width() - 200,
                height: this.platform.height() - 200,
                arrowDir: this.camera.PopoverArrowDirection.ARROW_ANY
            };

            // Determine the mediaType based on the mimetypes.
            if (imageSupported && !videoSupported) {
                options.mediaType = this.camera.MediaType.PICTURE;
            } else if (!imageSupported && videoSupported) {
                options.mediaType = this.camera.MediaType.VIDEO;
            } else if (this.platform.is('ios')) {
                // Only get all media in iOS because in Android using this option allows uploading any kind of file.
                options.mediaType = this.camera.MediaType.ALLMEDIA;
            }
        } else if (mimetypes) {
            if (mimetypes.indexOf('image/jpeg') > -1) {
                options.encodingType = this.camera.EncodingType.JPEG;
            } else if (mimetypes.indexOf('image/png') > -1) {
                options.encodingType = this.camera.EncodingType.PNG;
            }
        }

        return this.fileUploaderProvider.getPicture(options).then((path) => {
            const error = this.fileUploaderProvider.isInvalidMimetype(mimetypes, path); // Verify that the mimetype is supported.
            if (error) {
                return Promise.reject(error);
            }

            if (upload) {
                return this.uploadFile(path, maxSize, true, this.fileUploaderProvider.getCameraUploadOptions(path, fromAlbum));
            } else {
                // Copy or move the file to our temporary folder.
                return this.copyToTmpFolder(path, !fromAlbum, maxSize, 'jpg');
            }
        }, (error) => {
            const defaultError = fromAlbum ? 'core.fileuploader.errorgettingimagealbum' : 'core.fileuploader.errorcapturingimage';

            return this.treatImageError(error, defaultError);
        });
    }

    /**
     * Upload a file given the file entry.
     *
     * @param {any} fileEntry The file entry.
     * @param {boolean} deleteAfter True if the file should be deleted once treated.
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] True if the file should be uploaded, false to return the picked file.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string} [name] Name to use when uploading the file. If not defined, use the file's name.
     * @return {Promise<any>} Promise resolved when done.
     */
    uploadFileEntry(fileEntry: any, deleteAfter: boolean, maxSize?: number, upload?: boolean, allowOffline?: boolean,
            name?: string): Promise<any> {
        return this.fileProvider.getFileObjectFromFileEntry(fileEntry).then((file) => {
            return this.uploadFileObject(file, maxSize, upload, allowOffline, name).then((result) => {
                if (deleteAfter) {
                    // We have uploaded and deleted a copy of the file. Now delete the original one.
                    this.fileProvider.removeFileByFileEntry(fileEntry);
                }

                return result;
            });
        });
    }

    /**
     * Upload a file given the file object.
     *
     * @param {any} file The file object.
     * @param {number} [maxSize] Max size of the file. If not defined or -1, no max size.
     * @param {boolean} [upload] True if the file should be uploaded, false to return the picked file.
     * @param {boolean} [allowOffline] True to allow selecting in offline, false to require connection.
     * @param {string} [name] Name to use when uploading the file. If not defined, use the file's name.
     * @return {Promise<any>} Promise resolved when done.
     */
    uploadFileObject(file: any, maxSize?: number, upload?: boolean, allowOffline?: boolean, name?: string): Promise<any> {
        if (maxSize != -1 && file.size > maxSize) {
            return this.errorMaxBytes(maxSize, file.name);
        }

        return this.confirmUploadFile(file.size, false, allowOffline).then(() => {
            // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
            return this.copyAndUploadFile(file, upload, name);
        });
    }

    /**
     * Convenience function to upload a file, allowing to retry if it fails.
     *
     * @param {string} path Absolute path of the file to upload.
     * @param {number} maxSize Max size of the upload. -1 for no max size.
     * @param {boolean} checkSize True to check size.
     * @param {CoreFileUploaderOptions} Options.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if the file is uploaded, rejected otherwise.
     */
    protected uploadFile(path: string, maxSize: number, checkSize: boolean, options: CoreFileUploaderOptions, siteId?: string)
            : Promise<any> {

        const errorStr = this.translate.instant('core.error'),
            retryStr = this.translate.instant('core.retry'),
            uploadingStr = this.translate.instant('core.fileuploader.uploading'),
            errorUploading = (error): Promise<any> => {
                // Allow the user to retry.
                return this.domUtils.showConfirm(error, errorStr, retryStr).then(() => {
                    // Try again.
                    return this.uploadFile(path, maxSize, checkSize, options, siteId);
                }, () => {
                    // User cancelled. Delete the file if needed.
                    if (options.deleteAfterUpload) {
                        this.fileProvider.removeExternalFile(path);
                    }

                    return Promise.reject(null);
                });
            };

        let promise,
            file;

        if (!this.appProvider.isOnline()) {
            return errorUploading(this.translate.instant('core.fileuploader.errormustbeonlinetoupload'));
        }

        if (checkSize) {
            // Check that file size is the right one.
            promise = this.fileProvider.getExternalFile(path).then((fileEntry) => {
                return this.fileProvider.getFileObjectFromFileEntry(fileEntry).then((f) => {
                    file = f;

                    return file.size;
                });
            }).catch(() => {
                // Ignore failures.
            });
        } else {
            promise = Promise.resolve(0);
        }

        return promise.then((size) => {
            if (maxSize != -1 && size > maxSize) {
                return this.errorMaxBytes(maxSize, file.name);
            }

            if (size > 0) {
                return this.confirmUploadFile(size);
            }
        }).then(() => {
            // File isn't too large and user confirmed, let's upload.
            const modal = this.domUtils.showModalLoading(uploadingStr);

            return this.fileUploaderProvider.uploadFile(path, options, (progress: ProgressEvent) => {
                // Progress uploading.
                this.showProgressModal(modal, 'core.fileuploader.uploadingperc', progress);
            }, siteId).catch((error) => {
                this.logger.error('Error uploading file.', error);

                modal.dismiss();
                if (typeof error != 'string') {
                    error = this.translate.instant('core.fileuploader.errorwhileuploading');
                }

                return errorUploading(error);
            }).finally(() => {
                modal.dismiss();
            });
        });
    }

    /**
     * Show a progress modal.
     *
     * @param {Loading} modal The modal where to show the progress.
     * @param {string} stringKey The key of the string to display.
     * @param {ProgressEvent|CoreFileProgressEvent} progress The progress event.
     */
    protected showProgressModal(modal: Loading, stringKey: string, progress: ProgressEvent | CoreFileProgressEvent): void {
        if (progress && progress.lengthComputable) {
            // Calculate the progress percentage.
            const perc = Math.min((progress.loaded / progress.total) * 100, 100);

            if (perc >= 0) {
                modal.setContent(this.translate.instant(stringKey, { $a: perc.toFixed(1) }));

                if (modal._cmp && modal._cmp.changeDetectorRef) {
                    // Force a change detection, otherwise the content is not updated.
                    modal._cmp.changeDetectorRef.detectChanges();
                }
            }
        }
    }
}
