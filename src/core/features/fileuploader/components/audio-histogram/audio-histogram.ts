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
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject, Input, OnDestroy, ViewChild } from '@angular/core';

@Component({
    selector: 'core-audio-histogram',
    templateUrl: 'audio-histogram.html',
    styleUrl: 'audio-histogram.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreFileUploaderAudioHistogramComponent implements AfterViewInit, OnDestroy {

    private static readonly BARS_WIDTH = 2;
    private static readonly BARS_MIN_HEIGHT = 4;
    private static readonly BARS_GUTTER = 4;

    @Input({ required: true }) analyser!: AnalyserNode;
    @Input({ transform: toBoolean }) paused = false;
    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    private element: HTMLElement = inject(ElementRef).nativeElement;
    private canvas?: HTMLCanvasElement;
    private context?: CanvasRenderingContext2D | null;
    private buffer?: Uint8Array;
    private destroyed = false;

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.canvas = this.canvasRef?.nativeElement;
        this.context = this.canvas?.getContext('2d');
        this.buffer = new Uint8Array(this.analyser.fftSize);

        this.updateCanvas(this.element.clientWidth, this.element.clientHeight);
        this.draw();
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
        if (this.destroyed || !this.canvas || !this.context || !this.buffer) {
            return;
        }

        if (this.canvas.width !== this.element.clientWidth || this.canvas.height !== this.element.clientHeight) {
            this.updateCanvas(this.element.clientWidth, this.element.clientHeight);
        }

        const width = this.canvas.width;
        const height = this.canvas.height;
        const barsWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        const barsGutter = CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;
        const chunkLength = Math.floor(this.buffer.length / ((width - barsWidth - 1) / (barsWidth + barsGutter)));
        const barsCount = Math.floor(this.buffer.length / chunkLength);

        // Reset canvas.
        this.context.fillRect(0, 0, width, height);

        // Draw bars.
        const startX = Math.floor((width - (barsWidth + barsGutter)*barsCount - barsWidth - 1)/2);

        this.context.beginPath();
        this.paused ? this.drawPausedBars(startX) : this.drawActiveBars(startX);
        this.context.stroke();

        // Schedule next frame.
        requestAnimationFrame(() => this.draw());
    }

    /**
     * Draws bars on the histogram when it is active.
     *
     * @param x Starting x position.
     */
    private drawActiveBars(x: number): void {
        if (!this.canvas || !this.context || !this.buffer) {
            return;
        }

        let bufferX = 0;
        const width = this.canvas.width;
        const halfHeight = this.canvas.height / 2;
        const halfMinHeight = CoreFileUploaderAudioHistogramComponent.BARS_MIN_HEIGHT / 2;
        const barsWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        const barsGutter = CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;
        const bufferLength = this.buffer.length;
        const barsBufferWidth = Math.floor(bufferLength / ((width - barsWidth - 1) / (barsWidth + barsGutter)));

        this.analyser.getByteTimeDomainData(this.buffer);

        while (bufferX < bufferLength) {
            let maxLevel = halfMinHeight;

            do {
                maxLevel = Math.max(maxLevel, halfHeight * (1 - (this.buffer[bufferX] / 128)));
                bufferX++;
            } while (bufferX % barsBufferWidth !== 0 && bufferX < bufferLength);

            this.context.moveTo(x, halfHeight - maxLevel);
            this.context.lineTo(x, halfHeight + maxLevel);

            x += barsWidth + barsGutter;
        }
    }

    /**
     * Draws bars on the histogram when it is paused.
     *
     * @param x Starting x position.
     */
    private drawPausedBars(x: number): void {
        if (!this.canvas || !this.context) {
            return;
        }

        const width = this.canvas.width;
        const halfHeight = this.canvas.height / 2;
        const halfMinHeight = CoreFileUploaderAudioHistogramComponent.BARS_MIN_HEIGHT / 2;
        const xStep = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH + CoreFileUploaderAudioHistogramComponent.BARS_GUTTER;

        while (x < width) {
            this.context.moveTo(x, halfHeight - halfMinHeight);
            this.context.lineTo(x, halfHeight + halfMinHeight);

            x += xStep;
        }
    }

    /**
     * Set canvas element dimensions and configure styles.
     *
     * @param width Canvas width.
     * @param height Canvas height.
     */
    private updateCanvas(width: number, height: number): void {
        if (!this.canvas || !this.context) {
            return;
        }

        const styles = getComputedStyle(this.element);

        this.canvas.width = width;
        this.canvas.height = height;
        this.context.fillStyle = styles.getPropertyValue('--background-color');
        this.context.lineCap = 'round';
        this.context.lineWidth = CoreFileUploaderAudioHistogramComponent.BARS_WIDTH;
        this.context.strokeStyle = styles.getPropertyValue('--bars-color');
    }

}
