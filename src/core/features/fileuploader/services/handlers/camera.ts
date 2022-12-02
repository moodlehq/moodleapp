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

import { CoreApp } from '@services/app';
import { CorePlatform } from '@services/platform';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData, CoreFileUploaderHandlerResult } from '../fileuploader-delegate';
import { CoreFileUploaderHelper } from '../fileuploader-helper';

/**
 * Handler to take a picture to upload it.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderCameraHandlerService implements CoreFileUploaderHandler {

    name = 'CoreFileUploaderCamera';
    priority = 1800;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns Promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return CorePlatform.isMobile() || CoreApp.canGetUserMedia();
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param mimetypes List of mimetypes.
     * @returns Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        // Camera only supports JPEG and PNG.
        return CoreUtils.filterByRegexp(mimetypes, /^image\/(jpeg|png)$/);
    }

    /**
     * Get the data to display the handler.
     *
     * @returns Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.fileuploader.camera',
            class: 'core-fileuploader-camera-handler',
            icon: 'camera', // Cannot use font-awesome in action sheet.
            action: async (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): Promise<CoreFileUploaderHandlerResult> => {
                const result = await CoreFileUploaderHelper.uploadImage(false, maxSize, upload, mimetypes);

                return {
                    treated: true,
                    result: result,
                };
            },
        };
    }

}

export const CoreFileUploaderCameraHandler = makeSingleton(CoreFileUploaderCameraHandlerService);
