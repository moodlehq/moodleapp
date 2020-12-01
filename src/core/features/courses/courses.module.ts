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
import { Routes } from '@angular/router';

import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/pages/home/home-routing.module';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';

import { CoreDashboardHomeHandler } from './services/handlers/dashboard-home';
import { CoreCoursesMyCoursesHomeHandler } from './services/handlers/my-courses.home';

const mainMenuHomeChildrenRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: CoreDashboardHomeHandler.PAGE_NAME,
    },
    {
        path: CoreDashboardHomeHandler.PAGE_NAME,
        loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.CoreCoursesDashboardPageModule),
    },
    {
        path: CoreCoursesMyCoursesHomeHandler.PAGE_NAME,
        loadChildren: () => import('./pages/my-courses/my-courses.module').then(m => m.CoreCoursesMyCoursesPageModule),
    },
];

const mainMenuHomeSiblingRoutes: Routes = [
    {
        path: 'courses',
        loadChildren: () => import('./courses-lazy.module').then(m => m.CoreCoursesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuHomeRoutingModule.forChild({
            children: mainMenuHomeChildrenRoutes,
            siblings: mainMenuHomeSiblingRoutes,
        }),
    ],
    providers: [
        CoreDashboardHomeHandler,
        CoreCoursesMyCoursesHomeHandler,
    ],
})
export class CoreCoursesModule {

    constructor(
        homeDelegate: CoreMainMenuHomeDelegate,
        coursesDashboardHandler: CoreDashboardHomeHandler,
        coursesMyCoursesHandler: CoreCoursesMyCoursesHomeHandler,
    ) {
        homeDelegate.registerHandler(coursesDashboardHandler);
        homeDelegate.registerHandler(coursesMyCoursesHandler);
    }

}
