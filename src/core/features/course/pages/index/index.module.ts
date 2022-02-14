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
import { RouterModule, ROUTES, Routes } from '@angular/router';

import { resolveModuleRoutes } from '@/app/app-routing.module';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseIndexPage } from '.';
import { COURSE_INDEX_ROUTES } from './index-routing.module';
import { CoreCoursePreviewPageComponentModule } from '../course-summary/course-summary.module';

function buildRoutes(injector: Injector): Routes {
    const routes = resolveModuleRoutes(injector, COURSE_INDEX_ROUTES);

    return [
        {
            path: '',
            component: CoreCourseIndexPage,
            data: {
                isCourseIndex: true,
            },
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
        CoreCoursePreviewPageComponentModule,
    ],
    declarations: [
        CoreCourseIndexPage,
    ],
    exports: [RouterModule],
})
export class CoreCourseIndexPageModule {}
