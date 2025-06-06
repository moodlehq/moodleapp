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
import { Component, OnInit, OnDestroy, ElementRef, input, output, signal, computed, effect, inject } from '@angular/core';
import { CoreUser } from '@features/user/services/user';

import { CoreTime } from '@singletons/time';
import { CoreBaseModule } from '@/core/base.module';
import { CoreSecondsToHMSPipe } from '@pipes/seconds-to-hms';
import { CorePromiseUtils } from '@singletons/promise-utils';

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

    endTime = input(0); // Timestamp (in seconds) when the timer should end.
    timerText = input<string>(''); // Text to show next to the timer. If not defined, no text shown.
    timeLeftClass = input<string>(); // Name of the class to apply with each second. By default, 'core-timer-timeleft-'.
    timeLeftClassThreshold = input(100); // Number of seconds to start adding the timeLeftClass. Set it to -1 to not add it.
    align = input('start'); // Where to align the time and text. Defaults to 'start'. Other values: 'center', 'end'.
    hidable = input(false, { transform: toBoolean }); // Whether the user can hide the time left.
    timeUpText = input<string>(); // Text to show when the timer reaches 0. If not defined, 'core.timesup'.
    mode = input<CoreTimerMode>(CoreTimerMode.ITEM); // How to display data.
    underTimeClassThresholds = input([]); // Number of seconds to add the class 'core-timer-under-'.
    timerHiddenPreferenceName = input<string>(); // Name of the preference to store the timer visibility.
    finished = output<void>(); // Will emit an event when the timer reaches 0.
    /**
     * @deprecated since 4.4. Use hidable instead.
     */
    hiddable = input(false, { transform: toBoolean }); // Whether the user can hide the time left.

    timeLeft = signal(-1); // Seconds left to end.
    hiddenByUser = signal(false); // Whether the user has hidden the timer.

    showTimeLeft = computed(() => !this.canHideTimer() || !this.hiddenByUser());

    canHideTimer = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        if (!this.hidable() && !this.hiddable()) {
            return false;
        }

        // Don't allow hiding the timer if not started or time left is below 100 seconds.
        return this.timeLeft() === -1 || this.timeLeft() > 100;
    });

    modeBasic = CoreTimerMode.BASIC;
    protected timeInterval?: number;
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        // Apply classes based on the time left. Maybe this can be done with host bindings in the future.
        let container = this.element;
        effect(() => {
            const timeLeft = this.timeLeft();
            const timeLeftClass = this.timeLeftClass() || 'core-timer-timeleft-';
            const timeLeftClassThreshold = this.timeLeftClassThreshold();
            const underTimeClassThresholds = Array.from(this.underTimeClassThresholds())
                .sort((a, b) => a - b); // Sort by increase order.

            container = container || this.element;
            if (!container || timeLeft === -1) {
                return;
            }

            // Add class if timer is below timeLeftClassThreshold.
            if (timeLeft < timeLeftClassThreshold && !container.classList.contains(timeLeftClass + timeLeft)) {
                // Time left has changed. Remove previous classes and add the new one.
                container.classList.remove(timeLeftClass + (timeLeft + 1));
                container.classList.remove(timeLeftClass + (timeLeft + 2));
                container.classList.add(timeLeftClass + timeLeft);
            }

            // Add classes for underTimeClassThresholds.
            for (let i = 0; i < underTimeClassThresholds.length; i++) {
                const threshold = underTimeClassThresholds[i];
                if (timeLeft <= threshold) {
                    if (!container.classList.contains(`core-timer-under-${timeLeft}`)) {
                        // Add new class and remove the previous one.
                        const nextTreshold = underTimeClassThresholds[i + 1];
                        container.classList.add(`core-timer-under-${threshold}`);
                        nextTreshold && container.classList.remove(`core-timer-under-${nextTreshold}`);
                    }

                    break;
                }
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Only read the preference once, it should not change.
        this.initHiddenByUser();

        // Start the timer, updating time left every 200ms until it reaches 0.
        const endTime = Math.round(this.endTime());

        this.timeInterval = window.setInterval(() => {
            this.timeLeft.set(Math.max(endTime - CoreTime.timestamp(), 0));

            if (this.timeLeft() === 0) {
                // Time is up! Stop the timer and call the finish function.
                clearInterval(this.timeInterval);
                this.finished.emit();

                return;
            }
        }, 200);
    }

    /**
     * Initializes the hiddenByUser signal based on the user preference.
     */
    protected async initHiddenByUser(): Promise<void> {
        const timerHiddenPreferenceName = this.timerHiddenPreferenceName();
        if (this.canHideTimer() && timerHiddenPreferenceName) {
            const hidden = await CorePromiseUtils.ignoreErrors(CoreUser.getUserPreference(timerHiddenPreferenceName));

            this.hiddenByUser.set(hidden === '1');
        }
    }

    /**
     * Toggles the time left visibility.
     */
    toggleTimeLeftVisibility(): void {
        this.hiddenByUser.set(!this.hiddenByUser());

        const timerHiddenPreferenceName = this.timerHiddenPreferenceName();
        if (timerHiddenPreferenceName) {
            CoreUser.setUserPreference(timerHiddenPreferenceName, this.hiddenByUser() ? '0' : '1');
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
