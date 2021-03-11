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

const routes: Routes = [
    {
        path: '',
        redirectTo: 'my',
        pathMatch: 'full',
    },
    {
        path: 'categories',
        redirectTo: 'categories/root', // Fake "id".
        pathMatch: 'full',
    },
    {
        path: 'categories/:id',
        loadChildren: () =>
            import('./pages/categories/categories.module')
                .then(m => m.CoreCoursesCategoriesPageModule),
    },
    {
        path: 'all',
        loadChildren: () =>
            import('./pages/available-courses/available-courses.module')
                .then(m => m.CoreCoursesAvailableCoursesPageModule),
    },
    {
        path: 'search',
        loadChildren: () =>
            import('./pages/search/search.module')
                .then(m => m.CoreCoursesSearchPageModule),
    },
    {
        path: 'my',
        loadChildren: () =>
            import('./pages/my-courses/my-courses.module')
                .then(m => m.CoreCoursesMyCoursesPageModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
})
export class CoreCoursesLazyModule {}
