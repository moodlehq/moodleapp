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

import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';
import { resolveContentsRoutes } from '@features/course/course-contents-routing.module';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourseFormatComponent } from './components/course-format/course-format';

/**
 * Build module routes.
 *
 * @param injector Injector.
 * @returns Routes.
 */
function buildRoutes(injector: Injector): Routes {
    const routes = resolveContentsRoutes(injector);

    return [
        {
            path: '',
            component: CoreCourseContentsPage,
            children: routes.children,
        },
        ...routes.siblings,
    ];
}

@NgModule({
    providers: [
        { provide: ROUTES, multi: true, useFactory: buildRoutes, deps: [Injector] },
    ],
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
        CoreCourseFormatComponent,
    ],
    declarations: [
        CoreCourseContentsPage,
    ],
})
export class CoreCourseContentsLazyModule {}
