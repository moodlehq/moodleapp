// (C) Copyright 2015 Martin Dougiamas
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
import { Platform } from 'ionic-angular';
import { CoreCronDelegate } from '@providers/cron';
import { CoreEventsProvider } from '@providers/events';
import { CoreCourseProvider } from './providers/course';
import { CoreCourseHelperProvider } from './providers/helper';
import { CoreCourseLogHelperProvider } from './providers/log-helper';
import { CoreCourseFormatDelegate } from './providers/format-delegate';
import { CoreCourseModuleDelegate } from './providers/module-delegate';
import { CoreCourseOfflineProvider } from './providers/course-offline';
import { CoreCourseModulePrefetchDelegate } from './providers/module-prefetch-delegate';
import { CoreCourseOptionsDelegate } from './providers/options-delegate';
import { CoreCourseFormatDefaultHandler } from './providers/default-format';
import { CoreCourseModuleDefaultHandler } from './providers/default-module';
import { CoreCourseFormatSingleActivityModule } from './formats/singleactivity/singleactivity.module';
import { CoreCourseFormatSocialModule } from './formats/social/social.module';
import { CoreCourseFormatTopicsModule } from './formats/topics/topics.module';
import { CoreCourseFormatWeeksModule } from './formats/weeks/weeks.module';
import { CoreCourseSyncProvider } from './providers/sync';
import { CoreCourseSyncCronHandler } from './providers/sync-cron-handler';
import { CoreCourseLogCronHandler } from './providers/log-cron-handler';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { CoreCourseTagAreaHandler } from './providers/course-tag-area-handler';
import { CoreCourseModulesTagAreaHandler } from './providers/modules-tag-area-handler';

// List of providers (without handlers).
export const CORE_COURSE_PROVIDERS: any[] = [
    CoreCourseProvider,
    CoreCourseHelperProvider,
    CoreCourseLogHelperProvider,
    CoreCourseFormatDelegate,
    CoreCourseModuleDelegate,
    CoreCourseModulePrefetchDelegate,
    CoreCourseOptionsDelegate,
    CoreCourseOfflineProvider,
    CoreCourseSyncProvider
];

@NgModule({
    declarations: [],
    imports: [
        CoreCourseFormatSingleActivityModule,
        CoreCourseFormatTopicsModule,
        CoreCourseFormatWeeksModule,
        CoreCourseFormatSocialModule
    ],
    providers: [
        CoreCourseProvider,
        CoreCourseHelperProvider,
        CoreCourseLogHelperProvider,
        CoreCourseFormatDelegate,
        CoreCourseModuleDelegate,
        CoreCourseModulePrefetchDelegate,
        CoreCourseOptionsDelegate,
        CoreCourseOfflineProvider,
        CoreCourseSyncProvider,
        CoreCourseFormatDefaultHandler,
        CoreCourseModuleDefaultHandler,
        CoreCourseSyncCronHandler,
        CoreCourseLogCronHandler,
        CoreCourseTagAreaHandler,
        CoreCourseModulesTagAreaHandler
    ],
    exports: []
})
export class CoreCourseModule {
    constructor(cronDelegate: CoreCronDelegate, syncHandler: CoreCourseSyncCronHandler, logHandler: CoreCourseLogCronHandler,
                platform: Platform, eventsProvider: CoreEventsProvider, tagAreaDelegate: CoreTagAreaDelegate,
                courseTagAreaHandler: CoreCourseTagAreaHandler, modulesTagAreaHandler: CoreCourseModulesTagAreaHandler) {
        cronDelegate.register(syncHandler);
        cronDelegate.register(logHandler);
        tagAreaDelegate.registerHandler(courseTagAreaHandler);
        tagAreaDelegate.registerHandler(modulesTagAreaHandler);

        platform.resume.subscribe(() => {
            // Log the app is open to keep user in online status.
            setTimeout(() => {
                cronDelegate.forceCronHandlerExecution(logHandler.name);
            }, 1000);
        });

        eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            // Log the app is open to keep user in online status.
            setTimeout(() => {
                cronDelegate.forceCronHandlerExecution(logHandler.name).catch((e) => {
                    // Ignore errors here, since probably login is not complete: it happens on token invalid.
                });
            }, 1000);
        });
    }
}
