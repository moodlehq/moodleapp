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

const mobileRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/user-badges/user-badges'),
    },
    {
        path: ':badgeHash',
        loadComponent: () => import('./pages/issued-badge/issued-badge'),
        data: { usesSwipeNavigation: true },
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/user-badges/user-badges'),
        children: [
            {
                path: ':badgeHash',
                loadComponent: () => import('./pages/issued-badge/issued-badge'),
                data: { usesSwipeNavigation: true },
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
export default class AddonBadgesLazyModule {}
