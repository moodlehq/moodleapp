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

angular.module('mm.core.fileuploader')

.constant('mmFileUploaderFileSizeWarning', 1048576) // 1 MB.
.constant('mmFileUploaderWifiFileSizeWarning', 10485760) // 10 MB.

.factory('$mmFileUploaderHelper', function($q, $mmUtil, $mmApp, $log, $translate, $window, $rootScope, $ionicActionSheet,
        $mmFileUploader, $cordovaCamera, $cordovaCapture, $mmLang, $mmFS, $mmText, $timeout, mmFileUploaderFileSizeWarning,
        mmFileUploaderWifiFileSizeWarning, $mmFileUploaderDelegate) {

    $log = $log.getInstance('$mmFileUploaderHelper');

    var self = {},
        filePickerDeferred,
        hideActionSheet;

    /**
     * Compares two file lists and returns if they are different.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileUploaderHelper#areFileListDifferent
     * @param  {Array} a First file list.
     * @param  {Array} b Second file list.
     * @return {Boolean}   If both lists are different.
     */
    self.areFileListDifferent = function(a, b) {
        a = a || [];
        b = b || [];
        if (a.length != b.length) {
            return true;
        }

        // Currently we are going to compare the order of the files as well.
        // This function can be improved comparing more fields or not comparing the order.
        for (var i = 0; i < a.length; i++) {
            if (a[i].name != b[i].name) {
                return true;
            }
        }

        return false;
    };

    /**
     * Clear temporary attachments to be uploaded.
     * Attachments already saved in an offline store will NOT be deleted.
     *
     * @module mm.core
     * @ngdoc method
     * @name $mmFileUploaderHelper#clearTmpFiles
     * @param  {Object[]} files List of current files.
     * @return {Void}
     */
    self.clearTmpFiles = function(files) {
        // Delete the local files from the tmp folder.
        files.forEach(function(file) {
            if (!file.offline && file.remove) {
                file.remove();
            }
        });
    };

    /**
     * Show a confirmation modal to the user if he is using a limited connection or the file size is higher than 5MB.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#confirmUploadFile
     * @param  {Number} size              File's size.
     * @param  {Boolean} alwaysConfirm    True to show a confirm even if the size isn't high, false otherwise.
     * @param  {Boolean} allowOffline     True to allow uploading in offline, false to require connection.
     * @param {Number} [wifiThreshold]    Threshold to show confirm in WiFi connection. Default: mmFileUploaderWifiFileSizeWarning.
     * @param {Number} [limitedThreshold] Threshold to show confirm in limited connection. Default: mmFileUploaderFileSizeWarning.
     * @return {Promise}                  Promise resolved when the user confirms or if there's no need to show a modal.
     */
    self.confirmUploadFile = function(size, alwaysConfirm, allowOffline, wifiThreshold, limitedThreshold) {
        if (size == 0) {
            return $q.when();
        }

        if (!allowOffline && !$mmApp.isOnline()) {
            return $mmLang.translateAndReject('mm.fileuploader.errormustbeonlinetoupload');
        }

        wifiThreshold = typeof wifiThreshold == 'undefined' ? mmFileUploaderWifiFileSizeWarning : wifiThreshold;
        limitedThreshold = typeof limitedThreshold == 'undefined' ? mmFileUploaderFileSizeWarning : limitedThreshold;

        if (size < 0) {
            return $mmUtil.showConfirm($translate('mm.fileuploader.confirmuploadunknownsize'));
        } else if (size >= wifiThreshold || ($mmApp.isNetworkAccessLimited() && size >= limitedThreshold)) {
            size = $mmText.bytesToSize(size, 2);
            return $mmUtil.showConfirm($translate('mm.fileuploader.confirmuploadfile', {size: size}));
        } else {
            if (alwaysConfirm) {
                return $mmUtil.showConfirm($translate('mm.core.areyousure'));
            } else {
                return $q.when();
            }
        }
    };

    /**
     * Create a temporary copy of a file and upload it.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#copyAndUploadFile
     * @param  {Object} file    File to copy and upload.
     * @param  {Boolean} upload True if the file should be uploaded, false to return the picked file.
     * @return {Promise}        Promise resolved when the file is uploaded.
     */
    self.copyAndUploadFile = function(file, upload) {
        var modal = $mmUtil.showModalLoading('mm.fileuploader.readingfile', true),
            fileData;

        // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
        return $mmFS.readFileData(file, $mmFS.FORMATARRAYBUFFER).then(function(data) {
            fileData = data;

            // Get unique name for the copy.
            return $mmFS.getUniqueNameInFolder($mmFS.getTmpFolder(), file.name);
        }).then(function(newName) {
            var filepath = $mmFS.concatenatePaths($mmFS.getTmpFolder(), newName);

            return $mmFS.writeFile(filepath, fileData);
        }).catch(function(error) {
            $log.error('Error reading file to upload: '+JSON.stringify(error));
            modal.dismiss();
            return $mmLang.translateAndReject('mm.fileuploader.errorreadingfile');
        }).then(function(fileEntry) {
            modal.dismiss();

            if (upload) {
                // Pass true to delete the copy after the upload.
                return self.uploadGenericFile(fileEntry.toURL(), file.name, file.type, true);
            } else {
                return fileEntry;
            }
        });
    };

    /**
     * Function to call when trying to upload a file bigger than max size. Shows error and returns rejected promise.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#errorMaxBytes
     * @param  {Number} maxSize  Max size (bytes).
     * @param  {String} fileName Name of the file.
     * @return {Promise}         Rejected promise.
     */
    self.errorMaxBytes = function(maxSize, fileName) {
        var error = $translate.instant('mm.fileuploader.maxbytesfile', {$a: {
            file: fileName,
            size: $mmText.bytesToSize(maxSize, 2)
        }});

        $mmUtil.showErrorModal(error);
        return $q.reject();
    };

    /**
     * Function called when the file picker is closed.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#filePickerClosed
     * @return {Void}
     */
    self.filePickerClosed = function() {
        if (filePickerDeferred) {
            filePickerDeferred.reject();
            filePickerDeferred = undefined;
        }
        // Close the action sheet if it's opened.
        if (hideActionSheet) {
            hideActionSheet();
        }
    };

    /**
     * Function to call once a file is uploaded using the file picker.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#fileUploaded
     * @param {Mixed} result Result of the upload process.
     * @return {Void}
     */
    self.fileUploaded = function(result) {
        if (filePickerDeferred) {
            filePickerDeferred.resolve(result);
            filePickerDeferred = undefined;
        }
        // Close the action sheet if it's opened.
        if (hideActionSheet) {
            hideActionSheet();
        }
    };

    /**
     * Get the files stored in a folder, marking them as offline.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#getStoredFiles
     * @param  {String} folderPath Folder where to get the files.
     * @return {Promise}           Promise resolved with the list of files.
     */
    self.getStoredFiles = function(folderPath) {
        return $mmFS.getDirectoryContents(folderPath).then(function(files) {
            return self.markOfflineFiles(files);
        });
    };

    /**
     * Mark files as offline.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#markOfflineFiles
     * @param  {Array} files     Files to mark as offline.
     * @return {Array}           Files marked as offline.
     */
    self.markOfflineFiles = function(files) {
        // Mark the files as pending offline.
        angular.forEach(files, function(file) {
            file.offline = true;
            file.filename = file.name;
        });
        return files;
    };

    /**
     * Open the view to select and upload a file.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#selectAndUploadFile
     * @param  {Number} [maxSize] Max size of the file to upload. If not defined or -1, no max size.
     * @param  {String} [title]   File picker page title
     * @param  {Array}  [filterMethods]   File picker available methods
     * @return {Promise} Promise resolved when a file is uploaded, rejected if file picker is closed without a file uploaded.
     *                   The resolve value should be the response of the upload request.
     */
    self.selectAndUploadFile = function(maxSize, title, filterMethods) {
        return selectFile(maxSize, false, title, filterMethods, true);
    };

    /**
     * Open the view to select a file without uploading it.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#selectFile
     * @param  {Number} [maxSize]     Max size of the file. If not defined or -1, no max size.
     * @param  {Boolean} allowOffline True to allow selecting in offline, false to require connection.
     * @param  {String} [title]   File picker page title
     * @param  {Array}  [filterMethods]   File picker available methods
     * @return {Promise} Promise resolved when a file is selected, rejected if file picker is closed without selecting a file.
     *                   The resolve value should be the FileEntry of a copy of the picked file, so it can be deleted afterwards.
     */
    self.selectFile = function(maxSize, allowOffline, title, filterMethods) {
        return selectFile(maxSize, allowOffline, title, filterMethods, false);
    };

    /**
     * Open the view to select a file and maybe uploading it.
     *
     * @param  {Number} [maxSize]       Max size of the file. If not defined or -1, no max size.
     * @param  {Boolean} allowOffline   True to allow selecting in offline, false to require connection.
     * @param  {String} [title]         File picker title.
     * @param  {Array}  [filterMethods] File picker available methods.
     * @param  {Boolean} upload         True if the file should be uploaded, false if only picked.
     * @return {Promise} Promise resolved when a file is selected, rejected if file picker is closed without selecting a file.
     *                   The resolve value should be the FileEntry of a copy of the picked file, so it can be deleted afterwards.
     */
    function selectFile(maxSize, allowOffline, title, filterMethods, upload) {
        var buttons = [],
            handlers;

        filePickerDeferred = $q.defer();

        // Add buttons for handlers.
        handlers = $mmFileUploaderDelegate.getHandlers();
        handlers.sort(function(a, b) {
            return a.priority < b.priority;
        });

        angular.forEach(handlers, function(handler) {
            if (filterMethods && filterMethods.indexOf(handler.name) == -1) {
                // Method is not available, skip.
                return;
            }

            buttons.push({
                text: (handler.icon ? '<i class="icon ' + handler.icon + '"></i>' : '') + $translate.instant(handler.title),
                action: handler.action,
                className: handler.class,
                afterRender: handler.afterRender
            });
        });

        hideActionSheet = $ionicActionSheet.show({
            buttons: buttons,
            titleText: title ? title : $translate.instant('mm.fileuploader.' + (upload ? 'uploadafile' : 'selectafile')),
            cancelText: $translate.instant('mm.core.cancel'),
            buttonClicked: function(index) {
                if (angular.isFunction(buttons[index].action)) {
                    if (!allowOffline && !$mmApp.isOnline()) {
                        // Not allowed, show error.
                        $mmUtil.showErrorModal('mm.fileuploader.errormustbeonlinetoupload', true);
                        return;
                    }

                    // Execute the action and close the action sheet.
                    buttons[index].action(maxSize, upload, allowOffline).then(function(data) {
                        if (data.uploaded) {
                            // The handler already uploaded the file. Return the result.
                            return data.result;
                        } else {
                            // The handler didn't upload the file, we need to upload it.
                            if (data.fileEntry) {
                                // The handler provided us a fileEntry, use it.
                                return self.uploadFileEntry(data.fileEntry, data.delete, maxSize, upload, allowOffline);
                            } else if (data.path) {
                                // The handler provided a path. First treat it like it's a relative path.
                                return $mmFS.getFile(data.path).then(function(fileEntry) {
                                    return self.uploadFileEntry(fileEntry, data.delete, maxSize, upload, allowOffline);
                                }, function() {
                                    // File not found, it's probably an absolute path.
                                    return $mmFS.getExternalFile(data.path).then(function(fileEntry) {
                                        return uploadFileEntry(fileEntry, data.delete, maxSize, upload, allowOffline);
                                    });
                                });
                            }

                            // Nothing received, fail.
                            $mmUtil.showErrorModal('No file received');
                        }
                    }).then(function(result) {
                        // Success uploading or picking, return the result.
                        self.fileUploaded(result);
                    }).catch(function(error) {
                        if (error) {
                            $mmUtil.showErrorModal(error);
                        }
                    });
                }

                // Never close the action sheet. It will automatically be closed if success.
                return false;
            },
            cancel: function() {
                // User cancelled the action sheet.
                self.filePickerClosed();
                return true;
            }
        });

        // Call afterRender for each button.
        $timeout(function() {
            angular.forEach(buttons, function(button) {
                if (angular.isFunction(button.afterRender)) {
                    button.afterRender(maxSize, upload, allowOffline);
                }
            });
        }, 500);

        return filePickerDeferred.promise;
    }

    /**
     * Convenience function to upload a file on a certain site, showing a confirm if needed.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#showConfirmAndUploadInSite
     * @param  {Object} fileEntry          FileEntry of the file to upload.
     * @param  {Boolean} deleteAfterUpload Whether the file should be deleted after upload.
     * @param  {String} [siteId]           Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}                   Promise resolved when the file is uploaded.
     */
    self.showConfirmAndUploadInSite = function(fileEntry, deleteAfterUpload, siteId) {
        return $mmFS.getFileObjectFromFileEntry(fileEntry).then(function(file) {
            return self.confirmUploadFile(file.size).then(function() {
                return self.uploadGenericFile(fileEntry.toURL(), file.name, file.type, deleteAfterUpload, siteId).then(function() {
                    $mmUtil.showModal('mm.core.success', 'mm.fileuploader.fileuploaded');
                });
            }).catch(function(err) {
                if (err) {
                    $mmUtil.showErrorModal(err);
                }
                return $q.reject();
            });
        }, function() {
            $mmUtil.showErrorModal('mm.fileuploader.errorreadingfile', true);
            return $q.reject();
        });
    };

    /**
     * Convenient helper for the user to record and upload a video.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#uploadAudioOrVideo
     * @param  {Boolean} isAudio True if uploading an audio, false if it's a video.
     * @param  {Number} maxSize  Max size of the upload. -1 for no max size.
     * @param  {Boolean} upload  True if the file should be uploaded, false to return the picked file.
     * @return {Promise}         The reject contains the error message, if there is no error message
     *                           then we can consider that this is a silent fail.
     */
    self.uploadAudioOrVideo = function(isAudio, maxSize, upload) {
        $log.debug('Trying to record a video file');
        var fn = isAudio ? $cordovaCapture.captureAudio : $cordovaCapture.captureVideo;
        return fn({limit: 1}).then(function(medias) {
            // We used limit 1, we only want 1 media.
            var media = medias[0],
                path = media.localURL;
            if (upload) {
                return uploadFile(true, path, maxSize, true, $mmFileUploader.uploadMedia, media);
            } else {
                // Copy or move the file to our temporary folder.
                return copyToTmpFolder(path, true, maxSize);
            }
        }, function(error) {
            var defaultError = isAudio ? 'mm.fileuploader.errorcapturingaudio' : 'mm.fileuploader.errorcapturingvideo';
            return treatCaptureError(error, defaultError);
        });
    };

    /**
     * Uploads a file of any type.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#uploadGenericFile
     * @param  {String} uri                File URI.
     * @param  {String} name               File name.
     * @param  {String} type               File type.
     * @param  {Boolean} deleteAfterUpload Whether the file should be deleted after upload.
     * @param  {String} [siteId]           Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}                   Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type, deleteAfterUpload, siteId) {
        // We won't check size so there's no need to pass maxSize. Functions calling
        // uploadGenericFile should check the size before calling this function.
        return uploadFile(deleteAfterUpload, uri, -1, false,
                $mmFileUploader.uploadGenericFile, uri, name, type, deleteAfterUpload, undefined, undefined, siteId);
    };

    /**
     * Convenient helper for the user to upload an image, either from the album or taking it with the camera.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#uploadImage
     * @param  {Boolean} fromAlbum True if the image should be selected from album, false if it should be taken with camera.
     * @param  {Number} maxSize    Max size of the upload. -1 for no max size.
     * @param  {Boolean} upload    True if the image should be uploaded, false to return the picked file.
     * @return {Promise}           The reject contains the error message, if there is no error message
     *                             then we can consider that this is a silent fail.
     */
    self.uploadImage = function(fromAlbum, maxSize, upload) {
        $log.debug('Trying to capture an image with camera');
        var options = {
            quality: 50,
            destinationType: navigator.camera.DestinationType.FILE_URI,
            correctOrientation: true
        };

        if (fromAlbum) {
            options.sourceType = navigator.camera.PictureSourceType.PHOTOLIBRARY;
            options.popoverOptions = new CameraPopoverOptions(10, 10, $window.innerWidth  - 200, $window.innerHeight - 200,
                                            Camera.PopoverArrowDirection.ARROW_ANY);
            if (ionic.Platform.isIOS()) {
                // Only get all media in iOS because in Android using this option allows uploading any kind of file.
                options.mediaType = Camera.MediaType.ALLMEDIA;
            }
        }

        return $cordovaCamera.getPicture(options).then(function(path) {
            if (upload) {
                return uploadFile(!fromAlbum, path, maxSize, true, $mmFileUploader.uploadImage, path, fromAlbum);
            } else {
                // Copy or move the file to our temporary folder.
                return copyToTmpFolder(path, !fromAlbum, maxSize, 'jpg');
            }
        }, function(error) {
            var defaultError = fromAlbum ? 'mm.fileuploader.errorgettingimagealbum' : 'mm.fileuploader.errorcapturingimage';
            return treatImageError(error, defaultError);
        });
    };

    /**
     * Upload a file given the file entry.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#uploadFileEntry
     * @param  {Object} fileEntry     The file entry.
     * @param  {Boolean} deleteAfter  True if the file should be deleted once treated.
     * @param  {Number} [maxSize]     Max size of the file. If not defined or -1, no max size.
     * @param  {Boolean} upload       True if the file should be uploaded, false to return the picked file.
     * @param  {Boolean} allowOffline True to allow selecting in offline, false to require connection.
     * @return {Promise}              Promise resolved when done.
     */
    self.uploadFileEntry = function(fileEntry, deleteAfter, maxSize, upload, allowOffline) {
        return $mmFS.getFileObjectFromFileEntry(fileEntry).then(function(file) {
            return self.uploadFileObject(file, maxSize, upload, allowOffline).then(function(result) {
                if (deleteAfter) {
                    // We have uploaded and deleted a copy of the file. Now delete the original one.
                    $mmFS.removeFileByFileEntry(fileEntry);
                }
                return result;
            });
        });
    };

    /**
     * Upload a file given the file object.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHelper#uploadFileObject
     * @param  {Object} file          The file object.
     * @param  {Number} [maxSize]     Max size of the file. If not defined or -1, no max size.
     * @param  {Boolean} upload       True if the file should be uploaded, false to return the picked file.
     * @param  {Boolean} allowOffline True to allow selecting in offline, false to require connection.
     * @return {Promise}              Promise resolved when done.
     */
    self.uploadFileObject = function(file, maxSize, upload, allowOffline) {
        if (maxSize != -1 && file.size > maxSize) {
            return self.errorMaxBytes(maxSize, file.name);
        }

        return self.confirmUploadFile(file.size, false, allowOffline).then(function() {
            // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
            return self.copyAndUploadFile(file, upload);
        });
    };

    /**
     * Treat a capture image or browse album error.
     *
     * @param  {String} error          Error returned by the Cordova plugin.
     * @param  {String} defaultMessage Key of the default message to show.
     */
    function treatImageError(error, defaultMessage) {
        // Cancelled, or error. If cancelled, error is a string with "Selection cancelled." or "Camera cancelled.".
        if (error) {
            if (typeof error == 'string') {
                if (error.toLowerCase().indexOf("error") > -1 || error.toLowerCase().indexOf("unable") > -1) {
                    $log.error('Error getting image: ' + error);
                    return $q.reject(error);
                } else {
                    $log.debug('Cancelled');
                }
            } else {
                return $mmLang.translateAndReject(defaultMessage);
            }
        }
        return $q.reject();
    }

    /**
     * Treat a capture audio/video error.
     *
     * @param  {Mixed} error           Error returned by the Cordova plugin. Can be a string or an object.
     * @param  {String} defaultMessage Key of the default message to show.
     */
    function treatCaptureError(error, defaultMessage) {
        // Cancelled, or error. If cancelled, error is an object with code = 3.
        if (error) {
            if (typeof error === 'string') {
                $log.error('Error while recording audio/video: ' + error);
                if (error.indexOf('No Activity found') > -1) {
                    // User doesn't have an app to do this.
                    return $mmLang.translateAndReject('mm.fileuploader.errornoapp');
                } else {
                    return $mmLang.translateAndReject(defaultMessage);
                }
            } else {
                if (error.code != 3) {
                    // Error, not cancelled.
                    $log.error('Error while recording audio/video: ' + JSON.stringify(error));
                    return $mmLang.translateAndReject(defaultMessage);
                } else {
                    $log.debug('Cancelled');
                }
            }
        }
        return $q.reject();
    }

    /**
     * Copy or move a file to the app temporary folder.
     *
     * @param  {String} path          Path of the file.
     * @param  {Boolean} shouldDelete True if original file should be deleted (move), false otherwise (copy).
     * @param  {String} [defaultExt]  Defaut extension to use if the file doesn't have any.
     * @return {Promise}              Promise resolved with the copied file.
     */
    function copyToTmpFolder(path, shouldDelete, maxSize, defaultExt) {
        var fileName = $mmFS.getFileAndDirectoryFromPath(path).name,
            promise,
            fileTooLarge;

        // Check that size isn't too large.
        if (typeof maxSize != 'undefined' && maxSize != -1) {
            promise = $mmFS.getExternalFile(path).then(function(fileEntry) {
                return $mmFS.getFileObjectFromFileEntry(fileEntry).then(function(file) {
                    if (file.size > maxSize) {
                        fileTooLarge = file;
                    }
                });
            }).catch(function() {
                // Ignore failures.
            });
        } else {
            promise = $q.when();
        }

        return promise.then(function() {
            if (fileTooLarge) {
                return self.errorMaxBytes(maxSize, fileTooLarge.name);
            }

            // File isn't too large.
            // Picking an image from album in Android adds a timestamp at the end of the file. Delete it.
            fileName = fileName.replace(/(\.[^\.]*)\?[^\.]*$/, '$1');

            // Get a unique name in the folder to prevent overriding another file.
            return $mmFS.getUniqueNameInFolder($mmFS.getTmpFolder(), fileName, defaultExt);
        }).then(function(newName) {
            // Now move or copy the file.
            var destPath = $mmFS.concatenatePaths($mmFS.getTmpFolder(), newName);
            if (shouldDelete) {
                return $mmFS.moveExternalFile(path, destPath);
            } else {
                return $mmFS.copyExternalFile(path, destPath);
            }
        });
    }

    /**
     * Convenience function to upload a file, allowing to retry if it fails.
     *
     * @param  {Boolean} deleteAfterUpload Whether the file should be deleted after upload.
     * @param  {String} path               Absolute path of the file to upload. Required only if deleteAfterUpload=true.
     * @param  {Number} maxSize            Max size of the upload. -1 for no max size.
     * @param  {Boolean} checkSize         True to check size.
     * @param  {Function} uploadFn         Function used to upload the file.
     *                                     The function parameters need to be passed after this parameter.
     * @return {Promise}                   Promise resolved if the file are uploaded, rejected otherwise.
     * @description
     *
     * Usage:
     * uploadFile(false, path, maxSize, checkSize, myFunction, param1, param2)
     *
     * This will call the following function to upload the file:
     * myFunction(param1, param2)
     */
    function uploadFile(deleteAfterUpload, path, maxSize, checkSize, uploadFn) {

        var errorStr = $translate.instant('mm.core.error'),
            retryStr = $translate.instant('mm.core.retry'),
            args = arguments,
            progressTemplate =  "<div>" +
                                    "<ion-spinner></ion-spinner>" +
                                    "<p ng-if=\"!perc\">{{'mm.fileuploader.uploading' | translate}}</p>" +
                                    "<p ng-if=\"perc\">{{'mm.fileuploader.uploadingperc' | translate:{$a: perc} }}</p>" +
                                "</div>",
            scope,
            modal,
            promise,
            file;

        if (!$mmApp.isOnline()) {
            return errorUploading($translate.instant('mm.fileuploader.errormustbeonlinetoupload'));
        }

        if (checkSize) {
            // Check that file size is the right one.
            promise = $mmFS.getExternalFile(path).then(function(fileEntry) {
                return $mmFS.getFileObjectFromFileEntry(fileEntry).then(function(f) {
                    file = f;
                    return file.size;
                });
            }).catch(function() {
                // Ignore failures.
            });
        } else {
            promise = $q.when(0);
        }

        return promise.then(function(size) {
            if (maxSize != -1 && size > maxSize) {
                return self.errorMaxBytes(maxSize, file.name);
            }

            if (size > 0) {
                return self.confirmUploadFile(size);
            }
        }).then(function() {
            // File isn't too large and user confirmed, let's upload.
            scope = $rootScope.$new();
            modal = $mmUtil.showModalLoadingWithTemplate(progressTemplate, {scope: scope});

            return uploadFn.apply(undefined, Array.prototype.slice.call(args, 5)).then(undefined, undefined, function(progress) {
                // Progress uploading.
                if (progress && progress.lengthComputable) {
                    var perc = parseFloat(Math.min((progress.loaded / progress.total) * 100, 100)).toFixed(1);
                    if (perc >= 0) {
                        scope.perc = perc;
                    }
                }
            }).catch(function(error) {
                $log.error('Error uploading file: '+JSON.stringify(error));

                modal.dismiss();
                if (typeof error != 'string') {
                    error = $translate.instant('mm.fileuploader.errorwhileuploading');
                }
                return errorUploading(error);
            }).finally(function() {
                modal.dismiss();
                scope.$destroy();
            });
        });

        function errorUploading(error) {
            // Allow the user to retry.
            var options = {
                okText: retryStr
            };

            return $mmUtil.showConfirm(error, errorStr, options).then(function() {
                // Try again.
                return uploadFile.apply(undefined, args);
            }, function() {
                // User cancelled. Delete the file if needed.
                if (deleteAfterUpload) {
                    angular.forEach(paths, function(path) {
                        $mmFS.removeExternalFile(path);
                    });
                }
                return $q.reject();
            });
        }
    }

    return self;
});
