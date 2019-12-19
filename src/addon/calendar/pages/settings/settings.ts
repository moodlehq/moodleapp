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

import { Component } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { AddonCalendarProvider } from '../../providers/calendar';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Page that displays the calendar settings.
 */
@IonicPage({ segment: 'addon-calendar-settings' })
@Component({
    selector: 'page-addon-calendar-settings',
    templateUrl: 'settings.html',
})
export class AddonCalendarSettingsPage {

    defaultTime = 0;

    constructor(private calendarProvider: AddonCalendarProvider, private eventsProvider: CoreEventsProvider,
        private sitesProvider: CoreSitesProvider) { }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.calendarProvider.getDefaultNotificationTime().then((time) => {
            this.defaultTime = time;
        });
    }

    /**
     * Update default time.
     *
     * @param newTime New time.
     */
    updateDefaultTime(newTime: number): void {
        this.calendarProvider.setDefaultNotificationTime(newTime);
        this.eventsProvider.trigger(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, { time: newTime },
            this.sitesProvider.getCurrentSiteId());
    }
}
