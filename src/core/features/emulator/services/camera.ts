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
import { MediaType, type CameraPlugin, type MediaResult } from '@capacitor/camera';
import { Camera } from '@services/native/camera-compat';
import { resolveCapacitorCamera } from '@services/native/camera';
import { CoreEmulatorCaptureHelper } from './capture-helper';
import {
    CoreCaptureMediaTakePhotoOptions,
    CoreCaptureMediaRecordVideoOptions,
} from '@services/native/capture-media';

/**
 * Emulates the Capacitor Camera plugin in browser.
 */
@Injectable()
// eslint-disable-next-line @typescript-eslint/no-deprecated
export class CameraMock extends Camera {

    /**
     * @inheritdoc
     */
    async takePhoto(options: CoreCaptureMediaTakePhotoOptions): Promise<MediaResult> {
        const media = await CoreEmulatorCaptureHelper.captureMedia('image', options);

        return {
            type: MediaType.Photo,
            webPath: media.fullPath,
            saved: false,
            metadata: {
                format: media.format,
                size: media.size,
            },
        };
    }

    /**
     * @inheritdoc
     */
    async recordVideo(options: CoreCaptureMediaRecordVideoOptions): Promise<MediaResult> {
        const media = await CoreEmulatorCaptureHelper.captureMedia('video', options);

        return {
            type: MediaType.Video,
            webPath: media.fullPath,
            saved: false,
            metadata: {
                format: media.format,
                size: media.size,
                duration: media.duration,
            },
        };
    }

}

/**
 * Create a browser camera plugin that uses the emulator for camera capture.
 *
 * @returns Camera plugin with emulated photo and video capture.
 */
export function createCameraMock(): CameraPlugin {
    const camera = resolveCapacitorCamera();
    const mock = new CameraMock();

    return new Proxy(camera, {
        get(target, property, receiver) {
            if (property === 'takePhoto') {
                return mock.takePhoto.bind(mock);
            }

            if (property === 'recordVideo') {
                return mock.recordVideo.bind(mock);
            }

            return Reflect.get(target, property, receiver);
        },
    });
}
