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

const COURSE_INDEX_ROUTES = new InjectionToken('COURSE_INDEX_ROUTES');

/**
 * Resolve dynamic routes.
 *
 * @param injector Injector.
 * @returns Module routes.
 */
export function resolveIndexRoutes(injector: Injector): ModuleRoutes {
    return resolveModuleRoutes(injector, COURSE_INDEX_ROUTES);
}

/**
 * Module used to register routes in the main course page. These are routes that will appear as tabs in the main page of a course,
 * and they must also be declared in a CoreCourseOptionsHandler or in plugins using the CoreCourseOptionsDelegate.
 *
 * Some examples of routes registered in this module are:
 * - /main/{tab}/course/{courseId}/contents
 * - /main/{tab}/course/{courseId}/participants
 * - /main/{tab}/course/{courseId}/grades
 * - ...
 */
@NgModule()
export class CoreCourseIndexRoutingModule {

    static forChild(routes: ModuleRoutesConfig): ModuleWithProviders<CoreCourseIndexRoutingModule> {
        return {
            ngModule: CoreCourseIndexRoutingModule,
            providers: [
                { provide: COURSE_INDEX_ROUTES, multi: true, useValue: routes },
            ],
        };
    }

}
