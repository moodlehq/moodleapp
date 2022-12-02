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
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';

import { CoreEmulatorCaptureHelper } from './capture-helper';

// @todo remove android.media.action.IMAGE_CAPTURE and android.intent.action.GET_CONTENT entries
// from config.xml once https://github.com/apache/cordova-plugin-camera/issues/673 is resolved.
// (this is written here because comments get stripped out from config.xml)

/**
 * Emulates the Cordova Camera plugin in browser.
 */
@Injectable()
export class CameraMock extends Camera {

    /**
     * Remove intermediate image files that are kept in temporary storage after calling camera.getPicture.
     *
     * @returns Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cleanup(): Promise<any> {
        // This function is iOS only, nothing to do.
        return Promise.resolve();
    }

    /**
     * Take a picture.
     *
     * @param options Options that you want to pass to the camera.
     * @returns Promise resolved when captured.
     */
    getPicture(options: CameraOptions): Promise<string> {
        return CoreEmulatorCaptureHelper.captureMedia('image', options);
    }

}
