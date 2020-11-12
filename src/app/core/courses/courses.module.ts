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
import { CoreHomeRoutingModule } from '../mainmenu/pages/home/home-routing.module';
import { CoreHomeDelegate } from '../mainmenu/services/home.delegate';
import { CoreDashboardHomeHandler } from './services/handlers/dashboard.home';

const routes: Routes = [
    {
        path: 'dashboard',
        loadChildren: () =>
            import('@core/courses/pages/dashboard/dashboard.page.module').then(m => m.CoreCoursesDashboardPageModule),
    },
];

@NgModule({
    imports: [CoreHomeRoutingModule.forChild(routes)],
    exports: [CoreHomeRoutingModule],
    providers: [
        CoreDashboardHomeHandler,
    ],
})
export class CoreCoursesModule {

    constructor(
        homeDelegate: CoreHomeDelegate,
        coursesDashboardHandler: CoreDashboardHomeHandler,
    ) {
        homeDelegate.registerHandler(coursesDashboardHandler);
    }

}
