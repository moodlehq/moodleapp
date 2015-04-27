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

.factory('$mmaFilesHelper', function($q, $mmUtil, $cordovaNetwork, $ionicActionSheet,
        $log, $translate, $mmaFiles, $cordovaCamera, $cordovaCapture) {

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

        if (!$cordovaNetwork.isOnline()) {
            $mmUtil.showErrorModal('mma.files.errormustbeonlinetoupload', true);
            deferred.reject();
            return deferred.promise;
        }

        var promises = [
            $translate('cancel'),
            $translate('mma.files.audio'),
            $translate('mma.files.camera'),
            $translate('mma.files.photoalbums'),
            $translate('mma.files.video'),
            $translate('mma.files.uploadafilefrom'),
            $translate('mma.files.uploading'),
            $translate('mma.files.errorwhileuploading')
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
                buttons = [
                    { text: strPhotoalbums, uniqid: 'albums' },
                    { text: strCamera, uniqid: 'camera'  },
                    { text: strAudio, uniqid: 'audio'  },
                    { text: strVideo, uniqid: 'video'  },
                ];

            $ionicActionSheet.show({
                buttons: buttons,
                titleText: strUploadafilefrom,
                cancelText: strCancel,
                buttonClicked: function(index) {
                    if (buttons[index].uniqid === 'albums') {
                        $log.info('Trying to get a image from albums');

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

                            $mmaFiles.uploadImage(img).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            }).finally(function() {
                                $mmUtil.closeModalLoading();
                            });

                        }, function() {
                            // Cancelled, or error.
                            deferred.reject();
                        });

                    } else if (buttons[index].uniqid === 'camera') {
                        $log.info('Trying to get a media from camera');

                        $cordovaCamera.getPicture({
                            quality: 50,
                            destinationType: navigator.camera.DestinationType.FILE_URI
                        }).then(function(img) {
                            $mmUtil.showModalLoading(strLoading);

                            $mmaFiles.uploadImage(img).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            });

                        }, function() {
                            // Cancelled, or error.
                            deferred.reject();
                        });

                    } else if (buttons[index].uniqid === 'audio') {
                        $log.info('Trying to record an audio file');
                        $cordovaCapture.captureAudio({limit: 1}).then(function(medias) {
                            $mmUtil.showModalLoading(strLoading);

                            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            });

                        }, function() {
                            // Cancelled, or error.
                            deferred.reject();
                        });

                    } else if (buttons[index].uniqid === 'video') {
                        $log.info('Trying to record a video file');
                        $cordovaCapture.captureVideo({limit: 1}).then(function(medias) {
                            $mmUtil.showModalLoading(strLoading);

                            $q.all($mmaFiles.uploadMedia(medias)).then(function() {
                                // Success.
                                deferred.resolve();
                            }, function() {
                                deferred.reject(strErrorWhileUploading);
                            });

                        }, function() {
                            // Cancelled, or error.
                            deferred.reject();
                        });

                    } else {
                        deferred.reject();
                    }

                    return true;
                }
            });
        });

        return deferred.promise;
    };

    return self;
});
