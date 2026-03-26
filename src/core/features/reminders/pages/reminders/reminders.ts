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

import { Component, OnInit, signal } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreReminders } from '@features/reminders/services/reminders';
import { CoreReminderDBRecord } from '@features/reminders/services/database/reminders';
import { CoreNavigator } from '@services/navigator';
import { AddonCalendarHelper } from '@addons/calendar/services/calendar-helper';
import { CoreCourse, CoreCourseModuleBasicInfo } from '@features/course/services/course';
import { REMINDERS_DEFAULT_REMINDER_TIMEBEFORE, REMINDERS_DISABLED } from '@features/reminders/constants';
import { CoreTime } from '@static/time';
import { CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';

/**
 * Page to display reminders stored.
 */
@Component({
    selector: 'page-core-reminders-list',
    templateUrl: 'reminders.html',
    styleUrl: 'reminders.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreRemindersListPage implements OnInit {

    readonly reminders = signal<CoreReminderToDisplay[]>([]);

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.load();
    }

    /**
     * Refresh the list of reminders.
     *
     * @param refresher Refresher element.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        try {
            await this.load();
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Load the list of reminders and related information.
     */
    protected async load(): Promise<void> {
        const now = CoreTime.timestamp();
        try {
            const reminders = await CoreReminders.getAllReminders();
            const defaultTime = await CoreReminders.getDefaultNotificationTime();

            const wsOptions: CoreSitesCommonWSOptions = {
                readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            };

            let remindersToDisplay = await Promise.all(reminders.map(async (reminder) => {
                const reminderToDisplay: CoreReminderToDisplay = {
                    ...reminder,
                };
                const timebefore = reminder.timebefore === REMINDERS_DEFAULT_REMINDER_TIMEBEFORE
                    ? defaultTime
                    : reminder.timebefore;

                if (timebefore === REMINDERS_DISABLED) {
                    // Notification is disabled.
                    reminderToDisplay.passed = true;
                    reminderToDisplay.scheduledTime = undefined;

                    return reminderToDisplay;
                }

                reminderToDisplay.scheduledTime = reminderToDisplay.time - timebefore;
                if (reminderToDisplay.scheduledTime < now) {
                    reminderToDisplay.passed = true;
                }

                try {
                    let mod: CoreCourseModuleBasicInfo | undefined = undefined;
                    switch (reminderToDisplay.component) {
                        case 'AddonCalendarEvents':
                            reminderToDisplay.reminderType = 'event';
                            reminderToDisplay.icon = AddonCalendarHelper.getEventIcon(reminderToDisplay.type) ||
                                AddonCalendarHelper.getEventIcon('course');
                            reminderToDisplay.url = ''; // We want to open the event.
                            break;
                        case 'course':
                            reminderToDisplay.reminderType = 'course';
                            reminderToDisplay.icon = 'fas-graduation-cap';
                            break;
                        default:
                            mod = await CoreCourse.getModuleBasicInfo(reminderToDisplay.instanceId, wsOptions);

                            reminderToDisplay.reminderType = 'activity';
                            reminderToDisplay.moduleName = mod.modname;
                    }
                } catch {
                    // Ignore errors, we just won't show the icon or module name.
                }

                return reminderToDisplay;
            }));
            remindersToDisplay = remindersToDisplay
                .filter((reminder) => reminder.scheduledTime !== undefined)
                .sort((a, b) => (a.scheduledTime ?? 0) - (b.scheduledTime ?? 0));

            this.reminders.set(remindersToDisplay);

        } catch {
            this.reminders.set([]);
        }
    }

    /**
     * Navigate to the reminder event.
     *
     * @param reminder Reminder to open.
     */
    openReminder(reminder: CoreReminderToDisplay): void {
        if (reminder.reminderType === 'event') {
            CoreNavigator.navigateToSitePath(`/calendar/event/${reminder.instanceId}`);

            return;
        }
        // Not implemented, shouldn't happen.
    }

}

type CoreReminderToDisplay = CoreReminderDBRecord & {
    reminderType?: 'event' | 'activity' | 'course';
    moduleName?: string;
    icon?: string;
    scheduledTime?: number;
    passed?: boolean;
};
