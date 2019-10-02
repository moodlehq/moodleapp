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

import { NgModule, NgZone } from '@angular/core';
import { AddonNotificationsProvider } from './providers/notifications';
import { AddonNotificationsHelperProvider } from './providers/helper';
import { AddonNotificationsMainMenuHandler } from './providers/mainmenu-handler';
import { AddonNotificationsSettingsHandler } from './providers/settings-handler';
import { AddonNotificationsCronHandler } from './providers/cron-handler';
import { AddonNotificationsPushClickHandler } from './providers/push-click-handler';
import { CoreAppProvider } from '@providers/app';
import { CoreInitDelegate } from '@providers/init';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreSettingsDelegate } from '@core/settings/providers/delegate';
import { CoreCronDelegate } from '@providers/cron';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

// List of providers (without handlers).
export const ADDON_NOTIFICATIONS_PROVIDERS: any[] = [
    AddonNotificationsProvider,
    AddonNotificationsHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonNotificationsProvider,
        AddonNotificationsHelperProvider,
        AddonNotificationsMainMenuHandler,
        AddonNotificationsSettingsHandler,
        AddonNotificationsCronHandler,
        AddonNotificationsPushClickHandler
    ]
})
export class AddonNotificationsModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainMenuHandler: AddonNotificationsMainMenuHandler,
            settingsDelegate: CoreSettingsDelegate, settingsHandler: AddonNotificationsSettingsHandler,
            cronDelegate: CoreCronDelegate, cronHandler: AddonNotificationsCronHandler, zone: NgZone,
            appProvider: CoreAppProvider, localNotifications: CoreLocalNotificationsProvider,
            initDelegate: CoreInitDelegate, pushNotificationsDelegate: CorePushNotificationsDelegate,
            pushClickHandler: AddonNotificationsPushClickHandler) {

        mainMenuDelegate.registerHandler(mainMenuHandler);
        settingsDelegate.registerHandler(settingsHandler);
        cronDelegate.register(cronHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);

        if (appProvider.isDesktop()) {
            // Listen for clicks in simulated push notifications.
            localNotifications.registerClick(AddonNotificationsProvider.PUSH_SIMULATION_COMPONENT, (notification) => {
                initDelegate.ready().then(() => {
                    pushNotificationsDelegate.clicked(notification);
                });
            });
        }
    }
}
