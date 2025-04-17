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

import { conditionalRoutes } from '@/app/app-routing.module';
import { Injector, NgModule } from '@angular/core';
import { ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreScreen } from '@services/screen';
import { AddonNotificationsMainMenuHandlerService } from './services/handlers/mainmenu';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'list',
            data: { mainMenuTabRoot: AddonNotificationsMainMenuHandlerService.PAGE_NAME },
            loadComponent: () => import('@addons/notifications/pages/list/list'),
            children: conditionalRoutes([
                {
                    path: ':id',
                    loadComponent: () => import('@addons/notifications/pages/notification/notification'),
                },
            ], () => CoreScreen.isTablet),
        },
        ...conditionalRoutes([
            {
                path: 'list/:id',
                loadComponent: () => import('@addons/notifications/pages/notification/notification'),
            },
        ], () => CoreScreen.isMobile),
        {
            path: 'notification',
            loadComponent: () => import('@addons/notifications/pages/notification/notification'),
        },
        ...buildTabMainRoutes(injector, {
            redirectTo: 'list',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export default class AddonNotificationsLazyModule {}
