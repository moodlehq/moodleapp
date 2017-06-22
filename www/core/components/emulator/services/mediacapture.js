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

angular.module('mm.core.emulator')

/**
 * This service handles the emulation of the Cordova Media Capture plugin in desktop apps and in browser.
 *
 * @ngdoc service
 * @name $mmEmulatorMediaCapture
 * @module mm.core.emulator
 */
.factory('$mmEmulatorMediaCapture', function($log, $q, $ionicModal, $rootScope, $window, $mmUtil, $mmFS, $timeout) {

    $log = $log.getInstance('$mmEmulatorMediaCapture');

    var self = {},
        possibleVideoMimeTypes = {
            'video/webm;codecs=vp9': 'webm',
            'video/webm;codecs=vp8': 'webm',
            'video/ogg': 'ogv'
        },
        videoMimeType;

    /**
     * Capture media (image, audio, video).
     *
     * @param  {String} type              Type of media: image, audio, video.
     * @param  {Function} successCallback Function called when media taken.
     * @param  {Function} errorCallback   Function called when error or cancel.
     * @param  {Object} [options]         Optional options.
     * @return {Void}
     */
    function captureMedia(type, successCallback, errorCallback, options) {
        options = options || {};

        try {
            var scope = $rootScope.$new(),
                loadingModal = $mmUtil.showModalLoading(),
                facingMode = 'environment',
                mimetype,
                extension,
                quality = 0.92, // Image only.
                returnData = false; // Image only.

            // Initialize some data based on the type of media to capture.
            if (type == 'video') {
                scope.isVideo = true;
                title = 'mm.core.capturevideo';
                mimetype = videoMimeType;
                extension = possibleVideoMimeTypes[mimetype];
            } else if (type == 'audio') {
                scope.isAudio = true;
                title = 'mm.core.captureaudio';
            } else if (type == 'image') {
                scope.isImage = true;
                title = 'mm.core.captureimage';

                if (typeof options.sourceType != 'undefined' && options.sourceType != Camera.PictureSourceType.CAMERA) {
                    errorCallback && errorCallback('This source type is not supported in desktop.');
                    loadingModal.dismiss();
                    return;
                }

                if (options.cameraDirection == Camera.Direction.FRONT) {
                    facingMode = 'user';
                }

                if (options.encodingType == Camera.EncodingType.PNG) {
                    mimetype = 'image/png';
                    extension = 'png';
                } else {
                    mimetype = 'image/jpeg';
                    extension = 'jpeg';
                }

                if (options.quality >= 0 && options.quality <= 100) {
                    quality = options.quality / 100;
                }

                if (options.destinationType == Camera.DestinationType.DATA_URL) {
                    returnData = true;
                }
            }

            if (options.duration) {
                scope.chronoEndTime = options.duration * 1000;
            }

            initModal(scope).then(function(modal) {
                var constraints = {
                    video: scope.isAudio ? false : {facingMode: facingMode},
                    audio: !scope.isImage
                };

                navigator.mediaDevices.getUserMedia(constraints).then(function(localMediaStream) {
                    var streamVideo,
                        viewVideo,
                        canvas,
                        imgEl,
                        mediaRecorder,
                        chunks = [],
                        mediaBlob;

                    if (scope.isImage) {
                        canvas = modal.modalEl.querySelector('canvas.mm-webcam-image-canvas');
                        imgEl = modal.modalEl.querySelector('img.mm-webcam-image');
                    } else {
                        if (scope.isVideo) {
                            viewVideo = modal.modalEl.querySelector('video.mm-webcam-video-captured');
                        }

                        mediaRecorder = new MediaRecorder(localMediaStream, {mimeType: mimetype});

                        // When video or audio is recorded, add it to the list of chunks.
                        mediaRecorder.ondataavailable = function(e) {
                            if (e.data.size > 0) {
                                chunks.push(e.data);
                            }
                        };

                        // When recording stops, create a Blob element with the recording and set it to the video or audio.
                        mediaRecorder.onstop = function() {
                            mediaBlob = new Blob(chunks);
                            chunks = [];

                            viewVideo.src = $window.URL.createObjectURL(mediaBlob);
                        };
                    }

                    if (scope.isImage || scope.isVideo) {
                        // Set the stream as the source of the video.
                        streamVideo = modal.modalEl.querySelector('video.mm-webcam-stream');
                        streamVideo.src = $window.URL.createObjectURL(localMediaStream);

                        // Stream ready, show modal.
                        streamVideo.onloadedmetadata = function() {
                            loadingModal.dismiss();
                            modal.show();
                            scope.readyToCapture = true;
                            streamVideo.onloadedmetadata = null;
                        };
                    }

                    // Capture or stop capturing (stop is only for video and audio).
                    scope.actionClicked = function() {
                        if (scope.isCapturing) {
                            // It's capturing, stop.
                            scope.stopCapturing();
                        } else {
                            if (!scope.isImage) {
                                // Start the capture.
                                scope.isCapturing = true;
                                mediaRecorder.start();
                                scope.$broadcast('mm-chrono-start');
                            } else {
                                // Get the image from the video and set it to the canvas, using video width/height.
                                var width = streamVideo.offsetWidth,
                                    height = streamVideo.offsetHeight;

                                canvas.width = width;
                                canvas.height = height;
                                canvas.getContext('2d').drawImage(streamVideo, 0, 0, width, height);

                                // Convert the image to blob and show it in an image element.
                                loadingModal = $mmUtil.showModalLoading();
                                canvas.toBlob(function(blob) {
                                    loadingModal.dismiss();

                                    mediaBlob = blob;
                                    imgEl.setAttribute('src', $window.URL.createObjectURL(mediaBlob));
                                    scope.hasCaptured = true;
                                }, mimetype, quality);

                            }
                        }
                    };

                    // Stop capturing. Only for video and audio.
                    scope.stopCapturing = function() {
                        viewVideo && streamVideo.pause();
                        mediaRecorder.stop();
                        scope.isCapturing = false;
                        scope.hasCaptured = true;
                        scope.$broadcast('mm-chrono-stop');
                    };

                    // Discard the captured media.
                    scope.discard = function() {
                        viewVideo && viewVideo.pause();
                        streamVideo && streamVideo.play();

                        scope.hasCaptured = false;
                        scope.isCapturing = false;
                        scope.$broadcast('mm-chrono-reset');
                        delete mediaBlob;
                    };

                    // Done capturing, write the file.
                    scope.done = function() {
                        if (returnData) {
                            // Return the image as a base64 string.
                            success(canvas.toDataURL(mimetype, quality));
                            return;
                        }

                        if (!mediaBlob) {
                            // Shouldn't happen.
                            $mmUtil.showErrorModal('Please capture the media first.');
                            return;
                        }

                        // Create the file and return it.
                        var fileName = type + '_' + $mmUtil.readableTimestamp() + '.' + extension,
                            path = $mmFS.concatenatePaths($mmFS.getTmpFolder(), 'media/' + fileName);

                        loadingModal = $mmUtil.showModalLoading();

                        $mmFS.writeFile(path, mediaBlob).then(function(fileEntry) {
                            if (scope.isImage) {
                                success(fileEntry.toURL());
                            } else {
                                success([fileEntry]);
                            }
                        }).catch(function(err) {
                            $mmUtil.showErrorModal(err);
                        }).finally(function() {
                            loadingModal.dismiss();
                        });
                    };

                    // Success capturing the data.
                    function success(data) {
                        scope.modal.hide();

                        // Wait for the modal to close before calling the callback to prevent Ionic bug with modals.
                        $timeout(function() {
                            successCallback && successCallback(data);
                        }, 400);
                    }

                    // Capture cancelled.
                    scope.cancel = function() {
                        scope.modal.hide();
                        errorCallback && errorCallback({code: 3, message: "Canceled."});
                    };

                    scope.$on('modal.hidden', function() {
                        // Modal hidden, stop video and stream and destroy the scope.
                        var tracks = localMediaStream.getTracks();
                        angular.forEach(tracks, function(track) {
                            track.stop();
                        });
                        streamVideo && streamVideo.pause();
                        viewVideo && viewVideo.pause();
                        scope.$destroy();
                    });

                    scope.$on('$destroy', function() {
                        scope.modal.remove();
                    });
                  }).catch(errorCallback);
            }, errorCallback);
        } catch(ex) {
            errorCallback(ex.toString());
        }
    }

    /**
     * Init the getUserMedia function, using a deprecated function as fallback if the new one doesn't exist.
     *
     * @return {Boolean} Whether the function is supported.
     */
    function initGetUserMedia() {
        // Check if there is a function to get user media.
        navigator.mediaDevices = navigator.mediaDevices || {};

        if (!navigator.mediaDevices.getUserMedia) {
            // New function doesn't exist, check if the deprecated function is supported.
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia || navigator.msGetUserMedia;

            if (navigator.getUserMedia) {
                // Deprecated function exists, support the new function using the deprecated one.
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    var deferred = $q.defer();
                    navigator.getUserMedia(constraints, deferred.resolve, deferred.reject);
                    return deferred.promise;
                };
            } else {
                return false;
            }
        }

        return true;
    }

    /**
     * Initialize the mimetypes to use when capturing.
     *
     * @return {Void}
     */
    function initMimeTypes() {
        // Determine video mimetype.
        for (var mimeType in possibleVideoMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                videoMimeType = mimeType;
                break;
            }
        }
    }

    /**
     * Initialize the modal to capture media.
     *
     * @param  {Object} scope Scope to use in the modal.
     * @return {Promise}      Promise resolved when the modal is initialized.
     */
    function initModal(scope) {
        // Chat users modal.
        return $ionicModal.fromTemplateUrl('core/components/emulator/templates/capturemediamodal.html', {
            scope: scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            scope.modal = modal;

            return modal;
        });
    }

    /**
     * Load the emulation of the Cordova plugin.
     *
     * @module mm.core.emulator
     * @ngdoc method
     * @name $mmEmulatorMediaCapture#load
     * @return {Promise} Promise resolved when done.
     */
    self.load = function() {
        if (typeof window.MediaRecorder == 'undefined') {
            // Cannot record.
            return $q.when();
        }

        if (!initGetUserMedia()) {
            // Function not supported, stop.
            return $q.when();
        }

        initMimeTypes();

        navigator.device = navigator.device || {};
        navigator.device.capture = navigator.device.capture || {};
        navigator.camera = navigator.camera || {};

        // Create Camera constants.
        $window.Camera = $window.Camera || {};

        $window.Camera.DestinationType = {
            DATA_URL: 0,
            FILE_URI: 1,
            NATIVE_URI: 2
        };

        $window.Camera.Direction = {
            BACK: 0,
            FRONT: 1
        };

        $window.Camera.EncodingType = {
            JPEG: 0,
            PNG: 1
        };

        $window.Camera.MediaType = {
            PICTURE: 0,
            VIDEO: 1,
            ALLMEDIA: 2
        };

        $window.Camera.PictureSourceType = {
            PHOTOLIBRARY: 0,
            CAMERA: 1,
            SAVEDPHOTOALBUM: 2
        };

        $window.Camera.PopoverArrowDirection = {
            ARROW_UP: 1,
            ARROW_DOWN: 2,
            ARROW_LEFT: 4,
            ARROW_RIGHT: 8,
            ARROW_ANY: 15
        };

        // Copy the constants to navigator.camera.
        angular.extend(navigator.camera, $window.Camera);

        // Create CameraPopoverOptions and CameraPopoverHandle.
        $window.CameraPopoverOptions = function() {
            // Nothing to do, not supported in desktop.
        };

        $window.CameraPopoverHandle = function() {
            // Nothing to do, not supported in desktop.
        };
        $window.CameraPopoverHandle.prototype.setPosition = function() {
            // Nothing to do, not supported in desktop.
        };

        // Create camera methods.
        navigator.camera.getPicture = function(successCallback, errorCallback, options) {
            return captureMedia('image', successCallback, errorCallback, options);
        };

        navigator.camera.cleanup = function(successCallback, errorCallback) {
            // The tmp folder is cleaned when the app is started, do nothing.
            successCallback && successCallback();
        };

        // Support Media Capture methods.
        navigator.device.capture.captureImage = function(successCallback, errorCallback, options) {
            return captureMedia('image', successCallback, errorCallback, options);
        };

        navigator.device.capture.captureVideo = function(successCallback, errorCallback, options) {
            return captureMedia('video', successCallback, errorCallback, options);
        };

        return $q.when();
    };

    return self;
});
