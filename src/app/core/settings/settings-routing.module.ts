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
        path: 'about',
        loadChildren: () => import('./pages/about/about.page.module').then( m => m.CoreSettingsAboutPageModule),
    },
    {
        path: 'general',
        loadChildren: () => import('./pages/general/general.page.module').then( m => m.CoreSettingsGeneralPageModule),
    },
    {
        path: '',
        loadChildren: () => import('./pages/app/app.page.module').then( m => m.CoreSettingsAppPageModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CoreSettingsRoutingModule {}
