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
import { AddonModQuizAccessRuleDelegate } from './providers/access-rules-delegate';
import { AddonModQuizProvider } from './providers/quiz';
import { AddonModQuizOfflineProvider } from './providers/quiz-offline';
import { AddonModQuizHelperProvider } from './providers/helper';
import { AddonModQuizSyncProvider } from './providers/quiz-sync';
import { AddonModQuizModuleHandler } from './providers/module-handler';
import { AddonModQuizPrefetchHandler } from './providers/prefetch-handler';
import { AddonModQuizSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModQuizComponentsModule } from './components/components.module';

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModQuizComponentsModule
    ],
    providers: [
        AddonModQuizAccessRuleDelegate,
        AddonModQuizProvider,
        AddonModQuizOfflineProvider,
        AddonModQuizHelperProvider,
        AddonModQuizSyncProvider,
        AddonModQuizModuleHandler,
        AddonModQuizPrefetchHandler,
        AddonModQuizSyncCronHandler
    ]
})
export class AddonModQuizModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModQuizModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModQuizPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModQuizSyncCronHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
    }
}
