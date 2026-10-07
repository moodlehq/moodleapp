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

import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    OnDestroy,
    viewChild,
} from '@angular/core';

@Component({
    selector: 'core-audio-histogram',
    templateUrl: 'audio-histogram.html',
    styleUrl: 'audio-histogram.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreFileUploaderAudioHistogramComponent implements OnDestroy {

    protected static readonly BARS_WIDTH = 2;
    protected static readonly BARS_MIN_HEIGHT = 4;
    protected static readonly BARS_GUTTER = 4;

    readonly analyser = input.required<AnalyserNode>();
    readonly paused = input(false, { transform: toBoolean });
    readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

    protected hostElement: HTMLElement = inject(ElementRef).nativeElement;
    protected readonly canvas = computed(() => this.canvasRef()?.nativeElement);
    protected readonly context = computed(() => this.canvas()?.getContext('2d'));
    protected buffer?: Uint8Array<ArrayBuffer>;
    protected destroyed = false;

    constructor() {
        effect(() => {
            const canvas = this.canvas();
            const context = this.context();
            if (!canvas || !context) {
                return;
            }

            this.buffer = new Uint8Array(this.analyser().fftSize);
            this.updateCanvas(this.hostElement.clientWidth, this.hostElement.clientHeight);
            this.draw();
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.destroyed = true;
    }

    /**
     * Draw histogram.
     */
    private draw(): void {
        const canvas = this.canvas();
        const context = this.context();
        if (this.destroyed || !canvas || !context || !this.buffer) {
            return;
        }

        if (canvas.width !== this.hostElement.clientWidth || canvas.height !== this.hostElement.clientHeight) {
            this.updateCanvas(this.hostElement.clientWidth, this.hostElement.clientHeight);
        }

        const width = canvas.width;
        const height = canvas.height;
        const barsWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        const barsGutter = CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;
        const barsCount = Math.max(1, Math.floor((width - barsWidth - 1) / (barsWidth + barsGutter)));

        // Reset canvas.
        context.fillRect(0, 0, width, height);

        // Draw bars.
        const startX = Math.floor((width - (barsWidth + barsGutter)*barsCount - barsWidth - 1)/2);

        context.beginPath();
        if (this.paused()) {
            this.drawPausedBars(startX);
        } else {
            this.drawActiveBars(startX);
        }
        context.stroke();

        // Schedule next frame.
        requestAnimationFrame(() => this.draw());
    }

    /**
     * Draws bars on the histogram when it is active.
     *
     * @param x Starting x position.
     */
    protected drawActiveBars(x: number): void {
        const canvas = this.canvas();
        const context = this.context();
        if (!canvas || !context || !this.buffer) {
            return;
        }

        let bufferX = 0;
        const width = canvas.width;
        const halfHeight = canvas.height / 2;
        const halfMinHeight = CoreFileUploaderAudioHistogramComponent.BARS_MIN_HEIGHT / 2;
        const barsWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        const barsGutter = CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;
        const bufferLength = this.buffer.length;
        const barsBufferWidth = Math.floor(bufferLength / ((width - barsWidth - 1) / (barsWidth + barsGutter)));

        this.analyser().getByteTimeDomainData(this.buffer);

        while (bufferX < bufferLength) {
            let maxLevel = halfMinHeight;

            do {
                maxLevel = Math.max(maxLevel, halfHeight * (1 - (this.buffer[bufferX] / 128)));
                bufferX++;
            } while (bufferX % barsBufferWidth !== 0 && bufferX < bufferLength);

            context.moveTo(x, halfHeight - maxLevel);
            context.lineTo(x, halfHeight + maxLevel);

            x += barsWidth + barsGutter;
        }
    }

    /**
     * Draws bars on the histogram when it is paused.
     *
     * @param x Starting x position.
     */
    protected drawPausedBars(x: number): void {
        const canvas = this.canvas();
        const context = this.context();
        if (!canvas || !context) {
            return;
        }

        const width = canvas.width;
        const halfHeight = canvas.height / 2;
        const halfMinHeight = CoreFileUploaderAudioHistogramComponent.BARS_MIN_HEIGHT / 2;
        const xStep = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH + CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;

        while (x < width) {
            context.moveTo(x, halfHeight - halfMinHeight);
            context.lineTo(x, halfHeight + halfMinHeight);

            x += xStep;
        }
    }

    /**
     * Set canvas element dimensions and configure styles.
     *
     * @param width Canvas width.
     * @param height Canvas height.
     */
    protected updateCanvas(width: number, height: number): void {
        const canvas = this.canvas();
        const context = this.context();
        if (!canvas || !context) {
            return;
        }

        const styles = getComputedStyle(this.hostElement);

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = styles.getPropertyValue('--background-color');
        context.lineCap = 'round';
        context.lineWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        context.strokeStyle = styles.getPropertyValue('--bars-color');
    }

}
