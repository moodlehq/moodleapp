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
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData, CoreFileUploaderHandlerResult } from '../fileuploader-delegate';
import { CoreFileUploaderHelper } from '../fileuploader-helper';
/**
 * Handler to record an audio to upload it.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileUploaderAudioHandlerService implements CoreFileUploaderHandler {

    name = 'CoreFileUploaderAudio';
    priority = 1600;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return Promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return CoreApp.isMobile() || (CoreApp.canGetUserMedia() && CoreApp.canRecordMedia());
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param mimetypes List of mimetypes.
     * @return Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        if (CoreApp.isIOS()) {
            // In iOS it's recorded as WAV.
            return CoreUtils.filterByRegexp(mimetypes, /^audio\/wav$/);
        } else if (CoreApp.isAndroid()) {
            // In Android we don't know the format the audio will be recorded, so accept any audio mimetype.
            return CoreUtils.filterByRegexp(mimetypes, /^audio\//);
        } else {
            // In browser, support audio formats that are supported by MediaRecorder.
            if (MediaRecorder) {
                return mimetypes.filter((type) => {
                    const matches = type.match(/^audio\//);

                    return matches && matches.length && MediaRecorder.isTypeSupported(type);
                });
            }
        }

        return [];
    }

    /**
     * Get the data to display the handler.
     *
     * @return Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.fileuploader.audio',
            class: 'core-fileuploader-audio-handler',
            icon: 'mic', // Cannot use font-awesome in action sheet.
            action: async (
                maxSize?: number,
                upload?: boolean,
                allowOffline?: boolean,
                mimetypes?: string[],
            ): Promise<CoreFileUploaderHandlerResult> => {
                const result = await CoreFileUploaderHelper.uploadAudioOrVideo(true, maxSize, upload, mimetypes);

                return {
                    treated: true,
                    result: result,
                };
            },
        };
    }

}

export const CoreFileUploaderAudioHandler = makeSingleton(CoreFileUploaderAudioHandlerService);
