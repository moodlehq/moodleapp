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
import { CoreUserDelegate } from './providers/user-delegate';
import { CoreUserProfileFieldDelegate } from './providers/user-profile-field-delegate';
import { CoreUserProvider } from './providers/user';
import { CoreUserHelperProvider } from './providers/helper';
import { CoreUserProfileMailHandler } from './providers/user-handler';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreUserProfileLinkHandler } from './providers/user-link-handler';
import { CoreUserParticipantsCourseOptionHandler } from './providers/course-option-handler';
import { CoreUserParticipantsLinkHandler } from './providers/participants-link-handler';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreUserComponentsModule } from './components/components.module';
import { CoreCronDelegate } from '@providers/cron';
import { CoreUserOfflineProvider } from './providers/offline';
import { CoreUserSyncProvider } from './providers/sync';
import { CoreUserSyncCronHandler } from './providers/sync-cron-handler';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { CoreUserTagAreaHandler } from './providers/tag-area-handler';

// List of providers (without handlers).
export const CORE_USER_PROVIDERS: any[] = [
    CoreUserDelegate,
    CoreUserProfileFieldDelegate,
    CoreUserProvider,
    CoreUserHelperProvider,
    CoreUserOfflineProvider,
    CoreUserSyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        CoreUserComponentsModule
    ],
    providers: [
        CoreUserDelegate,
        CoreUserProfileFieldDelegate,
        CoreUserProvider,
        CoreUserHelperProvider,
        CoreUserOfflineProvider,
        CoreUserSyncProvider,
        CoreUserProfileMailHandler,
        CoreUserProfileLinkHandler,
        CoreUserParticipantsCourseOptionHandler,
        CoreUserParticipantsLinkHandler,
        CoreUserSyncCronHandler,
        CoreUserTagAreaHandler
    ]
})
export class CoreUserModule {
    constructor(userDelegate: CoreUserDelegate, userProfileMailHandler: CoreUserProfileMailHandler,
            eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, userProvider: CoreUserProvider,
            contentLinksDelegate: CoreContentLinksDelegate, userLinkHandler: CoreUserProfileLinkHandler,
            courseOptionHandler: CoreUserParticipantsCourseOptionHandler, linkHandler: CoreUserParticipantsLinkHandler,
            courseOptionsDelegate: CoreCourseOptionsDelegate, cronDelegate: CoreCronDelegate,
            syncHandler: CoreUserSyncCronHandler, tagAreaDelegate: CoreTagAreaDelegate, tagAreaHandler: CoreUserTagAreaHandler) {

        userDelegate.registerHandler(userProfileMailHandler);
        courseOptionsDelegate.registerHandler(courseOptionHandler);
        contentLinksDelegate.registerHandler(userLinkHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        cronDelegate.register(syncHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);

        eventsProvider.on(CoreEventsProvider.USER_DELETED, (data) => {
            // Search for userid in params.
            const params = data.params;
            let userId = 0;

            if (params.userid) {
                userId = params.userid;
            } else if (params.userids) {
                userId = params.userids[0];
            } else if (params.field === 'id' && params.values && params.values.length) {
                userId = params.values[0];
            } else if (params.userlist && params.userlist.length) {
                userId = params.userlist[0].userid;
            }

            if (userId > 0) {
                userProvider.deleteStoredUser(userId, data.siteId);
            }
        }, sitesProvider.getCurrentSiteId());
    }
}
