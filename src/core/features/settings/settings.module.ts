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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule } from '@/app/app-routing.module';
import { CoreMainMenuMoreRoutingModule } from '@features/mainmenu/pages/more/more-routing.module';

import { CoreSettingsHelperProvider } from './services/settings-helper';

const appRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => import('./settings-lazy.module').then(m => m.CoreSettingsLazyModule),
    },
];

const mainMenuMoreRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => import('./settings-lazy.module').then(m => m.CoreSettingsLazyModule),
    },
    {
        path: 'preferences',
        loadChildren: () => import('./pages/site/site.module').then(m => m.CoreSitePreferencesPageModule),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(appRoutes),
        CoreMainMenuMoreRoutingModule.forChild({ siblings: mainMenuMoreRoutes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [CoreSettingsHelperProvider],
            useFactory: (helper: CoreSettingsHelperProvider) => () => helper.initDomSettings(),
        },
    ],
})
export class CoreSettingsModule {}
