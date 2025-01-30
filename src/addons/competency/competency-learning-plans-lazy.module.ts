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
import { ADDON_COMPETENCY_COMPETENCIES_PAGE, ADDON_COMPETENCY_SUMMARY_PAGE } from './constants';

const mobileRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/planlist/planlist'),
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        loadComponent: () => import('./pages/plan/plan'),
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}/:competencyId`,
        loadComponent: () => import('./pages/competency/competency'),
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/planlist/planlist'),
        children: [
            {
                path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
                loadComponent: () => import('./pages/plan/plan'),
            },
        ],
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        loadComponent: () => import('./pages/competencies/competencies'),
        children: [
            {
                path: ':competencyId',
                loadComponent: () => import('./pages/competency/competency'),
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}/:competencyId/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
        loadComponent: () => import('./pages/competencysummary/competencysummary'),
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
    ],
})
export default class AddonCompetencyLearningPlansLazyModule {}
