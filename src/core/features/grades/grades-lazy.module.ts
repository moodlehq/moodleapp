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

import { CoreGradesCoursePage } from './pages/course/course.page';
import { CoreGradesCoursePageModule } from './pages/course/course.module';
import { CoreGradesCoursesPage } from './pages/courses/courses.page';
import { CoreGradesGradePage } from './pages/grade/grade.page';
import { CoreGradesMainMenuHandlerService } from './services/handlers/mainmenu';

const mobileRoutes: Routes = [
    {
        path: '',
        data: {
            mainMenuTabRoot: CoreGradesMainMenuHandlerService.PAGE_NAME,
        },
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
        data: {
            mainMenuTabRoot: CoreGradesMainMenuHandlerService.PAGE_NAME,
        },
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
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        CoreGradesCoursePageModule,
    ],
    declarations: [
        CoreGradesCoursesPage,
        CoreGradesGradePage,
    ],
})
export class CoreGradesLazyModule {}
