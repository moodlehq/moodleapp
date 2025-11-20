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

import { NgModule, provideAppInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';

import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA, SYNC_SITE_SCHEMA } from './services/database/lesson';
import { AddonModLessonGradeLinkHandler } from './services/handlers/grade-link';
import { AddonModLessonIndexLinkHandler } from './services/handlers/index-link';
import { AddonModLessonListLinkHandler } from './services/handlers/list-link';
import { AddonModLessonModuleHandler } from './services/handlers/module';
import { AddonModLessonPrefetchHandler } from './services/handlers/prefetch';
import { AddonModLessonPushClickHandler } from './services/handlers/push-click';
import { AddonModLessonReportLinkHandler } from './services/handlers/report-link';
import { AddonModLessonSyncCronHandler } from './services/handlers/sync-cron';
import { ADDON_MOD_LESSON_COMPONENT_LEGACY, ADDON_MOD_LESSON_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';
import { CoreCourseForceLanguageSource } from '@features/course/constants';

const routes: Routes = [
    {
        path: ADDON_MOD_LESSON_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId',
                loadComponent: () => import('./pages/index/index'),
            },
            {
                path: ':courseId/:cmId/player',
                loadComponent: () => import('./pages/player/player'),
                canDeactivate: [canLeaveGuard],
            },
            {
                path: ':courseId/:cmId/user-retake/:userId',
                loadComponent: () => import('./pages/user-retake/user-retake'),
            },
        ],
        data: { checkForcedLanguage: CoreCourseForceLanguageSource.MODULE },
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA, OFFLINE_SITE_SCHEMA, SYNC_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModLessonModuleHandler.instance);
            CoreCourseModulePrefetchDelegate.registerHandler(AddonModLessonPrefetchHandler.instance);
            CoreCronDelegate.register(AddonModLessonSyncCronHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModLessonGradeLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModLessonIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModLessonListLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModLessonReportLinkHandler.instance);
            CorePushNotificationsDelegate.registerClickHandler(AddonModLessonPushClickHandler.instance);

            CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_LESSON_COMPONENT_LEGACY);
        }),
    ],
})
export class AddonModLessonModule {}
