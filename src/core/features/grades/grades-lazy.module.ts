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

import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { CoreSharedModule } from '@/core/shared.module';
import { CoreScreen } from '@services/screen';

import { CoreGradesCoursePage } from './pages/course/course';
import { CoreGradesCoursesPage } from './pages/courses/courses';
import { CoreGradesGradePage } from './pages/grade/grade';
import { conditionalRoutes } from '@/app/app-routing.module';

const mobileRoutes: Routes = [
    {
        path: '',
        component: CoreGradesCoursesPage,
    },
    {
        path: ':courseId',
        component: CoreGradesCoursePage,
    },
    {
        path: ':courseId/:gradeId',
        component: CoreGradesGradePage,
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        component: CoreGradesCoursesPage,
        children: [
            {
                path: ':courseId',
                component: CoreGradesCoursePage,
            },
        ],
    },
    {
        path: ':courseId',
        component: CoreGradesCoursePage,
        children: [
            {
                path: ':gradeId',
                component: CoreGradesGradePage,
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.instance.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.instance.isTablet),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CommonModule,
        IonicModule,
        TranslateModule.forChild(),
        CoreSharedModule,
    ],
    declarations: [
        CoreGradesCoursesPage,
        CoreGradesCoursePage,
        CoreGradesGradePage,
    ],
})
export class CoreGradesLazyModule {}
