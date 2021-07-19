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

import { Injector, NgModule } from '@angular/core';
import { Route, RouterModule, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonCalendarMainMenuHandlerService } from './services/handlers/mainmenu';

export const AddonCalendarEditRoute: Route = {
    path: 'edit/:eventId',
    loadChildren: () =>
        import('@/addons/calendar/pages/edit-event/edit-event.module').then(m => m.AddonCalendarEditEventPageModule),
};

export const AddonCalendarEventRoute: Route ={
    path: 'event/:id',
    loadChildren: () => import('@/addons/calendar/pages/event/event.module').then(m => m.AddonCalendarEventPageModule),
};

function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index',
            data: {
                mainMenuTabRoot: AddonCalendarMainMenuHandlerService.PAGE_NAME,
            },
            loadChildren: () => import('@/addons/calendar/pages/index/index.module').then(m => m.AddonCalendarIndexPageModule),
        },
        {
            path: 'list',
            data: {
                mainMenuTabRoot: AddonCalendarMainMenuHandlerService.PAGE_NAME,
            },
            loadChildren: () => import('@/addons/calendar/pages/list/list.module').then(m => m.AddonCalendarListPageModule),
        },
        {
            path: 'settings',
            loadChildren: () =>
                import('@/addons/calendar/pages/settings/settings.module').then(m => m.AddonCalendarSettingsPageModule),
        },
        {
            path: 'day',
            loadChildren: () =>
                import('@/addons/calendar/pages/day/day.module').then(m => m.AddonCalendarDayPageModule),
        },
        AddonCalendarEventRoute,
        AddonCalendarEditRoute,
        ...buildTabMainRoutes(injector, {
            redirectTo: 'index',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    exports: [RouterModule],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export class AddonCalendarLazyModule { }
