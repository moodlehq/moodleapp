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

import {  NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'index',
        loadChildren: () => import('@features/tag/pages/index/index.page.module').then(m => m.CoreTagIndexPageModule),
    },
    {
        path: 'search',
        loadChildren: () => import('@features/tag//pages/search/search.page.module').then(m => m.CoreTagSearchPageModule),
    },
    {
        path: 'index-area',
        loadChildren: () => import('@features/tag/pages/index-area/index-area.page.module').then(m => m.CoreTagIndexAreaPageModule),
    },
    {
        path: '',
        redirectTo: 'search',
        pathMatch: 'full',
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CoreTagLazyModule { }
