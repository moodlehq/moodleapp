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

/**
 * File uploader handlers factory. This factory holds the different handlers used for delegates.
 *
 * @module mm.core.fileuploader
 * @ngdoc service
 * @name $mmFileUploaderHandlers
 */
.factory('$mmFileUploaderHandlers', function($mmFileUploaderHelper, $rootScope, $compile, $mmUtil, $mmApp, $translate, $mmFS) {

    var self = {};

    /**
     * Album file picker handler.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHandlers#albumFilePicker
     */
    self.albumFilePicker = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmApp.isDevice();
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            return {
                name: 'album',
                title: 'mm.fileuploader.photoalbums',
                class: 'mm-fileuploader-album-handler',
                icon: 'ion-images',
                action: function(maxSize, upload, allowOffline, mimetypes) {
                    return $mmFileUploaderHelper.uploadImage(true, maxSize, upload, mimetypes).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
        };

        /**
         * Given a list of mimetypes, return the ones supported by this handler.
         *
         * @param  {String[]} mimetypes List of mimetypes.
         * @return {String[]}           Supported mimetypes.
         */
        self.getSupportedMimeTypes = function(mimetypes) {
            // Album allows picking images and videos.
            return $mmUtil.filterByRegexp(mimetypes, /^(image|video)\//);
        };

        return self;
    };

    /**
     * Camera file picker handler.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHandlers#cameraFilePicker
     */
    self.cameraFilePicker = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmApp.isDevice() || $mmApp.canGetUserMedia();
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            return {
                name: 'camera',
                title: 'mm.fileuploader.camera',
                class: 'mm-fileuploader-camera-handler',
                icon: 'ion-camera',
                action: function(maxSize, upload, allowOffline, mimetypes) {
                    return $mmFileUploaderHelper.uploadImage(false, maxSize, upload, mimetypes).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
        };

        /**
         * Given a list of mimetypes, return the ones supported by this handler.
         *
         * @param  {String[]} mimetypes List of mimetypes.
         * @return {String[]}           Supported mimetypes.
         */
        self.getSupportedMimeTypes = function(mimetypes) {
            // Camera only supports JPEG and PNG.
            return $mmUtil.filterByRegexp(mimetypes, /^image\/(jpeg|png)$/);
        };

        return self;
    };

    /**
     * Audio file picker handler.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHandlers#audioFilePicker
     */
    self.audioFilePicker = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmApp.isDevice() || ($mmApp.canGetUserMedia() && $mmApp.canRecordMedia());
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            return {
                name: 'audio',
                title: 'mm.fileuploader.audio',
                class: 'mm-fileuploader-audio-handler',
                icon: 'ion-mic-a',
                action: function(maxSize, upload, allowOffline, mimetypes) {
                    return $mmFileUploaderHelper.uploadAudioOrVideo(true, maxSize, upload, mimetypes).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
        };

        /**
         * Given a list of mimetypes, return the ones supported by this handler.
         *
         * @param  {String[]} mimetypes List of mimetypes.
         * @return {String[]}           Supported mimetypes.
         */
        self.getSupportedMimeTypes = function(mimetypes) {
            if (ionic.Platform.isIOS()) {
                // iOS records as WAV.
                return $mmUtil.filterByRegexp(mimetypes, /^audio\/wav$/);
            } else if (ionic.Platform.isAndroid()) {
                // In Android we don't know the format the audio will be recorded, so accept any audio mimetype.
                return $mmUtil.filterByRegexp(mimetypes, /^audio\//);
            } else {
                // In desktop, support audio formats that are supported by MediaRecorder.
                if (MediaRecorder) {
                    return mimetypes.filter(function(type) {
                        var matches = type.match(/^audio\//);
                        return matches && matches.length && MediaRecorder.isTypeSupported(type);
                    });
                }
            }

            return [];
        };

        return self;
    };

    /**
     * Video file picker handler.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHandlers#videoFilePicker
     */
    self.videoFilePicker = function() {

        var self = {};

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return $mmApp.isDevice() || ($mmApp.canGetUserMedia() && $mmApp.canRecordMedia());
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            return {
                name: 'video',
                title: 'mm.fileuploader.video',
                class: 'mm-fileuploader-video-handler',
                icon: 'ion-ios-videocam',
                action: function(maxSize, upload, allowOffline, mimetypes) {
                    return $mmFileUploaderHelper.uploadAudioOrVideo(false, maxSize, upload, mimetypes).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
        };

        /**
         * Given a list of mimetypes, return the ones supported by this handler.
         *
         * @param  {String[]} mimetypes List of mimetypes.
         * @return {String[]}           Supported mimetypes.
         */
        self.getSupportedMimeTypes = function(mimetypes) {
            if (ionic.Platform.isIOS()) {
                // iOS records as MOV.
                return $mmUtil.filterByRegexp(mimetypes, /^video\/quicktime$/);
            } else if (ionic.Platform.isAndroid()) {
                // In Android we don't know the format the video will be recorded, so accept any video mimetype.
                return $mmUtil.filterByRegexp(mimetypes, /^video\//);
            } else {
                // In desktop, support video formats that are supported by MediaRecorder.
                if (MediaRecorder) {
                    return mimetypes.filter(function(type) {
                        var matches = type.match(/^video\//);
                        return matches && matches.length && MediaRecorder.isTypeSupported(type);
                    });
                }
            }

            return [];
        };

        return self;
    };

    /**
     * Generic file picker handler.
     *
     * @module mm.core.fileuploader
     * @ngdoc method
     * @name $mmFileUploaderHandlers#filePicker
     */
    self.filePicker = function() {

        var self = {},
            uploadFileScope;

        /**
         * Check if handler is enabled.
         *
         * @return {Boolean} True if handler is enabled, false otherwise.
         */
        self.isEnabled = function() {
            return ionic.Platform.isAndroid() || !$mmApp.isDevice() ||
                    (ionic.Platform.isIOS() && parseInt(ionic.Platform.version(), 10) >= 9);
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            var isIOS = ionic.Platform.isIOS();

            return {
                name: 'file',
                title: isIOS ? 'mm.fileuploader.more' : 'mm.fileuploader.file',
                class: 'mm-fileuploader-file-handler',
                icon: isIOS ? 'ion-more' : 'ion-folder',
                afterRender: function(maxSize, upload, allowOffline, mimetypes) {
                    // Add an invisible file input in the file handler.
                    // It needs to be done like this because button text doesn't accept inputs.
                    var element = document.querySelector('.mm-fileuploader-file-handler');
                    if (element) {
                        var input = angular.element('<input type="file" mm-file-uploader-on-change="filePicked">');
                        if (mimetypes && mimetypes.length && (!ionic.Platform.isAndroid() || mimetypes.length === 1)) {
                            // Don't use accept attribute in Android with several mimetypes, it's not supported.
                            input.attr('accept', mimetypes.join(', '));
                        }

                        if (!uploadFileScope) {
                            // Create a scope for the on change directive.
                            uploadFileScope = $rootScope.$new();
                        }

                        uploadFileScope.filePicked = function(evt) {
                            var input = evt.srcElement,
                                file = input.files[0],
                                fileName;
                            input.value = ''; // Unset input.
                            if (!file) {
                                return;
                            }

                            // Verify that the mimetype of the file is supported, in case the accept attribute isn't supported.
                            var error = $mmFileUploaderHelper.isInvalidMimetype(mimetypes, file.name, file.type);
                            if (error) {
                                $mmUtil.showErrorModal(error);
                                return;
                            }

                            fileName = file.name;
                            if (isIOS) {
                                // Check the name of the file and add a timestamp if needed (take picture).
                                var matches = fileName.match(/image\.(jpe?g|png)/);
                                if (matches) {
                                    fileName = 'image_' + $mmUtil.readableTimestamp() + '.' + matches[1];
                                }
                            }

                            // Upload the picked file.
                            $mmFileUploaderHelper.uploadFileObject(file, maxSize, upload, allowOffline, fileName)
                                    .then(function(result) {
                                $mmFileUploaderHelper.fileUploaded(result);
                            }).catch(function(error) {
                                if (error) {
                                    $mmUtil.showErrorModal(error);
                                }
                            });
                        };

                        $compile(input)(uploadFileScope);

                        element.appendChild(input[0]);
                    }
                }
            };
        };

        /**
         * Given a list of mimetypes, return the ones supported by this handler.
         *
         * @param  {String[]} mimetypes List of mimetypes.
         * @return {String[]}           Supported mimetypes.
         */
        self.getSupportedMimeTypes = function(mimetypes) {
            return mimetypes;
        };

        return self;
    };

    return self;
});
