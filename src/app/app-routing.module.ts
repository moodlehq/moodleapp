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
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { AuthGuard } from '@guards/auth';

const routes: Routes = [
    {
        path: 'login',
        loadChildren: () => import('@features/login/login.module').then( m => m.CoreLoginModule),
    },
    {
        path: 'settings',
        loadChildren: () => import('@features/settings/settings.module').then( m => m.CoreSettingsModule),
    },
    {
        path: '',
        loadChildren: () => import('@features/mainmenu/mainmenu.module').then( m => m.CoreMainMenuModule),
        canActivate: [AuthGuard],
        canLoad: [AuthGuard],
    },
];

@NgModule({
    imports: [
        RouterModule.forRoot(routes, {
            preloadingStrategy: PreloadAllModules,
            relativeLinkResolution: 'corrected',
        }),
    ],
    exports: [RouterModule],
})
export class AppRoutingModule { }
