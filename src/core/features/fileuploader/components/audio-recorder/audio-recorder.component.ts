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

import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy } from '@angular/core';
import { CoreModalComponent } from '@classes/modal-component';
import { CorePlatform } from '@services/platform';
import { DomSanitizer, Translate } from '@singletons';
import { BehaviorSubject, combineLatest, Observable, OperatorFunction } from 'rxjs';
import { Mp3MediaRecorder } from 'mp3-mediarecorder';
import { map, shareReplay, tap } from 'rxjs/operators';
import { initAudioEncoderMessage } from '@features/fileuploader/utils/worker-messages';
import { SafeUrl } from '@angular/platform-browser';
import { CAPTURE_ERROR_NO_MEDIA_FILES, CoreCaptureError } from '@classes/errors/captureerror';
import { CoreFileUploaderAudioRecording } from '@features/fileuploader/services/fileuploader';
import { CoreFile, CoreFileProvider } from '@services/file';
import { CorePath } from '@singletons/path';
import { CoreNative } from '@features/native/services/native';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreFileUploaderAudioHistogramComponent } from '../audio-histogram/audio-histogram';
import { CoreAlerts } from '@services/overlays/alerts';

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

    recordingUrl$: Observable<SafeUrl | null>;
    histogramAnalyzer$: Observable<AnalyserNode | null>;
    status$: Observable<'recording-ongoing' | 'recording-paused' | 'done' | 'empty'>;

    protected recording: AudioRecording | null;
    protected media$: BehaviorSubject<AudioRecorderMedia | null>;
    protected recording$: Observable<AudioRecording | null>;

    constructor(elementRef: ElementRef<HTMLElement>) {
        super(elementRef);

        this.recording = null;
        this.media$ = new BehaviorSubject<AudioRecorderMedia | null>(null);
        this.recording$ = this.media$.pipe(
            recorderAudioRecording(),
            shareReplay(),
            tap(recording => this.recording = recording),
        );
        this.recordingUrl$ = this.recording$.pipe(
            map(recording => recording && DomSanitizer.bypassSecurityTrustUrl(recording.url)),
        );
        this.histogramAnalyzer$ = this.media$.pipe(map(media => {
            if (!media?.analyser || CorePlatform.prefersReducedMotion()) {
                return null;
            }

            return media.analyser;
        }));
        this.status$ = combineLatest([this.media$.pipe(recorderStatus(), shareReplay()), this.recording$])
            .pipe(map(([recordingStatus, recording]) => {
                if (recordingStatus === 'recording') {
                    return 'recording-ongoing';
                }

                if (recordingStatus === 'paused') {
                    return 'recording-paused';
                }

                if (recording) {
                    return 'done';
                }

                return 'empty';
            }));
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        const recorder = this.media$.value?.recorder;

        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    }

    /**
     * Start recording.
     */
    async startRecording(): Promise<void> {
        try {
            const media = await this.createMedia();

            this.media$.next(media);

            media.recorder.start();
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Stop recording.
     */
    stopRecording(): void {
        try {
            this.media$.value?.recorder.stop();
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Stop recording.
     */
    pauseRecording(): void {
        try {
            this.media$.value?.recorder.pause();
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Stop recording.
     */
    resumeRecording(): void {
        try {
            this.media$.value?.recorder.resume();
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Discard recording.
     */
    discardRecording(): void {
        this.media$.next(null);
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
        if (!this.recording) {
            return;
        }

        try {
            const fileName = await CoreFile.getUniqueNameInFolder(CoreFileProvider.TMPFOLDER, 'recording.mp3');
            const filePath = CorePath.concatenatePaths(CoreFileProvider.TMPFOLDER, fileName);
            const fileEntry = await CoreFile.writeFile(filePath, this.recording.blob);

            this.close({
                name: fileEntry.name,
                fullPath: CoreFile.getFileEntryURL(fileEntry),
                type: 'audio/mpeg',
            });
        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Create media instances.
     *
     * @returns Media instances.
     */
    protected async createMedia(): Promise<AudioRecorderMedia> {
        await this.prepareMicrophoneAuthorization();

        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new window.AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        source.connect(analyser);

        return {
            analyser,
            recorder: new Mp3MediaRecorder(mediaStream, { worker: this.startWorker(), audioContext }),
        };
    }

    /**
     * Make sure that microphone usage has been authorized.
     */
    protected async prepareMicrophoneAuthorization(): Promise<void> {
        const diagnostic = await CoreNative.plugin('diagnostic')?.getInstance();

        if (!CorePlatform.isMobile() || !diagnostic) {
            return;
        }

        const status = await diagnostic.requestMicrophoneAuthorization();

        switch (status) {
            case diagnostic.permissionStatus.deniedOnce:
            case diagnostic.permissionStatus.deniedAlways:
                throw new Error(Translate.instant('core.fileuploader.microphonepermissiondenied'));
            case diagnostic.permissionStatus.restricted:
                throw new Error(Translate.instant('core.fileuploader.microphonepermissionrestricted'));
        }
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
 * Audio recording data.
 */
interface AudioRecording {
    url: string;
    blob: Blob;
}

/**
 * Media instances.
 */
interface AudioRecorderMedia {
    recorder: Mp3MediaRecorder;
    analyser: AnalyserNode;
}

/**
 * Observable operator that listens to a recorder and emits a recording file.
 *
 * @returns Operator.
 */
function recorderAudioRecording(): OperatorFunction<AudioRecorderMedia | null, AudioRecording | null> {
    return source => new Observable(subscriber => {
        let audioChunks: Blob[] = [];
        let previousRecorder: Mp3MediaRecorder | undefined;
        const onDataAvailable = event => audioChunks.push(event.data);
        const onError = event => CoreAlerts.showError(event.error);
        const onStop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/mpeg' });

            subscriber.next({
                url: URL.createObjectURL(blob),
                blob,
            });
        };
        const subscription = source.subscribe(media => {
            previousRecorder?.removeEventListener('dataavailable', onDataAvailable);
            previousRecorder?.removeEventListener('error', onError);
            previousRecorder?.removeEventListener('stop', onStop);

            media?.recorder.addEventListener('dataavailable', onDataAvailable);
            media?.recorder.addEventListener('error', onError);
            media?.recorder.addEventListener('stop', onStop);

            audioChunks = [];
            previousRecorder = media?.recorder;

            subscriber.next(null);
        });

        subscriber.next(null);

        return () => {
            subscription.unsubscribe();

            previousRecorder?.removeEventListener('dataavailable', onDataAvailable);
            previousRecorder?.removeEventListener('error', onError);
            previousRecorder?.removeEventListener('stop', onStop);
        };
    });
}

/**
 * Observable operator that listens to a recorder and emits its recording status.
 *
 * @returns Operator.
 */
function recorderStatus(): OperatorFunction<AudioRecorderMedia | null, RecordingState> {
    return source => new Observable(subscriber => {
        let previousRecorder: Mp3MediaRecorder | undefined;
        const onStart = () => subscriber.next('recording');
        const onPause = () => subscriber.next('paused');
        const onResume = () => subscriber.next('recording');
        const onStop = () => subscriber.next('inactive');
        const subscription = source.subscribe(media => {
            previousRecorder?.removeEventListener('start', onStart);
            previousRecorder?.removeEventListener('pause', onPause);
            previousRecorder?.removeEventListener('resume', onResume);
            previousRecorder?.removeEventListener('stop', onStop);

            media?.recorder.addEventListener('start', onStart);
            media?.recorder.addEventListener('pause', onPause);
            media?.recorder.addEventListener('resume', onResume);
            media?.recorder.addEventListener('stop', onStop);

            previousRecorder = media?.recorder;

            subscriber.next(media?.recorder.state ?? 'inactive');
        });

        subscriber.next('inactive');

        return () => {
            subscription.unsubscribe();

            previousRecorder?.removeEventListener('start', onStart);
            previousRecorder?.removeEventListener('pause', onPause);
            previousRecorder?.removeEventListener('resume', onResume);
            previousRecorder?.removeEventListener('stop', onStop);
        };
    });
}
