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

import { CoreReminders } from '@features/reminders/services/reminders';
import { Component, computed, effect, input, signal } from '@angular/core';
import { CoreTime } from '@static/time';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreRemindersSetButtonComponent } from '../set-button/set-button';

/**
 * Component that displays a date to remind.
 */
@Component({
    selector: 'core-reminders-date',
    templateUrl: 'date.html',
    styleUrl: 'date.scss',
    imports: [
        CoreSharedModule,
        CoreRemindersSetButtonComponent,
    ],
})
export class CoreRemindersDateComponent {

    readonly component = input<string>();
    readonly instanceId = input<number>();
    readonly type = input<string>();
    readonly label = input('');
    readonly time = input(0);
    readonly relativeTo = input(0);
    readonly title = input('');
    readonly url = input('');

    readonly showReminderButton = computed(() => {
        // If not set, button won't be shown.
        const component = this.component();
        const instanceId = this.instanceId();
        const type = this.type();
        if (component === undefined || instanceId === undefined || type === undefined) {
            return false;
        }

        const remindersEnabled = CoreReminders.isEnabled();

        return remindersEnabled && this.time() > CoreTime.timestamp();
    });

    readonly timebefore = signal<number | undefined>(undefined); // Undefined means no reminder has been set.
    readonly readableTime = computed(() => this.getReadableTime(this.time(), this.relativeTo()));

    constructor() {
        effect(async () => {
            const component = this.component();
            const instanceId = this.instanceId();
            const type = this.type();

            if (!this.showReminderButton() || component === undefined || instanceId === undefined || type === undefined) {
                return;
            }

            const reminders = await CoreReminders.getReminders({
                instanceId,
                component,
                type,
            });

            this.timebefore.set(reminders[0]?.timebefore);
        });
    }

    /**
     * Returns the readable time.
     *
     * @param timestamp Timestamp.
     * @param relativeTo Base timestamp if timestamp is relative to this one.
     * @returns Readable time string.
     */
    protected getReadableTime(timestamp: number, relativeTo = 0): string {
        if (!relativeTo) {
            return CoreTime.userDate(timestamp * 1000, 'core.strftimedatetime', true);
        }

        return Translate.instant(
            `core.course.relativedatessubmissionduedate${timestamp > relativeTo ? 'after' : 'before'}`,
            {
                $a: {
                    datediffstr: relativeTo === timestamp ?
                        `0 ${Translate.instant('core.secs')}` :
                        CoreTime.formatTime(relativeTo - timestamp, 3),
                },
            },
        );
    }

}
