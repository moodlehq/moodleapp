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
import {
    MediaCapture,
    CaptureImageOptions,
    CaptureVideoOptions,
    MediaFile,
} from '@ionic-native/media-capture/ngx';

import { CoreEmulatorCaptureHelper } from './capture-helper';

/**
 * Emulates the Cordova MediaCapture plugin in browser.
 */
@Injectable()
export class MediaCaptureMock extends MediaCapture {

    /**
     * Start the camera application and return information about captured image files.
     *
     * @param options Options.
     * @returns Promise resolved when captured.
     */
    captureImage(options: CaptureImageOptions): Promise<MediaFile[]> {
        return CoreEmulatorCaptureHelper.captureMedia('captureimage', options);
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param options Options.
     * @returns Promise resolved when captured.
     */
    captureVideo(options: CaptureVideoOptions): Promise<MediaFile[]> {
        return CoreEmulatorCaptureHelper.captureMedia('video', options);
    }

}
