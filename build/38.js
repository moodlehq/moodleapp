webpackJsonp([38],{

/***/ 1866:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreEmulatorCaptureMediaPageModule", function() { return CoreEmulatorCaptureMediaPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__capture_media__ = __webpack_require__(1991);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};






var CoreEmulatorCaptureMediaPageModule = /** @class */ (function () {
    function CoreEmulatorCaptureMediaPageModule() {
    }
    CoreEmulatorCaptureMediaPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_2__capture_media__["a" /* CoreEmulatorCaptureMediaPage */]
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_2__capture_media__["a" /* CoreEmulatorCaptureMediaPage */]),
                __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ]
        })
    ], CoreEmulatorCaptureMediaPageModule);
    return CoreEmulatorCaptureMediaPageModule;
}());

//# sourceMappingURL=capture-media.module.js.map

/***/ }),

/***/ 1991:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreEmulatorCaptureMediaPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__providers_file__ = __webpack_require__(27);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_utils_time__ = __webpack_require__(22);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};






/**
 * Page to capture media in browser or desktop.
 */
var CoreEmulatorCaptureMediaPage = /** @class */ (function () {
    function CoreEmulatorCaptureMediaPage(viewCtrl, params, domUtils, timeUtils, fileProvider, textUtils, cdr) {
        this.viewCtrl = viewCtrl;
        this.domUtils = domUtils;
        this.timeUtils = timeUtils;
        this.fileProvider = fileProvider;
        this.textUtils = textUtils;
        this.cdr = cdr;
        this.window = window;
        this.type = params.get('type');
        this.maxTime = params.get('maxTime');
        this.facingMode = params.get('facingMode') || 'environment';
        this.mimetype = params.get('mimetype');
        this.extension = params.get('extension');
        this.quality = params.get('quality') || 0.92;
        this.returnDataUrl = !!params.get('returnDataUrl');
    }
    /**
     * Component being initialized.
     */
    CoreEmulatorCaptureMediaPage.prototype.ngOnInit = function () {
        var _this = this;
        this.initVariables();
        var constraints = {
            video: this.isAudio ? false : { facingMode: this.facingMode },
            audio: !this.isImage
        };
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            var chunks = [];
            _this.localMediaStream = stream;
            if (!_this.isImage) {
                if (_this.isVideo) {
                    _this.previewMedia = _this.previewVideo.nativeElement;
                }
                else {
                    _this.previewMedia = _this.previewAudio.nativeElement;
                    _this.initAudioDrawer(_this.localMediaStream);
                    _this.audioDrawer.start();
                }
                _this.mediaRecorder = new _this.window.MediaRecorder(_this.localMediaStream, { mimeType: _this.mimetype });
                // When video or audio is recorded, add it to the list of chunks.
                _this.mediaRecorder.ondataavailable = function (e) {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };
                // When recording stops, create a Blob element with the recording and set it to the video or audio.
                _this.mediaRecorder.onstop = function () {
                    _this.mediaBlob = new Blob(chunks);
                    chunks = [];
                    _this.previewMedia.src = window.URL.createObjectURL(_this.mediaBlob);
                };
            }
            if (_this.isImage || _this.isVideo) {
                var hasLoaded_1 = false, waitTimeout_1;
                // Listen for stream ready to display the stream.
                _this.streamVideo.nativeElement.onloadedmetadata = function () {
                    if (hasLoaded_1) {
                        // Already loaded or timeout triggered, stop.
                        return;
                    }
                    hasLoaded_1 = true;
                    clearTimeout(waitTimeout_1);
                    _this.readyToCapture = true;
                    _this.streamVideo.nativeElement.onloadedmetadata = null;
                    // Force change detection. Angular doesn't detect these async operations.
                    _this.cdr.detectChanges();
                };
                // Set the stream as the source of the video.
                _this.streamVideo.nativeElement.src = window.URL.createObjectURL(_this.localMediaStream);
                // If stream isn't ready in a while, show error.
                waitTimeout_1 = setTimeout(function () {
                    if (!hasLoaded_1) {
                        // Show error.
                        hasLoaded_1 = true;
                        _this.dismissWithError(-1, 'Cannot connect to webcam.');
                    }
                }, 10000);
            }
            else {
                // It's ready to capture.
                _this.readyToCapture = true;
            }
        }).catch(function (error) {
            _this.dismissWithError(-1, error.message || error);
        });
    };
    /**
     * Initialize the audio drawer. This code has been extracted from MDN's example on MediaStream Recording:
     * https://github.com/mdn/web-dictaphone
     *
     * @param {MediaStream} stream Stream returned by getUserMedia.
     */
    CoreEmulatorCaptureMediaPage.prototype.initAudioDrawer = function (stream) {
        var skip = true, running = false;
        var audioCtx = new (this.window.AudioContext || this.window.webkitAudioContext)(), canvasCtx = this.streamAudio.nativeElement.getContext('2d'), source = audioCtx.createMediaStreamSource(stream), analyser = audioCtx.createAnalyser(), bufferLength = analyser.frequencyBinCount, dataArray = new Uint8Array(bufferLength), width = this.streamAudio.nativeElement.width, height = this.streamAudio.nativeElement.height, drawAudio = function () {
            if (!running) {
                return;
            }
            // Update the draw every animation frame.
            requestAnimationFrame(drawAudio);
            // Skip half of the frames to improve performance, shouldn't affect the smoothness.
            skip = !skip;
            if (skip) {
                return;
            }
            var sliceWidth = width / bufferLength;
            var x = 0;
            analyser.getByteTimeDomainData(dataArray);
            canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            canvasCtx.fillRect(0, 0, width, height);
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
            canvasCtx.beginPath();
            for (var i = 0; i < bufferLength; i++) {
                var v = dataArray[i] / 128.0, y = v * height / 2;
                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                }
                else {
                    canvasCtx.lineTo(x, y);
                }
                x += sliceWidth;
            }
            canvasCtx.lineTo(width, height / 2);
            canvasCtx.stroke();
        };
        analyser.fftSize = 2048;
        source.connect(analyser);
        this.audioDrawer = {
            start: function () {
                if (running) {
                    return;
                }
                running = true;
                drawAudio();
            },
            stop: function () {
                running = false;
            }
        };
    };
    /**
     * Initialize some variables based on the params.
     */
    CoreEmulatorCaptureMediaPage.prototype.initVariables = function () {
        if (this.type == 'captureimage') {
            this.isCaptureImage = true;
            this.type = 'image';
        }
        // Initialize some data based on the type of media to capture.
        if (this.type == 'video') {
            this.isVideo = true;
            this.title = 'core.capturevideo';
        }
        else if (this.type == 'audio') {
            this.isAudio = true;
            this.title = 'core.captureaudio';
        }
        else if (this.type == 'image') {
            this.isImage = true;
            this.title = 'core.captureimage';
        }
    };
    /**
     * Main action clicked: record or stop recording.
     */
    CoreEmulatorCaptureMediaPage.prototype.actionClicked = function () {
        var _this = this;
        if (this.isCapturing) {
            // It's capturing, stop.
            this.stopCapturing();
            this.cdr.detectChanges();
        }
        else {
            if (!this.isImage) {
                // Start the capture.
                this.isCapturing = true;
                this.resetChrono = false;
                this.mediaRecorder.start();
                this.cdr.detectChanges();
            }
            else {
                // Get the image from the video and set it to the canvas, using video width/height.
                var width = this.streamVideo.nativeElement.videoWidth, height = this.streamVideo.nativeElement.videoHeight, loadingModal_1 = this.domUtils.showModalLoading();
                this.imgCanvas.nativeElement.width = width;
                this.imgCanvas.nativeElement.height = height;
                this.imgCanvas.nativeElement.getContext('2d').drawImage(this.streamVideo.nativeElement, 0, 0, width, height);
                // Convert the image to blob and show it in an image element.
                this.imgCanvas.nativeElement.toBlob(function (blob) {
                    loadingModal_1.dismiss();
                    _this.mediaBlob = blob;
                    _this.previewImage.nativeElement.setAttribute('src', window.URL.createObjectURL(_this.mediaBlob));
                    _this.hasCaptured = true;
                }, this.mimetype, this.quality);
            }
        }
    };
    /**
     * User cancelled.
     */
    CoreEmulatorCaptureMediaPage.prototype.cancel = function () {
        // Send a "cancelled" error like the Cordova plugin does.
        this.dismissWithError(3, 'Canceled.', 'Camera cancelled');
    };
    /**
     * Discard the captured media.
     */
    CoreEmulatorCaptureMediaPage.prototype.discard = function () {
        this.previewMedia && this.previewMedia.pause();
        this.streamVideo && this.streamVideo.nativeElement.play();
        this.audioDrawer && this.audioDrawer.start();
        this.hasCaptured = false;
        this.isCapturing = false;
        this.resetChrono = true;
        delete this.mediaBlob;
        this.cdr.detectChanges();
    };
    /**
     * Close the modal, returning some data (success).
     *
     * @param {any} data Data to return.
     */
    CoreEmulatorCaptureMediaPage.prototype.dismissWithData = function (data) {
        this.viewCtrl.dismiss(data, 'success');
    };
    /**
     * Close the modal, returning an error.
     *
     * @param {number} code Error code. Will not be used if it's a Camera capture.
     * @param {string} message Error message.
     * @param {string} [cameraMessage] A specific message to use if it's a Camera capture. If not set, message will be used.
     */
    CoreEmulatorCaptureMediaPage.prototype.dismissWithError = function (code, message, cameraMessage) {
        var isCamera = this.isImage && !this.isCaptureImage, error = isCamera ? (cameraMessage || message) : { code: code, message: message };
        this.viewCtrl.dismiss(error, 'error');
    };
    /**
     * Done capturing, write the file.
     */
    CoreEmulatorCaptureMediaPage.prototype.done = function () {
        var _this = this;
        if (this.returnDataUrl) {
            // Return the image as a base64 string.
            this.dismissWithData(this.imgCanvas.nativeElement.toDataURL(this.mimetype, this.quality));
            return;
        }
        if (!this.mediaBlob) {
            // Shouldn't happen.
            this.domUtils.showErrorModal('Please capture the media first.');
            return;
        }
        // Create the file and return it.
        var fileName = this.type + '_' + this.timeUtils.readableTimestamp() + '.' + this.extension, path = this.textUtils.concatenatePaths(__WEBPACK_IMPORTED_MODULE_2__providers_file__["a" /* CoreFileProvider */].TMPFOLDER, 'media/' + fileName), loadingModal = this.domUtils.showModalLoading();
        this.fileProvider.writeFile(path, this.mediaBlob).then(function (fileEntry) {
            if (_this.isImage && !_this.isCaptureImage) {
                _this.dismissWithData(fileEntry.toURL());
            }
            else {
                // The capture plugin returns a MediaFile, not a FileEntry.
                // The only difference is that it supports a new function that won't be supported in desktop.
                fileEntry.getFormatData = function (successFn, errorFn) {
                    // Nothing to do.
                };
                _this.dismissWithData([fileEntry]);
            }
        }).catch(function (err) {
            _this.domUtils.showErrorModal(err);
        }).finally(function () {
            loadingModal.dismiss();
        });
    };
    /**
     * Stop capturing. Only for video and audio.
     */
    CoreEmulatorCaptureMediaPage.prototype.stopCapturing = function () {
        this.streamVideo && this.streamVideo.nativeElement.pause();
        this.audioDrawer && this.audioDrawer.stop();
        this.mediaRecorder && this.mediaRecorder.stop();
        this.isCapturing = false;
        this.hasCaptured = true;
    };
    /**
     * Page destroyed.
     */
    CoreEmulatorCaptureMediaPage.prototype.ngOnDestroy = function () {
        var tracks = this.localMediaStream.getTracks();
        tracks.forEach(function (track) {
            track.stop();
        });
        this.streamVideo && this.streamVideo.nativeElement.pause();
        this.previewMedia && this.previewMedia.pause();
        this.audioDrawer && this.audioDrawer.stop();
        delete this.mediaBlob;
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('streamVideo'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "streamVideo", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('previewVideo'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "previewVideo", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('imgCanvas'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "imgCanvas", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('previewImage'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "previewImage", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('streamAudio'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "streamAudio", void 0);
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])('previewAudio'),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_0__angular_core__["t" /* ElementRef */])
    ], CoreEmulatorCaptureMediaPage.prototype, "previewAudio", void 0);
    CoreEmulatorCaptureMediaPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-emulator-capture-media',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/emulator/pages/capture-media/capture-media.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-buttons start>\n            <button ion-button (click)="cancel()">{{ \'core.cancel\' | translate }}</button>\n        </ion-buttons>\n\n        <ion-title>{{ title | translate }}</ion-title>\n\n        <ion-buttons end>\n            <button ion-button *ngIf="hasCaptured" (click)="done()">{{ \'core.done\' | translate }}</button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content  class="has-footer">\n    <core-loading [hideUntil]="readyToCapture">\n        <div class="core-av-wrapper">\n            <!-- Video stream for image and video. -->\n            <video *ngIf="!isAudio" [hidden]="hasCaptured" class="core-webcam-stream" autoplay #streamVideo></video>\n\n            <!-- For video recording, use 2 videos and show/hide them because a CSS rule caused problems with the controls. -->\n            <video *ngIf="isVideo" [hidden]="!hasCaptured" class="core-webcam-video-captured" controls #previewVideo></video>\n\n            <!-- Canvas to treat the image and an img to show the result. -->\n            <canvas *ngIf="isImage" class="core-webcam-image-canvas" #imgCanvas></canvas>\n            <img *ngIf="isImage" [hidden]="!hasCaptured" class="core-webcam-image" alt="{{ \'core.capturedimage\' | translate }}" #previewImage>\n\n            <!-- Canvas to show audio waves when recording audio and audio player to listen to the result. -->\n            <div *ngIf="isAudio" class="core-audio-record-container">\n                <canvas [hidden]="hasCaptured" class="core-audio-canvas" #streamAudio></canvas>\n                <audio [hidden]="!hasCaptured" class="core-audio-captured" controls #previewAudio></audio>\n            </div>\n        </div>\n    </core-loading>\n</ion-content>\n\n<ion-footer>\n    <ion-row *ngIf="readyToCapture">\n        <ion-col></ion-col>\n        <ion-col text-center>\n            <button ion-button icon-only clear *ngIf="!hasCaptured" (click)="actionClicked()" [attr.aria-label]="title">\n                <ion-icon *ngIf="!isCapturing && isAudio" name="microphone"></ion-icon>\n                <ion-icon *ngIf="!isCapturing && isVideo" name="videocam"></ion-icon>\n                <ion-icon *ngIf="isImage" name="camera"></ion-icon>\n                <ion-icon *ngIf="isCapturing" name="square"></ion-icon>\n            </button>\n            <button ion-button icon-only clear *ngIf="hasCaptured" (click)="discard()" [attr.aria-label]="\'core.discard\' | translate">\n                <ion-icon name="trash"></ion-icon>\n            </button>\n        </ion-col>\n        <ion-col padding text-end class="chrono-container">\n            <core-chrono *ngIf="!isImage" [hidden]="hasCaptured" [running]="isCapturing" [reset]="resetChrono" [endTime]="maxTime" (onEnd)="stopCapturing()"></core-chrono>\n        </ion-col>\n    </ion-row>\n</ion-footer>\n\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/emulator/pages/capture-media/capture-media.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["D" /* ViewController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_3__providers_utils_dom__["a" /* CoreDomUtilsProvider */],
            __WEBPACK_IMPORTED_MODULE_5__providers_utils_time__["a" /* CoreTimeUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2__providers_file__["a" /* CoreFileProvider */],
            __WEBPACK_IMPORTED_MODULE_4__providers_utils_text__["a" /* CoreTextUtilsProvider */], __WEBPACK_IMPORTED_MODULE_0__angular_core__["j" /* ChangeDetectorRef */]])
    ], CoreEmulatorCaptureMediaPage);
    return CoreEmulatorCaptureMediaPage;
}());

//# sourceMappingURL=capture-media.js.map

/***/ })

});
//# sourceMappingURL=38.js.map