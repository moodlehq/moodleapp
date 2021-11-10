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
    AddonCalendarReminderUnits,
    AddonCalendarValueAndUnit,
} from '../../services/calendar';
import { CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonCalendarReminderTimeModalComponent } from '@addons/calendar/components/reminder-time-modal/reminder-time-modal';

/**
 * Page that displays the calendar settings.
 */
@Component({
    selector: 'page-addon-calendar-settings',
    templateUrl: 'settings.html',
})
export class AddonCalendarSettingsPage implements OnInit {

    defaultTimeLabel = '';

    protected defaultTime: AddonCalendarValueAndUnit = {
        value: 0,
        unit: AddonCalendarReminderUnits.MINUTE,
    };

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        const defaultTime = await AddonCalendar.getDefaultNotificationTime();

        this.defaultTime = AddonCalendarProvider.convertSecondsToValueAndUnit(defaultTime);
        this.defaultTimeLabel = AddonCalendar.getUnitValueLabel(this.defaultTime.value, this.defaultTime.unit);
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

        const reminderTime = await CoreDomUtils.openModal<number>({
            component: AddonCalendarReminderTimeModalComponent,
            componentProps: {
                initialValue: this.defaultTime,
                allowDisable: true,
            },
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        this.defaultTime = AddonCalendarProvider.convertSecondsToValueAndUnit(reminderTime);
        this.defaultTimeLabel = AddonCalendar.getUnitValueLabel(this.defaultTime.value, this.defaultTime.unit);

        this.updateDefaultTime(reminderTime);
    }

    /**
     * Update default time.
     *
     * @param newTime New time.
     */
    updateDefaultTime(newTime: number): void {
        AddonCalendar.setDefaultNotificationTime(newTime);

        CoreEvents.trigger(
            AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED,
            { time: newTime },
            CoreSites.getCurrentSiteId(),
        );
    }

}
