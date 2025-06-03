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
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CoreUser } from '@features/user/services/user';

import { CoreTime } from '@singletons/time';
import { CoreBaseModule } from '@/core/base.module';
import { CoreSecondsToHMSPipe } from '@pipes/seconds-to-hms';

/**
 * This directive shows a timer in format HH:MM:SS. When the countdown reaches 0, a function is called.
 *
 * Usage:
 * <core-timer [endTime]="endTime" (finished)="timeUp()" [timerText]="'addon.mod_quiz.timeleft' | translate"></core-timer>
 */
@Component({
    selector: 'core-timer',
    templateUrl: 'core-timer.html',
    styleUrl: 'timer.scss',
    imports: [
        CoreBaseModule,
        CoreSecondsToHMSPipe,
    ],
})
export class CoreTimerComponent implements OnInit, OnDestroy {

    @Input() endTime = 0; // Timestamp (in seconds) when the timer should end.
    @Input() timerText?: string; // Text to show next to the timer. If not defined, no text shown.
    @Input() timeLeftClass?: string; // Name of the class to apply with each second. By default, 'core-timer-timeleft-'.
    @Input() timeLeftClassThreshold = 100; // Number of seconds to start adding the timeLeftClass. Set it to -1 to not add it.
    @Input() align = 'start'; // Where to align the time and text. Defaults to 'start'. Other values: 'center', 'end'.
    @Input({ transform: toBoolean }) hidable = false; // Whether the user can hide the time left.
    @Input() timeUpText?: string; // Text to show when the timer reaches 0. If not defined, 'core.timesup'.
    @Input() mode: CoreTimerMode = CoreTimerMode.ITEM; // How to display data.
    @Input() underTimeClassThresholds = []; // Number of seconds to add the class 'core-timer-under-'.
    @Input() timerHiddenPreferenceName?: string; // Name of the preference to store the timer visibility.
    @Output() finished = new EventEmitter<void>(); // Will emit an event when the timer reaches 0.

    /**
     * @deprecated since 4.4. Use hidable instead.
     */
    @Input({ transform: toBoolean }) hiddable = false; // Whether the user can hide the time left.

    timeLeft?: number; // Seconds left to end.
    modeBasic = CoreTimerMode.BASIC;
    showTimeLeft = true;

    protected timeInterval?: number;
    protected element?: HTMLElement;

    constructor(
        protected elementRef: ElementRef,
    ) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // eslint-disable-next-line deprecation/deprecation
        if (this.hiddable && !this.hidable) {

            this.hidable = true;
        }

        const timeLeftClass = this.timeLeftClass || 'core-timer-timeleft-';
        const endTime = Math.round(this.endTime);
        this.underTimeClassThresholds.sort((a, b) => a - b); // Sort by increase order.

        if (this.hidable && this.timerHiddenPreferenceName) {
            try {
                const hidden = await CoreUser.getUserPreference(this.timerHiddenPreferenceName);

                this.showTimeLeft = hidden !== '1';
            } catch{
                // Ignore errors.
            }
        }

        let container: HTMLElement | undefined;

        // Check time left every 200ms.
        this.timeInterval = window.setInterval(() => {
            container = container || this.elementRef.nativeElement;
            this.timeLeft = Math.max(endTime - CoreTime.timestamp(), 0);

            if (this.timeLeft <= 100) {
                this.hidable = false;
                this.showTimeLeft = true;
            }

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
                        if (!container.classList.contains(`core-timer-under-${this.timeLeft}`)) {
                            // Add new class and remove the previous one.
                            const nextTreshold = this.underTimeClassThresholds[i + 1];
                            container.classList.add(`core-timer-under-${threshold}`);
                            nextTreshold && container.classList.remove(`core-timer-under-${nextTreshold}`);
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
     * Toggles the time left visibility.
     */
    toggleTimeLeftVisibility(): void {
        this.showTimeLeft = !this.showTimeLeft;

        if (this.hidable && this.timerHiddenPreferenceName) {
            CoreUser.setUserPreference(this.timerHiddenPreferenceName, this.showTimeLeft ? '0' : '1');
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        clearInterval(this.timeInterval);
    }

}

export enum CoreTimerMode {
    ITEM = 'item',
    BASIC = 'basic',
}
