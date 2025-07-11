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
import { authGuard } from '@features/mainmenu/guards/auth';

import { AppRoutingModule } from '@/app/app-routing.module';

import { CoreMainMenuDelegate } from './services/mainmenu-delegate';
import { CoreMainMenuHomeHandler } from './services/handlers/mainmenu';

/**
 * Get main menu services.
 *
 * @returns Returns main menu services.
 */
export async function getMainMenuServices(): Promise<Type<unknown>[]> {
    const { CoreMainMenuHomeDelegateService } = await import('@features/mainmenu/services/home-delegate');
    const { CoreMainMenuDelegateService } = await import('@features/mainmenu/services/mainmenu-delegate');
    const { CoreMainMenuProvider } = await import('@features/mainmenu/services/mainmenu');

    return [
        CoreMainMenuHomeDelegateService,
        CoreMainMenuDelegateService,
        CoreMainMenuProvider,
    ];
}

/**
 * Get main menu exported objects.
 *
 * @returns Main menu exported objects.
 */
export async function getMainMenuExportedObjects(): Promise<Record<string, unknown>> {
    const {
        MAIN_MENU_NUM_MAIN_HANDLERS,
        MAIN_MENU_ITEM_MIN_WIDTH,
        MAIN_MENU_MORE_PAGE_NAME,
        MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
        MAIN_MENU_VISIBILITY_UPDATED_EVENT,

    } = await import('@features/mainmenu/constants');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        MAIN_MENU_NUM_MAIN_HANDLERS,
        MAIN_MENU_ITEM_MIN_WIDTH,
        MAIN_MENU_MORE_PAGE_NAME,
        MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
        MAIN_MENU_VISIBILITY_UPDATED_EVENT,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

const appRoutes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'main',
    },
    {
        path: 'main',
        loadChildren: () => import('./mainmenu-lazy.module'),
        canActivate: [authGuard],
    },
    {
        path: 'reload',
        loadComponent: () => import('@features/mainmenu/pages/reload/reload'),
    },
];

@NgModule({
    imports: [AppRoutingModule.forChild(appRoutes)],
    providers: [
        provideAppInitializer(() => {
            CoreMainMenuDelegate.registerHandler(CoreMainMenuHomeHandler.instance);
        }),
    ],
})
export class CoreMainMenuModule {}
