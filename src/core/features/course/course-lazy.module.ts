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
import { resolveIndexRoutes } from '@features/course/course-routing.module';
import { CoreCourseHelper } from './services/course-helper';
import { CORE_COURSE_INDEX_PATH, CoreCourseForceLanguageSource } from './constants';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const indexRoutes = resolveIndexRoutes(injector);

    return [
        {
            path: CORE_COURSE_INDEX_PATH,
            loadChildren: () => [
                {
                    path: '',
                    loadComponent: () => import('@features/course/pages/index/index'),
                    data: {
                        isCourseIndex: true,
                    },
                    loadChildren: () => indexRoutes.children,
                },
                ...indexRoutes.siblings,
            ],
            data: { checkForcedLanguage: CoreCourseForceLanguageSource.COURSE },
        },
        {
            path: ':courseId/:cmId/module-preview',
            loadComponent: () => import('@features/course/pages/module-preview/module-preview'),
            data: { checkForcedLanguage: CoreCourseForceLanguageSource.COURSE },
        },
        {
            path: ':courseId/list-mod-type',
            loadComponent: () => import('@features/course/pages/list-mod-type/list-mod-type'),
            data: { checkForcedLanguage: CoreCourseForceLanguageSource.COURSE },
        },
        {
            path: ':courseId/summary',
            loadComponent: () => CoreCourseHelper.getCourseSummaryPage(),
            data: { checkForcedLanguage: CoreCourseForceLanguageSource.COURSE },
        },
    ];
}

@NgModule({
    providers: [
        {
            provide: ROUTES,
            multi: true,
            deps: [Injector],
            useFactory: buildRoutes,
        },
    ],
})
export default class CoreCourseLazyModule {}
