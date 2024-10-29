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

import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { MESSAGES_OFFLINE_SITE_SCHEMA } from './services/database/messages';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { AddonMessagesMainMenuHandler, AddonMessagesMainMenuHandlerService } from './services/handlers/mainmenu';
import { CoreCronDelegate } from '@services/cron';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { AddonMessagesSettingsHandler, AddonMessagesSettingsHandlerService } from './services/handlers/settings';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonMessagesIndexLinkHandler } from './services/handlers/index-link';
import { AddonMessagesDiscussionLinkHandler } from './services/handlers/discussion-link';
import { AddonMessagesContactRequestLinkHandler } from './services/handlers/contact-request-link';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonMessagesPushClickHandler } from './services/handlers/push-click';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonMessagesSendMessageUserHandler } from './services/handlers/user-send-message';
import { NgZone } from '@singletons';
import { CoreNetwork } from '@services/network';
import { AddonMessagesSync } from './services/messages-sync';
import { AddonMessagesSyncCronHandler } from './services/handlers/sync-cron';
import { CoreSitePreferencesRoutingModule } from '@features/settings/settings-site-routing.module';

/**
 * Get messages services.
 *
 * @returns Returns messages services.
 */
export async function getMessagesServices(): Promise<Type<unknown>[]> {
    const { AddonMessagesProvider } = await import('@addons/messages/services/messages');
    const { AddonMessagesOfflineProvider } = await import('@addons/messages/services/messages-offline');
    const { AddonMessagesSyncProvider } = await import('@addons/messages/services/messages-sync');

    return [
        AddonMessagesProvider,
        AddonMessagesOfflineProvider,
        AddonMessagesSyncProvider,
    ];
}

const mainMenuChildrenRoutes: Routes = [
    {
        path: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./messages-lazy.module'),
    },
];
const preferencesRoutes: Routes = [
    {
        path: AddonMessagesSettingsHandlerService.PAGE_NAME,
        loadChildren: () => import('./messages-settings-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
        CoreMainMenuTabRoutingModule.forChild( mainMenuChildrenRoutes),
        CoreSitePreferencesRoutingModule.forChild(preferencesRoutes),
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
            useValue: () => {
                // Register handlers.
                CoreMainMenuDelegate.registerHandler(AddonMessagesMainMenuHandler.instance);
                CoreCronDelegate.register(AddonMessagesMainMenuHandler.instance);
                CoreCronDelegate.register(AddonMessagesSyncCronHandler.instance);
                CoreSettingsDelegate.registerHandler(AddonMessagesSettingsHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonMessagesIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonMessagesDiscussionLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonMessagesContactRequestLinkHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonMessagesPushClickHandler.instance);
                CoreUserDelegate.registerHandler(AddonMessagesSendMessageUserHandler.instance);

                // Sync some discussions when device goes online.
                CoreNetwork.onConnectShouldBeStable().subscribe(() => {
                    // Execute the callback in the Angular zone, so change detection doesn't stop working.
                    NgZone.run(() => {
                        AddonMessagesSync.syncAllDiscussions(undefined, true);
                    });
                });
            },
        },

    ],
})
export class AddonMessagesModule {}
