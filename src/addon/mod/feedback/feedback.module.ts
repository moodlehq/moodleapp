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
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';
import { AddonModFeedbackComponentsModule } from './components/components.module';
import { AddonModFeedbackModuleHandler } from './providers/module-handler';
import { AddonModFeedbackProvider } from './providers/feedback';
import { AddonModFeedbackLinkHandler } from './providers/link-handler';
import { AddonModFeedbackAnalysisLinkHandler } from './providers/analysis-link-handler';
import { AddonModFeedbackShowEntriesLinkHandler } from './providers/show-entries-link-handler';
import { AddonModFeedbackShowNonRespondentsLinkHandler } from './providers/show-non-respondents-link-handler';
import { AddonModFeedbackCompleteLinkHandler } from './providers/complete-link-handler';
import { AddonModFeedbackPrintLinkHandler } from './providers/print-link-handler';
import { AddonModFeedbackListLinkHandler } from './providers/list-link-handler';
import { AddonModFeedbackHelperProvider } from './providers/helper';
import { AddonModFeedbackPrefetchHandler } from './providers/prefetch-handler';
import { AddonModFeedbackPushClickHandler } from './providers/push-click-handler';
import { AddonModFeedbackSyncProvider } from './providers/sync';
import { AddonModFeedbackSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModFeedbackOfflineProvider } from './providers/offline';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_FEEDBACK_PROVIDERS: any[] = [
    AddonModFeedbackProvider,
    AddonModFeedbackHelperProvider,
    AddonModFeedbackSyncProvider,
    AddonModFeedbackOfflineProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModFeedbackComponentsModule
    ],
    providers: [
        AddonModFeedbackProvider,
        AddonModFeedbackHelperProvider,
        AddonModFeedbackSyncProvider,
        AddonModFeedbackOfflineProvider,
        AddonModFeedbackModuleHandler,
        AddonModFeedbackPrefetchHandler,
        AddonModFeedbackLinkHandler,
        AddonModFeedbackAnalysisLinkHandler,
        AddonModFeedbackShowEntriesLinkHandler,
        AddonModFeedbackShowNonRespondentsLinkHandler,
        AddonModFeedbackCompleteLinkHandler,
        AddonModFeedbackPrintLinkHandler,
        AddonModFeedbackListLinkHandler,
        AddonModFeedbackSyncCronHandler,
        AddonModFeedbackPushClickHandler
    ]
})
export class AddonModFeedbackModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModFeedbackModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModFeedbackPrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModFeedbackLinkHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModFeedbackSyncCronHandler,
            analysisLinkHandler: AddonModFeedbackAnalysisLinkHandler, updateManager: CoreUpdateManagerProvider,
            showEntriesLinkHandler: AddonModFeedbackShowEntriesLinkHandler,
            showNonRespondentsLinkHandler: AddonModFeedbackShowNonRespondentsLinkHandler,
            completeLinkHandler: AddonModFeedbackCompleteLinkHandler,
            printLinkHandler: AddonModFeedbackPrintLinkHandler, listLinkHandler: AddonModFeedbackListLinkHandler,
            pushNotificationsDelegate: CorePushNotificationsDelegate, pushClickHandler: AddonModFeedbackPushClickHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(analysisLinkHandler);
        contentLinksDelegate.registerHandler(showEntriesLinkHandler);
        contentLinksDelegate.registerHandler(showNonRespondentsLinkHandler);
        contentLinksDelegate.registerHandler(completeLinkHandler);
        contentLinksDelegate.registerHandler(printLinkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        cronDelegate.register(syncHandler);
        pushNotificationsDelegate.registerClickHandler(pushClickHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_mod_feedback_responses',
            newName: AddonModFeedbackOfflineProvider.FEEDBACK_TABLE,
            fields: [
                {
                    name: 'responses',
                    type: 'object'
                }
            ]
        });
    }
}
