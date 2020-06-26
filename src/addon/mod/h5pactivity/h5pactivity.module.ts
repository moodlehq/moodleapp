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
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';

import { AddonModH5PActivityComponentsModule } from './components/components.module';
import { AddonModH5PActivityModuleHandler } from './providers/module-handler';
import { AddonModH5PActivityProvider } from './providers/h5pactivity';
import { AddonModH5PActivitySyncProvider } from './providers/sync';
import { AddonModH5PActivityPrefetchHandler } from './providers/prefetch-handler';
import { AddonModH5PActivityIndexLinkHandler } from './providers/index-link-handler';
import { AddonModH5PActivityReportLinkHandler } from './providers/report-link-handler';
import { AddonModH5PActivitySyncCronHandler } from './providers/sync-cron-handler';

// List of providers (without handlers).
export const ADDON_MOD_H5P_ACTIVITY_PROVIDERS: any[] = [
    AddonModH5PActivityProvider,
    AddonModH5PActivitySyncProvider,
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModH5PActivityComponentsModule
    ],
    providers: [
        AddonModH5PActivityProvider,
        AddonModH5PActivitySyncProvider,
        AddonModH5PActivityModuleHandler,
        AddonModH5PActivityPrefetchHandler,
        AddonModH5PActivityIndexLinkHandler,
        AddonModH5PActivityReportLinkHandler,
        AddonModH5PActivitySyncCronHandler,
    ]
})
export class AddonModH5PActivityModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate,
            moduleHandler: AddonModH5PActivityModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate,
            prefetchHandler: AddonModH5PActivityPrefetchHandler,
            linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModH5PActivityIndexLinkHandler,
            reportLinkHandler: AddonModH5PActivityReportLinkHandler,
            cronDelegate: CoreCronDelegate,
            syncHandler: AddonModH5PActivitySyncCronHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(reportLinkHandler);
        cronDelegate.register(syncHandler);
    }
}
