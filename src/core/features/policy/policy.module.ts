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

import { NgModule, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule } from '@/app/app-routing.module';
import { CoreEvents } from '@static/events';
import { ACCEPTANCES_PAGE_NAME, POLICY_PAGE_NAME, SITE_POLICY_PAGE_NAME } from './constants';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CorePolicyUserHandler } from './services/handlers/user';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CorePolicyAcceptancesLinkHandler } from './services/handlers/acceptances-link';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';

const routes: Routes = [
    {
        path: POLICY_PAGE_NAME,
        loadChildren: () => [
            {
                path: SITE_POLICY_PAGE_NAME,
                loadComponent: () => import('@features/policy/pages/site-policy/site-policy'),
            },
            {
                path: ACCEPTANCES_PAGE_NAME,
                loadComponent: () => import('@features/policy/pages/acceptances/acceptances'),
            },
        ],
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(routes),
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(async () => {
            CoreUserDelegate.registerHandler(CorePolicyUserHandler.instance);
            CoreContentLinksDelegate.registerHandler(CorePolicyAcceptancesLinkHandler.instance);

            CoreEvents.on(CoreEvents.SITE_POLICY_NOT_AGREED, async (data) => {
                const { CorePolicy } = await import('@features/policy/services/policy');

                CorePolicy.goToAcceptSitePolicies(data.siteId);
            });
        }),
    ],
})
export class CorePolicyModule {}
