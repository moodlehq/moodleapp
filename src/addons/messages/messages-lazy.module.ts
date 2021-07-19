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

import { Injector, NgModule } from '@angular/core';
import { Route, RouterModule, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonMessagesIndexGuard } from './guards';

export const AddonMessagesDiscussionRoute: Route = {
    path: 'discussion',
    loadChildren: () => import('./pages/discussion/discussion.module')
        .then(m => m.AddonMessagesDiscussionPageModule),
};

function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index', // 3.5 or lower.
            loadChildren: () =>
                import('./pages/discussions-35/discussions.module').then(m => m.AddonMessagesDiscussions35PageModule),
        },
        {
            path: 'contacts-35', // 3.5 or lower.
            loadChildren: () => import('./pages/contacts-35/contacts.module').then(m => m.AddonMessagesContacts35PageModule),
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            loadChildren: () => import('./pages/group-conversations/group-conversations.module')
                .then(m => m.AddonMessagesGroupConversationsPageModule),
        },
        AddonMessagesDiscussionRoute,
        {
            path: 'search',
            loadChildren: () => import('./pages/search/search.module')
                .then(m => m.AddonMessagesSearchPageModule),
        },
        {
            path: 'contacts', // 3.6 or greater.
            loadChildren: () => import('./pages/contacts/contacts.module')
                .then(m => m.AddonMessagesContactsPageModule),
        },
        {
            path: 'preferences',
            loadChildren: () => import('./pages/settings/settings.module').then(m => m.AddonMessagesSettingsPageModule),
        },
        ...buildTabMainRoutes(injector, {
            canActivate: [AddonMessagesIndexGuard],
        }),
    ];
}

@NgModule({
    exports: [RouterModule],
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export class AddonMessagesLazyModule { }
