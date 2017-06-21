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

        navigator.device.capture.captureVideo = function(successCallback, errorCallback, options) {
            try {
                var scope = $rootScope.$new(),
                    loadingModal = $mmUtil.showModalLoading();

                if (options && options.duration) {
                    scope.chronoEndTime = options.duration * 1000;
                }

                initModal(scope).then(function(modal) {
                    navigator.mediaDevices.getUserMedia({video: true, audio: true}).then(function(localMediaStream) {
                        var streamVideo = modal.modalEl.querySelector('video.mm-webcam-stream'),
                            viewVideo = modal.modalEl.querySelector('video.mm-webcam-video-captured'),
                            mediaRecorder = new MediaRecorder(localMediaStream, {mimeType: videoMimeType}),
                            chunks = [],
                            mediaBlob;

                        // Set the stream as the source of the video.
                        streamVideo.src = $window.URL.createObjectURL(localMediaStream);

                        // When data is captured, add it to the list of chunks.
                        mediaRecorder.ondataavailable = function(e) {
                            if (e.data.size > 0) {
                                chunks.push(e.data);
                            }
                        };

                        // When capturing stops, create a Blob element with the recording and set it to the video.
                        mediaRecorder.onstop = function() {
                            mediaBlob = new Blob(chunks);
                            chunks = [];

                            viewVideo.src = $window.URL.createObjectURL(mediaBlob);
                        };

                        // Stream ready, show modal.
                        streamVideo.onloadedmetadata = function() {
                            loadingModal.dismiss();
                            modal.show();
                            scope.readyToCapture = true;
                            streamVideo.onloadedmetadata = null;
                        };

                        // Capture or stop capturing (for video and audio).
                        scope.actionClicked = function() {
                            if (scope.isCapturing) {
                                // It's capturing, stop.
                                scope.stopCapturing();
                            } else {
                                // Start the capture.
                                mediaRecorder.start();
                                scope.isCapturing = true;
                                scope.$broadcast('mm-chrono-start');
                            }
                        };

                        // Stop capturing.
                        scope.stopCapturing = function() {
                            streamVideo.pause();
                            mediaRecorder.stop();
                            scope.isCapturing = false;
                            scope.hasCaptured = true;
                            scope.$broadcast('mm-chrono-stop');
                        };

                        // Discard the captured media.
                        scope.discard = function() {
                            viewVideo.pause();
                            streamVideo.play();

                            scope.hasCaptured = false;
                            scope.isCapturing = false;
                            scope.$broadcast('mm-chrono-reset');
                            delete mediaBlob;
                        };

                        // Done capturing, write the file.
                        scope.done = function() {
                            if (!mediaBlob) {
                                // Shouldn't happen.
                                $mmUtil.showErrorModal('Please capture the media first.');
                                return;
                            }

                            // Create the file and return it.
                            var fileName = 'video_' + $mmUtil.readableTimestamp() + '.' + possibleVideoMimeTypes[videoMimeType],
                                path = $mmFS.concatenatePaths($mmFS.getTmpFolder(), 'media/' + fileName);

                            loadingModal = $mmUtil.showModalLoading();

                            $mmFS.writeFile(path, mediaBlob).then(function(fileEntry) {
                                scope.modal.hide();

                                // Wait for the modal to close before calling the callback to prevent Ionic bug with modals.
                                $timeout(function() {
                                    successCallback && successCallback([fileEntry]);
                                }, 400);
                            }).catch(function(err) {
                                $mmUtil.showErrorModal(err);
                            }).finally(function() {
                                loadingModal.dismiss();
                            });
                        };

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
                            streamVideo.pause();
                            viewVideo.pause();
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
        };

        return $q.when();
    };

    return self;
});
