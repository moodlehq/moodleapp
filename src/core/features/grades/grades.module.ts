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
import { COURSE_PAGE_NAME } from '@features/course/course.module';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/user.module';
import { CoreGradesProvider } from './services/grades';
import { CoreGradesHelperProvider, GRADES_PAGE_NAME, GRADES_PARTICIPANTS_PAGE_NAME } from './services/grades-helper';
import { CoreGradesCourseOptionHandler } from './services/handlers/course-option';
import { CoreGradesOverviewLinkHandler } from './services/handlers/overview-link';
import { CoreGradesUserHandler } from './services/handlers/user';
import { CoreGradesReportLinkHandler } from './services/handlers/report-link';
import { CoreGradesUserLinkHandler } from './services/handlers/user-link';
import { CoreGradesCourseParticipantsOptionHandler } from '@features/grades/services/handlers/course-participants-option';
import { conditionalRoutes } from '@/app/app-routing.module';
import { COURSE_INDEX_PATH } from '@features/course/course-lazy.module';
import { CoreScreen } from '@services/screen';

export const CORE_GRADES_SERVICES: Type<unknown>[] = [
    CoreGradesProvider,
    CoreGradesHelperProvider,
];

const mainMenuChildrenRoutes: Routes = [
    {
        path: GRADES_PAGE_NAME,
        loadChildren: () => import('./grades-courses-lazy.module').then(m => m.CoreGradesCoursesLazyModule),
        data: { swipeManagerSource: 'courses' },
    },
    {
        path: `${COURSE_PAGE_NAME}/:courseId/${PARTICIPANTS_PAGE_NAME}/:userId/${GRADES_PAGE_NAME}`,
        loadChildren: () => import('./grades-course-lazy.module').then(m => m.CoreGradesCourseLazyModule),
    },
    ...conditionalRoutes([
        {
            path: `${COURSE_PAGE_NAME}/${COURSE_INDEX_PATH}/${GRADES_PARTICIPANTS_PAGE_NAME}/:userId`,
            loadChildren: () => import('./grades-course-lazy.module').then(m => m.CoreGradesCourseLazyModule),
            data: { swipeManagerSource: 'participants' },
        },
    ], () => CoreScreen.isMobile),
];

const courseIndexRoutes: Routes = [
    {
        path: GRADES_PAGE_NAME,
        loadChildren: () => import('./grades-course-lazy.module').then(m => m.CoreGradesCourseLazyModule),
    },
    {
        path: GRADES_PARTICIPANTS_PAGE_NAME,
        loadChildren: () => import('./grades-course-participants-lazy.module').then(m => m.CoreGradesCourseParticipantsLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(CoreGradesUserHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreGradesReportLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreGradesUserLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreGradesOverviewLinkHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(CoreGradesCourseOptionHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(CoreGradesCourseParticipantsOptionHandler.instance);
            },
        },
    ],
})
export class CoreGradesModule {}
