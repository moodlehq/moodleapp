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
import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy,
    Output,
    EventEmitter,
    SimpleChange,
    ChangeDetectorRef,
} from '@angular/core';

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
})
export class CoreChronoComponent implements OnInit, OnChanges, OnDestroy {

    @Input({ transform: toBoolean }) running = false; // Set it to true to start the chrono. Set it to false to stop it.
    @Input() startTime = 0; // Number of milliseconds to put in the chrono before starting.
    @Input() endTime?: number; // Number of milliseconds to stop the chrono.
    @Input({ transform: toBoolean }) reset = false; // Set it to true to reset the chrono.
    @Input({ transform: toBoolean }) hours = true;
    @Output() onEnd: EventEmitter<void>; // Will emit an event when the endTime is reached.

    time = 0;
    protected interval?: number;

    constructor(protected changeDetectorRef: ChangeDetectorRef) {
        this.onEnd = new EventEmitter();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.time = this.startTime || 0;
    }

    /**
     * Component being changed.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes && changes.running) {
            if (changes.running.currentValue) {
                this.start();
            } else {
                this.stop();
            }
        }
        if (changes && changes.reset && changes.reset.currentValue) {
            this.resetChrono();
        }
    }

    /**
     * Reset the chrono, stopping it and setting it to startTime.
     */
    protected resetChrono(): void {
        this.stop();
        this.time = this.startTime || 0;
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
            this.time += Date.now() - lastExecTime;
            lastExecTime = Date.now();

            if (this.endTime !== undefined && this.time > this.endTime) {
                // End time reached, stop the timer and call the end function.
                this.stop();
                this.onEnd.emit();
            }

            // Force change detection. Angular doesn't detect these async operations.
            this.changeDetectorRef.detectChanges();
        }, 200);
    }

    /**
     * Stop the chrono, leaving the same time it has.
     */
    protected stop(): void {
        clearInterval(this.interval);
        delete this.interval;
    }

    ngOnDestroy(): void {
        this.stop();
    }

}
