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
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonPrivateFilesUserHandler } from './services/handlers/user';
import { ADDON_PRIVATE_FILES_PAGE_NAME } from './constants';

/**
 * Get private files services.
 *
 * @returns Returns private files services.
 */
export async function getPrivateFilesServices(): Promise<Type<unknown>[]> {
    const { AddonPrivateFilesProvider } = await import('@addons/privatefiles/services/privatefiles');
    const { AddonPrivateFilesHelperProvider } = await import('@addons/privatefiles/services/privatefiles-helper');

    return [
        AddonPrivateFilesProvider,
        AddonPrivateFilesHelperProvider,
    ];
}

const routes: Routes = [
    {
        path: ADDON_PRIVATE_FILES_PAGE_NAME,
        loadChildren: () => [
            {
                path: '',
                redirectTo: 'root',
                pathMatch: 'full',
            },
            {
                path: 'root',
                loadComponent: () => import('@addons/privatefiles/pages/index'),
            },
            {
                path: ':hash',
                loadComponent: () => import('@addons/privatefiles/pages/index'),
            },
        ],
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(AddonPrivateFilesUserHandler.instance);
            },
        },
    ],
})
export class AddonPrivateFilesModule {}
