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
import { CoreMediaFile, CoreNativeCamera } from '@services/native/camera';
import { CaptureError, MediaFile } from '@awesome-cordova-plugins/media-capture/ngx';

import { makeSingleton, MediaCapture } from '@singletons';
import { CoreLogger } from '@static/logger';
import { CorePlatform } from '@services/platform';
import { CoreModals } from '@services/overlays/modals';
import { CoreFileUploaderAudioRecording } from './fileuploader';
import { RecordVideoOptions, TakePhotoOptions } from '@capacitor/camera';

/**
 * Service to manage capture media.
 */
@Injectable({ providedIn: 'root' })
export class CoreCaptureMediaService {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreCaptureMediaService');
    }

    /**
     * Check whether the in-app audio recorder can be used.
     *
     * @returns Whether the in-app audio recorder can be used.
     */
    canUseInAppAudioRecorder(): boolean {
        return CorePlatform.supportsMediaCapture() && CorePlatform.supportsWebAssembly();
    }

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @returns Promise resolved with the result.
     */
    async captureAudio(): Promise<CoreFileUploaderAudioRecording[] | MediaFile[] | CaptureError> {
        if (!this.canUseInAppAudioRecorder()) {
            const media = await MediaCapture.captureAudio({ limit: 1 });

            return media;
        }

        const recording = await this.captureAudioInApp();

        return [recording];
    }

    /**
     * Record an audio file without using an external app.
     *
     * @returns Promise resolved with the file.
     * Do not use this function directly, use CoreCaptureMedia.captureAudio instead.
     */
    async captureAudioInApp(): Promise<CoreFileUploaderAudioRecording> {
        const { CoreFileUploaderAudioRecorderComponent } =
            await import('@features/fileuploader/components/audio-recorder/audio-recorder.component');

        const recording = await CoreModals.openSheet(CoreFileUploaderAudioRecorderComponent);

        if (!recording) {
            throw new Error('Recording missing from audio capture');
        }

        return recording;
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param options Options.
     * @returns Promise resolved with the result.
     */
    async captureVideo(options: RecordVideoOptions = {}): Promise<CoreMediaFile> {
        return await CoreNativeCamera.recordVideo(options);
    }

    /**
     * Take a picture or video, or load one from the library.
     *
     * @param options Options.
     * @returns Promise resolved with the result.
     */
    async capturePicture(options: TakePhotoOptions = {}): Promise<CoreMediaFile> {
        return await CoreNativeCamera.takePhoto(options);
    }

}
export const CoreCaptureMedia = makeSingleton(CoreCaptureMediaService);
