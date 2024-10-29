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
import { SHAREDFILES_PAGE_NAME } from '@features/sharedfiles/constants';
import { CoreSettingsSynchronizationPage } from '@features/settings/pages/synchronization/synchronization';
import { CoreSettingsGeneralPage } from '@features/settings/pages/general/general';
import { CoreSettingsSpaceUsagePage } from '@features/settings/pages/space-usage/space-usage';
import { CoreSettingsAboutPage } from '@features/settings/pages/about/about';
import { CoreSettingsLicensesPage } from '@features/settings/pages/licenses/licenses';
import { CoreSettingsDeviceInfoPage } from '@features/settings/pages/deviceinfo/deviceinfo';
import { CoreSettingsDevPage } from '@features/settings/pages/dev/dev';
import { CoreSettingsErrorLogPage } from '@features/settings/pages/error-log/error-log';

const sectionRoutes: Routes = [
    {
        path: 'general',
        component: CoreSettingsGeneralPage,
    },
    {
        path: 'spaceusage',
        component: CoreSettingsSpaceUsagePage,
    },
    {
        path: 'sync',
        component: CoreSettingsSynchronizationPage,
    },
    {
        path: SHAREDFILES_PAGE_NAME,
        loadChildren: () => import('@features/sharedfiles/sharedfiles-lazy.module'),
    },
    {
        path: 'about',
        component: CoreSettingsAboutPage,
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
        component: CoreSettingsDeviceInfoPage,
    },
    {
        path: 'about/deviceinfo/dev',
        component: CoreSettingsDevPage,
    },
    {
        path: 'about/deviceinfo/dev/error-log',
        component: CoreSettingsErrorLogPage,
    },
    {
        path: 'about/licenses',
        component: CoreSettingsLicensesPage,
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
    ],
    declarations: [
        CoreSettingsIndexPage,
        CoreSettingsSynchronizationPage,
        CoreSettingsGeneralPage,
        CoreSettingsSpaceUsagePage,
        CoreSettingsAboutPage,
        CoreSettingsLicensesPage,
        CoreSettingsDeviceInfoPage,
        CoreSettingsDevPage,
        CoreSettingsErrorLogPage,
    ],
})
export default class CoreSettingsLazyModule {}
