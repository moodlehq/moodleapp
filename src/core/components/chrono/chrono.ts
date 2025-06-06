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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, OnInit, OnDestroy, input, output, signal, effect } from '@angular/core';
import { CoreBaseModule } from '@/core/base.module';
import { CoreSecondsToHMSPipe } from '@pipes/seconds-to-hms';

/**
 * This component shows a chronometer in format HH:MM:SS.
 *
 * If no startTime is provided, it will start at 00:00:00.
 * If an endTime is provided, the chrono will stop and emit an event in the onEnd output when that number of milliseconds is
 * reached. E.g. if startTime=60000 and endTime=120000, the chrono will start at 00:01:00 and end when it reaches 00:02:00.
 *
 * This component has 2 boolean inputs to control the timer: running (to start and stop it) and reset.
 *
 * Example usage:
 * <core-chrono [running]="running" [reset]="reset" [endTime]="maxTime" (onEnd)="stopCapturing()"></core-chrono>
 */
@Component({
    selector: 'core-chrono',
    templateUrl: 'core-chrono.html',
    imports: [
        CoreBaseModule,
        CoreSecondsToHMSPipe,
    ],
})
export class CoreChronoComponent implements OnInit, OnDestroy {

    running = input(false, { transform: toBoolean }); // Set it to true to start the chrono. Set it to false to stop it.
    startTime = input(0); // Number of milliseconds to put in the chrono before starting.
    endTime = input<number>(); // Number of milliseconds to stop the chrono.
    reset = input(false, { transform: toBoolean }); // Set it to true to reset the chrono.
    hours = input(true, { transform: toBoolean }); // Whether to show hours in the chrono or not.
    onEnd = output(); // Will emit an event when the endTime is reached.

    time = signal(0); // Current time in milliseconds.
    protected interval?: number;

    constructor() {
        effect(() => {
            this.running() ? this.start() : this.stop();
        });
        effect(() => {
            if (this.reset()) {
                this.resetChrono();
            }
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.time.set(this.startTime() || 0);
    }

    /**
     * Reset the chrono, stopping it and setting it to startTime.
     */
    protected resetChrono(): void {
        this.stop();
        this.time.set(this.startTime() || 0);
    }

    /**
     * Start the chrono if it isn't running.
     */
    protected start(): void {
        if (this.interval) {
            // Already setup.
            return;
        }

        let lastExecTime = Date.now();

        this.interval = window.setInterval(() => {
            // Increase the chrono.
            this.time.update(time => time + Date.now() - lastExecTime);
            lastExecTime = Date.now();

            const endTime = this.endTime();
            if (endTime !== undefined && this.time() > endTime) {
                // End time reached, stop the timer and call the end function.
                this.stop();
                this.onEnd.emit();
            }
        }, 200);
    }

    /**
     * Stop the chrono, leaving the same time it has.
     */
    protected stop(): void {
        clearInterval(this.interval);
        delete this.interval;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.stop();
    }

}
