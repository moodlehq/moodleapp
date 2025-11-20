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

import { NgModule, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreSitePreferencesRoutingModule } from '@features/settings/settings-site-routing.module';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { AddonStorageManagerSettingsHandler } from './services/handlers/settings';
import { ADDON_STORAGE_MANAGER_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_STORAGE_MANAGER_PAGE_NAME,
        loadComponent: () => import('./pages/courses-storage/courses-storage'),
    },
    {
        path: `${ADDON_STORAGE_MANAGER_PAGE_NAME}/:courseId`,
        loadComponent: () => import('./pages/course-storage/course-storage'),
        data: { checkForcedLanguage: 'course' },
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreSitePreferencesRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreSettingsDelegate.registerHandler(AddonStorageManagerSettingsHandler.instance);
        }),
    ],
})
export class AddonStorageManagerModule {}
