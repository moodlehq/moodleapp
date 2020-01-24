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
import { AddonModChoiceComponentsModule } from './components/components.module';
import { AddonModChoiceModuleHandler } from './providers/module-handler';
import { AddonModChoiceProvider } from './providers/choice';
import { AddonModChoiceLinkHandler } from './providers/link-handler';
import { AddonModChoiceListLinkHandler } from './providers/list-link-handler';
import { AddonModChoicePrefetchHandler } from './providers/prefetch-handler';
import { AddonModChoiceSyncProvider } from './providers/sync';
import { AddonModChoiceSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModChoiceOfflineProvider } from './providers/offline';

// List of providers (without handlers).
export const ADDON_MOD_CHOICE_PROVIDERS: any[] = [
    AddonModChoiceProvider,
    AddonModChoiceSyncProvider,
    AddonModChoiceOfflineProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModChoiceComponentsModule
    ],
    providers: [
        AddonModChoiceProvider,
        AddonModChoiceSyncProvider,
        AddonModChoiceOfflineProvider,
        AddonModChoiceModuleHandler,
        AddonModChoicePrefetchHandler,
        AddonModChoiceLinkHandler,
        AddonModChoiceListLinkHandler,
        AddonModChoiceSyncCronHandler
    ]
})
export class AddonModChoiceModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModChoiceModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModChoicePrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModChoiceLinkHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModChoiceSyncCronHandler,
            listLinkHandler: AddonModChoiceListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        cronDelegate.register(syncHandler);
    }
}
