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

import { CoreSharedModule } from '@/core/shared.module';
import { AddonCalendarComponentsModule } from '@addons/calendar/components/components.module';
import { AddonCalendarDayPage } from '@addons/calendar/pages/day/day';
import { AddonCalendarEditEventPage } from '@addons/calendar/pages/edit-event/edit-event';
import { AddonCalendarEventPage } from '@addons/calendar/pages/event/event';
import { AddonCalendarIndexPage } from '@addons/calendar/pages/index';
import { AddonCalendarSettingsPage } from '@addons/calendar/pages/settings/settings';
import { Injector, NgModule } from '@angular/core';
import { ROUTES, Routes } from '@angular/router';
import { CoreEditorComponentsModule } from '@features/editor/components/components.module';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { ADDON_CALENDAR_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index',
            data: { mainMenuTabRoot: ADDON_CALENDAR_PAGE_NAME },
            component: AddonCalendarIndexPage,
        },
        {
            path: 'calendar-settings',
            component: AddonCalendarSettingsPage,
        },
        {
            path: 'day',
            component: AddonCalendarDayPage,
        },
        {
            path: 'event/:id',
            component: AddonCalendarEventPage,
        },
        {
            path: 'edit/:eventId',
            component: AddonCalendarEditEventPage,
            canDeactivate: [canLeaveGuard],
        },
        ...buildTabMainRoutes(injector, {
            redirectTo: 'index',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    imports: [
        CoreSharedModule,
        AddonCalendarComponentsModule,
        CoreMainMenuComponentsModule,
        CoreEditorComponentsModule,
    ],
    declarations: [
        AddonCalendarDayPage,
        AddonCalendarEditEventPage,
        AddonCalendarEventPage,
        AddonCalendarIndexPage,
        AddonCalendarSettingsPage,
    ],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export default class AddonCalendarLazyModule {}
