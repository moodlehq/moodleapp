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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreCronDelegate } from '@services/cron';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { AddonNotificationsMainMenuHandler, AddonNotificationsMainMenuHandlerService } from './services/handlers/mainmenu';
import { AddonNotificationsCronHandler } from './services/handlers/cron';
import { AddonNotificationsPushClickHandler } from './services/handlers/push-click';
import { AddonNotificationsSettingsHandler, AddonNotificationsSettingsHandlerService } from './services/handlers/settings';
import { CoreSitePreferencesRoutingModule } from '@features/settings/pages/site/site-routing';
import { AddonNotificationsProvider } from './services/notifications';
import { AddonNotificationsHelperProvider } from './services/notifications-helper';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonNotificationsPreferencesLinkHandler } from './services/handlers/preferences-link';
import { AddonNotificationsLinkHandler } from './services/handlers/notifications-link';

export const ADDON_NOTIFICATIONS_SERVICES: Type<unknown>[] = [
    AddonNotificationsProvider,
    AddonNotificationsHelperProvider,
];

const routes: Routes = [
    {
        path: AddonNotificationsMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@addons/notifications/notifications-lazy.module').then(m => m.AddonNotificationsLazyModule),
    },
];
const preferencesRoutes: Routes = [
    {
        path: AddonNotificationsSettingsHandlerService.PAGE_NAME,
        loadChildren: () => import('./pages/settings/settings.module').then(m => m.AddonNotificationsSettingsPageModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuRoutingModule.forChild({ children: routes }),
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreSitePreferencesRoutingModule.forChild(preferencesRoutes),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreMainMenuDelegate.registerHandler(AddonNotificationsMainMenuHandler.instance);
                CoreCronDelegate.register(AddonNotificationsCronHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonNotificationsPushClickHandler.instance);
                CoreSettingsDelegate.registerHandler(AddonNotificationsSettingsHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonNotificationsLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonNotificationsPreferencesLinkHandler.instance);

                AddonNotificationsMainMenuHandler.initialize();
            },
        },
    ],
})
export class AddonNotificationsModule {}
