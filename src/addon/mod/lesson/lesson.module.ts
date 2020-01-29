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

import { NgModule } from '@angular/core';
import { CoreCronDelegate } from '@providers/cron';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { AddonModLessonComponentsModule } from './components/components.module';
import { AddonModLessonProvider } from './providers/lesson';
import { AddonModLessonOfflineProvider } from './providers/lesson-offline';
import { AddonModLessonSyncProvider } from './providers/lesson-sync';
import { AddonModLessonHelperProvider } from './providers/helper';
import { AddonModLessonModuleHandler } from './providers/module-handler';
import { AddonModLessonPrefetchHandler } from './providers/prefetch-handler';
import { AddonModLessonSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModLessonIndexLinkHandler } from './providers/index-link-handler';
import { AddonModLessonGradeLinkHandler } from './providers/grade-link-handler';
import { AddonModLessonReportLinkHandler } from './providers/report-link-handler';
import { AddonModLessonListLinkHandler } from './providers/list-link-handler';
import { AddonModLessonPushClickHandler } from './providers/push-click-handler';

// List of providers (without handlers).
export const ADDON_MOD_LESSON_PROVIDERS: any[] = [
    AddonModLessonProvider,
    AddonModLessonOfflineProvider,
    AddonModLessonSyncProvider,
    AddonModLessonHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModLessonComponentsModule
    ],
    providers: [
        AddonModLessonProvider,
        AddonModLessonOfflineProvider,
        AddonModLessonSyncProvider,
        AddonModLessonHelperProvider,
        AddonModLessonModuleHandler,
        AddonModLessonPrefetchHandler,
        AddonModLessonSyncCronHandler,
        AddonModLessonIndexLinkHandler,
        AddonModLessonGradeLinkHandler,
        AddonModLessonReportLinkHandler,
        AddonModLessonListLinkHandler,
        AddonModLessonPushClickHandler
    ]
})
export class AddonModLessonModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModLessonModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModLessonPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModLessonSyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModLessonIndexLinkHandler, gradeHandler: AddonModLessonGradeLinkHandler,
            reportHandler: AddonModLessonReportLinkHandler,
            listLinkHandler: AddonModLessonListLinkHandler, pushNotificationsDelegate: CorePushNotificationsDelegate,
            pushClickHandler: AddonModLessonPushClickHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(gradeHandler);
        linksDelegate.registerHandler(reportHandler);
        linksDelegate.registerHandler(listLinkHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);
    }
}
