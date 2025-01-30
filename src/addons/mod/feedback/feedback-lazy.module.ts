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
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { canLeaveGuard } from '@guards/can-leave';

const commonRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index/index'),
    },
    {
        path: ':courseId/:cmId/form',
        loadComponent: () => import('./pages/form/form'),
        canDeactivate: [canLeaveGuard],
    },
    {
        path: ':courseId/:cmId/nonrespondents',
        loadComponent: () => import('./pages/nonrespondents/nonrespondents'),
    },
];

const mobileRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/attempts',
        loadComponent: () => import('./pages/attempts/attempts'),
    },
    {
        path: ':courseId/:cmId/attempts/:attemptId',
        loadComponent: () => import('./pages/attempt/attempt'),
    },
];

const tabletRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/attempts',
        loadComponent: () => import('./pages/attempts/attempts'),
        children: [
            {
                path: ':attemptId',
                loadComponent: () => import('./pages/attempt/attempt'),
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
export default class AddonModFeedbackLazyModule {}
