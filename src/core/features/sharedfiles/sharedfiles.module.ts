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

import { AppRoutingModule } from '@/app/app-routing.module';
import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreFileUploaderDelegate } from '@features/fileuploader/services/fileuploader-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreSitePreferencesRoutingModule } from '@features/settings/settings-site-routing.module';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { CoreSharedFilesSettingsHandler } from './services/handlers/settings';
import { CoreSharedFilesUploadHandler } from './services/handlers/upload';
import { CoreSharedFiles } from './services/sharedfiles';
import { CoreSharedFilesHelper } from './services/sharedfiles-helper';
import { SHAREDFILES_PAGE_NAME } from './constants';

/**
 * Get shared files services.
 *
 * @returns Returns shared files services.
 */
export async function getSharedFilesServices(): Promise<Type<unknown>[]> {
    const { CoreSharedFilesProvider } = await import('@features/sharedfiles/services/sharedfiles');
    const { CoreSharedFilesHelperProvider } = await import('@features/sharedfiles/services/sharedfiles-helper');

    return [
        CoreSharedFilesProvider,
        CoreSharedFilesHelperProvider,
    ];
}

/**
 * Get the shared files routes.
 *
 * @returns Shared files routes.
 */
export function getSharedFilesRoutes(): Routes {
    return [
        {
            path: 'choosesite',
            loadComponent: () => import('@features/sharedfiles/pages/choose-site/choose-site'),
        },
        {
            path: 'list/:hash',
            loadComponent: () => import('@features/sharedfiles/pages/list/list'),
        },
    ];
}

const routes: Routes = [
    {
        path: SHAREDFILES_PAGE_NAME,
        loadChildren: () => getSharedFilesRoutes(),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(routes),
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreSitePreferencesRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(async () => {
            CoreFileUploaderDelegate.registerHandler(CoreSharedFilesUploadHandler.instance);
            CoreSettingsDelegate.registerHandler(CoreSharedFilesSettingsHandler.instance);

            CoreSharedFilesHelper.initialize();
            await CoreSharedFiles.initializeDatabase();
        }),
    ],
})
export class CoreSharedFilesModule {}
