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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule } from '@/app/app-routing.module';
import { CoreEvents } from '@singletons/events';
import { POLICY_PAGE_NAME } from './constants';

/**
 * Get policy services.
 *
 * @returns Policy services.
 */
export async function getPolicyServices(): Promise<Type<unknown>[]> {
    const { CorePolicyService } = await import('@features/policy/services/policy');

    return [
        CorePolicyService,
    ];
}

const routes: Routes = [
    {
        path: POLICY_PAGE_NAME,
        loadChildren: () => import('./policy-lazy.module').then(m => m.CorePolicyLazyModule),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: async () => {
                CoreEvents.on(CoreEvents.SITE_POLICY_NOT_AGREED, async (data) => {
                    const { CorePolicy } = await import('@features/policy/services/policy');

                    CorePolicy.goToAcceptSitePolicies(data.siteId);
                });
            },
        },
    ],
})
export class CorePolicyModule {}
