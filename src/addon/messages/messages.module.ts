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
import { AddonMessagesAddContactUserHandler } from './providers/user-add-contact-handler';
import { AddonMessagesBlockContactUserHandler } from './providers/user-block-contact-handler';
import { AddonMessagesContactRequestLinkHandler } from './providers/contact-request-link-handler';
import { AddonMessagesDiscussionLinkHandler } from './providers/discussion-link-handler';
import { AddonMessagesIndexLinkHandler } from './providers/index-link-handler';
import { AddonMessagesSyncCronHandler } from './providers/sync-cron-handler';
import { AddonMessagesPushClickHandler } from './providers/push-click-handler';
import { CoreAppProvider } from '@providers/app';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSettingsDelegate } from '@core/settings/providers/delegate';
import { AddonMessagesSettingsHandler } from './providers/settings-handler';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { CoreUtilsProvider } from '@providers/utils/utils';

// List of providers (without handlers).
export const ADDON_MESSAGES_PROVIDERS: any[] = [
    AddonMessagesProvider,
    AddonMessagesOfflineProvider,
    AddonMessagesSyncProvider
];

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
        AddonMessagesAddContactUserHandler,
        AddonMessagesBlockContactUserHandler,
        AddonMessagesContactRequestLinkHandler,
        AddonMessagesDiscussionLinkHandler,
        AddonMessagesIndexLinkHandler,
        AddonMessagesSyncCronHandler,
        AddonMessagesSettingsHandler,
        AddonMessagesPushClickHandler
    ]
})
export class AddonMessagesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainmenuHandler: AddonMessagesMainMenuHandler,
            contentLinksDelegate: CoreContentLinksDelegate, indexLinkHandler: AddonMessagesIndexLinkHandler,
            discussionLinkHandler: AddonMessagesDiscussionLinkHandler, sendMessageHandler: AddonMessagesSendMessageUserHandler,
            userDelegate: CoreUserDelegate, cronDelegate: CoreCronDelegate, syncHandler: AddonMessagesSyncCronHandler,
            network: Network, zone: NgZone, messagesSync: AddonMessagesSyncProvider, appProvider: CoreAppProvider,
            localNotifications: CoreLocalNotificationsProvider, messagesProvider: AddonMessagesProvider,
            sitesProvider: CoreSitesProvider, linkHelper: CoreContentLinksHelperProvider,
            settingsHandler: AddonMessagesSettingsHandler, settingsDelegate: CoreSettingsDelegate,
            pushNotificationsDelegate: CorePushNotificationsDelegate, utils: CoreUtilsProvider,
            addContactHandler: AddonMessagesAddContactUserHandler, blockContactHandler: AddonMessagesBlockContactUserHandler,
            contactRequestLinkHandler: AddonMessagesContactRequestLinkHandler, pushClickHandler: AddonMessagesPushClickHandler) {
        // Register handlers.
        mainMenuDelegate.registerHandler(mainmenuHandler);
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(discussionLinkHandler);
        contentLinksDelegate.registerHandler(contactRequestLinkHandler);
        userDelegate.registerHandler(sendMessageHandler);
        userDelegate.registerHandler(addContactHandler);
        userDelegate.registerHandler(blockContactHandler);
        cronDelegate.register(syncHandler);
        cronDelegate.register(mainmenuHandler);
        settingsDelegate.registerHandler(settingsHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);

        // Sync some discussions when device goes online.
        network.onConnect().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                messagesSync.syncAllDiscussions(undefined, true);
            });
        });

        const notificationClicked = (notification: any): void => {
            messagesProvider.isMessagingEnabledForSite(notification.site).then(() => {
                sitesProvider.isFeatureDisabled('CoreMainMenuDelegate_AddonMessages', notification.site).then((disabled) => {
                    if (disabled) {
                        // Messages are disabled, stop.
                        return;
                    }

                    messagesProvider.invalidateDiscussionsCache(notification.site).finally(() => {
                        // Check if group messaging is enabled, to determine which page should be loaded.
                        messagesProvider.isGroupMessagingEnabledInSite(notification.site).then((enabled) => {
                            const pageParams: any = {};
                            let pageName = 'AddonMessagesIndexPage';
                            if (enabled) {
                                pageName = 'AddonMessagesGroupConversationsPage';
                            }

                            // Check if we have enough information to open the conversation.
                            if (notification.convid && enabled) {
                                pageParams.conversationId = Number(notification.convid);
                            } else if (notification.userfromid || notification.useridfrom) {
                                pageParams.discussionUserId = Number(notification.userfromid || notification.useridfrom);
                            }

                            linkHelper.goInSite(undefined, pageName, pageParams, notification.site);
                        });
                    });
                });
            });
        };

        if (appProvider.isDesktop()) {
            // Listen for clicks in simulated push notifications.
            localNotifications.registerClick(AddonMessagesProvider.PUSH_SIMULATION_COMPONENT, notificationClicked);
        }
    }
}
