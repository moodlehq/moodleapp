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

import { AddonBadgesMyBadgesLinkHandler } from './services/handlers/mybadges-link';
import { AddonBadgesBadgeLinkHandler } from './services/handlers/badge-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonBadgesUserHandler } from './services/handlers/user';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonBadgesPushClickHandler } from './services/handlers/push-click';

const mainMenuHomeSiblingRoutes: Routes = [
    {
        path: 'badges',
        loadChildren: () => import('./badges-lazy.module').then(m => m.AddonBadgesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuHomeSiblingRoutes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreContentLinksDelegate.instance.registerHandler(AddonBadgesMyBadgesLinkHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(AddonBadgesBadgeLinkHandler.instance);
                CoreUserDelegate.instance.registerHandler(AddonBadgesUserHandler.instance);
                CorePushNotificationsDelegate.instance.registerClickHandler(AddonBadgesPushClickHandler.instance);
            },
        },
    ],
})
export class AddonBadgesModule {}
