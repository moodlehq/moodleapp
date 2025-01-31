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
import { RouterModule, Routes } from '@angular/router';

import { CorePolicySitePolicyPage } from '@features/policy/pages/site-policy/site-policy';
import { ACCEPTANCES_PAGE_NAME, SITE_POLICY_PAGE_NAME } from './constants';
import { CorePolicyAcceptancesPage } from './pages/acceptances/acceptances';

const routes: Routes = [
    {
        path: SITE_POLICY_PAGE_NAME,
        component: CorePolicySitePolicyPage,
    },
    {
        path: ACCEPTANCES_PAGE_NAME,
        component: CorePolicyAcceptancesPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export default class CorePolicyLazyModule {}
