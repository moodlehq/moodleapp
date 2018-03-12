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
import { Platform } from 'ionic-angular';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData } from '@core/fileuploader/providers/delegate';
import { CoreSharedFilesHelperProvider } from './helper';
/**
 * Handler to upload files from the album.
 */
@Injectable()
export class CoreSharedFilesUploadHandler implements CoreFileUploaderHandler {
    name = 'CoreSharedFilesUpload';
    priority = 1300;

    constructor(private sharedFilesHelper: CoreSharedFilesHelperProvider, private platform: Platform) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.platform.is('ios');
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param {string[]} [mimetypes] List of mimetypes.
     * @return {string[]} Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        return mimetypes;
    }

    /**
     * Get the data to display the handler.
     *
     * @return {CoreFileUploaderHandlerData} Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.sharedfiles.sharedfiles',
            class: 'core-sharedfiles-fileuploader-handler',
            icon: 'folder',
            action: (maxSize?: number, upload?: boolean, allowOffline?: boolean, mimetypes?: string[]): Promise<any> => {
                // Don't use the params because the file won't be uploaded, it is returned to the fileuploader.
                return this.sharedFilesHelper.pickSharedFile(mimetypes);
            }
        };
    }
}
