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
import { AddonModWorkshopAssessmentStrategyModule } from './assessment/assessment.module';
import { AddonModWorkshopComponentsModule } from './components/components.module';
import { AddonModWorkshopModuleHandler } from './providers/module-handler';
import { AddonModWorkshopProvider } from './providers/workshop';
import { AddonModWorkshopLinkHandler } from './providers/link-handler';
import { AddonModWorkshopListLinkHandler } from './providers/list-link-handler';
import { AddonModWorkshopOfflineProvider } from './providers/offline';
import { AddonModWorkshopSyncProvider } from './providers/sync';
import { AddonModWorkshopHelperProvider } from './providers/helper';
import { AddonWorkshopAssessmentStrategyDelegate } from './providers/assessment-strategy-delegate';
import { AddonModWorkshopPrefetchHandler } from './providers/prefetch-handler';
import { AddonModWorkshopSyncCronHandler } from './providers/sync-cron-handler';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_WORKSHOP_PROVIDERS: any[] = [
    AddonModWorkshopProvider,
    AddonModWorkshopOfflineProvider,
    AddonModWorkshopSyncProvider,
    AddonModWorkshopHelperProvider,
    AddonWorkshopAssessmentStrategyDelegate
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModWorkshopComponentsModule,
        AddonModWorkshopAssessmentStrategyModule
    ],
    providers: [
        AddonModWorkshopProvider,
        AddonModWorkshopModuleHandler,
        AddonModWorkshopLinkHandler,
        AddonModWorkshopListLinkHandler,
        AddonModWorkshopOfflineProvider,
        AddonModWorkshopSyncProvider,
        AddonModWorkshopHelperProvider,
        AddonWorkshopAssessmentStrategyDelegate,
        AddonModWorkshopPrefetchHandler,
        AddonModWorkshopSyncCronHandler
    ]
})
export class AddonModWorkshopModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModWorkshopModuleHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModWorkshopLinkHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModWorkshopPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModWorkshopSyncCronHandler,
            updateManager: CoreUpdateManagerProvider, listLinkHandler: AddonModWorkshopListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTablesMigration([
            {
                name: 'mma_mod_workshop_offline_submissions',
                newName: AddonModWorkshopOfflineProvider.SUBMISSIONS_TABLE,
                fields: [
                    {
                        name: 'attachmentsid',
                        type: 'object'
                    }
                ]
            },
            {
                name: 'mma_mod_workshop_offline_assessments',
                newName: AddonModWorkshopOfflineProvider.ASSESSMENTS_TABLE,
                fields: [
                    {
                        name: 'inputdata',
                        type: 'object'
                    }
                ]
            },
            {
                name: 'mma_mod_workshop_offline_evaluate_submissions',
                newName: AddonModWorkshopOfflineProvider.EVALUATE_SUBMISSIONS_TABLE,
                fields: [
                    {
                        name: 'gradeover',
                        type: 'object'
                    },
                    {
                        name: 'published',
                        type: 'boolean'
                    }
                ]
            },
            {
                name: 'mma_mod_workshop_offline_evaluate_assessments',
                newName: AddonModWorkshopOfflineProvider.EVALUATE_ASSESSMENTS_TABLE,
                fields: [
                    {
                        name: 'gradinggradeover',
                        type: 'object'
                    }
                ]
            }
        ]);
    }
}
