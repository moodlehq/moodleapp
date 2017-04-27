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
.factory('$mmFileUploaderHandlers', function($mmFileUploaderHelper, $rootScope, $compile, $mmUtil, $mmApp) {

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
            return true;
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
                action: function(maxSize, upload, allowOffline) {
                    return $mmFileUploaderHelper.uploadImage(true, maxSize, upload).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
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
            return true;
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
                action: function(maxSize, upload, allowOffline) {
                    return $mmFileUploaderHelper.uploadImage(false, maxSize, upload).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
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
            return true;
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
                action: function(maxSize, upload, allowOffline) {
                    return $mmFileUploaderHelper.uploadAudioOrVideo(true, maxSize, upload).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
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
            return true;
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
                action: function(maxSize, upload, allowOffline) {
                    return $mmFileUploaderHelper.uploadAudioOrVideo(false, maxSize, upload).then(function(result) {
                        return {
                            uploaded: true,
                            result: result
                        };
                    });
                }
            };
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
            return ionic.Platform.isAndroid();
        };

        /**
         * Get the data to display the handler.
         *
         * @return {Object} Data.
         */
        self.getData = function() {
            return {
                name: 'file',
                title: 'mm.fileuploader.file',
                class: 'mm-fileuploader-file-handler',
                icon: 'ion-folder',
                afterRender: function(maxSize, upload, allowOffline) {
                    // Add an invisible file input in the file handler.
                    // It needs to be done like this because button text doesn't accept inputs.
                    var element = document.querySelector('.mm-fileuploader-file-handler');
                    if (element) {
                        var input = angular.element('<input type="file" mm-file-uploader-on-change="filePicked">');

                        if (!uploadFileScope) {
                            // Create a scope for the on change directive.
                            uploadFileScope = $rootScope.$new();

                            uploadFileScope.filePicked = function(evt) {
                                var input = evt.srcElement;
                                var file = input.files[0];
                                input.value = ''; // Unset input.
                                if (!file) {
                                    return;
                                }

                                // Upload the picked file.
                                $mmFileUploaderHelper.uploadFileObject(file, maxSize, upload, allowOffline).then(function(result) {
                                    $mmFileUploaderHelper.fileUploaded(result);
                                }).catch(function(error) {
                                    if (error) {
                                        $mmUtil.showErrorModal(error);
                                    }
                                });
                            };
                        }

                        $compile(input)(uploadFileScope);

                        element.appendChild(input[0]);
                    }
                }
            };
        };

        return self;
    };

    return self;
});
