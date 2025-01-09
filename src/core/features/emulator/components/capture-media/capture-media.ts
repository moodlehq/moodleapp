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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, Input } from '@angular/core';
import { MediaFile } from '@awesome-cordova-plugins/media-capture/ngx';

import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTimeUtils } from '@services/utils/time';
import { ModalController, Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreCaptureError } from '@classes/errors/captureerror';
import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CorePath } from '@singletons/path';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreLoadings } from '@services/overlays/loadings';

/**
 * Page to capture media in browser.
 */
@Component({
    selector: 'core-emulator-capture-media',
    templateUrl: 'capture-media.html',
    styleUrl: 'capture-media.scss',
})
export class CoreEmulatorCaptureMediaComponent implements OnInit, OnDestroy {

    @Input() type?: 'video' | 'image' | 'captureimage';
    @Input() maxTime?: number; // Max time to capture.
    @Input() facingMode?: string; // Camera facing mode.
    @Input() mimetype?: string;
    @Input() extension?: string;
    @Input() quality?: number; // Only for images.
    @Input({ transform: toBoolean }) returnDataUrl = false; // Whether it should return a data img. Only for images.

    @ViewChild('streamVideo') streamVideo?: ElementRef;
    @ViewChild('previewVideo') previewVideo?: ElementRef;
    @ViewChild('imgCanvas') imgCanvas?: ElementRef;
    @ViewChild('previewImage') previewImage?: ElementRef;

    title?: string; // The title of the page.
    isVideo?: boolean; // Whether it should capture video.
    isImage?: boolean; // Whether it should capture image.
    readyToCapture?: boolean; // Whether it's ready to capture.
    hasCaptured?: boolean; // Whether it has captured something.
    isCapturing?: boolean; // Whether it's capturing.
    resetChrono?: boolean; // Boolean to reset the chrono.

    protected isCaptureImage?: boolean; // To identify if it's capturing an image using media capture plugin (instead of camera).
    protected mediaRecorder?: MediaRecorder; // To record video.
    protected previewMedia?: HTMLVideoElement; // The element to preview the video captured.
    protected mediaBlob?: Blob; // A Blob where the captured data is stored.
    protected localMediaStream?: MediaStream;

    constructor(
        protected changeDetectorRef: ChangeDetectorRef,
    ) {}

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.initVariables();
        this.initHtmlCapture();
    }

    /**
     * Initialize some variables based on the params.
     */
    protected initVariables(): void {
        this.facingMode = this.facingMode || 'environment';
        this.quality = this.quality || 0.92;

        if (this.type == 'captureimage') {
            this.isCaptureImage = true;
            this.type = 'image';
        }

        // Initialize some data based on the type of media to capture.
        if (this.type == 'video') {
            this.isVideo = true;
            this.title = 'core.capturevideo';
        } else if (this.type == 'image') {
            this.isImage = true;
            this.title = 'core.captureimage';
        }
    }

    /**
     * Init HTML recorder for browser
     * .
     *
     * @returns Promise resolved when done.
     */
    protected async initHtmlCapture(): Promise<void> {
        const constraints = {
            video: { facingMode: this.facingMode },
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            let chunks: Blob[] = [];
            this.localMediaStream = stream;

            if (!this.isImage) {
                if (this.isVideo) {
                    this.previewMedia = this.previewVideo?.nativeElement;
                }

                this.mediaRecorder = new MediaRecorder(this.localMediaStream, { mimeType: this.mimetype });

                // When video is recorded, add it to the list of chunks.
                this.mediaRecorder.ondataavailable = (e): void => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                // When recording stops, create a Blob element with the recording and set it to the video.
                this.mediaRecorder.onstop = (): void => {
                    this.mediaBlob = new Blob(chunks);
                    chunks = [];

                    if (this.previewMedia) {
                        this.previewMedia.src = window.URL.createObjectURL(this.mediaBlob);
                    }
                };
            }

            if (!this.isImage && !this.isVideo) {
                // It's ready to capture.
                this.readyToCapture = true;

                return;
            }

            const streamVideo = this.streamVideo;
            if (!streamVideo) {
                throw new CoreError('Video element not found.');
            }

            let hasLoaded = false;

            // If stream isn't ready in a while, show error.
            const waitTimeout = window.setTimeout(() => {
                if (!hasLoaded) {
                    // Show error.
                    hasLoaded = true;
                    this.dismissWithError(-1, 'Cannot connect to webcam.');
                }
            }, 10000);

            // Listen for stream ready to display the stream.
            streamVideo.nativeElement.onloadedmetadata = (): void => {
                if (hasLoaded) {
                    // Already loaded or timeout triggered, stop.
                    return;
                }

                hasLoaded = true;
                clearTimeout(waitTimeout);
                this.readyToCapture = true;
                streamVideo.nativeElement.onloadedmetadata = null;
                // Force change detection. Angular doesn't detect these async operations.
                this.changeDetectorRef.detectChanges();
            };

            // Set the stream as the source of the video.
            streamVideo.nativeElement.srcObject = this.localMediaStream;
        } catch (error) {
            this.dismissWithError(-1, error.message || error);
        }
    }

    /**
     * Main action clicked: record or stop recording.
     */
    async actionClicked(): Promise<void> {
        if (this.isCapturing) {
            // It's capturing, stop.
            this.stopCapturing();
            this.changeDetectorRef.detectChanges();

            return;
        }

        if (!this.isImage) {
            // Start the capture.
            this.isCapturing = true;
            this.resetChrono = false;

            this.mediaRecorder?.start();
            this.changeDetectorRef.detectChanges();
        } else {
            if (!this.imgCanvas) {
                return;
            }

            // Get the image from the video and set it to the canvas, using video width/height.
            const width = this.streamVideo?.nativeElement.videoWidth;
            const height = this.streamVideo?.nativeElement.videoHeight;
            const loadingModal = await CoreLoadings.show();

            this.imgCanvas.nativeElement.width = width;
            this.imgCanvas.nativeElement.height = height;
            this.imgCanvas.nativeElement.getContext('2d').drawImage(this.streamVideo?.nativeElement, 0, 0, width, height);

            // Convert the image to blob and show it in an image element.
            this.imgCanvas.nativeElement.toBlob((blob: Blob) => {
                loadingModal.dismiss();

                this.mediaBlob = blob;
                this.previewImage?.nativeElement.setAttribute('src', window.URL.createObjectURL(this.mediaBlob));
                this.hasCaptured = true;
            }, this.mimetype, this.quality);
        }
    }

    /**
     * User cancelled.
     */
    async cancel(): Promise<void> {
        if (this.hasCaptured) {
            try {
                await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
            } catch {
                // Canceled.
                return;
            }
        }

        // Send a "cancelled" error like the Cordova plugin does.
        this.dismissWithCanceledError('Canceled.', 'Camera cancelled');
    }

    /**
     * Discard the captured media.
     */
    async discard(): Promise<void> {
        this.previewMedia?.pause();
        this.streamVideo?.nativeElement.play();

        this.hasCaptured = false;
        this.isCapturing = false;
        this.resetChrono = true;
        delete this.mediaBlob;
        this.changeDetectorRef.detectChanges();
    }

    /**
     * Close the modal, returning some data (success).
     *
     * @param data Data to return.
     */
    dismissWithData(data?: [MediaFile] | string): void {
        ModalController.dismiss(data, 'success');
    }

    /**
     * Close the modal, returning an error.
     *
     * @param message Error message.
     * @param cameraMessage A specific message to use if it's a Camera capture. If not set, message will be used.
     */
    dismissWithCanceledError(message: string, cameraMessage?: string): void {
        const isCamera = this.isImage && !this.isCaptureImage;
        const error = isCamera ? new CoreCanceledError(cameraMessage || message) : new CoreCaptureError(3, message);

        ModalController.dismiss(error, 'error');
    }

    /**
     * Close the modal, returning an error.
     *
     * @param code Error code. Will not be used if it's a Camera capture.
     * @param message Error message.
     * @param cameraMessage A specific message to use if it's a Camera capture. If not set, message will be used.
     */
    dismissWithError(code: number, message: string, cameraMessage?: string): void {
        const isCamera = this.isImage && !this.isCaptureImage;
        const error = isCamera ? new CoreError(cameraMessage || message) : new CoreCaptureError(code, message);

        ModalController.dismiss(error, 'error');
    }

    /**
     * Done capturing, write the file.
     */
    async done(): Promise<void> {
        if (this.returnDataUrl) {
            // Return the image as a base64 string.
            this.dismissWithData((<HTMLCanvasElement> this.imgCanvas?.nativeElement).toDataURL(this.mimetype, this.quality));

            return;
        }

        if (!this.mediaBlob) {
            // Shouldn't happen.
            CoreDomUtils.showErrorModal('Please capture the media first.');

            return;
        }

        const loadingModal = await CoreLoadings.show();

        try {
            // Capturing in browser. Write the blob in a file.
            if (!this.mediaBlob) {
                // Shouldn't happen.
                throw new Error('Please capture the media first.');
            }

            const fileEntry = await CoreFile.writeFile(this.getFilePath(), this.mediaBlob);

            if (this.isImage && !this.isCaptureImage) {
                this.dismissWithData(CoreFile.getFileEntryURL(fileEntry));
            } else {
                // The capture plugin should return a MediaFile, not a FileEntry. Convert it.
                const metadata = await CoreFile.getMetadata(fileEntry);

                let mimetype: string | undefined;
                if (this.extension) {
                    mimetype = CoreMimetypeUtils.getMimeType(this.extension);
                }

                const mediaFile: MediaFile = {
                    name: fileEntry.name,
                    fullPath: fileEntry.nativeURL || fileEntry.fullPath,
                    type: mimetype || '',
                    lastModifiedDate: metadata.modificationTime,
                    size: metadata.size,
                    getFormatData: (): void => {
                        // Nothing to do.
                    },
                };

                this.dismissWithData([mediaFile]);
            }
        } catch (err) {
            CoreDomUtils.showErrorModal(err);
        } finally {
            loadingModal.dismiss();
        }
    }

    /**
     * Get path to the file where the media will be stored.
     *
     * @returns Path.
     */
    protected getFilePath(): string {
        const fileName = this.type + '_' + CoreTimeUtils.readableTimestamp() + '.' + this.extension;

        return CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, 'media/' + fileName);
    }

    /**
     * Stop capturing. Only for video.
     */
    stopCapturing(): void {
        this.isCapturing = false;
        this.hasCaptured = true;

        this.streamVideo && this.streamVideo.nativeElement.pause();
        this.mediaRecorder && this.mediaRecorder.stop();
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        if (this.localMediaStream) {
            const tracks = this.localMediaStream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        }
        this.streamVideo?.nativeElement.pause();
        this.previewMedia?.pause();
        delete this.mediaBlob;
    }

}

export type CaptureMediaComponentInputs = {
    type: 'video' | 'image' | 'captureimage';
    maxTime?: number; // Max time to capture.
    facingMode?: string; // Camera facing mode.
    mimetype?: string;
    extension?: string;
    quality?: number; // Only for images.
    returnDataUrl?: boolean; // Whether it should return a data img. Only for images.
};
