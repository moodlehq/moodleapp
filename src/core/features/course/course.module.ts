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

import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreCourseFormatModule } from '@features/course/format/formats.module';
import { COURSE_SITE_SCHEMA, COURSE_OFFLINE_SITE_SCHEMA } from './services/database/course';
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
import { CORE_COURSE_PAGE_NAME, CORE_COURSE_CONTENTS_PAGE_NAME, CORE_COURSE_OVERVIEW_PAGE_NAME } from './constants';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreCourseOverviewOptionHandler } from './services/handlers/overview-option';

/**
 * Get course services.
 *
 * @returns Course services.
 */
export async function getCourseServices(): Promise<Type<unknown>[]> {
    const { CoreCourseProvider } = await import('@features/course/services/course');
    const { CoreCourseHelperProvider } = await import('@features/course/services/course-helper');
    const { CoreCourseModuleHelperService } = await import('@features/course/services/course-module-helper');
    const { CoreCourseDownloadStatusHelperService } = await import('@features/course/services/course-download-status-helper');
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
        CoreCourseModuleHelperService,
        CoreCourseDownloadStatusHelperService,
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
    const {
        CoreCourseAccessDataType,
        CORE_COURSE_ALL_SECTIONS_ID,
        CORE_COURSE_STEALTH_MODULES_SECTION_ID,
        CORE_COURSE_ALL_COURSES_CLEARED,
        CORE_COURSE_PROGRESS_UPDATED_EVENT,
        CORE_COURSE_COMPONENT,
        CORE_COURSE_CORE_MODULES,
    } = await import('@features/course/constants');

    // Export components that are used from JS code instead of in templates. E.g. when opening a modal or in a handler.
    const { CoreCourseUnsupportedModuleComponent } =
        await import ('@features/course/components/unsupported-module/unsupported-module');
    const { CoreCourseFormatSingleActivityComponent } =
        await import ('@features/course/format/singleactivity/components/singleactivity');
    const { CoreCourseCourseIndexComponent } = await import('@features/course/components/course-index/course-index');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        CoreCourseActivityPrefetchHandlerBase,
        CoreCourseResourcePrefetchHandlerBase,
        CoreCourseUnsupportedModuleComponent,
        CoreCourseFormatSingleActivityComponent,
        CoreCourseCourseIndexComponent,
        CoreCourseAccessDataType,
        CORE_COURSE_ALL_SECTIONS_ID,
        CORE_COURSE_STEALTH_MODULES_SECTION_ID,
        CORE_COURSE_ALL_COURSES_CLEARED,
        CORE_COURSE_PROGRESS_UPDATED_EVENT,
        CORE_COURSE_COMPONENT,
        CORE_COURSE_CORE_MODULES,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Get directives and components for site plugins.
 *
 * @returns Returns directives and components.
 */
export async function getCourseExportedDirectives(): Promise<Type<unknown>[]> {
    const { CoreCourseFormatComponent } = await import('@features/course/components/course-format/course-format');
    const { CoreCourseSectionComponent } = await import('@features/course/components/course-section/course-section');
    const { CoreCourseModuleComponent } = await import('@features/course/components/module/module');
    const { CoreCourseModuleCompletionComponent } = await import('@features/course/components/module-completion/module-completion');
    const { CoreCourseModuleCompletionLegacyComponent } =
        await import('@features/course/components/module-completion-legacy/module-completion-legacy');
    const { CoreCourseModuleInfoComponent } = await import('@features/course/components/module-info/module-info');
    const { CoreCourseModuleNavigationComponent } = await import('@features/course/components/module-navigation/module-navigation');

    const { CoreCourseDownloadModuleMainFileDirective } = await import('@features/course/directives/download-module-main-file');

    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const { CoreCourseModuleDescriptionComponent } =
        await import('@features/course/components/module-description/module-description');

    return [
        CoreCourseModuleDescriptionComponent,
        CoreCourseFormatComponent,
        CoreCourseSectionComponent,
        CoreCourseModuleComponent,
        CoreCourseModuleCompletionComponent,
        CoreCourseModuleCompletionLegacyComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
        CoreCourseDownloadModuleMainFileDirective,
    ];
}

const routes: Routes = [
    {
        matcher: buildRegExpUrlMatcher(new RegExp(`^${CORE_COURSE_PAGE_NAME}(/deep)*`)),
        loadChildren: () => import('@features/course/course-lazy.module'),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: CORE_COURSE_CONTENTS_PAGE_NAME,
        loadChildren: () => import('@features/course/course-contents-lazy.module'),
    },
    {
        path: CORE_COURSE_OVERVIEW_PAGE_NAME,
        loadComponent: () => import('@features/course/pages/overview/overview'),
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
            useValue: [COURSE_SITE_SCHEMA, COURSE_OFFLINE_SITE_SCHEMA, LOG_SITE_SCHEMA, PREFETCH_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCronDelegate.register(CoreCourseSyncCronHandler.instance);
            CoreCronDelegate.register(CoreCourseLogCronHandler.instance);
            CoreTagAreaDelegate.registerHandler(CoreCourseTagAreaHandler.instance);
            CoreTagAreaDelegate.registerHandler(CoreCourseModulesTagAreaHandler.instance);
            CoreCourseOptionsDelegate.registerHandler(CoreCourseOverviewOptionHandler.instance);

            CoreCourse.initialize();
            CoreCourseModulePrefetchDelegate.initialize();
        }),
    ],
})
export class CoreCourseModule {}
