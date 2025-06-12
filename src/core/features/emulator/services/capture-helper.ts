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
import { CameraOptions } from '@awesome-cordova-plugins/camera/ngx';
import { CaptureImageOptions, CaptureVideoOptions, MediaFile } from '@awesome-cordova-plugins/media-capture/ngx';

import { CoreMimetype } from '@singletons/mimetype';
import { makeSingleton, ModalController } from '@singletons';
import { CaptureMediaComponentInputs, CoreEmulatorCaptureMediaComponent } from '../components/capture-media/capture-media';

/**
 * Helper service with some features to capture media (image, video).
 */
@Injectable({ providedIn: 'root' })
export class CoreEmulatorCaptureHelperProvider {

    protected possibleVideoMimeTypes = {
        'video/webm;codecs=vp9': 'webm',
        'video/webm;codecs=vp8': 'webm',
        'video/ogg': 'ogv',
    };

    videoMimeType?: string;

    /**
     * Capture media (image, video).
     *
     * @param type Type of media: image, video.
     * @param options Optional options.
     * @returns Promise resolved when captured, rejected if error.
     */
    captureMedia(type: 'image', options?: MockCameraOptions): Promise<string>;
    captureMedia(type: 'captureimage', options?: MockCaptureImageOptions): Promise<MediaFile[]>;
    captureMedia(type: 'video', options?: MockCaptureVideoOptions): Promise<MediaFile[]>;
    async captureMedia(
        type: 'image' | 'captureimage' | 'video',
        options?: MockCameraOptions | MockCaptureImageOptions | MockCaptureVideoOptions,
    ): Promise<MediaFile[] | string> {
        options = options || {};

        // Build the params to send to the modal.
        const params: CaptureMediaComponentInputs = {
            type: type,
        };

        // Initialize some data based on the type of media to capture.
        if (type === 'video') {
            const mimeAndExt = this.getMimeTypeAndExtension(type, options.mimetypes);
            params.mimetype = mimeAndExt.mimetype;
            params.extension = mimeAndExt.extension;
        } else if (type === 'image') {
            if ('sourceType' in options && options.sourceType !== undefined && options.sourceType != 1) {
                return Promise.reject('This source type is not supported in browser.');
            }

            if ('cameraDirection' in options && options.cameraDirection === 1) {
                params.facingMode = 'user';
            }

            if ('encodingType' in options && options.encodingType === 1) {
                params.mimetype = 'image/png';
                params.extension = 'png';
            } else {
                params.mimetype = 'image/jpeg';
                params.extension = 'jpeg';
            }

            if ('quality' in options && options.quality !== undefined && options.quality >= 0 && options.quality <= 100) {
                params.quality = options.quality / 100;
            }

            if ('destinationType' in options && options.destinationType === 0) {
                params.returnDataUrl = true;
            }
        }

        if ('duration' in options && options.duration) {
            params.maxTime = options.duration * 1000;
        }

        const modal = await ModalController.create({
            component: CoreEmulatorCaptureMediaComponent,
            cssClass: 'core-modal-fullscreen',
            componentProps: params,
        });

        await modal.present();

        const result = await modal.onDidDismiss();

        if (result.role === 'success') {
            return result.data;
        } else {
            throw result.data;
        }
    }

    /**
     * Get the mimetype and extension to capture media.
     *
     * @param type Type of media: image, video.
     * @param mimetypes List of supported mimetypes. If undefined, all mimetypes supported.
     * @returns An object with mimetype and extension to use.
     */
    protected getMimeTypeAndExtension(type: string, mimetypes?: string[]): { extension?: string; mimetype?: string } {
        const result: { extension?: string; mimetype?: string } = {};

        if (mimetypes?.length) {
            // Search for a supported mimetype.
            result.mimetype = mimetypes.find((mimetype) => {
                const matches = mimetype.match(new RegExp(`^${type}/`));

                return matches?.length && window.MediaRecorder.isTypeSupported(mimetype);
            });
        }

        if (result.mimetype) {
            // Found a supported mimetype in the mimetypes array, get the extension.
            result.extension = CoreMimetype.getExtension(result.mimetype);
        } else if (type === 'video' && this.videoMimeType) {
            // No mimetype found, use default extension.
            result.mimetype = this.videoMimeType;
            result.extension = this.possibleVideoMimeTypes[result.mimetype];
        }

        return result;
    }

    /**
     * Init the getUserMedia function, using a deprecated function as fallback if the new one doesn't exist.
     *
     * @returns Whether the function is supported.
     */
    protected initGetUserMedia(): boolean {
        return !!navigator.mediaDevices.getUserMedia;
    }

    /**
     * Initialize the mimetypes to use when capturing.
     */
    protected initMimeTypes(): void {
        for (const mimeType in this.possibleVideoMimeTypes) {
            if (window.MediaRecorder.isTypeSupported(mimeType)) {
                this.videoMimeType = mimeType;
                break;
            }
        }
    }

    /**
     * Load the Mocks that need it.
     *
     * @returns Promise resolved when loaded.
     */
    load(): Promise<void> {
        if (window.MediaRecorder !== undefined && this.initGetUserMedia()) {
            this.initMimeTypes();
        }

        return Promise.resolve();
    }

}

export const CoreEmulatorCaptureHelper = makeSingleton(CoreEmulatorCaptureHelperProvider);

export interface MockCameraOptions extends CameraOptions {
    mimetypes?: string[]; // Allowed mimetypes.
}
export interface MockCaptureImageOptions extends CaptureImageOptions {
    mimetypes?: string[]; // Allowed mimetypes.
}
export interface MockCaptureVideoOptions extends CaptureVideoOptions {
    mimetypes?: string[]; // Allowed mimetypes.
}
