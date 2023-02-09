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
    CoreFileUploaderHandler,
    CoreFileUploaderHandlerData,
    CoreFileUploaderHandlerResult,
} from '@features/fileuploader/services/fileuploader-delegate';
import { CorePlatform } from '@services/platform';
import { makeSingleton } from '@singletons';
import { CoreSharedFilesHelper } from '../sharedfiles-helper';
/**
 * Handler to upload files from the album.
 */
@Injectable({ providedIn: 'root' })
export class CoreSharedFilesUploadHandlerService implements CoreFileUploaderHandler {

    name = 'CoreSharedFilesUpload';
    priority = 1300;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return CorePlatform.isIOS();
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param mimetypes List of mimetypes.
     * @returns Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        return mimetypes;
    }

    /**
     * Get the data to display the handler.
     *
     * @returns Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.sharedfiles.sharedfiles',
            class: 'core-sharedfiles-fileuploader-handler',
            icon: 'folder', // Cannot use font-awesome in action sheet.
            action: (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): Promise<CoreFileUploaderHandlerResult> => CoreSharedFilesHelper.pickSharedFile(mimetypes),
        };
    }

}

export const CoreSharedFilesUploadHandler = makeSingleton(CoreSharedFilesUploadHandlerService);
