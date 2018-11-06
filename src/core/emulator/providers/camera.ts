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
import { Camera, CameraOptions } from '@ionic-native/camera';
import { CoreEmulatorCaptureHelperProvider } from './capture-helper';

/**
 * Emulates the Cordova Camera plugin in desktop apps and in browser.
 */
@Injectable()
export class CameraMock extends Camera {

    constructor(private captureHelper: CoreEmulatorCaptureHelperProvider) {
        super();
    }

    /**
     * Remove intermediate image files that are kept in temporary storage after calling camera.getPicture.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    cleanup(): Promise<any> {
        // This function is iOS only, nothing to do.
        return Promise.resolve();
    }

    /**
     * Take a picture.
     *
     * @param {CameraOptions} options Options that you want to pass to the camera.
     * @return {Promise<any>} Promise resolved when captured.
     */
    getPicture(options: CameraOptions): Promise<any> {
        return this.captureHelper.captureMedia('image', options);
    }
}
