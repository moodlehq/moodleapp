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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreGradesProvider } from './services/grades';
import { CoreGradesHelperProvider } from './services/grades-helper';
import { CoreGradesCourseOptionHandler } from './services/handlers/course-option';
import { CoreGradesMainMenuHandler, CoreGradesMainMenuHandlerService } from './services/handlers/mainmenu';
import { CoreGradesOverviewLinkHandler } from './services/handlers/overview-link';
import { CoreGradesUserHandler } from './services/handlers/user';
import { CoreGradesUserLinkHandler } from './services/handlers/user-link';

export const CORE_GRADES_SERVICES: Type<unknown>[] = [
    CoreGradesProvider,
    CoreGradesHelperProvider,
];

const routes: Routes = [
    {
        path: CoreGradesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@features/grades/grades-lazy.module').then(m => m.CoreGradesLazyModule),
    },
    {
        path: 'user-grades/:courseId',
        loadChildren: () => import('@features/grades/grades-course-lazy.module').then(m => m.CoreGradesCourseLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: 'grades',
        loadChildren: () => import('@features/grades/grades-course-lazy.module').then(m => m.CoreGradesCourseLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreMainMenuRoutingModule.forChild({ children: routes }),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useValue: () => {
                CoreMainMenuDelegate.registerHandler(CoreGradesMainMenuHandler.instance);
                CoreUserDelegate.registerHandler(CoreGradesUserHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreGradesUserLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreGradesOverviewLinkHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(CoreGradesCourseOptionHandler.instance);
            },
        },
    ],
})
export class CoreGradesModule {}
