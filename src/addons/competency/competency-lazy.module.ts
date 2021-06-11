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
import { AddonCompetencyCompetenciesPage } from './pages/competencies/competencies';
import { AddonCompetencyCompetencyPage } from './pages/competency/competency';
import { AddonCompetencyCompetencySummaryPage } from './pages/competencysummary/competencysummary';
import { AddonCompetencyCourseCompetenciesPage } from './pages/coursecompetencies/coursecompetencies.page';
import { AddonCompetencyCourseCompetenciesPageModule } from './pages/coursecompetencies/coursecompetencies.module';
import { AddonCompetencyMainMenuHandlerService } from './services/handlers/mainmenu';

const mobileRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        data: {
            mainMenuTabRoot: AddonCompetencyMainMenuHandlerService.PAGE_NAME,
        },
        component: AddonCompetencyPlanListPage,
    },
    {
        path: 'competencies',
        component: AddonCompetencyCompetenciesPage,
    },
    {
        path: 'competencies/:competencyId',
        component: AddonCompetencyCompetencyPage,
    },
    {
        path: 'course/:courseId',
        component: AddonCompetencyCourseCompetenciesPage,
    },
    {
        path: 'summary/:competencyId',
        component: AddonCompetencyCompetencySummaryPage,
    },
    {
        path: ':planId',
        component: AddonCompetencyPlanPage,
    },
];

const tabletRoutes: Routes = [
    {
        path: 'summary/:competencyId',
        component: AddonCompetencyCompetencySummaryPage,
    },
    {
        path: 'competencies',
        component: AddonCompetencyCompetenciesPage,
        children: [
            {
                path: ':competencyId',
                component: AddonCompetencyCompetencyPage,
            },
        ],
    },
    {
        path: 'course/:courseId',
        component: AddonCompetencyCourseCompetenciesPage,
    },
    {
        path: '',
        data: {
            mainMenuTabRoot: AddonCompetencyMainMenuHandlerService.PAGE_NAME,
        },
        component: AddonCompetencyPlanListPage,
        children: [
            {
                path: ':planId',
                component: AddonCompetencyPlanPage,
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
        CoreSharedModule,
        AddonCompetencyCourseCompetenciesPageModule,
    ],
    declarations: [
        AddonCompetencyPlanPage,
        AddonCompetencyPlanListPage,
        AddonCompetencyCompetenciesPage,
        AddonCompetencyCompetencyPage,
        AddonCompetencyCompetencySummaryPage,
    ],
})
export class AddonCompetencyLazyModule {}
