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
import { CoreCronDelegate } from '@providers/cron';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { AddonModWikiProvider } from './providers/wiki';
import { AddonModWikiOfflineProvider } from './providers/wiki-offline';
import { AddonModWikiSyncProvider } from './providers/wiki-sync';
import { AddonModWikiModuleHandler } from './providers/module-handler';
import { AddonModWikiPrefetchHandler } from './providers/prefetch-handler';
import { AddonModWikiSyncCronHandler } from './providers/sync-cron-handler';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonModWikiProvider,
        AddonModWikiOfflineProvider,
        AddonModWikiSyncProvider,
        AddonModWikiModuleHandler,
        AddonModWikiPrefetchHandler,
        AddonModWikiSyncCronHandler
    ]
})
export class AddonModWikiModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModWikiModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModWikiPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModWikiSyncCronHandler, ) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
    }
}
