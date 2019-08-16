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

import { Injectable } from '@angular/core';
import { MediaCapture, CaptureAudioOptions, CaptureImageOptions, CaptureVideoOptions } from '@ionic-native/media-capture';
import { CoreEmulatorCaptureHelperProvider } from './capture-helper';

/**
 * Emulates the Cordova MediaCapture plugin in desktop apps and in browser.
 */
@Injectable()
export class MediaCaptureMock extends MediaCapture {

    constructor(private captureHelper: CoreEmulatorCaptureHelperProvider) {
        super();
    }

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @param {CaptureAudioOptions} options Options.
     * @return {Promise<any>} Promise resolved when captured.
     */
    captureAudio(options: CaptureAudioOptions): Promise<any> {
        return this.captureHelper.captureMedia('audio', options);
    }

    /**
     * Start the camera application and return information about captured image files.
     *
     * @param {CaptureImageOptions} options Options.
     * @return {Promise<any>} Promise resolved when captured.
     */
    captureImage(options: CaptureImageOptions): Promise<any> {
        return this.captureHelper.captureMedia('captureimage', options);
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param {CaptureVideoOptions} options Options.
     * @return {Promise<any>} Promise resolved when captured.
     */
    captureVideo(options: CaptureVideoOptions): Promise<any> {
        return this.captureHelper.captureMedia('video', options);
    }
}
