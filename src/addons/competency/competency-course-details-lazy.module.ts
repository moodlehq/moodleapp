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

import { AddonCompetencyCompetencyPage } from './pages/competency/competency.page';
import { AddonCompetencyCompetencySummaryPage } from './pages/competencysummary/competencysummary.page';
import { ADDON_COMPETENCY_SUMMARY_PAGE } from './competency.module';
import { AddonCompetencyCompetencyPageModule } from './pages/competency/competency.module';
import { AddonCompetencyCompetencySummaryPageModule } from './pages/competencysummary/competencysummary.module';
import { AddonCompetencyCourseCompetenciesPage } from './pages/coursecompetencies/coursecompetencies.page';
import { AddonCompetencyCourseCompetenciesPageModule } from './pages/coursecompetencies/coursecompetencies.module';
import { AddonCompetencyCompetenciesPage } from './pages/competencies/competencies.page';
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { AddonCompetencyCompetenciesPageModule } from './pages/competencies/competencies.module';

const mobileRoutes: Routes = [
    {
        path: '',
        component: AddonCompetencyCourseCompetenciesPage,
    },
    {
        path: ':competencyId',
        component: AddonCompetencyCompetencyPage,
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
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
        path: `:competencyId/${ADDON_COMPETENCY_SUMMARY_PAGE}`,
        component: AddonCompetencyCompetencySummaryPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        AddonCompetencyCourseCompetenciesPageModule,
        AddonCompetencyCompetenciesPageModule,
        AddonCompetencyCompetencyPageModule,
        AddonCompetencyCompetencySummaryPageModule,
    ],
})
export class AddonCompetencyCourseDetailsLazyModule {}
