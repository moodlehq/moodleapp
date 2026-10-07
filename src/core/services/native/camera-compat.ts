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
    CameraDirection,
    MediaTypeSelection,
} from '@capacitor/camera';
import { makeSingleton } from '@singletons';
import {
    CoreCaptureMedia,
    CoreCaptureMediaChooseFromGalleryOptions,
    CoreCaptureMediaTakePhotoOptions,
    CoreMediaFile,
} from './capture-media';
import { CoreFileFormat } from '@services/file';

/* eslint-disable @typescript-eslint/no-deprecated */

/**
 * Service wrapping the Native Camera plugin.
 *
 * @deprecated since 6.0. Use CoreCaptureMedia instead.
 */
@Injectable({ providedIn: 'root' })
export class Camera {

    /**
     * Take a picture or video, or load one from the library.
     *
     * @param options Options that you want to pass to the camera. Encoding type, quality, etc.
     *    Platform-specific quirks are described in the
     *    [Cordova plugin docs](https://github.com/apache/cordova-plugin-camera#cameraoptions-errata-).
     * @returns Returns a Promise that resolves with Base64 encoding of the image data,
     *    or the image file URI, depending on cameraOptions, otherwise rejects with an error.
     */
    async getPicture(options: CameraOptions = {}): Promise<string> {
        const sourceType = options.sourceType ?? Camera.PictureSourceType.CAMERA;
        const isGallerySource = sourceType === Camera.PictureSourceType.PHOTOLIBRARY
            || sourceType === Camera.PictureSourceType.SAVEDPHOTOALBUM;

        let mediaFile: CoreMediaFile;

        if (isGallerySource) {
            const galleryOptions: CoreCaptureMediaChooseFromGalleryOptions = {
                quality: options.quality ?? 50,
                editable: options.allowEdit ? 'in-app' : 'no',
                targetWidth: options.targetWidth,
                targetHeight: options.targetHeight,
                correctOrientation: options.correctOrientation,
            };

            switch (options.mediaType) {
                case Camera.MediaType.PICTURE:
                    galleryOptions.mediaType = MediaTypeSelection.Photo;
                    break;

                case Camera.MediaType.VIDEO:
                    galleryOptions.mediaType = MediaTypeSelection.Video;
                    break;

                case Camera.MediaType.ALLMEDIA:
                    galleryOptions.mediaType = MediaTypeSelection.All;
                    break;
            }

            mediaFile = await CoreCaptureMedia.chooseFromGallery(galleryOptions);
        } else {
            const takePhotoOptions: CoreCaptureMediaTakePhotoOptions = {
                quality: options.quality ?? 50,
                editable: options.allowEdit ? 'in-app' : 'no',
                targetWidth: options.targetWidth,
                targetHeight: options.targetHeight,
                encodingType: options.encodingType,
                webUseInput: false,
                correctOrientation: options.correctOrientation,
                saveToGallery: options.saveToPhotoAlbum,
                cameraDirection: options.cameraDirection === Camera.Direction.FRONT
                    ? CameraDirection.Front
                    : CameraDirection.Rear,
            };

            mediaFile = await CoreCaptureMedia.capturePicture(takePhotoOptions);
        }

        if (options.destinationType !== Camera.DestinationType.DATA_URL
            || (isGallerySource && options.mediaType === Camera.MediaType.VIDEO)) {
            return mediaFile.fullPath;
        }

        const dataUrl = await this.readDataUrl(mediaFile.fullPath);
        const base64Index = dataUrl.indexOf(',');

        return base64Index === -1 ? dataUrl : dataUrl.substring(base64Index + 1);
    }

    /**
     * Read a media file as a data URL.
     *
     * @param path Media file path.
     * @returns Promise resolved with the data URL.
     */
    protected async readDataUrl(path: string): Promise<string> {
        if (path.startsWith('data:')) {
            return path;
        }

        if (!path.startsWith('blob:')) {
            const { CoreFile } = await import('@services/file');

            return CoreFile.readFile(path, CoreFileFormat.FORMATDATAURL);
        }

        const blob = await (await fetch(path)).blob();

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('FileReader returned no data URL.'));
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Remove intermediate image files that are kept in temporary storage after calling camera.getPicture.
     * Not needed with capacitor.
     */
    async cleanup(): Promise<void> {
        // Nothing to do.
    }

    /* eslint-disable @typescript-eslint/naming-convention */

    /**
     * Constant for possible destination types
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
     */
    static EncodingType = {
        /** Return JPEG encoded image */
        JPEG: 0,
        /** Return PNG encoded image */
        PNG: 1,
    };

    /**
     * Convenience constant
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
     */
    static Direction = {
        /** Use the back-facing camera */
        BACK: 0,
        /** Use the front-facing camera */
        FRONT: 1,
    };

}
/**
 * @deprecated since 6.0. Use CoreCaptureMedia instead.
 */
export const CoreNativeCamera = makeSingleton(Camera);

/**
 * @deprecated since 6.0. Use CoreCaptureMedia.capturePicture or CoreCaptureMedia.chooseFromGallery instead.
 */
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
