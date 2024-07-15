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
import { CoreCourseFormatModule } from '@features/course/format/formats.module';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/course';
import { SITE_SCHEMA as LOG_SITE_SCHEMA } from './services/database/log';
import { SITE_SCHEMA as PREFETCH_SITE_SCHEMA } from './services/database/module-prefetch';
import { CoreCourseModulePrefetchDelegate } from './services/module-prefetch-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreCourseLogCronHandler } from './services/handlers/log-cron';
import { CoreCourseSyncCronHandler } from './services/handlers/sync-cron';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCourseTagAreaHandler } from './services/handlers/course-tag-area';
import { CoreCourseModulesTagAreaHandler } from './services/handlers/modules-tag-area';
import { CoreCourse } from './services/course';
import { buildRegExpUrlMatcher } from '@/app/app-routing.module';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { COURSE_PAGE_NAME, CONTENTS_PAGE_NAME } from './constants';

/**
 * Get course services.
 *
 * @returns Course services.
 */
export async function getCourseServices(): Promise<Type<unknown>[]> {
    const { CoreCourseProvider } = await import('@features/course/services/course');
    const { CoreCourseHelperProvider } = await import('@features/course/services/course-helper');
    const { CoreCourseLogHelperProvider } = await import('@features/course/services/log-helper');
    const { CoreCourseFormatDelegateService } = await import('@features/course/services/format-delegate');
    const { CoreCourseModuleDelegateService } = await import('@features/course/services/module-delegate');
    const { CoreCourseModulePrefetchDelegateService } = await import('@features/course/services/module-prefetch-delegate');
    const { CoreCourseOptionsDelegateService } = await import('@features/course/services/course-options-delegate');
    const { CoreCourseOfflineProvider } = await import('@features/course/services/course-offline');
    const { CoreCourseSyncProvider } = await import('@features/course/services/sync');

    return [
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
}

/**
 * Get course exported objects.
 *
 * @returns Course exported objects.
 */
export async function getCourseExportedObjects(): Promise<Record<string, unknown>> {
    const { CoreCourseActivityPrefetchHandlerBase } = await import('@features/course/classes/activity-prefetch-handler');
    const { CoreCourseResourcePrefetchHandlerBase } = await import('@features/course/classes/resource-prefetch-handler');
    const { CoreCourseAccessDataType } = await import('@features/course/services/course');
    const { CoreCourseUnsupportedModuleComponent } =
        await import ('@features/course/components/unsupported-module/unsupported-module');
    const { CoreCourseFormatSingleActivityComponent } =
        await import ('@features/course/format/singleactivity/components/singleactivity');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        CoreCourseActivityPrefetchHandlerBase,
        CoreCourseResourcePrefetchHandlerBase,
        CoreCourseUnsupportedModuleComponent,
        CoreCourseFormatSingleActivityComponent,
        CoreCourseAccessDataType,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

const routes: Routes = [
    {
        matcher: buildRegExpUrlMatcher(new RegExp(`^${COURSE_PAGE_NAME}(/deep)*`)),
        loadChildren: () => import('@features/course/course-lazy.module').then(m => m.CoreCourseLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: CONTENTS_PAGE_NAME,
        loadChildren: () => import('@features/course/course-contents-lazy.module').then(m => m.CoreCourseContentsLazyModule),
    },
];

@NgModule({
    imports: [
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseFormatModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA, OFFLINE_SITE_SCHEMA, LOG_SITE_SCHEMA, PREFETCH_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
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
