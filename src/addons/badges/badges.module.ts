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

import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';

import { AddonBadgesMyBadgesLinkHandler } from './services/handlers/mybadges-link';
import { AddonBadgesBadgeLinkHandler } from './services/handlers/badge-link';
import { AddonBadgesBadgeClassLinkHandler } from './services/handlers/badgeclass-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonBadgesUserHandler } from './services/handlers/user';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonBadgesPushClickHandler } from './services/handlers/push-click';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { AddonBadgesTagAreaHandler } from './services/handlers/tag-area';
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';

/**
 * Get badges services.
 *
 * @returns Returns badges services.
 */
export async function getBadgesServices(): Promise<Type<unknown>[]> {
    const { AddonBadgesProvider } = await import('@addons/badges/services/badges');

    return [
        AddonBadgesProvider,
    ];
}

const mobileRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/user-badges/user-badges'),
    },
    {
        path: ':badgeHash',
        loadComponent: () => import('./pages/issued-badge/issued-badge'),
        data: { usesSwipeNavigation: true },
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/user-badges/user-badges'),
        loadChildren: () => [
            {
                path: ':badgeHash',
                loadComponent: () => import('./pages/issued-badge/issued-badge'),
                data: { usesSwipeNavigation: true },
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
];

const mainMenuRoutes: Routes = [
    {
        path: 'badge/:badgeHash',
        loadComponent: () => import('./pages/issued-badge/issued-badge'),
        data: { usesSwipeNavigation: false },
    },
    {
        path: 'badges',
        loadChildren: () => routes,
    },
    {
        path: 'badgeclass/:badgeId',
        loadComponent: () => import('./pages/badge-class/badge-class'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuRoutes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreContentLinksDelegate.registerHandler(AddonBadgesMyBadgesLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonBadgesBadgeLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonBadgesBadgeClassLinkHandler.instance);
            CoreUserDelegate.registerHandler(AddonBadgesUserHandler.instance);
            CorePushNotificationsDelegate.registerClickHandler(AddonBadgesPushClickHandler.instance);
            CoreTagAreaDelegate.registerHandler(AddonBadgesTagAreaHandler.instance);
        }),
    ],
})
export class AddonBadgesModule {}
