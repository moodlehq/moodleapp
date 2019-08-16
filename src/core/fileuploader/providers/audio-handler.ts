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
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderHandler, CoreFileUploaderHandlerData } from './delegate';
import { CoreFileUploaderHelperProvider } from './helper';
/**
 * Handler to record an audio to upload it.
 */
@Injectable()
export class CoreFileUploaderAudioHandler implements CoreFileUploaderHandler {
    name = 'CoreFileUploaderAudio';
    priority = 1600;

    constructor(private appProvider: CoreAppProvider, private utils: CoreUtilsProvider, private platform: Platform,
            private uploaderHelper: CoreFileUploaderHelperProvider) { }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.appProvider.isMobile() || (this.appProvider.canGetUserMedia() && this.appProvider.canRecordMedia());
    }

    /**
     * Given a list of mimetypes, return the ones that are supported by the handler.
     *
     * @param {string[]} [mimetypes] List of mimetypes.
     * @return {string[]} Supported mimetypes.
     */
    getSupportedMimetypes(mimetypes: string[]): string[] {
        if (this.platform.is('ios')) {
            // In iOS it's recorded as WAV.
            return this.utils.filterByRegexp(mimetypes, /^audio\/wav$/);
        } else if (this.platform.is('android')) {
            // In Android we don't know the format the audio will be recorded, so accept any audio mimetype.
            return this.utils.filterByRegexp(mimetypes, /^audio\//);
        } else {
            // In desktop, support audio formats that are supported by MediaRecorder.
            const mediaRecorder = (<any> window).MediaRecorder;
            if (mediaRecorder) {
                return mimetypes.filter((type) => {
                    const matches = type.match(/^audio\//);

                    return matches && matches.length && mediaRecorder.isTypeSupported(type);
                });
            }
        }

        return [];
    }

    /**
     * Get the data to display the handler.
     *
     * @return {CoreFileUploaderHandlerData} Data.
     */
    getData(): CoreFileUploaderHandlerData {
        return {
            title: 'core.fileuploader.audio',
            class: 'core-fileuploader-audio-handler',
            icon: 'microphone',
            action: (maxSize?: number, upload?: boolean, allowOffline?: boolean, mimetypes?: string[]): Promise<any> => {
                return this.uploaderHelper.uploadAudioOrVideo(true, maxSize, upload, mimetypes).then((result) => {
                    return {
                        treated: true,
                        result: result
                    };
                });
            }
        };
    }
}
