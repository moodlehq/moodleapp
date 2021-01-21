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
import { RouterModule, ROUTES, Routes } from '@angular/router';

import { buildTabMainRoutes } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonMessagesContactsRoutingModule } from './pages/contacts/messages-contacts-routing.module';
import { AddonMessagesIndexRoutingModule } from './pages/index-35/messages-index-routing.module';

function buildRoutes(injector: Injector): Routes {
    return [
        {
            path: 'index', // 3.5 or lower.
            loadChildren: () => import('./pages/index-35/index.module').then( m => m.AddonMessagesIndex35PageModule),
        },
        {
            path: 'group-conversations', // 3.6 or greater.
            loadChildren: () => import('./pages/group-conversations/group-conversations.module')
                .then(m => m.AddonMessagesGroupConversationsPageModule),
        },
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
        ...buildTabMainRoutes(injector, {
            redirectTo: 'index',
            pathMatch: 'full',
        }),
    ];
}

// 3.5 or lower.
const indexTabRoutes: Routes = [
    {
        path: 'discussions',
        loadChildren: () => import('./pages/discussions-35/discussions.module').then(m => m.AddonMessagesDiscussions35PageModule),
    },
    {
        path: 'contacts',
        loadChildren: () => import('./pages/contacts-35/contacts.module').then(m => m.AddonMessagesContacts35PageModule),
    },
];

// 3.6 or greater.
const contactsTabRoutes: Routes = [
    {
        path: 'confirmed',
        loadChildren: () => import('./pages/contacts-confirmed/contacts-confirmed.module')
            .then(m => m.AddonMessagesContactsConfirmedPageModule),
    },
    {
        path: 'requests',
        loadChildren: () => import('./pages/contacts-requests/contacts-requests.module')
            .then(m => m.AddonMessagesContactsRequestsPageModule),
    },
];

@NgModule({
    imports: [
        AddonMessagesIndexRoutingModule.forChild({ children: indexTabRoutes }),
        AddonMessagesContactsRoutingModule.forChild({ children: contactsTabRoutes }),
    ],
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
