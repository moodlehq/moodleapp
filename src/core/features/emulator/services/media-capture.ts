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
import { MediaCapture, MediaFile } from '@awesome-cordova-plugins/media-capture/ngx';

import { CoreEmulatorCaptureHelper } from './capture-helper';

/**
 * Emulates the Cordova MediaCapture plugin in browser.
 */
@Injectable()
export class MediaCaptureMock extends MediaCapture {

    /**
     * Start the camera application and return information about captured image files.
     *
     * @returns Promise resolved when captured.
     * @deprecated since 6.0. Use Camera.takePhoto instead.
     */
    async captureImage(): Promise<MediaFile[]> {
        const media = await CoreEmulatorCaptureHelper.captureMedia('image');

        return [{
            name: media.fullPath.split('/').pop() || '',
            fullPath: media.fullPath,
            type: media.format,
            lastModifiedDate: new Date(),
            size: media.size || 0,
            getFormatData: (): void => {
                // Nothing to do.
            },
        }];
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @returns Promise resolved when captured.
     * @deprecated since 6.0. Use Camera.recordVideo instead.
     */
    async captureVideo(): Promise<MediaFile[]> {
        const media = await CoreEmulatorCaptureHelper.captureMedia('video');

        return [{
            name: media.fullPath.split('/').pop() || '',
            fullPath: media.fullPath,
            type: media.format,
            lastModifiedDate: new Date(),
            size: media.size || 0,
            getFormatData: (): void => {
                // Nothing to do.
            },
        }];
    }

}
