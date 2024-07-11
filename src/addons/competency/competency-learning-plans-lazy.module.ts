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
import { CoreSharedModule } from '@/core/shared.module';
import { AddonCompetencyPlanPage } from './pages/plan/plan';
import { AddonCompetencyPlanListPage } from './pages/planlist/planlist';
import { AddonCompetencyCompetencyPage } from './pages/competency/competency.page';
import { AddonCompetencyCompetencySummaryPage } from './pages/competencysummary/competencysummary.page';
import { ADDON_COMPETENCY_COMPETENCIES_PAGE, ADDON_COMPETENCY_SUMMARY_PAGE } from './constants';
import { AddonCompetencyCompetencyPageModule } from './pages/competency/competency.module';
import { AddonCompetencyCompetencySummaryPageModule } from './pages/competencysummary/competencysummary.module';
import { AddonCompetencyCompetenciesPage } from './pages/competencies/competencies.page';
import { AddonCompetencyCompetenciesPageModule } from './pages/competencies/competencies.module';

const mobileRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: AddonCompetencyPlanListPage,
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        component: AddonCompetencyPlanPage,
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}/:competencyId`,
        component: AddonCompetencyCompetencyPage,
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        component: AddonCompetencyPlanListPage,
        children: [
            {
                path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
                component: AddonCompetencyPlanPage,
            },
        ],
    },
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}`,
        component: AddonCompetencyCompetenciesPage,
        children: [
            {
                path: ':competencyId',
                component: AddonCompetencyCompetencyPage,
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
    {
        path: `:planId/${ADDON_COMPETENCY_COMPETENCIES_PAGE}/:competencyId/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
        component: AddonCompetencyCompetencySummaryPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonCompetencyCompetenciesPageModule,
        AddonCompetencyCompetencyPageModule,
        AddonCompetencyCompetencySummaryPageModule,
    ],
    declarations: [
        AddonCompetencyPlanPage,
        AddonCompetencyPlanListPage,
    ],
})
export class AddonCompetencyLearningPlansLazyModule {}
