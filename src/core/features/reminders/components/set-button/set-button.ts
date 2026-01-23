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

import { CoreReminderData, CoreReminders } from '@features/reminders/services/reminders';
import { Component, computed, input, signal } from '@angular/core';
import { CorePopovers } from '@services/overlays/popovers';
import { Translate } from '@singletons';
import { CoreTime } from '@singletons/time';
import { CoreToasts } from '@services/overlays/toasts';
import { REMINDERS_DISABLED } from '@features/reminders/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a button to set a reminder.
 */
@Component({
    selector: 'core-reminders-set-button',
    templateUrl: 'set-button.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreRemindersSetButtonComponent {

    readonly component = input<string>();
    readonly instanceId = input<number>();
    readonly type = input<string>();
    readonly label = input('');
    readonly initialTimebefore = input<number>();
    readonly time = input(-1);
    readonly title = input('');
    readonly url = input('');

    readonly labelClean = computed(() => this.label().replace(':', ''));
    readonly timebefore = signal(this.initialTimebefore());
    readonly reminderMessage = computed(() => {
        const timebefore = this.timebefore();
        if (timebefore === undefined) {
            return undefined;
        }

        const reminderTime = this.time() - timebefore;

        return Translate.instant('core.reminders.reminderset', {
            $a: CoreTime.userDate(reminderTime * 1000),
        });
    });

    /**
     * Set reminder.
     *
     * @param ev Click event.
     */
    async setReminder(ev: Event): Promise<void> {
        if (this.component() === undefined || this.instanceId() === undefined || this.type() === undefined) {
            return;
        }

        ev.preventDefault();
        ev.stopPropagation();

        if (this.timebefore() === undefined) {
            // Set it to the time of the event.
            this.saveReminder(0);

            return;
        }

        // Open popover.
        const { CoreRemindersSetReminderMenuComponent }
            = await import('../set-reminder-menu/set-reminder-menu');

        const reminderTime = await CorePopovers.open<{ timeBefore: number }>({
            component: CoreRemindersSetReminderMenuComponent,
            componentProps: {
                initialValue: this.timebefore(),
                eventTime: this.time(),
                noReminderLabel: 'core.reminders.delete',
            },
            event: ev,
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        // Save before.
        this.saveReminder(reminderTime.timeBefore);
    }

    /**
     * Save reminder.
     *
     * @param timebefore Time before the event to fire the notification.
     * @returns Promise resolved when done.
     */
    protected async saveReminder(timebefore: number): Promise<void> {
        const component = this.component();
        const instanceId = this.instanceId();
        const type = this.type();
        if (component === undefined || instanceId === undefined || type === undefined) {
            return;
        }

        // Remove previous the reminders.
        await CoreReminders.removeReminders({
            instanceId,
            component,
            type,
        });

        if (timebefore === undefined || timebefore === REMINDERS_DISABLED) {
            this.timebefore.set(undefined);
            CoreToasts.show({
                message: 'core.reminders.reminderunset',
                translateMessage: true,
            });

            return;
        }

        this.timebefore.set(timebefore);

        const reminder: CoreReminderData = {
            timebefore,
            component,
            instanceId,
            type,
            title: `${this.label()} ${this.title()}`,
            url: this.url(),
            time: this.time(),
        };

        // Save before.
        await CoreReminders.addReminder(reminder);

        const time = this.time() - timebefore;
        const message = Translate.instant('core.reminders.reminderset', { $a: CoreTime.userDate(time * 1000) });
        CoreToasts.show({ message });
    }

}
