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

import { CoreMedia } from '@static/media';
import { CorePlatform } from '@services/platform';
import { CoreArray } from '@static/array';
import { makeSingleton } from '@singletons';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData, CoreFileUploaderHandlerResult } from '../fileuploader-delegate';
import { CoreFileUploaderHelper } from '../fileuploader-helper';

/**
 * Handler to record a video to upload it.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderVideoHandlerService implements CoreFileUploaderHandler {

    name = 'CoreFileUploaderVideo';
    priority = 1400;

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return CorePlatform.isMobile() || (CoreMedia.canGetUserMedia() && CoreMedia.canRecordMedia());
    }

    /**
     * @inheritdoc
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        if (CorePlatform.isIOS()) {
            // In iOS it's recorded as MOV.
            return CoreArray.filterByRegexp(mimetypes, /^video\/quicktime$/);
        } else if (CorePlatform.isAndroid()) {
            // In Android we don't know the format the video will be recorded, so accept any video mimetype.
            return CoreArray.filterByRegexp(mimetypes, /^video\//);
        } else {
            // In browser, support video formats that are supported by MediaRecorder.
            if (MediaRecorder) {
                return mimetypes.filter((type) => {
                    const matches = type.match(/^video\//);

                    return matches?.length && MediaRecorder.isTypeSupported(type);
                });
            }
        }

        return [];
    }

    /**
     * @inheritdoc
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.fileuploader.video',
            class: 'core-fileuploader-video-handler',
            icon: 'fas-video',
            action: async (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): Promise<CoreFileUploaderHandlerResult> => {
                const result = await CoreFileUploaderHelper.uploadAudioOrVideo(false, maxSize, upload, mimetypes);

                return {
                    treated: true,
                    result: result,
                };
            },
        };
    }

}

export const CoreFileUploaderVideoHandler = makeSingleton(CoreFileUploaderVideoHandlerService);
