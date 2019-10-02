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
import { AddonModSurveyComponentsModule } from './components/components.module';
import { AddonModSurveyModuleHandler } from './providers/module-handler';
import { AddonModSurveyProvider } from './providers/survey';
import { AddonModSurveyLinkHandler } from './providers/link-handler';
import { AddonModSurveyListLinkHandler } from './providers/list-link-handler';
import { AddonModSurveyHelperProvider } from './providers/helper';
import { AddonModSurveyPrefetchHandler } from './providers/prefetch-handler';
import { AddonModSurveySyncProvider } from './providers/sync';
import { AddonModSurveySyncCronHandler } from './providers/sync-cron-handler';
import { AddonModSurveyOfflineProvider } from './providers/offline';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_SURVEY_PROVIDERS: any[] = [
    AddonModSurveyProvider,
    AddonModSurveyHelperProvider,
    AddonModSurveySyncProvider,
    AddonModSurveyOfflineProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModSurveyComponentsModule
    ],
    providers: [
        AddonModSurveyProvider,
        AddonModSurveyHelperProvider,
        AddonModSurveySyncProvider,
        AddonModSurveyOfflineProvider,
        AddonModSurveyModuleHandler,
        AddonModSurveyPrefetchHandler,
        AddonModSurveyLinkHandler,
        AddonModSurveyListLinkHandler,
        AddonModSurveySyncCronHandler
    ]
})
export class AddonModSurveyModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModSurveyModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModSurveyPrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModSurveyLinkHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModSurveySyncCronHandler, updateManager: CoreUpdateManagerProvider,
            listLinkHandler: AddonModSurveyListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        cronDelegate.register(syncHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_mod_survey_answers',
            newName: AddonModSurveyOfflineProvider.SURVEY_TABLE,
            fields: [
                {
                    name: 'answers',
                    type: 'object'
                }
            ]
        });
    }
}
