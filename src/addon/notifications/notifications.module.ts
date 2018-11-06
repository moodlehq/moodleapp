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
import { AddonNotificationsProvider } from './providers/notifications';
import { AddonNotificationsMainMenuHandler } from './providers/mainmenu-handler';
import { AddonNotificationsSettingsHandler } from './providers/settings-handler';
import { AddonNotificationsCronHandler } from './providers/cron-handler';
import { CoreAppProvider } from '@providers/app';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreSettingsDelegate } from '@core/settings/providers/delegate';
import { CoreCronDelegate } from '@providers/cron';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonPushNotificationsDelegate } from '@addon/pushnotifications/providers/delegate';

// List of providers (without handlers).
export const ADDON_NOTIFICATIONS_PROVIDERS: any[] = [
    AddonNotificationsProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonNotificationsProvider,
        AddonNotificationsMainMenuHandler,
        AddonNotificationsSettingsHandler,
        AddonNotificationsCronHandler,
    ]
})
export class AddonNotificationsModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainMenuHandler: AddonNotificationsMainMenuHandler,
            settingsDelegate: CoreSettingsDelegate, settingsHandler: AddonNotificationsSettingsHandler,
            cronDelegate: CoreCronDelegate, cronHandler: AddonNotificationsCronHandler,
            appProvider: CoreAppProvider, utils: CoreUtilsProvider, sitesProvider: CoreSitesProvider,
            notificationsProvider: AddonNotificationsProvider, localNotifications: CoreLocalNotificationsProvider,
            linkHelper: CoreContentLinksHelperProvider, pushNotificationsDelegate: AddonPushNotificationsDelegate) {
        mainMenuDelegate.registerHandler(mainMenuHandler);
        settingsDelegate.registerHandler(settingsHandler);
        cronDelegate.register(cronHandler);

        const notificationClicked = (notification: any): void => {
            sitesProvider.isFeatureDisabled('CoreMainMenuDelegate_AddonNotifications', notification.site).then((disabled) => {
                if (disabled) {
                    // Notifications are disabled, stop.
                    return;
                }

                notificationsProvider.invalidateNotificationsList().finally(() => {
                    linkHelper.goInSite(undefined, 'AddonNotificationsListPage', undefined, notification.site);
                });
            });
        };

        if (appProvider.isDesktop()) {
            // Listen for clicks in simulated push notifications.
            localNotifications.registerClick(AddonNotificationsProvider.PUSH_SIMULATION_COMPONENT, notificationClicked);
        }

        // Register push notification clicks.
        pushNotificationsDelegate.on('click').subscribe((notification) => {
            if (utils.isTrueOrOne(notification.notif)) {
                notificationClicked(notification);

                return true;
            }
        });
    }
}
