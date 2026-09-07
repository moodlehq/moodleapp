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
    Camera as CameraPlugin,
    ChooseFromGalleryOptions,
    MediaResult,
    MediaTypeSelection,
    RecordVideoOptions,
    TakePhotoOptions,
} from '@capacitor/camera';
import { makeSingleton } from '@singletons';

/**
 * Service wrapping the Native Camera plugin.
 */
@Injectable({ providedIn: 'root' })
export class Camera {

    /**
     * Open the device's camera and allow the user to take a photo.
     *
     * @param options Options to configure the camera.
     * @returns Promise resolved with the photo path.
     */
    async takePhoto(options: TakePhotoOptions): Promise<CoreMediaFile> {
        options.includeMetadata = true;

        const result = await CameraPlugin.takePhoto(options);

        return this.getMediaFileFromResult(result);
    }

    /**
     * Allow users to choose pictures, videos, or both, directly from their gallery.
     *
     * @param options Options to configure the gallery selection.
     * @returns Promise resolved with the selected media path.
     */
    async chooseFromGallery(options: ChooseFromGalleryOptions): Promise<CoreMediaFile> {
        options.webUseInput = true;
        options.limit = 1; // In case we want more, we should create a new method for that.
        options.includeMetadata = true;

        const result = await CameraPlugin.chooseFromGallery(options);
        const firstResult = result.results[0];

        return this.getMediaFileFromResult(firstResult);
    }

    /**
     * Open the device's camera and allow the user to record a video.
     *
     * @param options Options to configure the video recording.
     * @returns Promise resolved with the recorded video path.
     */
    async recordVideo(options: RecordVideoOptions): Promise<CoreMediaFile> {
        options.isPersistent = false;
        options.includeMetadata = true;

        const result = await CameraPlugin.recordVideo(options);

        return this.getMediaFileFromResult(result);
    }

    protected getMediaFileFromResult(result: MediaResult): CoreMediaFile {
        return {
            fullPath: result.uri ? `file://${result.uri}` : result.webPath || '',
            format: result.metadata?.format || '',
            size: result.metadata?.size,
            duration: result.metadata?.duration,
            resolution: result.metadata?.resolution,
            creationDate: result.metadata?.creationDate,
        };
    }

    /**
     * Take a picture or video, or load one from the library.
     *
     * @param options Options that you want to pass to the camera. Encoding type, quality, etc.
     *    Platform-specific quirks are described in the
     *    [Cordova plugin docs](https://github.com/apache/cordova-plugin-camera#cameraoptions-errata-).
     * @returns Returns a Promise that resolves with Base64 encoding of the image data,
     *    or the image file URI, depending on cameraOptions, otherwise rejects with an error.
     *
     * @deprecated since 6.0. Use takePhoto or chooseFromGallery instead.
     * option destinationType is not supported.
     */
    async getPicture(options: CameraOptions): Promise<string> {
        if (options.sourceType === PictureSourceType.PHOTOLIBRARY || options.sourceType === PictureSourceType.SAVEDPHOTOALBUM) {
            const galleryOptions: ChooseFromGalleryOptions = {
                quality: options.quality,
                editable: options.allowEdit ? 'in-app' : 'no',
                targetWidth: options.targetWidth,
                targetHeight: options.targetHeight,
                webUseInput: true,
                correctOrientation: options.correctOrientation,
            };

            switch (options.mediaType) {
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                case Camera.MediaType.PICTURE:
                    galleryOptions.mediaType = MediaTypeSelection.Photo;
                    break;
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                case Camera.MediaType.VIDEO:
                    galleryOptions.mediaType = MediaTypeSelection.Video;
                    break;
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                case Camera.MediaType.ALLMEDIA:
                    galleryOptions.mediaType = MediaTypeSelection.All;
                    break;
            }

            return (await this.chooseFromGallery(galleryOptions)).fullPath;
        } else {
            const takePhotoOptions: TakePhotoOptions = {
                quality: options.quality,
                editable: options.allowEdit ? 'in-app' : 'no',
                targetWidth: options.targetWidth,
                targetHeight: options.targetHeight,
                encodingType: options.encodingType,
                webUseInput: false,
                correctOrientation: options.correctOrientation,
                saveToGallery: options.saveToPhotoAlbum,
            };

            return (await this.takePhoto(takePhotoOptions)).fullPath;
        }
    }

    /**
     * Remove intermediate image files that are kept in temporary storage after calling camera.getPicture.
     * Not needed with capacitor.
     *
     * @deprecated since 6.0. Not needed anymore.
     */
    async cleanup(): Promise<void> {
        // Nothing to do.
    }
    /* eslint-disable @typescript-eslint/naming-convention */

    /**
     * Constant for possible destination types
     *
     * @deprecated since 6.0. DestinationType is not supported anymore.
     */
    static DestinationType = {
        /**
         * Return base64 encoded string. DATA_URL can be very memory intensive and cause
         * app crashes or out of memory errors.
         * Use FILE_URI or NATIVE_URI if possible
         */
        DATA_URL: 0,
        /** Return file uri (content://media/external/images/media/2 for Android) */
        FILE_URI: 1,
        /** Return native uri (eg. asset-library://... for iOS) */
        NATIVE_URI: 2,
    };

    /**
     * Convenience constant
     *
     * @deprecated since 6.0. Will be removed in future versions.
     */
    static EncodingType = {
        /** Return JPEG encoded image */
        JPEG: 0,
        /** Return PNG encoded image */
        PNG: 1,
    };

    /**
     * Convenience constant
     *
     * @deprecated since 6.0. Will be removed in future versions.
     */
    static MediaType = {
        /** Allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType */
        PICTURE: 0,
        /** Allow selection of video only, ONLY RETURNS URL */
        VIDEO: 1,
        /** Allow selection from all media types */
        ALLMEDIA: 2,
    };

    /**
     * Convenience constant
     *
     * @deprecated since 6.0. Will be removed in future versions.
     */
    static PictureSourceType = {
        /** Choose image from picture library (same as PHOTOLIBRARY for Android) */
        PHOTOLIBRARY: 0,
        /** Take picture from camera */
        CAMERA: 1,
        /** Choose image from picture library (same as SAVEDPHOTOALBUM for Android) */
        SAVEDPHOTOALBUM: 2,
    };

    /**
     * Convenience constant
     *
     * @deprecated since 6.0. Will be removed in future versions.
     */
    static PopoverArrowDirection = {
        ARROW_UP: 1,
        ARROW_DOWN: 2,
        ARROW_LEFT: 4,
        ARROW_RIGHT: 8,
        ARROW_ANY: 15,
    };

    /**
     * Convenience constant
     *
     * @deprecated since 6.0. Will be removed in future versions.
     */
    static Direction = {
        /** Use the back-facing camera */
        BACK: 0,
        /** Use the front-facing camera */
        FRONT: 1,
    };

}
export const CoreNativeCamera = makeSingleton(Camera);

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

export type CameraOptions = {
    /** Picture quality in range 0-100. Default is 50 */
    quality?: number;
    /**
     * Choose the format of the return value.
     * Defined in Camera.DestinationType. Default is FILE_URI.
     *      DATA_URL : 0,   Return image as base64-encoded string (DATA_URL can be very memory intensive
     *  and cause app crashes or out of memory errors. Use FILE_URI or NATIVE_URI if possible),
     *      FILE_URI : 1,   Returns image file URI,
     *      NATIVE_URI : 2  Return image native URI
     *          (e.g., assets-library:// on iOS or content:// on Android)
     */
    destinationType?: DestinationType;
    /**
     * Set the source of the picture.
     * Defined in Camera.PictureSourceType. Default is CAMERA.
     *      PHOTOLIBRARY : 0,
     *      CAMERA : 1,
     *      SAVEDPHOTOALBUM : 2
     */
    sourceType?: PictureSourceType;
    /** Allow simple editing of image before selection. */
    allowEdit?: boolean;
    /**
     * Choose the returned image file's encoding.
     * Defined in Camera.EncodingType. Default is JPEG
     *      JPEG : 0    Return JPEG encoded image
     *      PNG : 1     Return PNG encoded image
     */
    encodingType?: EncodingType;
    /**
     * Width in pixels to scale image. Must be used with targetHeight.
     * Aspect ratio remains constant.
     */
    targetWidth?: number;
    /**
     * Height in pixels to scale image. Must be used with targetWidth.
     * Aspect ratio remains constant.
     */
    targetHeight?: number;
    /**
     * Set the type of media to select from. Only works when PictureSourceType
     * is PHOTOLIBRARY or SAVEDPHOTOALBUM. Defined in Camera.MediaType
     *      PICTURE: 0      allow selection of still pictures only. DEFAULT.
     *          Will return format specified via DestinationType
     *      VIDEO: 1        allow selection of video only, WILL ALWAYS RETURN FILE_URI
     *      ALLMEDIA : 2    allow selection from all media types
     */
    mediaType?: MediaType;
    /** Rotate the image to correct for the orientation of the device during capture. */
    correctOrientation?: boolean;
    /** Save the image to the photo album on the device after capture. */
    saveToPhotoAlbum?: boolean;
    /**
     * Choose the camera to use (front- or back-facing).
     * Defined in Camera.Direction. Default is BACK.
     *      BACK: 0
     *      FRONT: 1
     */
    cameraDirection?: number;
    /** iOS-only options that specify popover location in iPad. Defined in CameraPopoverOptions. */
    popoverOptions?: unknown;
};

enum MediaType {
  PICTURE = 0,
  VIDEO,
  ALLMEDIA,
}

enum PictureSourceType {
    PHOTOLIBRARY = 0,
    CAMERA,
    SAVEDPHOTOALBUM,
}

enum DestinationType {
  DATA_URL = 0,
  FILE_URL,
  NATIVE_URI,
}

enum EncodingType {
  JPEG = 0,
  PNG,
}
