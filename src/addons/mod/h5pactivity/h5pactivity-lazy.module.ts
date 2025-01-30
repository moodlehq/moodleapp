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

import { CoreSharedModule } from '@/core/shared.module';
import { canLeaveGuard } from '@guards/can-leave';
import { AddonModH5PActivityComponentsModule } from './components/components.module';
import { AddonModH5PActivityIndexPage } from './pages/index/index';
import { AddonModH5PActivityUserAttemptsPage } from '@addons/mod/h5pactivity/pages/user-attempts/user-attempts';
import { AddonModH5PActivityAttemptResultsPage } from '@addons/mod/h5pactivity/pages/attempt-results/attempt-results';
import { AddonModH5PActivityUsersAttemptsPage } from '@addons/mod/h5pactivity/pages/users-attempts/users-attempts';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModH5PActivityIndexPage,
        canDeactivate: [canLeaveGuard],
    },
    {
        path: ':courseId/:cmId/userattempts/:userId',
        component: AddonModH5PActivityUserAttemptsPage,
    },
    {
        path: ':courseId/:cmId/attemptresults/:attemptId',
        component: AddonModH5PActivityAttemptResultsPage,
    },
    {
        path: ':courseId/:cmId/users',
        component: AddonModH5PActivityUsersAttemptsPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModH5PActivityComponentsModule,
        AddonModH5PActivityIndexPage,
        AddonModH5PActivityUserAttemptsPage,
        AddonModH5PActivityAttemptResultsPage,
        AddonModH5PActivityUsersAttemptsPage,
    ],
})
export default class AddonModH5PActivityLazyModule {}
