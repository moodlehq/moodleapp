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
import { CoreMainMenuDelegate } from '../../core/mainmenu/providers/delegate';
import { CoreContentLinksDelegate } from '../../core/contentlinks/providers/delegate';
import { CoreUserDelegate } from '../../core/user/providers/user-delegate';
import { CoreCronDelegate } from '../../providers/cron';
import { AddonMessagesSendMessageUserHandler } from './providers/user-send-message-handler';
import { AddonMessagesDiscussionLinkHandler } from './providers/discussion-link-handler';
import { AddonMessagesIndexLinkHandler } from './providers/index-link-handler';
import { AddonMessagesSyncCronHandler } from './providers/sync-cron-handler';
import { CoreEventsProvider } from '../../providers/events';

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
        AddonMessagesSyncCronHandler
    ]
})
export class AddonMessagesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainmenuHandler: AddonMessagesMainMenuHandler,
            contentLinksDelegate: CoreContentLinksDelegate, indexLinkHandler: AddonMessagesIndexLinkHandler,
            discussionLinkHandler: AddonMessagesDiscussionLinkHandler, sendMessageHandler: AddonMessagesSendMessageUserHandler,
            userDelegate: CoreUserDelegate, cronDelegate: CoreCronDelegate, syncHandler: AddonMessagesSyncCronHandler,
            network: Network, messagesSync: AddonMessagesSyncProvider) {
        // Register handlers.
        mainMenuDelegate.registerHandler(mainmenuHandler);
        contentLinksDelegate.registerHandler(indexLinkHandler);
        contentLinksDelegate.registerHandler(discussionLinkHandler);
        userDelegate.registerHandler(sendMessageHandler);
        cronDelegate.register(syncHandler);
        cronDelegate.register(mainmenuHandler);

        // Sync some discussions when device goes online.
        network.onConnect().subscribe(() => {
            messagesSync.syncAllDiscussions(undefined, true);
        });
    }
}
