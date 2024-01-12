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
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CorePlatform.isIOS();
    }

    /**
     * @inheritdoc
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        return mimetypes;
    }

    /**
     * @inheritdoc
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.sharedfiles.sharedfiles',
            class: 'core-sharedfiles-fileuploader-handler',
            icon: 'fas-folder',
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
