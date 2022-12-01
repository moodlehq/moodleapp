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

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';

import { CoreTimeUtils } from '@services/utils/time';

/**
 * This directive shows a timer in format HH:MM:SS. When the countdown reaches 0, a function is called.
 *
 * Usage:
 * <core-timer [endTime]="endTime" (finished)="timeUp()" [timerText]="'addon.mod_quiz.timeleft' | translate"></core-timer>
 */
@Component({
    selector: 'core-timer',
    templateUrl: 'core-timer.html',
    styleUrls: ['timer.scss'],
})
export class CoreTimerComponent implements OnInit, OnDestroy {

    @Input() endTime?: string | number; // Timestamp (in seconds) when the timer should end.
    @Input() timerText?: string; // Text to show next to the timer. If not defined, no text shown.
    @Input() timeLeftClass?: string; // Name of the class to apply with each second. By default, 'core-timer-timeleft-'.
    @Input() timeLeftClassThreshold = 100; // Number of seconds to start adding the timeLeftClass. Set it to -1 to not add it.
    @Input() align?: string; // Where to align the time and text. Defaults to 'left'. Other values: 'center', 'right'.
    @Input() timeUpText?: string; // Text to show when the timer reaches 0. If not defined, 'core.timesup'.
    @Input() mode: CoreTimerMode = CoreTimerMode.ITEM; // How to display data.
    @Input() underTimeClassThresholds = []; // Number of seconds to add the class 'core-timer-under-'.
    @Output() finished = new EventEmitter<void>(); // Will emit an event when the timer reaches 0.

    timeLeft?: number; // Seconds left to end.
    modeBasic = CoreTimerMode.BASIC;

    protected timeInterval?: number;
    protected element?: HTMLElement;

    constructor(
        protected elementRef: ElementRef,
    ) {}

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const timeLeftClass = this.timeLeftClass || 'core-timer-timeleft-';
        const endTime = Math.round(Number(this.endTime));
        this.underTimeClassThresholds.sort((a, b) => a - b); // Sort by increase order.

        if (!endTime) {
            return;
        }

        let container: HTMLElement | undefined;

        // Check time left every 200ms.
        this.timeInterval = window.setInterval(() => {
            container = container || this.elementRef.nativeElement.querySelector('.core-timer');
            this.timeLeft = Math.max(endTime - CoreTimeUtils.timestamp(), 0);

            if (container) {
                // Add class if timer is below timeLeftClassThreshold.
                if (this.timeLeft < this.timeLeftClassThreshold && !container.classList.contains(timeLeftClass + this.timeLeft)) {
                    // Time left has changed. Remove previous classes and add the new one.
                    container.classList.remove(timeLeftClass + (this.timeLeft + 1));
                    container.classList.remove(timeLeftClass + (this.timeLeft + 2));
                    container.classList.add(timeLeftClass + this.timeLeft);
                }

                // Add classes for underTimeClassThresholds.
                for (let i = 0; i < this.underTimeClassThresholds.length; i++) {
                    const threshold = this.underTimeClassThresholds[i];
                    if (this.timeLeft <= threshold) {
                        if (!container.classList.contains('core-timer-under-' + this.timeLeft)) {
                            // Add new class and remove the previous one.
                            const nextTreshold = this.underTimeClassThresholds[i + 1];
                            container.classList.add('core-timer-under-' + threshold);
                            nextTreshold && container.classList.remove('core-timer-under-' + nextTreshold);
                        }

                        break;
                    }
                }
            }

            if (this.timeLeft === 0) {
                // Time is up! Stop the timer and call the finish function.
                clearInterval(this.timeInterval);
                this.finished.emit();

                return;
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

export enum CoreTimerMode {
    ITEM = 'item',
    BASIC = 'basic',
}
