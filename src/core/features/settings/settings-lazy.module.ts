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

import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreScreen } from '@services/screen';

import { CoreSettingsIndexPage } from './pages/index';
import { SHAREDFILES_PAGE_NAME } from '@features/sharedfiles/sharedfiles.module';

const sectionRoutes: Routes = [
    {
        path: 'general',
        loadChildren: () => import('./pages/general/general.module').then(m => m.CoreSettingsGeneralPageModule),
    },
    {
        path: 'spaceusage',
        loadChildren: () => import('./pages/space-usage/space-usage.module').then(m => m.CoreSettingsSpaceUsagePageModule),
    },
    {
        path: 'sync',
        loadChildren: () =>
            import('./pages/synchronization/synchronization.module')
                .then(m => m.CoreSettingsSynchronizationPageModule),
    },
    {
        path: SHAREDFILES_PAGE_NAME,
        loadChildren: () => import('@features/sharedfiles/sharedfiles-lazy.module').then(m => m.CoreSharedFilesLazyModule),
    },
    {
        path: 'about',
        loadChildren: () => import('./pages/about/about.module').then(m => m.CoreSettingsAboutPageModule),
    },
];

const mobileRoutes: Routes = [
    {
        path: '',
        component: CoreSettingsIndexPage,
    },
    ...sectionRoutes,
];

const tabletRoutes: Routes = [
    {
        path: '',
        component: CoreSettingsIndexPage,
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'general',
            },
            ...sectionRoutes,
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
    {
        path: 'about/deviceinfo',
        loadChildren: () => import('./pages/deviceinfo/deviceinfo.module').then(m => m.CoreSettingsDeviceInfoPageModule),
    },
    {
        path: 'about/licenses',
        loadChildren: () => import('./pages/licenses/licenses.module').then(m => m.CoreSettingsLicensesPageModule),
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
    ],
    declarations: [
        CoreSettingsIndexPage,
    ],
})
export class CoreSettingsLazyModule {}
