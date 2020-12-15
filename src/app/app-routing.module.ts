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
import { PreloadAllModules, RouterModule, ROUTES, Routes } from '@angular/router';

import { CoreArray } from '@singletons/array';

function buildAppRoutes(injector: Injector): Routes {
    return CoreArray.flatten(injector.get<Routes[]>(APP_ROUTES, []));
}

export type ModuleRoutes = { children: Routes; siblings: Routes };
export type ModuleRoutesConfig = Routes | Partial<ModuleRoutes>;

export function resolveModuleRoutes(injector: Injector, token: InjectionToken<ModuleRoutesConfig[]>): ModuleRoutes {
    const configs = injector.get(token, []);
    const routes = configs.map(config => {
        if (Array.isArray(config)) {
            return {
                children: [],
                siblings: config,
            };
        }

        return {
            children: config.children || [],
            siblings: config.siblings || [],
        };
    });

    return {
        children: CoreArray.flatten(routes.map(r => r.children)),
        siblings: CoreArray.flatten(routes.map(r => r.siblings)),
    };
}

export const APP_ROUTES = new InjectionToken('APP_ROUTES');

@NgModule({
    imports: [
        RouterModule.forRoot([], {
            preloadingStrategy: PreloadAllModules,
            relativeLinkResolution: 'corrected',
        }),
    ],
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildAppRoutes, deps: [Injector] },
    ],
    exports: [RouterModule],
})
export class AppRoutingModule {

    static forChild(routes: Routes): ModuleWithProviders<AppRoutingModule> {
        return {
            ngModule: AppRoutingModule,
            providers: [
                { provide: APP_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
