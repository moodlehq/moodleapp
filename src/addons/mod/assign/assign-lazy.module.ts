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
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { canLeaveGuard } from '@guards/can-leave';
import { CoreScreen } from '@services/screen';

const commonRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index'),
    },
    {
        path: ':courseId/:cmId/edit',
        loadComponent: () => import('./pages/edit/edit'),
        canDeactivate: [canLeaveGuard],
    },
];

const mobileRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/submission',
        loadComponent: () => import('./pages/submission-list/submission-list'),
    },
    {
        path: ':courseId/:cmId/submission/:submitId',
        loadComponent: () => import('./pages/submission-review/submission-review'),
        canDeactivate: [canLeaveGuard],
    },
];

const tabletRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/submission',
        loadComponent: () => import('./pages/submission-list/submission-list'),
        children: [
            {
                path: ':submitId',
                loadComponent: () => import('./pages/submission-review/submission-review'),
                canDeactivate: [canLeaveGuard],
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export default class AddonModAssignLazyModule {}
