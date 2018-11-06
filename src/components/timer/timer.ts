// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * This directive shows a timer in format HH:MM:SS. When the countdown reaches 0, a function is called.
 *
 * Usage:
 * <core-timer [endTime]="endTime" (finished)="timeUp()" [timerText]="'addon.mod_quiz.timeleft' | translate"></core-timer>
 */
@Component({
    selector: 'core-timer',
    templateUrl: 'core-timer.html'
})
export class CoreTimerComponent implements OnInit, OnDestroy {
    @Input() endTime: string | number; // Timestamp (in seconds) when the timer should end.
    @Input() timerText: string; // Text to show next to the timer. If not defined, no text shown.
    @Input() timeLeftClass: string; // Name of the class to apply with each second. By default, 'core-timer-timeleft-'.
    @Input() align: string; // Where to align the time and text. Defaults to 'left'. Other values: 'center', 'right'.
    @Output() finished: EventEmitter<void>; // Will emit an event when the timer reaches 0.

    @ViewChild('container', { read: ElementRef }) containerRef: ElementRef;

    timeLeft: number; // Seconds left to end.

    protected timeInterval;
    protected container: HTMLElement;

    constructor(protected timeUtils: CoreTimeUtilsProvider) {
        this.finished = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const timeLeftClass = this.timeLeftClass || 'core-timer-timeleft-',
            endTime = Math.round(Number(this.endTime)),
            container: HTMLElement = this.containerRef && this.containerRef.nativeElement;

        if (!endTime) {
            return;
        }

        // Check time left every 200ms.
        this.timeInterval = setInterval(() => {
            this.timeLeft = endTime - this.timeUtils.timestamp();

            if (this.timeLeft < 0) {
                // Time is up! Stop the timer and call the finish function.
                clearInterval(this.timeInterval);
                this.finished.emit();

                return;
            }

            // If the time has nearly expired, change the color.
            if (this.timeLeft < 100 && !container.classList.contains(timeLeftClass + this.timeLeft)) {
                // Time left has changed. Remove previous classes and add the new one.
                container.classList.remove(timeLeftClass + (this.timeLeft + 1));
                container.classList.remove(timeLeftClass + (this.timeLeft + 2));
                container.classList.add(timeLeftClass + this.timeLeft);
            }
        }, 200);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        clearInterval(this.timeInterval);
    }
}
