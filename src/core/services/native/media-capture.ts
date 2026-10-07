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
import { CoreCaptureMedia } from './capture-media';
import { Observable } from 'rxjs';

/**
 * Service wrapping the Native Media Capture plugin.
 *
 * @deprecated since 6.0. Use CoreCaptureMedia instead.
 */
@Injectable({ providedIn: 'root' })
export class MediaCapture {

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @param options Capture audio options.
     * @returns Promise resolved with an array of captured media files.
     * @deprecated since 6.0. Use CoreCaptureMedia.captureAudio instead.
     */
    async captureAudio(options?: unknown): Promise<MediaFile[] | unknown> {
        void options;

        const media = await CoreCaptureMedia.captureAudio();

        return [{
            name: media.fullPath.split('/').pop() || '',
            fullPath: media.fullPath,
            type: media.type,
            lastModifiedDate: new Date(),
            size: 0,
            getFormatData: (): void => {
                // Nothing to do.
            },
        }];
    }

    /**
     * Start the camera application and return information about captured image files.
     *
     * @param options Capture image options.
     * @returns Promise resolved when captured.
     * @deprecated since 6.0. Use CoreCaptureMedia.capturePicture instead.
     */
    async captureImage(options?: unknown): Promise<MediaFile[] | unknown> {
        void options;

        const media = await CoreCaptureMedia.capturePicture();

        return [{
            name: media.fullPath.split('/').pop() || '',
            fullPath: media.fullPath,
            type: media.format,
            lastModifiedDate: new Date(),
            size: media.size || 0,
            getFormatData: (): void => {
                // Nothing to do.
            },
        }];
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param options Capture video options.
     * @returns Promise resolved when captured.
     * @deprecated since 6.0. Use CoreCaptureMedia.captureVideo instead.
     */
    async captureVideo(options?: unknown): Promise<MediaFile[] | unknown> {
        void options;

        const media = await CoreCaptureMedia.captureVideo();

        return [{
            name: media.fullPath.split('/').pop() || '',
            fullPath: media.fullPath,
            type: media.format,
            lastModifiedDate: new Date(),
            size: media.size || 0,
            getFormatData: (): void => {
                // Nothing to do.
            },
        }];
    }

    /**
     * The recording image sizes and formats supported by the device.
     *
     * @returns empty array
     * @deprecated since 6.0. Not implemented.
     */
    supportedImageModes: unknown[] = [];

    /**
     * The audio recording formats supported by the device.
     *
     * @returns empty array
     * @deprecated since 6.0. Not implemented.
     */
    supportedAudioModes: unknown[] = [];

    /**
     * The recording video resolutions and formats supported by the device.
     *
     * @returns empty array
     * @deprecated since 6.0. Not implemented.
     */
    supportedVideoModes: unknown[] = [];

    /**
     * is fired if the capture call is successful
     *
     * @returns observable
     * @deprecated since 6.0. Not implemented.
     */
    onPendingCaptureResult(): Observable<MediaFile[]> {
        return new Observable<MediaFile[]>();
    }

    /**
     * is fired if the capture call is unsuccessful
     *
     * @returns observable
     * @deprecated since 6.0. Not implemented.
     */
    onPendingCaptureError(): Observable<unknown> {
        return new Observable<unknown>();
    }

}

/**
 * Deprecated. Remove when capture functions are fully migrated.
 * Represents a media file captured or selected from the device.
 */
export type MediaFile = {
    /**
     * The name of the file, without path information.
     */
    name: string;
    /**
     * The full path of the file, including the name.
     */
    fullPath: string;
    /**
     * The file's mime type
     */
    type: string;
    /**
     * The date and time when the file was last modified.
     */
    lastModifiedDate: Date;
    /**
     * The size of the file, in bytes.
     */
    size: number;
    /**
     * Retrieves the format information of the media file.
     */
    getFormatData(): void;
};
