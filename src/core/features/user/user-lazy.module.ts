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
        redirectTo: 'profile',
        pathMatch: 'full',
    },
    {
        path: 'profile',
        loadChildren: () => import('./pages/profile/profile.module').then( m => m.CoreUserProfilePageModule),
    },
    {
        path: 'about',
        loadChildren: () => import('./pages/about/about.module').then( m => m.CoreUserAboutPageModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
})
export class CoreUserLazyModule {}
