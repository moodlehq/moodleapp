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
    MediaResult,
    TakePhotoOptions,
    RecordVideoOptions,
    ChooseFromGalleryOptions,
    CameraErrorCode,
} from '@capacitor/camera';
import { Camera, makeSingleton } from '@singletons';
import { CoreModals } from '@services/overlays/modals';
import { CoreFileUploaderAudioRecording } from '../../features/fileuploader/services/fileuploader';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreFileUtils } from '@static/file-utils';

/**
 * Service to manage capture media.
 */
@Injectable({ providedIn: 'root' })
export class CoreCaptureMediaService {

    /**
     * Check whether the in-app audio recorder can be used.
     *
     * @returns Whether the in-app audio recorder can be used.
     * @deprecated since 6.0. The in-app audio recorder is now used on every platform.
     */
    canUseInAppAudioRecorder(): boolean {
        return true;
    }

    /**
     * Start the audio recorder application and return information about captured audio clip files.
     *
     * @returns Promise resolved with the result.
     */
    async captureAudio(): Promise<CoreFileUploaderAudioRecording> {
        // @todo Capacitor: Decide where to place this component.
        const { CoreFileUploaderAudioRecorderComponent } =
            await import('@features/fileuploader/components/audio-recorder/audio-recorder.component');

        const recording = await CoreModals.openSheet(CoreFileUploaderAudioRecorderComponent);

        if (!recording) {
            throw new Error('Recording missing from audio capture');
        }

        return recording;
    }

    /**
     * Record an audio file without using an external app.
     *
     * @returns Promise resolved with the file.
     * Do not use this function directly, use CoreCaptureMedia.captureAudio instead.
     */
    async captureAudioInApp(): Promise<CoreFileUploaderAudioRecording> {
        return await CoreCaptureMedia.captureAudio();
    }

    /**
     * Start the video recorder application and return information about captured video clip files.
     *
     * @param options Options.
     * @returns Promise resolved with the result.
     */
    async captureVideo(options: CoreCaptureMediaRecordVideoOptions = {}): Promise<CoreMediaFile> {
        const result = await this.callCameraPlugin(() => Camera.recordVideo({
            ...options,
            isPersistent: false,
            includeMetadata: true,
        }));

        return this.getMediaFileFromResult(result);
    }

    /**
     * Open the device's camera and allow the user to take a photo.
     *
     * @param options Options to configure the camera.
     * @returns Promise resolved with the photo path.
     */
    async capturePicture(options: CoreCaptureMediaTakePhotoOptions = {}): Promise<CoreMediaFile> {
        const result = await this.callCameraPlugin(() => Camera.takePhoto({ ...options, includeMetadata: true }));

        return this.getMediaFileFromResult(result);
    }

    /**
     * Choose a media file from the gallery.
     *
     * @param options Options for choosing the media from the gallery.
     * @returns Promise resolved with the chosen media file.
     */
    async chooseFromGallery(options: CoreCaptureMediaChooseFromGalleryOptions = {}): Promise<CoreMediaFile> {
        const result = await this.callCameraPlugin(() => Camera.chooseFromGallery({
            ...options,
            webUseInput: true,
            limit: 1, // In case we want more, we should create a new method for that.
            includeMetadata: true,
        }));
        const firstResult = result.results[0];

        return this.getMediaFileFromResult(firstResult);    }

    /**
     * Call the camera plugin, translating its cancellation errors to a silent error.
     *
     * @param action Plugin action to run.
     * @returns Promise resolved with the plugin result.
     */
    protected async callCameraPlugin<T>(action: () => Promise<T>): Promise<T> {
        try {
            return await action();
        } catch (error) {
            if (this.isCancellationError(error)) {
                throw new CoreCanceledError();
            }

            throw error;
        }
    }

    /**
     * Get a CoreMediaFile object from a media result.
     *
     * @param result The media result obtained from the camera or gallery.
     * @returns The corresponding CoreMediaFile object.
     */
    protected getMediaFileFromResult(result: MediaResult): CoreMediaFile {
        return {
            fullPath: result.uri
                 ? CoreFileUtils.convertToFileUrl(result.uri)
                 : result.webPath || '',
            format: result.metadata?.format || '',
            size: result.metadata?.size,
            duration: result.metadata?.duration,
            resolution: result.metadata?.resolution,
            creationDate: result.metadata?.creationDate,
        };
    }

    /**
     * Check whether a camera plugin error represents user cancellation.
     *
     * @param error Error returned by the plugin.
     * @returns Whether the error represents cancellation.
     */
    protected isCancellationError(error: unknown): boolean {
        if (typeof error === 'string') {
            return error.toLowerCase() === 'user cancelled photos app';
        }

        if (typeof error !== 'object' || error === null) {
            return false;
        }

        const code = 'code' in error ? error.code : undefined;
        const message = 'message' in error ? error.message : undefined;

        return [
            CameraErrorCode.TakePhotoCancelled,
            CameraErrorCode.RecordVideoCancelled,
            CameraErrorCode.ChooseMediaCancelled,
            CameraErrorCode.EditPhotoCancelled,
        ].includes(code as CameraErrorCode) ||
        (typeof message === 'string' && message.toLowerCase() === 'user cancelled photos app');
    }

}
export const CoreCaptureMedia = makeSingleton(CoreCaptureMediaService);

export type CoreCaptureMediaTakePhotoOptions = Omit<TakePhotoOptions, 'includeMetadata'>;

export type CoreCaptureMediaRecordVideoOptions = Omit<RecordVideoOptions, 'includeMetadata'|'isPersistent'>;

export type CoreCaptureMediaChooseFromGalleryOptions = Omit<ChooseFromGalleryOptions, 'includeMetadata'|'webUseInput'|'limit'>;

export type CoreMediaFile = {
    /**
     * The path pointing to the media file.
     */
    fullPath: string;
    /**
     * The format of the image, ex: jpeg, png, mp4.
     */
    format: string;
    /**
     * File size of the media, in bytes.
     */
    size?: number;
    /**
     * Only applicable for `MediaType.Video` - the duration of the media, in seconds.
     */
    duration?: number;
    /**
     * The resolution of the media, in `<width>x<height>` format. Example: '1920x1080'.
     */
    resolution?: string;
    /**
     * The date and time the media was created, in ISO 8601 format.
     * If creation date is not available (e.g. Android 7 and below), the last modified date is returned.
     * For Web, the last modified date is always returned.
     */
    creationDate?: string;
};
