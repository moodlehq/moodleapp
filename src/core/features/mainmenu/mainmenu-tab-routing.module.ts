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

import { InjectionToken, Injector, ModuleWithProviders, NgModule } from '@angular/core';
import { Route, Routes } from '@angular/router';

import { ModuleRoutesConfig, isEmptyRoute, resolveModuleRoutes } from '@/app/app-routing.module';

const MAIN_MENU_TAB_ROUTES = new InjectionToken('MAIN_MENU_TAB_ROUTES');

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @param mainRoute Main route. Cannot use loadChildren because we might need to add more children.
 * @returns Routes.
 */
export function buildTabMainRoutes(injector: Injector, mainRoute: Omit<Route, 'loadChildren'>): Routes {
    const path = mainRoute.path ?? '';
    const routes = resolveModuleRoutes(injector, MAIN_MENU_TAB_ROUTES);

    mainRoute.path = path;

    if (!('redirectTo' in mainRoute)) {
        mainRoute.children = mainRoute.children || [];
        mainRoute.children = mainRoute.children.concat(routes.children);
    } else if (isEmptyRoute(mainRoute)) {
        return [];
    }

    return [mainRoute, ...routes.siblings];
}

/**
 * Module used to register children routes for all main menu tabs. These are routes that can be navigated within any tab in the
 * main menu, but will remain within the navigation stack of the tab rather than overriding the main menu or moving to another tab.
 *
 * Some examples of routes registered in this module are:
 * - /main/{tab}/user
 * - /main/{tab}/badges
 * - /main/{tab}/mod_forum
 * - ...
 */
@NgModule()
export class CoreMainMenuTabRoutingModule {

    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<CoreMainMenuTabRoutingModule> {
        return {
            ngModule: CoreMainMenuTabRoutingModule,
            providers: [
                { provide: MAIN_MENU_TAB_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
