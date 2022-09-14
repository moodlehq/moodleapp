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

import { Component, OnInit } from '@angular/core';
import {
    AddonCalendar,
    AddonCalendarProvider,
} from '../../services/calendar';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import {
    CoreReminders,
    CoreRemindersService,
    CoreRemindersUnits,
    CoreReminderValueAndUnit,
} from '@features/reminders/services/reminders';
import { CoreRemindersSetReminderMenuComponent } from '@features/reminders/components/set-reminder-menu/set-reminder-menu';

/**
 * Page that displays the calendar settings.
 */
@Component({
    selector: 'page-addon-calendar-settings',
    templateUrl: 'settings.html',
})
export class AddonCalendarSettingsPage implements OnInit {

    defaultTimeLabel = '';

    protected defaultTime: CoreReminderValueAndUnit = {
        value: 0,
        unit: CoreRemindersUnits.MINUTE,
    };

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.updateDefaultTimeLabel();
    }

    /**
     * Change default time.
     *
     * @param e Event.
     * @return Promise resolved when done.
     */
    async changeDefaultTime(e: Event): Promise<void> {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();

        const reminderTime = await CoreDomUtils.openPopover<{timeBefore: number}>({
            component: CoreRemindersSetReminderMenuComponent,
            componentProps: {
                initialValue: this.defaultTime,
                noReminderLabel: 'core.settings.disabled',
            },
            event: e,
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        await AddonCalendar.setDefaultNotificationTime(reminderTime.timeBefore);
        this.updateDefaultTimeLabel();

        CoreEvents.trigger(
            AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED,
            { time: reminderTime.timeBefore },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * Update default time label.
     */
    async updateDefaultTimeLabel(): Promise<void> {
        const defaultTime = await AddonCalendar.getDefaultNotificationTime();

        this.defaultTime = CoreRemindersService.convertSecondsToValueAndUnit(defaultTime);
        this.defaultTimeLabel = CoreReminders.getUnitValueLabel(this.defaultTime.value, this.defaultTime.unit);
    }

}
