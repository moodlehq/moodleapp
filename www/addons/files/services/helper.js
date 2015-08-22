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

angular.module('mm.addons.files')

.constant('mmaFilesFileSizeWarning', 5242880)

.factory('$mmaFilesHelper', function($q, $mmUtil, $mmApp, $log, $translate, $window,
        $mmaFiles, $cordovaCamera, $cordovaCapture, $mmLang, $mmFS, $mmText, mmaFilesFileSizeWarning) {

    $log = $log.getInstance('$mmaFilesHelper');

    var self = {};

    /**
     * Convenient helper for the user to upload an image from an album.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadImageFromAlbum
     * @return {Promise} The reject contains the error message, if there is no error message
     *                   then we can consider that this is a silent fail.
     */
    self.uploadImageFromAlbum = function() {
        $log.debug('Trying to get a image from albums');
        var deferred = $q.defer();

        var width  =  $window.innerWidth  - 200;
        var height =  $window.innerHeight - 200;

        // iPad popOver, see https://tracker.moodle.org/browse/MOBILE-208
        var popover = new CameraPopoverOptions(10, 10, width, height, Camera.PopoverArrowDirection.ARROW_ANY);
        $cordovaCamera.getPicture({
            quality: 50,
            destinationType: navigator.camera.DestinationType.FILE_URI,
            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
            popoverOptions : popover
        }).then(function(img) {
            var modal = $mmUtil.showModalLoading('mma.files.uploading', true);
            $mmaFiles.uploadImage(img, true).then(function() {
                // Success.
                deferred.resolve();
            }, function() {
                $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorwhileuploading');
            }).finally(function() {
                modal.dismiss();
            });

        }, function(error) {
            treatImageError(error, deferred, 'mma.files.errorgettingimagealbum');
        });

        return deferred.promise;
    };

    /**
     * Convenient helper for the user to take an image with the camera and upload it.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadImageFromCamera
     * @return {Promise} The reject contains the error message, if there is no error message
     *                   then we can consider that this is a silent fail.
     */
    self.uploadImageFromCamera = function() {
        $log.debug('Trying to capture an image with camera');
        var deferred = $q.defer();

        $cordovaCamera.getPicture({
            quality: 50,
            destinationType: navigator.camera.DestinationType.FILE_URI
        }).then(function(img) {
            var modal = $mmUtil.showModalLoading('mma.files.uploading', true);
            $mmaFiles.uploadImage(img, false).then(function() {
                // Success.
                deferred.resolve();
            }, function() {
                $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorwhileuploading');
            }).finally(function() {
                modal.dismiss();
            });

        }, function(error) {
            treatImageError(error, deferred, 'mma.files.errorcapturingimage');
        });

        return deferred.promise;
    };

    /**
     * Convenient helper for the user to record and upload an audio.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadAudio
     * @return {Promise} The reject contains the error message, if there is no error message
     *                   then we can consider that this is a silent fail.
     */
    self.uploadAudio = function() {
        $log.debug('Trying to record an audio file');
        var deferred = $q.defer();

        $cordovaCapture.captureAudio({limit: 1}).then(function(medias) {
            var modal = $mmUtil.showModalLoading('mma.files.uploading', true);
            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                // Success.
                deferred.resolve();
            }, function() {
                $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorwhileuploading');
            }).finally(function() {
                modal.dismiss();
            });

        }, function(error) {
            treatCaptureError(error, deferred, 'mma.files.errorcapturingaudio');
        });

        return deferred.promise;
    };

    /**
     * Convenient helper for the user to record and upload a video.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadVideo
     * @return {Promise} The reject contains the error message, if there is no error message
     *                   then we can consider that this is a silent fail.
     */
    self.uploadVideo = function() {
        $log.debug('Trying to record a video file');
        var deferred = $q.defer();

        $cordovaCapture.captureVideo({limit: 1}).then(function(medias) {
            var modal = $mmUtil.showModalLoading('mma.files.uploading', true);
            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                // Success.
                deferred.resolve();
            }, function() {
                $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorwhileuploading');
            }).finally(function() {
                modal.dismiss();
            });

        }, function(error) {
            treatCaptureError(error, deferred, 'mma.files.errorcapturingvideo');
        });

        return deferred.promise;
    };

    /**
     * Show a confirmation modal to the user if he is using a limited connection or the file size is higher than 5MB.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#confirmUploadFile
     * @param  {Number} size File's size.
     * @return {Promise}     Promise resolved when the user confirms or if there's no need to show a modal.
     */
    self.confirmUploadFile = function(size) {
        if (!$mmApp.isOnline()) {
            return $mmLang.translateAndReject('mma.files.errormustbeonlinetoupload');
        }

        if ($mmApp.isNetworkAccessLimited() || size >= mmaFilesFileSizeWarning) {
             var size = $mmText.bytesToSize(size, 2);
            return $mmUtil.showConfirm($translate('mma.files.confirmuploadfile', {size: size}));
        } else {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        }
    };

    /**
     * Create a temporary copy of a file and upload it.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#copyAndUploadFile
     * @param {Object} file File to copy and upload.
     * @return {Promise}    Promise resolved when the file is uploaded.
     */
    self.copyAndUploadFile = function(file) {
        var deferred = $q.defer();

        var modal = $mmUtil.showModalLoading('mma.files.readingfile', true);

        // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
        $mmFS.readFileData(file, $mmFS.FORMATARRAYBUFFER).then(function(data) {

            var filepath = $mmFS.getTmpFolder() + '/' + file.name;

            $mmFS.writeFile(filepath, data).then(function(fileEntry) {
                modal.dismiss();
                self.uploadGenericFile(fileEntry.toURL(), file.name, file.type).then(deferred.resolve, deferred.reject);
            }, function(error) {
                $log.error('Error writing file to upload: '+JSON.stringify(error));
                $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorreadingfile');
                modal.dismiss();
            });

        }, function(error) {
            $log.error('Error reading file to upload: '+JSON.stringify(error));
            $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorreadingfile');
            modal.dismiss();
        });

        return deferred.promise;
    };

    /**
     * Uploads a file of any type.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadGenericFile
     * @param  {String} uri      File URI.
     * @param  {String} name     File name.
     * @param  {String} type     File type.
     * @param  {String} [siteid] Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}         Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type, siteid) {
        var deferred = $q.defer();

        if (!$mmApp.isOnline()) {
            $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errormustbeonlinetoupload');
            return deferred.promise;
        }

        var modal = $mmUtil.showModalLoading('mma.files.uploading', true);

        $mmaFiles.uploadGenericFile(uri, name, type, siteid).then(deferred.resolve, function(error) {
            $log.error('Error uploading file: '+JSON.stringify(error));
            $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errorwhileuploading');
        }).finally(function() {
            modal.dismiss();
        });

        return deferred.promise;
    };

    /**
     * Convenience function to upload a file on a certain site, showing a confirm if needed.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#showConfirmAndUploadInSite
     * @param  {String} fileEntry FileEntry of the file to upload.
     * @param  {String} [siteid]  Id of the site to upload the file to. If not defined, use current site.
     * @return {Promise}          Promise resolved when the file is uploaded.
     */
    self.showConfirmAndUploadInSite = function(fileEntry, siteid) {
        return $mmFS.getFileObjectFromFileEntry(fileEntry).then(function(file) {
            return self.confirmUploadFile(file.size).then(function() {
                return self.uploadGenericFile(fileEntry.toURL(), file.name, file.type, siteid).then(function() {
                    // Invalidate my files root dir so the list is refreshed when the user goes in.
                    return $mmaFiles.invalidateDirectory('my', undefined, siteid).finally(function() {
                        $mmUtil.showModal('mm.core.success', 'mma.files.fileuploaded');
                    });
                }, function(err) {
                    if (err) {
                        $mmUtil.showErrorModal(err);
                    }
                    return $q.reject();
                });
            }, function(err) {
                if (err) {
                    $mmUtil.showErrorModal(err);
                }
                return $q.reject();
            });
        }, function() {
            $mmUtil.showErrorModal('mma.files.errorreadingfile', true);
            return $q.reject();
        });
    }

    /**
     * Treat a capture image or browse album error.
     *
     * @param  {String} error          Error returned by the Cordova plugin.
     * @param  {Promise} deferred      Promise to reject.
     * @param  {String} defaultMessage Key of the default message to show.
     */
    function treatImageError(error, deferred, defaultMessage) {
        // Cancelled, or error. If cancelled, error is a string with "Selection cancelled." or "Camera cancelled.".
        if (error) {
            if (typeof(error) === 'string') {
                if (error.toLowerCase().indexOf("error") > -1 || error.toLowerCase().indexOf("unable") > -1) {
                    $log.error('Error getting image: ' + error);
                    deferred.reject(error);
                } else {
                    $log.debug('Cancelled');
                    deferred.reject();
                }
            } else {
                $mmLang.translateAndRejectDeferred(deferred, defaultMessage);
            }
        } else {
            deferred.reject();
        }
    }

    /**
     * Treat a capture audio/video error.
     *
     * @param  {Mixed} error           Error returned by the Cordova plugin. Can be a string or an object.
     * @param  {Promise} deferred      Promise to reject.
     * @param  {String} defaultMessage Key of the default message to show.
     */
    function treatCaptureError(error, deferred, defaultMessage) {
        // Cancelled, or error. If cancelled, error is an object with code = 3.
        if (error) {
            if (typeof(error) === 'string') {
                $log.error('Error while recording audio/video: ' + error);
                if (error.indexOf('No Activity found') > -1) {
                    // User doesn't have an app to do this.
                    $mmLang.translateAndRejectDeferred(deferred, 'mma.files.errornoapp');
                } else {
                    $mmLang.translateAndRejectDeferred(deferred, defaultMessage);
                }
            } else {
                if (error.code != 3) {
                    // Error, not cancelled.
                    $log.error('Error while recording audio/video: ' + JSON.stringify(error));
                    $mmLang.translateAndRejectDeferred(deferred, defaultMessage);
                } else {
                    $log.debug('Cancelled');
                    deferred.reject();
                }
            }
        } else {
            deferred.reject();
        }
    }

    return self;
});
