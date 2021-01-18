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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { MESSAGES_OFFLINE_SITE_SCHEMA } from './services/database/messages';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { AddonMessagesMainMenuHandler, AddonMessagesMainMenuHandlerService } from './services/handlers/mainmenu';
import { CoreCronDelegate } from '@services/cron';

const mainMenuChildrenRoutes: Routes = [
    {
        path: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./messages-lazy.module').then(m => m.AddonMessagesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [MESSAGES_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreMainMenuDelegate.instance.registerHandler(AddonMessagesMainMenuHandler.instance);
                CoreCronDelegate.instance.register(AddonMessagesMainMenuHandler.instance);
            },
        },

    ],
})
export class AddonMessagesModule {

    /* constructor(
        contentLinksDelegate: CoreContentLinksDelegate,
        indexLinkHandler: AddonMessagesIndexLinkHandler,
        discussionLinkHandler: AddonMessagesDiscussionLinkHandler,
        sendMessageHandler: AddonMessagesSendMessageUserHandler,
        userDelegate: CoreUserDelegate,
        cronDelegate: CoreCronDelegate,
        syncHandler: AddonMessagesSyncCronHandler,
        network: Network,
        zone: NgZone,
        messagesSync: AddonMessagesSyncProvider,
        messagesProvider: AddonMessagesProvider,
        sitesProvider: CoreSitesProvider,
        linkHelper: CoreContentLinksHelperProvider,
        settingsHandler: AddonMessagesSettingsHandler,
        settingsDelegate: CoreSettingsDelegate,
        pushNotificationsDelegate: CorePushNotificationsDelegate,
        addContactHandler: AddonMessagesAddContactUserHandler,
        blockContactHandler: AddonMessagesBlockContactUserHandler,
        contactRequestLinkHandler: AddonMessagesContactRequestLinkHandler,
        pushClickHandler: AddonMessagesPushClickHandler,
    ) {
        // Register handlers.
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(discussionLinkHandler);
        contentLinksDelegate.registerHandler(contactRequestLinkHandler);
        userDelegate.registerHandler(sendMessageHandler);
        userDelegate.registerHandler(addContactHandler);
        userDelegate.registerHandler(blockContactHandler);
        cronDelegate.register(syncHandler);
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
    }*/

}
