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

import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';

import { AppRoutingModule, conditionalRoutes } from '@/app/app-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreSettingsHelper } from './services/settings-helper';
import { SHAREDFILES_PAGE_NAME } from '@features/sharedfiles/constants';
import { getSharedFilesRoutes } from '@features/sharedfiles/sharedfiles.module';
import { CoreScreen } from '@services/screen';

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

const sectionRoutes: Routes = [
    {
        path: 'general',
        loadComponent: () => import('@features/settings/pages/general/general'),
    },
    {
        path: 'spaceusage',
        loadComponent: () => import('@features/settings/pages/space-usage/space-usage'),
    },
    {
        path: 'sync',
        loadComponent: () => import('@features/settings/pages/synchronization/synchronization'),
    },
    {
        path: SHAREDFILES_PAGE_NAME,
        loadChildren: () => getSharedFilesRoutes(),
    },
    {
        path: 'about',
        loadComponent: () => import('@features/settings/pages/about/about'),
    },
];

const mobileRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('@features/settings/pages/index/index'),
    },
    ...sectionRoutes,
];

const tabletRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('@features/settings/pages/index/index'),
        loadChildren: () => [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'general',
            },
            ...sectionRoutes,
        ],
    },
];

const settingsRoutes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
    {
        path: 'about/deviceinfo',
        loadComponent: () => import('@features/settings/pages/deviceinfo/deviceinfo'),
    },
    {
        path: 'about/deviceinfo/dev',
        loadComponent: () => import('@features/settings/pages/dev/dev'),
    },
    {
        path: 'about/deviceinfo/dev/error-log',
        loadComponent: () => import('@features/settings/pages/error-log/error-log'),
    },
    {
        path: 'about/licenses',
        loadComponent: () => import('@features/settings/pages/licenses/licenses'),
    },
];

const appRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => settingsRoutes,
    },
];

const mainMenuMoreRoutes: Routes = [
    {
        path: 'settings',
        loadChildren: () => settingsRoutes,
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
        provideAppInitializer(() => CoreSettingsHelper.initialize()),
    ],
})
export class CoreSettingsModule {}
