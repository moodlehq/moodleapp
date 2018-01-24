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
import { CoreUserDelegate } from './providers/user-delegate';
import { CoreUserProfileFieldDelegate } from './providers/user-profile-field-delegate';
import { CoreUserProvider } from './providers/user';
import { CoreUserHelperProvider } from './providers/helper';
import { CoreUserProfileMailHandler } from './providers/user-handler';
import { CoreEventsProvider } from '../../providers/events';
import { CoreSitesProvider } from '../../providers/sites';
import { CoreContentLinksDelegate } from '../contentlinks/providers/delegate';
import { CoreUserProfileLinkHandler } from './providers/user-link-handler';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreUserDelegate,
        CoreUserProfileFieldDelegate,
        CoreUserProfileMailHandler,
        CoreUserProvider,
        CoreUserHelperProvider,
        CoreUserProfileLinkHandler
    ]
})
export class CoreUserModule {
    constructor(userDelegate: CoreUserDelegate, userProfileMailHandler: CoreUserProfileMailHandler,
            eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider, userProvider: CoreUserProvider,
            contentLinksDelegate: CoreContentLinksDelegate, userLinkHandler: CoreUserProfileLinkHandler) {
        userDelegate.registerHandler(userProfileMailHandler);
        contentLinksDelegate.registerHandler(userLinkHandler);

        eventsProvider.on(CoreEventsProvider.USER_DELETED, (data) => {
            // Search for userid in params.
            let params = data.params,
                userId = 0;
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
