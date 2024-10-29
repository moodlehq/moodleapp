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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule } from '@/app/app-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreSettingsHelper } from './services/settings-helper';

/**
 * Get settings services.
 *
 * @returns Returns settings services.
 */
export async function getSettingsServices(): Promise<Type<unknown>[]> {
    const { CoreSettingsDelegateService } = await import('@features/settings/services/settings-delegate');
    const { CoreSettingsHelperProvider } = await import('@features/settings/services/settings-helper');

    return [
        CoreSettingsDelegateService,
        CoreSettingsHelperProvider,
    ];
}

const appRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => import('./settings-lazy.module'),
    },
];

const mainMenuMoreRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => import('./settings-lazy.module'),
    },
    {
        path: 'preferences',
        loadChildren: () => import('./settings-site-lazy.module'),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(appRoutes),
        CoreMainMenuTabRoutingModule.forChild(mainMenuMoreRoutes),
    ],
    providers: [
        { provide: APP_INITIALIZER, multi: true, useValue: () => CoreSettingsHelper.initialize() },
    ],
})
export class CoreSettingsModule {}
