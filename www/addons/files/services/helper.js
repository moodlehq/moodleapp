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

.factory('$mmaFilesHelper', function($q, $mmUtil, $mmApp, $ionicActionSheet, $log, $translate,
        $mmaFiles, $cordovaCamera, $cordovaCapture, $mmLang, $ionicPopup, $state, $mmFS, $mmText, mmaFilesFileSizeWarning) {

    $log = $log.getInstance('$mmaFilesHelper');

    var self = {};

    /**
     * Convenient helper for the user to upload a file.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#pickAndUploadFile
     * @return {Promise} The reject contains the error message, if there is no error message
     *                   then we can consider that this is a silent fail.
     */
    self.pickAndUploadFile = function() {
        var deferred = $q.defer();

        if (!$mmApp.isOnline()) {
            $mmLang.translateErrorAndReject(deferred, 'mma.files.errormustbeonlinetoupload');
            return deferred.promise;
        }

        var promises = [
            $translate('mm.core.cancel'),
            $translate('mma.files.audio'),
            $translate('mma.files.camera'),
            $translate('mma.files.photoalbums'),
            $translate('mma.files.video'),
            $translate('mma.files.uploadafilefrom'),
            $translate('mma.files.uploading'),
            $translate('mma.files.errorwhileuploading'),
            $translate('mma.files.file')
        ];

        $q.all(promises).then(function(translations) {

            var strCancel = translations[0],
                strAudio = translations[1],
                strCamera = translations[2],
                strPhotoalbums = translations[3],
                strVideo = translations[4],
                strUploadafilefrom = translations[5],
                strLoading = translations[6],
                strErrorWhileUploading = translations[7],
                strFile = translations[8],
                buttons = [
                    { text: strPhotoalbums, uniqid: 'albums' },
                    { text: strCamera, uniqid: 'camera'  },
                    { text: strAudio, uniqid: 'audio'  },
                    { text: strVideo, uniqid: 'video'  }
                ];

            if (ionic.Platform.isAndroid()) {
                buttons.push({ text: strFile, uniqid: 'file'  });
            }

            $ionicActionSheet.show({
                buttons: buttons,
                titleText: strUploadafilefrom,
                cancelText: strCancel,
                buttonClicked: function(index) {
                    if (buttons[index].uniqid === 'albums') {
                        $log.debug('Trying to get a image from albums');

                        var width  =  window.innerWidth  - 200;
                        var height =  window.innerHeight - 200;

                        // iPad popOver, see https://tracker.moodle.org/browse/MOBILE-208
                        var popover = new CameraPopoverOptions(10, 10, width, height, Camera.PopoverArrowDirection.ARROW_ANY);
                        $cordovaCamera.getPicture({
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.FILE_URI,
                            sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
                            popoverOptions : popover
                        }).then(function(img) {
                            $mmUtil.showModalLoading(strLoading);

                            $mmaFiles.uploadImage(img, true).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            }).finally(function() {
                                $mmUtil.closeModalLoading();
                            });

                        }, function(error) {
                            treatImageError(error, deferred, 'mma.files.errorgettingimagealbum');
                        });

                    } else if (buttons[index].uniqid === 'camera') {
                        $log.debug('Trying to get a media from camera');

                        $cordovaCamera.getPicture({
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.FILE_URI
                        }).then(function(img) {
                            $mmUtil.showModalLoading(strLoading);

                            $mmaFiles.uploadImage(img, false).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            }).finally(function() {
                                $mmUtil.closeModalLoading();
                            });

                        }, function(error) {
                            treatImageError(error, deferred, 'mma.files.errorcapturingimage');
                        });

                    } else if (buttons[index].uniqid === 'audio') {
                        $log.debug('Trying to record an audio file');
                        $cordovaCapture.captureAudio({limit: 1}).then(function(medias) {
                            $mmUtil.showModalLoading(strLoading);

                            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            }).finally(function() {
                                $mmUtil.closeModalLoading();
                            });

                        }, function(error) {
                            treatCaptureError(error, deferred, 'mma.files.errorcapturingaudio');
                        });

                    } else if (buttons[index].uniqid === 'video') {
                        $log.debug('Trying to record a video file');
                        $cordovaCapture.captureVideo({limit: 1}).then(function(medias) {
                            $mmUtil.showModalLoading(strLoading);

                            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            }).finally(function() {
                                $mmUtil.closeModalLoading();
                            });

                        }, function(error) {
                            treatCaptureError(error, deferred, 'mma.files.errorcapturingvideo');
                        });

                    } else if(buttons[index].uniqid === 'file') {
                        $state.go('site.files-upload');
                        deferred.reject();
                    } else {
                        deferred.reject();
                    }

                    return true;
                }
            });
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
        if (!$cordovaNetwork.isOnline()) {
            return $translate('mma.files.errormustbeonlinetoupload').then(function(errString) {
                return $q.reject(errString);
            });
        }

        if ($mmApp.isNetworkAccessLimited() || size >= mmaFilesFileSizeWarning) {
            return $mmText.bytesToSize(size, 2).then(function(size) {
                return $mmUtil.showConfirm($translate('mma.files.confirmuploadfile', {size: size}));
            });
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

        $translate('mma.files.readingfile').then(function(readingString) {
            $mmUtil.showModalLoading(readingString);
        });

        // We have the data of the file to be uploaded, but not its URL (needed). Create a copy of the file to upload it.
        $mmFS.readFileData(file, $mmFS.FORMATARRAYBUFFER).then(function(data) {

            var filepath = $mmFS.getTmpFolder() + '/' + file.name;

            $mmFS.writeFile(filepath, data).then(function(fileEntry) {
                $mmUtil.closeModalLoading();
                self.uploadGenericFile(fileEntry.toURL(), file.name, file.type).then(deferred.resolve, deferred.reject);
            }, function(error) {
                $log.error('Error writing file to upload: '+JSON.stringify(error));
                $mmLang.translateErrorAndReject(deferred, 'mma.files.errorreadingfile');
                $mmUtil.closeModalLoading();
            });

        }, function(error) {
            $log.error('Error reading file to upload: '+JSON.stringify(error));
            $mmLang.translateErrorAndReject(deferred, 'mma.files.errorreadingfile');
            $mmUtil.closeModalLoading();
        });

        return deferred.promise;
    };

    /**
     * Uploads a file of any type.
     *
     * @module mm.addons.files
     * @ngdoc method
     * @name $mmaFilesHelper#uploadGenericFile
     * @param  {String} uri  File URI.
     * @param  {String} name File name.
     * @param  {String} type File type.
     * @return {Promise}    Promise resolved when the file is uploaded.
     */
    self.uploadGenericFile = function(uri, name, type) {
        var deferred = $q.defer();

        if (!$cordovaNetwork.isOnline()) {
            $translate('mma.files.errormustbeonlinetoupload').then(function(errString) {
                deferred.reject(errString);
            });
            return deferred.promise;
        }

        $translate('mma.files.uploading').then(function(uploadingString) {
            $mmUtil.showModalLoading(uploadingString);
        });

        $mmaFiles.uploadGenericFile(uri, name, type).then(deferred.resolve, function(error) {
            $log.error('Error uploading file: '+JSON.stringify(error));
            $mmLang.translateErrorAndReject(deferred, 'mma.files.errorwhileuploading');
        }).finally(function() {
            $mmUtil.closeModalLoading();
        });

        return deferred.promise;
    };

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
                $mmLang.translateErrorAndReject(deferred, defaultMessage);
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
                    $mmLang.translateErrorAndReject(deferred, 'mma.files.errornoapp');
                } else {
                    $mmLang.translateErrorAndReject(deferred, defaultMessage);
                }
            } else {
                if (error.code != 3) {
                    // Error, not cancelled.
                    $log.error('Error while recording audio/video: ' + JSON.stringify(error));
                    $mmLang.translateErrorAndReject(deferred, defaultMessage);
                } else {
                    $log.debug('Cancelled');
                }
            }
        } else {
            deferred.reject();
        }
    }

    return self;
});
