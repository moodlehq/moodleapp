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

import { NgModule } from '@angular/core';
import { CoreCronDelegate } from '@providers/cron';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
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
import { AddonModForumPostLinkHandler } from './providers/post-link-handler';
import { AddonModForumPushClickHandler } from './providers/push-click-handler';
import { AddonModForumTagAreaHandler } from './providers/tag-area-handler';
import { AddonModForumComponentsModule } from './components/components.module';

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
        AddonModForumPostLinkHandler,
        AddonModForumDiscussionLinkHandler,
        AddonModForumPushClickHandler,
        AddonModForumTagAreaHandler
    ]
})
export class AddonModForumModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModForumModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModForumPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModForumSyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModForumIndexLinkHandler, discussionHandler: AddonModForumDiscussionLinkHandler,
            listLinkHandler: AddonModForumListLinkHandler,
            pushNotificationsDelegate: CorePushNotificationsDelegate, pushClickHandler: AddonModForumPushClickHandler,
            postLinkHandler: AddonModForumPostLinkHandler, tagAreaDelegate: CoreTagAreaDelegate,
            tagAreaHandler: AddonModForumTagAreaHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(discussionHandler);
        linksDelegate.registerHandler(listLinkHandler);
        linksDelegate.registerHandler(postLinkHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);
    }
}
