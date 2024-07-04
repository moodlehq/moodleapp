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

const COURSE_CONTENTS_ROUTES = new InjectionToken('COURSE_CONTENTS_ROUTES');

/**
 * Resolve dynamic routes.
 *
 * @param injector Injector.
 * @returns Module routes.
 */
export function resolveContentsRoutes(injector: Injector): ModuleRoutes {
    return resolveModuleRoutes(injector, COURSE_CONTENTS_ROUTES);
}

/**
 * Module used to register routes in the course contents page. These are routes that will only be used on
 * single activity courses where the activity uses split-view navigation in tablets, such as forum or glossary.
 */
@NgModule()
export class CoreCourseContentsRoutingModule {

    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<CoreCourseContentsRoutingModule> {
        return {
            ngModule: CoreCourseContentsRoutingModule,
            providers: [
                { provide: COURSE_CONTENTS_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
