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

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    OnDestroy,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { CoreModalComponent } from '@classes/modal-component';
import { CorePlatform } from '@services/platform';
import { Translate } from '@singletons';
import { Mp3MediaRecorder } from 'mp3-mediarecorder';
import { initAudioEncoderMessage } from '@features/fileuploader/utils/worker-messages';
import { CAPTURE_ERROR_NO_MEDIA_FILES, CoreCaptureError } from '@classes/errors/captureerror';
import { CoreFileUploaderAudioRecording } from '@features/fileuploader/services/fileuploader';
import { CoreFile, CoreFileProvider } from '@services/file';
import { CorePath } from '@static/path';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreFileUploaderAudioHistogramComponent } from '../audio-histogram/audio-histogram';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreAnyError } from '@classes/errors/error';
import { CoreMimetype } from '@static/mimetype';
import { CoreTime } from '@static/time';
import { CorePromiseUtils } from '@static/promise-utils';

@Component({
    selector: 'core-fileuploader-audio-recorder',
    styleUrl: 'audio-recorder.scss',
    templateUrl: 'audio-recorder.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
        CoreFileUploaderAudioHistogramComponent,
    ],
})
export class CoreFileUploaderAudioRecorderComponent extends CoreModalComponent<CoreFileUploaderAudioRecording>
    implements OnDestroy {

    readonly recordingUrl = signal<string>('');

    readonly histogramAnalyzer = computed<AnalyserNode | null>(() => {
        const media = this.media();

        return media && !CorePlatform.prefersReducedMotion() ? media.analyser : null;
    });

    readonly status = computed<CoreFileUploaderAudioRecorderStatus>(() => {
        if (this.recording()) {
            return 'done';
        }

        switch (this.recordingState()) {
            case 'recording':
                return 'recording-ongoing';
            case 'paused':
                return 'recording-paused';
            default:
                return 'empty';
        }
    });

    protected readonly recording = signal<Blob | null>(null);
    protected readonly media = signal<AudioRecorderMedia | null>(null);
    protected readonly recordingState = signal<RecordingState>('inactive');

    protected readonly previewAudio = viewChild<ElementRef<HTMLAudioElement>>('previewAudio');
    protected readonly previewMedia = computed(() => this.previewAudio()?.nativeElement);

    constructor() {
        super();

        effect(() => {
            const blob = this.recording();
            untracked(() => {
                this.recordingUrl.update((previousUrl) => {
                    if (previousUrl) {
                        URL.revokeObjectURL(previousUrl);
                    }

                    return blob ? URL.createObjectURL(blob) : '';
                });
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.resetMedia();
    }

    /**
     * Start recording.
     */
    async startRecording(): Promise<void> {
        try {
            const media = await this.createMedia();
            const audioChunks: Blob[] = [];

            this.resetMedia();

            media.recorder.ondataavailable = event => audioChunks.push(event.data);
            media.recorder.onerror = event => CoreAlerts.showError(event.error);
            media.recorder.onstart = () => this.recordingState.set('recording');
            media.recorder.onpause = () => this.recordingState.set('paused');
            media.recorder.onresume = () => this.recordingState.set('recording');
            media.recorder.onstop = async () => {
                const blob = new Blob(audioChunks, { type: 'audio/mp3' });

                // Release the microphone as soon as the recording ends.
                this.stopStream(media);

                this.recording.set(blob);
                this.recordingState.set('inactive');
            };

            this.media.set(media);

            media.recorder.start();
        } catch (error) {
            if (error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError') {
                CoreAlerts.showError(Translate.instant('core.fileuploader.microphonepermissiondenied'));
            } else {
                CoreAlerts.showError(error);
            }
        }
    }

    /**
     * Stop recording.
     */
    stopRecording(): void {
        try {
            this.media()?.recorder.stop();
        } catch (error) {
            CoreAlerts.showError(error as CoreAnyError);
        }
    }

    /**
     * Stop recording.
     */
    pauseRecording(): void {
        try {
            this.media()?.recorder.pause();
        } catch (error) {
            CoreAlerts.showError(error as CoreAnyError);
        }
    }

    /**
     * Stop recording.
     */
    resumeRecording(): void {
        try {
            this.media()?.recorder.resume();
        } catch (error) {
            CoreAlerts.showError(error as CoreAnyError);
        }
    }

    /**
     * Discard recording.
     */
    discardRecording(): void {
        this.resetMedia();
    }

    /**
     * Dismiss modal without a result.
     */
    async cancel(): Promise<void> {
        this.close(new CoreCaptureError(CAPTURE_ERROR_NO_MEDIA_FILES));
    }

    /**
     * Dismiss the modal with the current recording as a result.
     */
    async submit(): Promise<void> {
        const blob = this.recording();

        if (!blob) {
            return;
        }

        try {
            const type = blob.type.split(';')[0];
            const extension = CoreMimetype.getExtension(type);
            const fileName = `recording_${CoreTime.readableTimestamp()}.${extension}`;
            const filePath = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, fileName);
            const fileEntry = await CoreFile.writeFile(filePath, blob);
            const mediaDuration = this.previewMedia()?.duration;
            const duration = mediaDuration && Number.isFinite(mediaDuration) ? mediaDuration : undefined;

            const result: CoreFileUploaderAudioRecording = {
                name: fileEntry.name,
                fullPath: fileEntry.toURL(),
                type,
                duration,
            };

            this.close(result);
        } catch (error) {
            CoreAlerts.showError(error as CoreAnyError);
        }
    }

    /**
     * Reset recorder state and release its event handlers and recording URL.
     */
    protected resetMedia(): void {
        const recorder = this.media()?.recorder;

        if (recorder) {
            recorder.ondataavailable = null;
            recorder.onerror = null;
            recorder.onstart = null;
            recorder.onpause = null;
            recorder.onresume = null;
            recorder.onstop = null;

            if (recorder.state !== 'inactive') {
                recorder.stop();
            }
        }

        const media = this.media();
        if (media) {
            this.stopStream(media);
            CorePromiseUtils.ignoreErrors(media.audioContext.close());
        }

        this.clearPreview();

        this.media.set(null);
        this.recording.set(null);
        this.recordingState.set('inactive');
    }

    /**
     * Stop all the tracks of the media stream, releasing the microphone.
     *
     * @param media Media instances.
     */
    protected stopStream(media: AudioRecorderMedia): void {
        media.stream.getTracks().forEach(track => track.stop());
    }

    /**
     * Clear the preview and release its object URL.
     */
    protected clearPreview(): void {
        this.previewMedia()?.pause();
        this.previewMedia()?.removeAttribute('src');
        this.previewMedia()?.load();
        this.recording.set(null);
    }

    /**
     * Create media instances.
     *
     * @returns Media instances.
     */
    protected async createMedia(): Promise<AudioRecorderMedia> {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new window.AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        source.connect(analyser);

        return {
            analyser,
            audioContext,
            stream: mediaStream,
            recorder: new Mp3MediaRecorder(mediaStream, { worker: this.startWorker(), audioContext }),
        };
    }

    /**
     * Start worker script.
     *
     * @returns Worker.
     */
    protected startWorker(): Worker {
        const worker = new Worker(new URL('./audio-recorder.worker', import.meta.url));

        worker.postMessage(
            initAudioEncoderMessage({ vmsgWasmUrl: `${document.head.baseURI}assets/lib/vmsg/vmsg.wasm` }),
        );

        return worker;
    }

}

/**
 * Media instances.
 */
interface AudioRecorderMedia {
    recorder: Mp3MediaRecorder;
    analyser: AnalyserNode;
    audioContext: AudioContext;
    stream: MediaStream;
}

/**
 * Recording status.
 */
type CoreFileUploaderAudioRecorderStatus = 'empty' | 'recording-ongoing' | 'recording-paused' | 'done';
