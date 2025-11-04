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

import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';

import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonCalendarViewLinkHandler } from './services/handlers/view-link';
import { AddonCalendarMainMenuHandler } from './services/handlers/mainmenu';
import { AddonCalendarSyncCronHandler } from './services/handlers/sync-cron';

import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CALENDAR_SITE_SCHEMA } from './services/database/calendar';
import { CALENDAR_OFFLINE_SITE_SCHEMA } from './services/database/calendar-offline';
import { AddonCalendar } from './services/calendar';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { ADDON_CALENDAR_PAGE_NAME } from './constants';

/**
 * Get calendar services.
 *
 * @returns Returns calendar services.
 */
export async function getCalendarServices(): Promise<Type<unknown>[]> {
    const { AddonCalendarProvider } = await import('@addons/calendar/services/calendar');
    const { AddonCalendarOfflineProvider } = await import('@addons/calendar/services/calendar-offline');
    const { AddonCalendarHelperProvider } = await import('@addons/calendar/services/calendar-helper');
    const { AddonCalendarSyncProvider } = await import('@addons/calendar/services/calendar-sync');

    return [
        AddonCalendarProvider,
        AddonCalendarOfflineProvider,
        AddonCalendarHelperProvider,
        AddonCalendarSyncProvider,
    ];
}

const mainMenuChildrenRoutes: Routes = [
    {
        path: ADDON_CALENDAR_PAGE_NAME,
        loadChildren: () => import('./calendar-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [CALENDAR_SITE_SCHEMA, CALENDAR_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(async () => {
            CoreContentLinksDelegate.registerHandler(AddonCalendarViewLinkHandler.instance);
            CoreMainMenuDelegate.registerHandler(AddonCalendarMainMenuHandler.instance);
            CoreCronDelegate.register(AddonCalendarSyncCronHandler.instance);

            await AddonCalendar.initialize();

            AddonCalendar.updateAllSitesEventReminders();
        }),
    ],
})
export class AddonCalendarModule {}
