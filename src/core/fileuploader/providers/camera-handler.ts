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
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData } from './delegate';
import { CoreFileUploaderHelperProvider } from './helper';
/**
 * Handler to take a picture to upload it.
 */
@Injectable()
export class CoreFileUploaderCameraHandler implements CoreFileUploaderHandler {
    name = 'CoreFileUploaderCamera';
    priority = 1800;

    constructor(private appProvider: CoreAppProvider, private utils: CoreUtilsProvider,
            private uploaderHelper: CoreFileUploaderHelperProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.appProvider.isMobile() || this.appProvider.canGetUserMedia();
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param mimetypes List of mimetypes.
     * @return Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        // Camera only supports JPEG and PNG.
        return this.utils.filterByRegexp(mimetypes, /^image\/(jpeg|png)$/);
    }

    /**
     * Get the data to display the handler.
     *
     * @return Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.fileuploader.camera',
            class: 'core-fileuploader-camera-handler',
            icon: 'camera',
            action: (maxSize?: number, upload?: boolean, allowOffline?: boolean, mimetypes?: string[]): Promise<any> => {
                return this.uploaderHelper.uploadImage(false, maxSize, upload, mimetypes).then((result) => {
                    return {
                        treated: true,
                        result: result
                    };
                });
            }
        };
    }
}
