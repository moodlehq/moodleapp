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

import { ModuleRoutes, ModuleRoutesConfig, resolveModuleRoutes } from '@/app/app-routing.module';

const SITE_PREFERENCES_ROUTES = new InjectionToken('SITE_PREFERENCES_ROUTES');

/**
 * Resolve dynamic routes.
 *
 * @param injector Injector.
 * @returns Module routes.
 */
export function resolveSiteRoutes(injector: Injector): ModuleRoutes {
    return resolveModuleRoutes(injector, SITE_PREFERENCES_ROUTES);
}

@NgModule()
export class CoreSitePreferencesRoutingModule {

    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<CoreSitePreferencesRoutingModule> {
        return {
            ngModule: CoreSitePreferencesRoutingModule,
            providers: [
                { provide: SITE_PREFERENCES_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
