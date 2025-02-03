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

import { Injector, NgModule } from '@angular/core';
import { ROUTES, Routes } from '@angular/router';

import { resolveMainMenuRoutes } from './mainmenu-routing.module';
import { CoreMainMenuHomeHandlerService } from './services/handlers/mainmenu';
import { MAIN_MENU_MORE_PAGE_NAME } from './constants';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const mainMenuRoutes = resolveMainMenuRoutes(injector);

    return [
        {
            path: '',
            loadComponent: () => import('@features/mainmenu/pages/menu/menu'),
            children: [
                {
                    path: CoreMainMenuHomeHandlerService.PAGE_NAME,
                    loadChildren: () => import('./mainmenu-home-lazy.module'),
                },
                {
                    path: MAIN_MENU_MORE_PAGE_NAME,
                    loadChildren: () => import('./mainmenu-more-lazy.module'),
                },
                ...mainMenuRoutes.children,
            ],
        },
        ...mainMenuRoutes.siblings,
    ];
}

@NgModule({
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
})
export default class CoreMainMenuLazyModule {}
