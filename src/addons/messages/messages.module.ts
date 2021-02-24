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
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { AddonMessagesSettingsHandler } from './services/handlers/settings';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonMessagesIndexLinkHandler } from './services/handlers/index-link';
import { AddonMessagesDiscussionLinkHandler } from './services/handlers/discussion-link';
import { AddonMessagesContactRequestLinkHandler } from './services/handlers/contact-request-link';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonMessagesPushClickHandler } from './services/handlers/push-click';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonMessagesSendMessageUserHandler } from './services/handlers/user-send-message';
import { Network, NgZone } from '@singletons';
import { AddonMessagesSync } from './services/messages-sync';
import { AddonMessagesSyncCronHandler } from './services/handlers/sync-cron';

const mainMenuChildrenRoutes: Routes = [
    {
        path: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('./messages-lazy.module').then(m => m.AddonMessagesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuRoutingModule.forChild({ children: mainMenuChildrenRoutes }),
        CoreMainMenuTabRoutingModule.forChild( mainMenuChildrenRoutes),
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
                // Register handlers.
                CoreMainMenuDelegate.instance.registerHandler(AddonMessagesMainMenuHandler.instance);
                CoreCronDelegate.instance.register(AddonMessagesMainMenuHandler.instance);
                CoreCronDelegate.instance.register(AddonMessagesSyncCronHandler.instance);
                CoreSettingsDelegate.instance.registerHandler(AddonMessagesSettingsHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(AddonMessagesIndexLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(AddonMessagesDiscussionLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(AddonMessagesContactRequestLinkHandler.instance);
                CorePushNotificationsDelegate.instance.registerClickHandler(AddonMessagesPushClickHandler.instance);
                CoreUserDelegate.instance.registerHandler(AddonMessagesSendMessageUserHandler.instance);

                // Sync some discussions when device goes online.
                Network.instance.onConnect().subscribe(() => {
                    // Execute the callback in the Angular zone, so change detection doesn't stop working.
                    NgZone.instance.run(() => {
                        AddonMessagesSync.instance.syncAllDiscussions(undefined, true);
                    });
                });
            },
        },

    ],
})
export class AddonMessagesModule {}
