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

import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreCourseComponentsModule } from './components/components.module';
import { CoreCourseDirectivesModule } from './directives/directives.module';
import { CoreCourseFormatModule } from './format/formats.module';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/course';
import { SITE_SCHEMA as LOG_SITE_SCHEMA } from './services/database/log';
import { SITE_SCHEMA as PREFETCH_SITE_SCHEMA } from './services/database/module-prefetch';
import { CoreCourseIndexRoutingModule } from './pages/index/index-routing.module';
import { CoreCourseModulePrefetchDelegate, CoreCourseModulePrefetchDelegateService } from './services/module-prefetch-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreCourseLogCronHandler } from './services/handlers/log-cron';
import { CoreCourseSyncCronHandler } from './services/handlers/sync-cron';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCourseTagAreaHandler } from './services/handlers/course-tag-area';
import { CoreCourseModulesTagAreaHandler } from './services/handlers/modules-tag-area';
import { CoreCourse, CoreCourseProvider } from './services/course';
import { CoreCourseHelperProvider } from './services/course-helper';
import { CoreCourseLogHelperProvider } from './services/log-helper';
import { CoreCourseFormatDelegateService } from './services/format-delegate';
import { CoreCourseModuleDelegateService } from './services/module-delegate';
import { CoreCourseOptionsDelegateService } from './services/course-options-delegate';
import { CoreCourseOfflineProvider } from './services/course-offline';
import { CoreCourseSyncProvider } from './services/sync';
import { COURSE_INDEX_PATH } from '@features/course/course-lazy.module';
import { buildRegExpUrlMatcher } from '@/app/app-routing.module';

export const CORE_COURSE_SERVICES: Type<unknown>[] = [
    CoreCourseProvider,
    CoreCourseHelperProvider,
    CoreCourseLogHelperProvider,
    CoreCourseFormatDelegateService,
    CoreCourseModuleDelegateService,
    CoreCourseModulePrefetchDelegateService,
    CoreCourseOptionsDelegateService,
    CoreCourseOfflineProvider,
    CoreCourseSyncProvider,
];

export const COURSE_PAGE_NAME = 'course';
export const CONTENTS_PAGE_NAME = 'contents';
export const COURSE_CONTENTS_PATH = `${COURSE_PAGE_NAME}/${COURSE_INDEX_PATH}/${CONTENTS_PAGE_NAME}`;

const routes: Routes = [
    {
        matcher: buildRegExpUrlMatcher(new RegExp(`^${COURSE_PAGE_NAME}(/deep)*`)),
        loadChildren: () => import('@features/course/course-lazy.module').then(m => m.CoreCourseLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: CONTENTS_PAGE_NAME,
        loadChildren: () => import('./pages/contents/contents.module').then(m => m.CoreCourseContentsPageModule),
    },
];

@NgModule({
    imports: [
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseFormatModule,
        CoreCourseComponentsModule,
        CoreCourseDirectivesModule,
    ],
    exports: [CoreCourseIndexRoutingModule],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA, OFFLINE_SITE_SCHEMA, LOG_SITE_SCHEMA, PREFETCH_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreCronDelegate.register(CoreCourseSyncCronHandler.instance);
                CoreCronDelegate.register(CoreCourseLogCronHandler.instance);
                CoreTagAreaDelegate.registerHandler(CoreCourseTagAreaHandler.instance);
                CoreTagAreaDelegate.registerHandler(CoreCourseModulesTagAreaHandler.instance);

                CoreCourse.initialize();
                CoreCourseModulePrefetchDelegate.initialize();
            },
        },
    ],
})
export class CoreCourseModule {}
