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
import { MediaObject } from '@ionic-native/media/ngx';
import { FileEntry } from '@ionic-native/file/ngx';
import { MediaFile } from '@ionic-native/media-capture/ngx';

import { CoreApp } from '@services/app';
import { CoreFile, CoreFileProvider } from '@services/file';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { Platform, ModalController, Media, Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreCaptureError } from '@classes/errors/captureerror';
import { CoreCanceledError } from '@classes/errors/cancelederror';

/**
 * Page to capture media in browser, or to capture audio in mobile devices.
 */
@Component({
    selector: 'core-emulator-capture-media',
    templateUrl: 'capture-media.html',
    styleUrls: ['capture-media.scss'],
})
export class CoreEmulatorCaptureMediaComponent implements OnInit, OnDestroy {

    @Input() type?: 'audio' | 'video' | 'image' | 'captureimage';
    @Input() maxTime?: number; // Max time to capture.
    @Input() facingMode?: string; // Camera facing mode.
    @Input() mimetype?: string;
    @Input() extension?: string;
    @Input() quality?: number; // Only for images.
    @Input() returnDataUrl?: boolean; // Whether it should return a data img. Only for images.

    @ViewChild('streamVideo') streamVideo?: ElementRef;
    @ViewChild('previewVideo') previewVideo?: ElementRef;
    @ViewChild('imgCanvas') imgCanvas?: ElementRef;
    @ViewChild('previewImage') previewImage?: ElementRef;
    @ViewChild('streamAudio') streamAudio?: ElementRef;
    @ViewChild('previewAudio') previewAudio?: ElementRef;

    title?: string; // The title of the page.
    isAudio?: boolean; // Whether it should capture audio.
    isVideo?: boolean; // Whether it should capture video.
    isImage?: boolean; // Whether it should capture image.
    readyToCapture?: boolean; // Whether it's ready to capture.
    hasCaptured?: boolean; // Whether it has captured something.
    isCapturing?: boolean; // Whether it's capturing.
    resetChrono?: boolean; // Boolean to reset the chrono.
    isCordovaAudioCapture?: boolean; // Whether it's capturing audio using Cordova plugin.

    protected isCaptureImage?: boolean; // To identify if it's capturing an image using media capture plugin (instead of camera).
    protected mediaRecorder?: MediaRecorder; // To record video/audio.
    protected previewMedia?: HTMLAudioElement | HTMLVideoElement; // The element to preview the audio/video captured.
    protected mediaBlob?: Blob; // A Blob where the captured data is stored.
    protected localMediaStream?: MediaStream;
    protected audioDrawer?: {start: () => void; stop: () => void }; // To start/stop the display of audio sound.

    // Variables for Cordova Media capture.
    protected mediaFile?: MediaObject;
    protected filePath?: string;
    protected fileEntry?: FileEntry;

    constructor(
        protected changeDetectorRef: ChangeDetectorRef,
    ) {}

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.initVariables();

        if (this.isCordovaAudioCapture) {
            this.initCordovaMediaPlugin();
        } else {
            this.initHtmlCapture();
        }
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
        } else if (this.type == 'audio') {
            this.isAudio = true;
            this.title = 'core.captureaudio';
        } else if (this.type == 'image') {
            this.isImage = true;
            this.title = 'core.captureimage';
        }

        this.isCordovaAudioCapture = CoreApp.isMobile() && this.isAudio;

        if (this.isCordovaAudioCapture) {
            this.extension = Platform.is('ios') ? 'wav' : 'aac';
            this.returnDataUrl = false;
        }
    }

    /**
     * Init recording with Cordova media plugin.
     *
     * @return Promise resolved when ready.
     */
    protected async initCordovaMediaPlugin(): Promise<void> {
        this.filePath = this.getFilePath();
        let absolutePath = CoreTextUtils.concatenatePaths(CoreFile.getBasePathInstant(), this.filePath);

        if (Platform.is('ios')) {
            // In iOS we need to remove the file:// part.
            absolutePath = absolutePath.replace(/^file:\/\//, '');
        }

        try {
            // First create the file.
            this.fileEntry = await CoreFile.createFile(this.filePath);

            // Now create the media instance.
            this.mediaFile = Media.create(absolutePath);
            this.readyToCapture = true;
            this.previewMedia = this.previewAudio?.nativeElement;
        } catch (error) {
            this.dismissWithError(-1, error.message || error);
        }
    }

    /**
     * Init HTML recorder for browser
     * .
     *
     * @return Promise resolved when done.
     */
    protected async initHtmlCapture(): Promise<void> {
        const constraints = {
            video: this.isAudio ? false : { facingMode: this.facingMode },
            audio: !this.isImage,
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            let chunks: Blob[] = [];
            this.localMediaStream = stream;

            if (!this.isImage) {
                if (this.isVideo) {
                    this.previewMedia = this.previewVideo?.nativeElement;
                } else {
                    this.previewMedia = this.previewAudio?.nativeElement;
                    this.initAudioDrawer(this.localMediaStream);
                    this.audioDrawer?.start();
                }

                this.mediaRecorder = new MediaRecorder(this.localMediaStream, { mimeType: this.mimetype });

                // When video or audio is recorded, add it to the list of chunks.
                this.mediaRecorder.ondataavailable = (e): void => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };

                // When recording stops, create a Blob element with the recording and set it to the video or audio.
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

            if (!this.streamVideo) {
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
            this.streamVideo.nativeElement.onloadedmetadata = (): void => {
                if (hasLoaded) {
                    // Already loaded or timeout triggered, stop.
                    return;
                }

                hasLoaded = true;
                clearTimeout(waitTimeout);
                this.readyToCapture = true;
                this.streamVideo!.nativeElement.onloadedmetadata = null;
                // Force change detection. Angular doesn't detect these async operations.
                this.changeDetectorRef.detectChanges();
            };

            // Set the stream as the source of the video.
            if ('srcObject' in this.streamVideo.nativeElement) {
                this.streamVideo.nativeElement.srcObject = this.localMediaStream;
            } else {
                // Fallback for old browsers.
                // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/srcObject#Examples
                this.streamVideo.nativeElement.src = window.URL.createObjectURL(this.localMediaStream);
            }
        } catch (error) {
            this.dismissWithError(-1, error.message || error);
        }
    }

    /**
     * Initialize the audio drawer. This code has been extracted from MDN's example on MediaStream Recording:
     * https://github.com/mdn/web-dictaphone
     *
     * @param stream Stream returned by getUserMedia.
     */
    protected initAudioDrawer(stream: MediaStream): void {
        if (!this.streamAudio) {
            return;
        }

        let skip = true;
        let running = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const audioCtx = new (window.AudioContext || (<any> window).webkitAudioContext)();
        const canvasCtx = this.streamAudio.nativeElement.getContext('2d');
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const width = this.streamAudio.nativeElement.width;
        const height = this.streamAudio.nativeElement.height;
        const drawAudio = (): void => {
            if (!running) {
                return;
            }

            // Update the draw every animation frame.
            requestAnimationFrame(drawAudio);

            // Skip half of the frames to improve performance, shouldn't affect the smoothness.
            skip = !skip;
            if (skip) {
                return;
            }

            const sliceWidth = width / bufferLength;
            let x = 0;

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = 'rgb(200, 200, 200)';
            canvasCtx.fillRect(0, 0, width, height);

            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

            canvasCtx.beginPath();

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(width, height / 2);
            canvasCtx.stroke();
        };

        analyser.fftSize = 2048;
        source.connect(analyser);

        this.audioDrawer = {
            start: (): void => {
                if (running) {
                    return;
                }

                running = true;
                drawAudio();
            },
            stop: (): void => {
                running = false;
            },
        };
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

            if (this.isCordovaAudioCapture) {
                this.mediaFile?.startRecord();
                if (this.previewMedia) {
                    this.previewMedia.src = '';
                }
            } else {
                this.mediaRecorder?.start();
            }

            this.changeDetectorRef.detectChanges();
        } else {
            if (!this.imgCanvas) {
                return;
            }

            // Get the image from the video and set it to the canvas, using video width/height.
            const width = this.streamVideo?.nativeElement.videoWidth;
            const height = this.streamVideo?.nativeElement.videoHeight;
            const loadingModal = await CoreDomUtils.showModalLoading();

            this.imgCanvas.nativeElement.width = width;
            this.imgCanvas.nativeElement.height = height;
            this.imgCanvas.nativeElement.getContext('2d').drawImage(this.streamVideo?.nativeElement, 0, 0, width, height);

            // Convert the image to blob and show it in an image element.
            this.imgCanvas.nativeElement.toBlob((blob) => {
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

        if (this.isCordovaAudioCapture && this.filePath) {
            // Delete the tmp file.
            CoreFile.removeFile(this.filePath);
        }
    }

    /**
     * Discard the captured media.
     */
    discard(): void {
        this.previewMedia?.pause();
        this.streamVideo?.nativeElement.play();
        this.audioDrawer?.start();

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
     * @param code Error code. Will not be used if it's a Camera capture.
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

        if (!this.mediaBlob && !this.isCordovaAudioCapture) {
            // Shouldn't happen.
            CoreDomUtils.showErrorModal('Please capture the media first.');

            return;
        }

        let fileEntry = this.fileEntry;
        const loadingModal = await CoreDomUtils.showModalLoading();

        try {
            if (!this.isCordovaAudioCapture) {
                // Capturing in browser. Write the blob in a file.
                if (!this.mediaBlob) {
                    // Shouldn't happen.
                    throw new Error('Please capture the media first.');
                }

                fileEntry = await CoreFile.writeFile(this.getFilePath(), this.mediaBlob);
            }

            if (!fileEntry) {
                throw new CoreError('File not found.');
            }

            if (this.isImage && !this.isCaptureImage) {
                this.dismissWithData(fileEntry.toURL());
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
     * @return Path.
     */
    protected getFilePath(): string {
        const fileName = this.type + '_' + CoreTimeUtils.readableTimestamp() + '.' + this.extension;

        return CoreTextUtils.concatenatePaths(CoreFileProvider.TMPFOLDER, 'media/' + fileName);
    }

    /**
     * Stop capturing. Only for video and audio.
     */
    stopCapturing(): void {
        this.isCapturing = false;
        this.hasCaptured = true;

        if (this.isCordovaAudioCapture) {
            this.mediaFile?.stopRecord();
            if (this.previewMedia && this.fileEntry) {
                this.previewMedia.src = CoreFile.convertFileSrc(this.fileEntry.toURL());
            }
        } else {
            this.streamVideo && this.streamVideo.nativeElement.pause();
            this.audioDrawer && this.audioDrawer.stop();
            this.mediaRecorder && this.mediaRecorder.stop();
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.mediaFile?.release();

        if (this.localMediaStream) {
            const tracks = this.localMediaStream.getTracks();
            tracks.forEach((track) => {
                track.stop();
            });
        }
        this.streamVideo?.nativeElement.pause();
        this.previewMedia?.pause();
        this.audioDrawer?.stop();
        delete this.mediaBlob;
    }

}

export type CaptureMediaComponentInputs = {
    type: 'audio' | 'video' | 'image' | 'captureimage';
    maxTime?: number; // Max time to capture.
    facingMode?: string; // Camera facing mode.
    mimetype?: string;
    extension?: string;
    quality?: number; // Only for images.
    returnDataUrl?: boolean; // Whether it should return a data img. Only for images.
};
