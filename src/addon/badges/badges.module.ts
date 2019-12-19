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
import { AddonBadgesProvider } from './providers/badges';
import { AddonBadgesUserHandler } from './providers/user-handler';
import { AddonBadgesMyBadgesLinkHandler } from './providers/mybadges-link-handler';
import { AddonBadgesBadgeLinkHandler } from './providers/badge-link-handler';
import { AddonBadgesPushClickHandler } from './providers/push-click-handler';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

// List of providers (without handlers).
export const ADDON_BADGES_PROVIDERS: any[] = [
    AddonBadgesProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonBadgesProvider,
        AddonBadgesUserHandler,
        AddonBadgesMyBadgesLinkHandler,
        AddonBadgesBadgeLinkHandler,
        AddonBadgesPushClickHandler
    ]
})
export class AddonBadgesModule {
    constructor(userDelegate: CoreUserDelegate, userHandler: AddonBadgesUserHandler,
        contentLinksDelegate: CoreContentLinksDelegate, myBadgesLinkHandler: AddonBadgesMyBadgesLinkHandler,
        badgeLinkHandler: AddonBadgesBadgeLinkHandler,
        pushNotificationsDelegate: CorePushNotificationsDelegate, pushClickHandler: AddonBadgesPushClickHandler) {

        userDelegate.registerHandler(userHandler);
        contentLinksDelegate.registerHandler(myBadgesLinkHandler);
        contentLinksDelegate.registerHandler(badgeLinkHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);
    }
}
