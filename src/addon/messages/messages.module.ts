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
import { Network } from '@ionic-native/network';
import { AddonMessagesProvider } from './providers/messages';
import { AddonMessagesOfflineProvider } from './providers/messages-offline';
import { AddonMessagesSyncProvider } from './providers/sync';
import { AddonMessagesMainMenuHandler } from './providers/mainmenu-handler';
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreCronDelegate } from '@providers/cron';
import { AddonMessagesSendMessageUserHandler } from './providers/user-send-message-handler';
import { AddonMessagesDiscussionLinkHandler } from './providers/discussion-link-handler';
import { AddonMessagesIndexLinkHandler } from './providers/index-link-handler';
import { AddonMessagesSyncCronHandler } from './providers/sync-cron-handler';
import { CoreEventsProvider } from '@providers/events';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSettingsDelegate } from '@core/settings/providers/delegate';
import { AddonMessagesSettingsHandler } from './providers/settings-handler';
import { AddonPushNotificationsDelegate } from '@addon/pushnotifications/providers/delegate';
import { CoreUtilsProvider } from '@providers/utils/utils';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonMessagesProvider,
        AddonMessagesOfflineProvider,
        AddonMessagesSyncProvider,
        AddonMessagesMainMenuHandler,
        AddonMessagesSendMessageUserHandler,
        AddonMessagesDiscussionLinkHandler,
        AddonMessagesIndexLinkHandler,
        AddonMessagesSyncCronHandler,
        AddonMessagesSettingsHandler
    ]
})
export class AddonMessagesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainmenuHandler: AddonMessagesMainMenuHandler,
            contentLinksDelegate: CoreContentLinksDelegate, indexLinkHandler: AddonMessagesIndexLinkHandler,
            discussionLinkHandler: AddonMessagesDiscussionLinkHandler, sendMessageHandler: AddonMessagesSendMessageUserHandler,
            userDelegate: CoreUserDelegate, cronDelegate: CoreCronDelegate, syncHandler: AddonMessagesSyncCronHandler,
            network: Network, messagesSync: AddonMessagesSyncProvider, appProvider: CoreAppProvider,
            localNotifications: CoreLocalNotificationsProvider, messagesProvider: AddonMessagesProvider,
            sitesProvider: CoreSitesProvider, linkHelper: CoreContentLinksHelperProvider,
            settingsHandler: AddonMessagesSettingsHandler, settingsDelegate: CoreSettingsDelegate,
pushNotificationsDelegate: AddonPushNotificationsDelegate, utils: CoreUtilsProvider) {
        // Register handlers.
        mainMenuDelegate.registerHandler(mainmenuHandler);
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(discussionLinkHandler);
        userDelegate.registerHandler(sendMessageHandler);
        cronDelegate.register(syncHandler);
        cronDelegate.register(mainmenuHandler);
        settingsDelegate.registerHandler(settingsHandler);

        // Sync some discussions when device goes online.
        network.onConnect().subscribe(() => {
            messagesSync.syncAllDiscussions(undefined, true);
        });

        const notificationClicked = (notification: any): void => {
            messagesProvider.isMessagingEnabledForSite(notification.site).then(() => {
                sitesProvider.isFeatureDisabled('$mmSideMenuDelegate_mmaMessages', notification.site).then((disabled) => {
                    if (disabled) {
                        // Messages are disabled, stop.
                        return;
                    }

                    messagesProvider.invalidateDiscussionsCache().finally(() => {
                        linkHelper.goInSite(undefined, 'AddonMessagesIndexPage', undefined, notification.site);
                    });
                });
            });
        };

        if (appProvider.isDesktop()) {
            // Listen for clicks in simulated push notifications.
            localNotifications.registerClick(AddonMessagesProvider.PUSH_SIMULATION_COMPONENT, notificationClicked);
        }

        // @todo: use addon manager $mmPushNotificationsDelegate = $mmAddonManager.get('$mmPushNotificationsDelegate');
        // Register push notification clicks.
        if (pushNotificationsDelegate) {
            pushNotificationsDelegate.registerHandler('mmaMessages', (notification) => {
                if (utils.isFalseOrZero(notification.notif)) {
                    notificationClicked(notification);

                    return true;
                }
            });
        }
    }
}
