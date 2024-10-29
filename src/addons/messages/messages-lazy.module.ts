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
import { CoreSharedModule } from '@/core/shared.module';
import { AddonMessagesContacts35Page } from '@addons/messages/pages/contacts-35/contacts';
import { AddonMessagesContactsPage } from '@addons/messages/pages/contacts/contacts';
import { AddonMessagesDiscussionPage } from '@addons/messages/pages/discussion/discussion';
import { AddonMessagesDiscussions35Page } from '@addons/messages/pages/discussions-35/discussions';
import { AddonMessagesGroupConversationsPage } from '@addons/messages/pages/group-conversations/group-conversations';
import { AddonMessagesSearchPage } from '@addons/messages/pages/search/search';
import { AddonMessagesMainMenuHandlerService } from '@addons/messages/services/handlers/mainmenu';
import { Injector, NgModule } from '@angular/core';
import { Route, ROUTES, Routes } from '@angular/router';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';
import { CoreScreen } from '@services/screen';
import { messagesIndexGuard } from './guards';

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
            component: AddonMessagesDiscussionPage,
        },
        {
            path: 'discussion/:conversationId',
            component: AddonMessagesDiscussionPage,
        },
    ];

    const mobileRoutes: Routes = [
        {
            path: 'contacts', // 3.6 or greater.
            component: AddonMessagesContactsPage,
        },
        {
            path: 'index',
            data: { mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME },
            component: AddonMessagesDiscussions35Page,
        },
        {
            path: 'contacts-35', // 3.5.
            component: AddonMessagesContacts35Page,
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            data: { mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME },
            component: AddonMessagesGroupConversationsPage,
        },
        {
            path: 'search',
            component: AddonMessagesSearchPage,
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
            component: AddonMessagesContactsPage,
            children: discussionRoutes,
        },
        {
            path: 'index',
            data: { mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME },
            component: AddonMessagesDiscussions35Page,
            children: discussionRoutes,
        },
        {
            path: 'contacts-35', // 3.5.
            component: AddonMessagesContacts35Page,
            children: discussionRoutes,
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            data: { mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME },
            component: AddonMessagesGroupConversationsPage,
            children: discussionRoutes,
        },
        {
            path: 'search',
            component: AddonMessagesSearchPage,
            children: discussionRoutes,
        },
    ];

    return [
        ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
        ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        ...discussionRoutes,
        {
            path: 'message-settings',
            loadChildren: () => import('./messages-settings-lazy.module'),
        },
        ...buildTabMainRoutes(injector, {
            canActivate: [messagesIndexGuard],
        }),
    ];
}

@NgModule({
    imports: [
        CoreSharedModule,
        CoreSearchComponentsModule,
        CoreMainMenuComponentsModule,
    ],
    declarations: [
        AddonMessagesContacts35Page,
        AddonMessagesContactsPage,
        AddonMessagesDiscussionPage,
        AddonMessagesDiscussions35Page,
        AddonMessagesGroupConversationsPage,
        AddonMessagesSearchPage,
    ],
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
