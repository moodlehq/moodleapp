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
import { CoreCronDelegate } from '@providers/cron';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { AddonModForumProvider } from './providers/forum';
import { AddonModForumOfflineProvider } from './providers/offline';
import { AddonModForumHelperProvider } from './providers/helper';
import { AddonModForumSyncProvider } from './providers/sync';
import { AddonModForumModuleHandler } from './providers/module-handler';
import { AddonModForumPrefetchHandler } from './providers/prefetch-handler';
import { AddonModForumSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModForumIndexLinkHandler } from './providers/index-link-handler';
import { AddonModForumDiscussionLinkHandler } from './providers/discussion-link-handler';
import { AddonModForumListLinkHandler } from './providers/list-link-handler';
import { AddonModForumPushClickHandler } from './providers/push-click-handler';
import { AddonModForumComponentsModule } from './components/components.module';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_FORUM_PROVIDERS: any[] = [
    AddonModForumProvider,
    AddonModForumOfflineProvider,
    AddonModForumHelperProvider,
    AddonModForumSyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModForumComponentsModule,
    ],
    providers: [
        AddonModForumProvider,
        AddonModForumOfflineProvider,
        AddonModForumHelperProvider,
        AddonModForumSyncProvider,
        AddonModForumModuleHandler,
        AddonModForumPrefetchHandler,
        AddonModForumSyncCronHandler,
        AddonModForumIndexLinkHandler,
        AddonModForumListLinkHandler,
        AddonModForumDiscussionLinkHandler,
        AddonModForumPushClickHandler
    ]
})
export class AddonModForumModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModForumModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModForumPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModForumSyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModForumIndexLinkHandler, discussionHandler: AddonModForumDiscussionLinkHandler,
            updateManager: CoreUpdateManagerProvider, listLinkHandler: AddonModForumListLinkHandler,
            pushNotificationsDelegate: CorePushNotificationsDelegate, pushClickHandler: AddonModForumPushClickHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(discussionHandler);
        linksDelegate.registerHandler(listLinkHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTablesMigration([
            {
                name: 'mma_mod_forum_offline_discussions',
                newName: AddonModForumOfflineProvider.DISCUSSIONS_TABLE,
                fields: [
                    {
                        name: 'forumAndUser',
                        delete: true
                    },
                    {
                        name: 'options',
                        type: 'object'
                    }
                ]
            },
            {
                name: 'mma_mod_forum_offline_replies',
                newName: AddonModForumOfflineProvider.REPLIES_TABLE,
                fields: [
                    {
                        name: 'forumAndUser',
                        delete: true
                    },
                    {
                        name: 'discussionAndUser',
                        delete: true
                    },
                    {
                        name: 'options',
                        type: 'object'
                    }
                ]
            }
        ]);
    }
}
