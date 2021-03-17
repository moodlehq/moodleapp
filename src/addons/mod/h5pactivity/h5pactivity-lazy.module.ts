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
import { CanLeaveGuard } from '@guards/can-leave';
import { AddonModH5PActivityComponentsModule } from './components/components.module';
import { AddonModH5PActivityIndexPage } from './pages/index/index';

const routes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModH5PActivityIndexPage,
        canDeactivate: [CanLeaveGuard],
    },
    {
        path: ':courseId/:cmId/userattempts/:userId',
        loadChildren: () => import('./pages/user-attempts/user-attempts.module')
            .then( m => m.AddonModH5PActivityUserAttemptsPageModule),
    },
    {
        path: ':courseId/:cmId/attemptresults/:attemptId',
        loadChildren: () => import('./pages/attempt-results/attempt-results.module')
            .then( m => m.AddonModH5PActivityAttemptResultsPageModule),
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModH5PActivityComponentsModule,
    ],
    declarations: [
        AddonModH5PActivityIndexPage,
    ],
})
export class AddonModH5PActivityLazyModule {}
