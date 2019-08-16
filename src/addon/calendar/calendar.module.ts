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

import { NgModule } from '@angular/core';
import { AddonCalendarProvider } from './providers/calendar';
import { AddonCalendarHelperProvider } from './providers/helper';
import { AddonCalendarMainMenuHandler } from './providers/mainmenu-handler';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreInitDelegate } from '@providers/init';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreLoginHelperProvider } from '@core/login/providers/helper';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_CALENDAR_PROVIDERS: any[] = [
    AddonCalendarProvider,
    AddonCalendarHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonCalendarProvider,
        AddonCalendarHelperProvider,
        AddonCalendarMainMenuHandler
    ]
})
export class AddonCalendarModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, calendarHandler: AddonCalendarMainMenuHandler,
            initDelegate: CoreInitDelegate, calendarProvider: AddonCalendarProvider, loginHelper: CoreLoginHelperProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider, updateManager: CoreUpdateManagerProvider) {
        mainMenuDelegate.registerHandler(calendarHandler);

        initDelegate.ready().then(() => {
            calendarProvider.scheduleAllSitesEventsNotifications();
        });

        localNotificationsProvider.registerClick(AddonCalendarProvider.COMPONENT, (data) => {
            if (data.eventid) {
                initDelegate.ready().then(() => {
                    calendarProvider.isDisabled(data.siteId).then((disabled) => {
                        if (disabled) {
                            // The calendar is disabled in the site, don't open it.
                            return;
                        }

                        loginHelper.redirect('AddonCalendarListPage', {eventId: data.eventid}, data.siteId);
                    });
                });
            }
        });

        // Allow migrating the table from the old app to the new schema.
        // In the old app some calculated properties were stored when it shouldn't. Filter only the fields we want.
        updateManager.registerSiteTableMigration({
            name: 'calendar_events',
            newName: AddonCalendarProvider.EVENTS_TABLE,
            filterFields: ['id', 'name', 'description', 'format', 'eventtype', 'courseid', 'timestart', 'timeduration',
                    'categoryid', 'groupid', 'userid', 'instance', 'modulename', 'timemodified', 'repeatid', 'visible', 'uuid',
                    'sequence', 'subscriptionid']
        });

        // Migrate the component name.
        updateManager.registerLocalNotifComponentMigration('mmaCalendarComponent', AddonCalendarProvider.COMPONENT);
    }
}
