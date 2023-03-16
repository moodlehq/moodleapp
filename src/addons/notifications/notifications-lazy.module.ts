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
import { CoreSharedModule } from '@/core/shared.module';
import { AddonNotificationsListPage } from '@addons/notifications/pages/list/list';
import { AddonNotificationsNotificationPage } from '@addons/notifications/pages/notification/notification';
import { Injector, NgModule } from '@angular/core';
import { RouterModule, ROUTES, Routes } from '@angular/router';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';

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
            component: AddonNotificationsListPage,
            children: conditionalRoutes([
                {
                    path: ':id',
                    component: AddonNotificationsNotificationPage,
                },
            ], () => CoreScreen.isTablet),
        },
        ...conditionalRoutes([
            {
                path: 'list/:id',
                component: AddonNotificationsNotificationPage,
            },
        ], () => CoreScreen.isMobile),
        {
            path: 'notification',
            component: AddonNotificationsNotificationPage,
        },
        ...buildTabMainRoutes(injector, {
            redirectTo: 'list',
            pathMatch: 'full',
        }),
    ];
}

@NgModule({
    imports: [
        CoreSharedModule,
        CoreMainMenuComponentsModule,
    ],
    declarations: [
        AddonNotificationsListPage,
        AddonNotificationsNotificationPage,
    ],
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
export class AddonNotificationsLazyModule {}
