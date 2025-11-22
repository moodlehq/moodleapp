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

import { NgModule, Type, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { PARTICIPANTS_PAGE_NAME } from '@features/user/constants';
import { GRADES_PAGE_NAME, GRADES_PARTICIPANTS_PAGE_NAME } from './constants';
import { CoreGradesCourseOptionHandler } from './services/handlers/course-option';
import { CoreGradesOverviewLinkHandler } from './services/handlers/overview-link';
import { CoreGradesUserHandler } from './services/handlers/user';
import { CoreGradesReportLinkHandler } from './services/handlers/report-link';
import { CoreGradesUserLinkHandler } from './services/handlers/user-link';
import { CoreGradesCourseParticipantsOptionHandler } from '@features/grades/services/handlers/course-participants-option';
import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { CORE_COURSE_PAGE_NAME, CORE_COURSE_INDEX_PATH } from '@features/course/constants';

/**
 * Get grades services.
 *
 * @returns Returns grades services.
 */
export async function getGradesServices(): Promise<Type<unknown>[]> {
    const { CoreGradesProvider } = await import('@features/grades/services/grades');
    const { CoreGradesHelperProvider } = await import('@features/grades/services/grades-helper');

    return [
        CoreGradesProvider,
        CoreGradesHelperProvider,
    ];
}

const mobileRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('@features/grades/pages/courses/courses'),
    },
    {
        path: ':courseId',
        loadComponent: () => import('@features/grades/pages/course/course'),
        data: { checkForcedLanguage: 'course' },
    },
];

const tabletRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('@features/grades/pages/courses/courses'),
        loadChildren: () => [
            {
                path: ':courseId',
                loadComponent: () => import('@features/grades/pages/course/course'),
                data: { checkForcedLanguage: 'course' },
            },
        ],
    },
];

const mainMenuChildrenRoutes: Routes = [
    {
        path: GRADES_PAGE_NAME,
        loadChildren: () => [
            ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
            ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        ],
        data: { swipeManagerSource: 'courses' },
    },
    {
        path: `${CORE_COURSE_PAGE_NAME}/:courseId/${PARTICIPANTS_PAGE_NAME}/:userId/${GRADES_PAGE_NAME}`,
        loadComponent: () => import('@features/grades/pages/course/course'),
        data: { checkForcedLanguage: 'course' },
    },
    ...conditionalRoutes([
        {
            path: `${CORE_COURSE_PAGE_NAME}/${CORE_COURSE_INDEX_PATH}/${GRADES_PARTICIPANTS_PAGE_NAME}/:userId`,
            loadComponent: () => import('@features/grades/pages/course/course'),
            data: { swipeManagerSource: 'participants' },
        },
    ], () => CoreScreen.isMobile),
];

const courseIndexRoutes: Routes = [
    {
        path: GRADES_PAGE_NAME,
        loadComponent: () => import('@features/grades/pages/course/course'),
    },
    {
        path: GRADES_PARTICIPANTS_PAGE_NAME,
        loadComponent: () => import('@features/user/pages/participants/participants'),
        loadChildren: () => conditionalRoutes([
            {
                path: ':userId',
                loadComponent: () => import('@features/grades/pages/course/course'),
                data: { swipeManagerSource: 'participants' },
            },
        ], () => CoreScreen.isTablet),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuChildrenRoutes),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreUserDelegate.registerHandler(CoreGradesUserHandler.instance);
            CoreContentLinksDelegate.registerHandler(CoreGradesReportLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(CoreGradesUserLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(CoreGradesOverviewLinkHandler.instance);
            CoreCourseOptionsDelegate.registerHandler(CoreGradesCourseOptionHandler.instance);
            CoreCourseOptionsDelegate.registerHandler(CoreGradesCourseParticipantsOptionHandler.instance);
        }),
    ],
})
export class CoreGradesModule {}
