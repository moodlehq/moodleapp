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

import { ModuleRoutesConfig, resolveModuleRoutes } from '@/app/app-routing.module';

const MAIN_MENU_TAB_ROUTES = new InjectionToken('MAIN_MENU_TAB_ROUTES');
const modulesPaths: Record<string, Set<string>> = {};

/**
 * Get the name of the module the injector belongs to.
 *
 * @param injector Injector.
 * @returns Injector module name.
 */
function getInjectorModule(injector: Injector): string | null {
    if (!('source' in injector) || typeof injector.source !== 'string') {
        return null;
    }

    // Get module name from R3Injector source.
    // See https://github.com/angular/angular/blob/16.2.0/packages/core/src/di/r3_injector.ts#L161C8
    return injector.source;
}

/**
 * Get module paths.
 *
 * @param injector Injector.
 * @returns Module paths.
 */
function getModulePaths(injector: Injector): Set<string> | null {
    const module = getInjectorModule(injector);

    if (!module) {
        return null;
    }

    return modulesPaths[module] ??= new Set();
}

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @param mainRoute Main route.
 * @returns Routes.
 */
export function buildTabMainRoutes(injector: Injector, mainRoute: Route): Routes {
    const path = mainRoute.path ?? '';
    const modulePaths = getModulePaths(injector);
    const isRootRoute = modulePaths && !modulePaths.has(path);
    const routes = resolveModuleRoutes(injector, MAIN_MENU_TAB_ROUTES);

    mainRoute.path = path;
    modulePaths?.add(path);

    if (isRootRoute && !('redirectTo' in mainRoute)) {
        mainRoute.children = mainRoute.children || [];
        mainRoute.children = mainRoute.children.concat(routes.children);
    }

    return isRootRoute
        ? [mainRoute, ...routes.siblings]
        : [mainRoute];
}

@NgModule()
export class CoreMainMenuTabRoutingModule {

    /**
     * Use this function to declare routes that will be children of all main menu tabs root routes.
     *
     * @param routes Routes to be children of main menu tabs.
     * @returns Calculated module.
     */
    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<CoreMainMenuTabRoutingModule> {
        return {
            ngModule: CoreMainMenuTabRoutingModule,
            providers: [
                { provide: MAIN_MENU_TAB_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
