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
        redirectTo: 'init',
        pathMatch: 'full',
    },
    {
        path: 'init',
        loadChildren: () => import('./pages/init/init.page.module').then( m => m.CoreLoginInitPageModule),
    },
    {
        path: 'site',
        loadChildren: () => import('./pages/site/site.page.module').then( m => m.CoreLoginSitePageModule),
    },
    {
        path: 'credentials',
        loadChildren: () => import('./pages/credentials/credentials.page.module').then( m => m.CoreLoginCredentialsPageModule),
    },
    {
        path: 'sites',
        loadChildren: () => import('./pages/sites/sites.page.module').then( m => m.CoreLoginSitesPageModule),
    },
    {
        path: 'forgottenpassword',
        loadChildren: () => import('./pages/forgotten-password/forgotten-password.module')
            .then( m => m.CoreLoginForgottenPasswordPageModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CoreLoginRoutingModule {}
