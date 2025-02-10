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

import { conditionalRoutes } from '@/app/app-routing.module';
import { Injector, NgModule } from '@angular/core';
import { Route, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreScreen } from '@services/screen';
import { messagesIndexGuard } from './guards';
import { ADDON_MESSAGES_PAGE_NAME } from './constants';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const discussionRoutes: Route[] = [
        {
            path: 'discussion/user/:userId',
            loadComponent: () => import('./pages/discussion/discussion'),
        },
        {
            path: 'discussion/:conversationId',
            loadComponent: () => import('./pages/discussion/discussion'),
        },
    ];

    const mobileRoutes: Routes = [
        {
            path: 'contacts', // 3.6 or greater.
            loadComponent: () => import('./pages/contacts/contacts'),
        },
        {
            path: 'index',
            data: { mainMenuTabRoot: ADDON_MESSAGES_PAGE_NAME },
            loadComponent: () => import('./pages/discussions-35/discussions'),
        },
        {
            path: 'contacts-35', // 3.5.
            loadComponent: () => import('./pages/contacts-35/contacts'),
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            data: { mainMenuTabRoot: ADDON_MESSAGES_PAGE_NAME },
            loadComponent: () => import('./pages/group-conversations/group-conversations'),
        },
        {
            path: 'search',
            loadComponent: () => import('./pages/search/search'),
        },
    ]
        .reduce((routes, mobileRoute) => [
            ...routes,
            mobileRoute,
            ...discussionRoutes.map(discussionRoute => ({
                ...discussionRoute,
                path: `${mobileRoute.path}/${discussionRoute.path}`,
            })),
        ], []);

    const tabletRoutes: Routes = [
        {
            path: 'contacts', // 3.6 or greater.
            loadComponent: () => import('./pages/contacts/contacts'),
            loadChildren: () => discussionRoutes,
        },
        {
            path: 'index', // 3.5.
            data: { mainMenuTabRoot: ADDON_MESSAGES_PAGE_NAME },
            loadComponent: () => import('./pages/discussions-35/discussions'),
            loadChildren: () => discussionRoutes,
        },
        {
            path: 'contacts-35', // 3.5.
            loadComponent: () => import('./pages/contacts-35/contacts'),
            loadChildren: () => discussionRoutes,
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            data: { mainMenuTabRoot: ADDON_MESSAGES_PAGE_NAME },
            loadComponent: () => import('./pages/group-conversations/group-conversations'),
            loadChildren: () => discussionRoutes,
        },
        {
            path: 'search',
            loadComponent: () => import('./pages/search/search'),
            loadChildren: () => discussionRoutes,
        },
    ];

    return [
        ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
        ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        ...discussionRoutes,
        {
            path: 'message-settings',
            loadComponent: () => import('./pages/settings/settings'),
        },
        ...buildTabMainRoutes(injector, {
            canActivate: [messagesIndexGuard],
        }),
    ];
}

@NgModule({
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export default class AddonMessagesLazyModule {}
