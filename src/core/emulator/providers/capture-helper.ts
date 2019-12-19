// (C) Copyright 2015 Moodle Pty Ltd.
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
import { ModalController, Modal } from 'ionic-angular';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Helper service with some features to capture media (image, audio, video).
 */
@Injectable()
export class CoreEmulatorCaptureHelperProvider {
    protected possibleAudioMimeTypes = {
        'audio/webm': 'weba',
        'audio/ogg': 'ogg'
    };
    protected possibleVideoMimeTypes = {
        'video/webm;codecs=vp9': 'webm',
        'video/webm;codecs=vp8': 'webm',
        'video/ogg': 'ogv'
    };
    protected win: any;
    videoMimeType: string;
    audioMimeType: string;

    constructor(private utils: CoreUtilsProvider, private mimeUtils: CoreMimetypeUtilsProvider,
            private modalCtrl: ModalController) {
        // Convert the window to "any" type because some of the variables used (like MediaRecorder) aren't in the window spec.
        this.win = <any> window;
    }

    /**
     * Capture media (image, audio, video).
     *
     * @param type Type of media: image, audio, video.
     * @param options Optional options.
     * @return Promise resolved when captured, rejected if error.
     */
    captureMedia(type: string, options: any): Promise<any> {
        options = options || {};

        try {
            // Build the params to send to the modal.
            const deferred = this.utils.promiseDefer(),
                params: any = {
                    type: type
                };
            let mimeAndExt,
                modal: Modal;

            // Initialize some data based on the type of media to capture.
            if (type == 'video') {
                mimeAndExt = this.getMimeTypeAndExtension(type, options.mimetypes);
                params.mimetype = mimeAndExt.mimetype;
                params.extension = mimeAndExt.extension;
            } else if (type == 'audio') {
                mimeAndExt = this.getMimeTypeAndExtension(type, options.mimetypes);
                params.mimetype = mimeAndExt.mimetype;
                params.extension = mimeAndExt.extension;
            } else if (type == 'image') {
                if (typeof options.sourceType != 'undefined' && options.sourceType != 1) {
                    return Promise.reject('This source type is not supported in desktop.');
                }

                if (options.cameraDirection == 1) {
                    params.facingMode = 'user';
                }

                if (options.encodingType == 1) {
                    params.mimetype = 'image/png';
                    params.extension = 'png';
                } else {
                    params.mimetype = 'image/jpeg';
                    params.extension = 'jpeg';
                }

                if (options.quality >= 0 && options.quality <= 100) {
                    params.quality = options.quality / 100;
                }

                if (options.destinationType == 0) {
                    params.returnDataUrl = true;
                }
            }

            if (options.duration) {
                params.maxTime = options.duration * 1000;
            }

            modal = this.modalCtrl.create('CoreEmulatorCaptureMediaPage', params);
            modal.present();
            modal.onDidDismiss((data: any, role: string) => {
                if (role == 'success') {
                    deferred.resolve(data);
                } else {
                    deferred.reject(data);
                }
            });

            return deferred.promise;
        } catch (ex) {
            return Promise.reject(ex.toString());
        }
    }

    /**
     * Get the mimetype and extension to capture media.
     *
     * @param type Type of media: image, audio, video.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @return An object with mimetype and extension to use.
     */
    protected getMimeTypeAndExtension(type: string, mimetypes: string[]): { extension: string, mimetype: string } {
        const result: any = {};

        if (mimetypes && mimetypes.length) {
            // Search for a supported mimetype.
            for (let i = 0; i < mimetypes.length; i++) {
                const mimetype = mimetypes[i],
                    matches = mimetype.match(new RegExp('^' + type + '/'));

                if (matches && matches.length && this.win.MediaRecorder.isTypeSupported(mimetype)) {
                    result.mimetype = mimetype;
                    break;
                }
            }
        }

        if (result.mimetype) {
            // Found a supported mimetype in the mimetypes array, get the extension.
            result.extension = this.mimeUtils.getExtension(result.mimetype);
        } else if (type == 'video') {
            // No mimetype found, use default extension.
            result.mimetype = this.videoMimeType;
            result.extension = this.possibleVideoMimeTypes[result.mimetype];
        } else if (type == 'audio') {
            // No mimetype found, use default extension.
            result.mimetype = this.audioMimeType;
            result.extension = this.possibleAudioMimeTypes[result.mimetype];
        }

        return result;
    }

    /**
     * Init the getUserMedia function, using a deprecated function as fallback if the new one doesn't exist.
     *
     * @return Whether the function is supported.
     */
    protected initGetUserMedia(): boolean {
        const nav = <any> navigator;
        // Check if there is a function to get user media.
        if (typeof nav.mediaDevices == 'undefined') {
            nav.mediaDevices = {};
        }

        if (!nav.mediaDevices.getUserMedia) {
            // New function doesn't exist, check if the deprecated function is supported.
            nav.getUserMedia = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia;

            if (nav.getUserMedia) {
                // Deprecated function exists, support the new function using the deprecated one.
                navigator.mediaDevices.getUserMedia = (constraints): Promise<any> => {
                    const deferred = this.utils.promiseDefer();
                    nav.getUserMedia(constraints, deferred.resolve, deferred.reject);

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
     */
    protected initMimeTypes(): void {
        // Determine video and audio mimetype to use.
        for (const mimeType in this.possibleVideoMimeTypes) {
            if (this.win.MediaRecorder.isTypeSupported(mimeType)) {
                this.videoMimeType = mimeType;
                break;
            }
        }

        for (const mimeType in this.possibleAudioMimeTypes) {
            if (this.win.MediaRecorder.isTypeSupported(mimeType)) {
                this.audioMimeType = mimeType;
                break;
            }
        }
    }

    /**
     * Load the Mocks that need it.
     *
     * @return Promise resolved when loaded.
     */
    load(): Promise<void> {
        if (typeof this.win.MediaRecorder != 'undefined' && this.initGetUserMedia()) {
            this.initMimeTypes();
        }

        return Promise.resolve();
    }
}
