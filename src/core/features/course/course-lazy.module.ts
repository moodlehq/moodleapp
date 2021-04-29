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

export const COURSE_INDEX_PATH = ':courseId';

const routes: Routes = [
    {
        path: COURSE_INDEX_PATH,
        loadChildren: () => import('./pages/index/index.module').then( m => m.CoreCourseIndexPageModule),
    },
    {
        path: ':courseId/unsupported-module',
        loadChildren: () => import('./pages/unsupported-module/unsupported-module.module')
            .then( m => m.CoreCourseUnsupportedModulePageModule),
    },
    {
        path: ':courseId/list-mod-type',
        loadChildren: () => import('./pages/list-mod-type/list-mod-type.module').then(m => m.CoreCourseListModTypePageModule),
    },
    {
        path: ':courseId/preview',
        loadChildren: () =>
            import('./pages/preview/preview.module').then(m => m.CoreCoursePreviewPageModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
})
export class CoreCourseLazyModule {}
