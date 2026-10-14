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
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData, CoreFileUploaderHandlerResult } from '../fileuploader-delegate';
import { CoreFileUploaderHelper } from '../fileuploader-helper';
import { makeSingleton } from '@singletons';

/**
 * Handler to upload any type of file.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderFileHandlerService implements CoreFileUploaderHandler {

    name = 'CoreFileUploaderFile';
    priority = 1200;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
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
        const handler: CoreFileUploaderHandlerData = {
            title: 'core.fileuploader.file',
            class: 'core-fileuploader-file-handler',
            icon: 'fas-file-lines',
        };

        handler.action = async (
            maxSize?: number,
            upload?: boolean,
            allowOffline?: boolean,
            mimetypes?: string[],
        ): Promise<CoreFileUploaderHandlerResult> => {
            const result = await CoreFileUploaderHelper.chooseAndUploadFile(maxSize, upload, allowOffline, mimetypes);

            return {
                treated: true,
                result,
            };
        };

        return handler;
    }

}

export const CoreFileUploaderFileHandler = makeSingleton(CoreFileUploaderFileHandlerService);
