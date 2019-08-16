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
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { AddonModScormProvider } from './providers/scorm';
import { AddonModScormHelperProvider } from './providers/helper';
import { AddonModScormOfflineProvider } from './providers/scorm-offline';
import { AddonModScormModuleHandler } from './providers/module-handler';
import { AddonModScormPrefetchHandler } from './providers/prefetch-handler';
import { AddonModScormSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModScormIndexLinkHandler } from './providers/index-link-handler';
import { AddonModScormGradeLinkHandler } from './providers/grade-link-handler';
import { AddonModScormListLinkHandler } from './providers/list-link-handler';
import { AddonModScormSyncProvider } from './providers/scorm-sync';
import { AddonModScormComponentsModule } from './components/components.module';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_SCORM_PROVIDERS: any[] = [
    AddonModScormProvider,
    AddonModScormOfflineProvider,
    AddonModScormHelperProvider,
    AddonModScormSyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModScormComponentsModule
    ],
    providers: [
        AddonModScormProvider,
        AddonModScormOfflineProvider,
        AddonModScormHelperProvider,
        AddonModScormSyncProvider,
        AddonModScormModuleHandler,
        AddonModScormPrefetchHandler,
        AddonModScormSyncCronHandler,
        AddonModScormIndexLinkHandler,
        AddonModScormGradeLinkHandler,
        AddonModScormListLinkHandler
    ]
})
export class AddonModScormModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModScormModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModScormPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModScormSyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModScormIndexLinkHandler, gradeHandler: AddonModScormGradeLinkHandler,
            updateManager: CoreUpdateManagerProvider, listLinkHandler: AddonModScormListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(gradeHandler);
        linksDelegate.registerHandler(listLinkHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTablesMigration([
            {
                name: 'mod_scorm_offline_attempts',
                newName: AddonModScormOfflineProvider.ATTEMPTS_TABLE,
                fields: [
                    {
                        name: 'snapshot',
                        type: 'object'
                    },
                    {
                        name: 'scormAndUser',
                        delete: true
                    }
                ]
            },
            {
                name: 'mod_scorm_offline_scos_tracks',
                newName: AddonModScormOfflineProvider.TRACKS_TABLE,
                fields: [
                    {
                        name: 'value',
                        type: 'object'
                    },
                    {
                        name: 'scormUserAttempt',
                        delete: true
                    },
                    {
                        name: 'scormUserAttemptSynced',
                        delete: true
                    }
                ]
            }
        ]);
    }
}
