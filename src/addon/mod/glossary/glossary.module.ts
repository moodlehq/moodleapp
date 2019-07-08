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
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { AddonModGlossaryProvider } from './providers/glossary';
import { AddonModGlossaryOfflineProvider } from './providers/offline';
import { AddonModGlossaryHelperProvider } from './providers/helper';
import { AddonModGlossarySyncProvider } from './providers/sync';
import { AddonModGlossaryModuleHandler } from './providers/module-handler';
import { AddonModGlossaryPrefetchHandler } from './providers/prefetch-handler';
import { AddonModGlossarySyncCronHandler } from './providers/sync-cron-handler';
import { AddonModGlossaryIndexLinkHandler } from './providers/index-link-handler';
import { AddonModGlossaryEntryLinkHandler } from './providers/entry-link-handler';
import { AddonModGlossaryListLinkHandler } from './providers/list-link-handler';
import { AddonModGlossaryEditLinkHandler } from './providers/edit-link-handler';
import { AddonModGlossaryTagAreaHandler } from './providers/tag-area-handler';
import { AddonModGlossaryComponentsModule } from './components/components.module';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_GLOSSARY_PROVIDERS: any[] = [
    AddonModGlossaryProvider,
    AddonModGlossaryOfflineProvider,
    AddonModGlossaryHelperProvider,
    AddonModGlossarySyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModGlossaryComponentsModule,
    ],
    providers: [
        AddonModGlossaryProvider,
        AddonModGlossaryOfflineProvider,
        AddonModGlossaryHelperProvider,
        AddonModGlossarySyncProvider,
        AddonModGlossaryModuleHandler,
        AddonModGlossaryPrefetchHandler,
        AddonModGlossarySyncCronHandler,
        AddonModGlossaryIndexLinkHandler,
        AddonModGlossaryEntryLinkHandler,
        AddonModGlossaryListLinkHandler,
        AddonModGlossaryEditLinkHandler,
        AddonModGlossaryTagAreaHandler
    ]
})
export class AddonModGlossaryModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModGlossaryModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModGlossaryPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModGlossarySyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModGlossaryIndexLinkHandler, discussionHandler: AddonModGlossaryEntryLinkHandler,
            updateManager: CoreUpdateManagerProvider, listLinkHandler: AddonModGlossaryListLinkHandler,
            editLinkHandler: AddonModGlossaryEditLinkHandler, tagAreaDelegate: CoreTagAreaDelegate,
            tagAreaHandler: AddonModGlossaryTagAreaHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(discussionHandler);
        linksDelegate.registerHandler(listLinkHandler);
        linksDelegate.registerHandler(editLinkHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_mod_glossary_add_entry',
            newName: AddonModGlossaryOfflineProvider.ENTRIES_TABLE,
            fields: [
                {
                    name: 'glossaryAndConcept',
                    delete: true
                },
                {
                    name: 'glossaryAndUser',
                    delete: true
                },
                {
                    name: 'options',
                    type: 'object'
                },
                {
                    name: 'attachments',
                    type: 'object'
                }
            ]
        });
    }
}
