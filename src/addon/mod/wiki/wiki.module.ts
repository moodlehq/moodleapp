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
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { AddonModWikiComponentsModule } from './components/components.module';
import { AddonModWikiProvider } from './providers/wiki';
import { AddonModWikiOfflineProvider } from './providers/wiki-offline';
import { AddonModWikiSyncProvider } from './providers/wiki-sync';
import { AddonModWikiModuleHandler } from './providers/module-handler';
import { AddonModWikiPrefetchHandler } from './providers/prefetch-handler';
import { AddonModWikiSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModWikiIndexLinkHandler } from './providers/index-link-handler';
import { AddonModWikiPageOrMapLinkHandler } from './providers/page-or-map-link-handler';
import { AddonModWikiCreateLinkHandler } from './providers/create-link-handler';
import { AddonModWikiEditLinkHandler } from './providers/edit-link-handler';
import { AddonModWikiListLinkHandler } from './providers/list-link-handler';
import { AddonModWikiTagAreaHandler } from './providers/tag-area-handler';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_WIKI_PROVIDERS: any[] = [
    AddonModWikiProvider,
    AddonModWikiOfflineProvider,
    AddonModWikiSyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModWikiComponentsModule
    ],
    providers: [
        AddonModWikiProvider,
        AddonModWikiOfflineProvider,
        AddonModWikiSyncProvider,
        AddonModWikiModuleHandler,
        AddonModWikiPrefetchHandler,
        AddonModWikiSyncCronHandler,
        AddonModWikiIndexLinkHandler,
        AddonModWikiPageOrMapLinkHandler,
        AddonModWikiCreateLinkHandler,
        AddonModWikiEditLinkHandler,
        AddonModWikiListLinkHandler,
        AddonModWikiTagAreaHandler
    ]
})
export class AddonModWikiModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModWikiModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModWikiPrefetchHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModWikiSyncCronHandler, linksDelegate: CoreContentLinksDelegate,
            indexHandler: AddonModWikiIndexLinkHandler, pageOrMapHandler: AddonModWikiPageOrMapLinkHandler,
            createHandler: AddonModWikiCreateLinkHandler, editHandler: AddonModWikiEditLinkHandler,
            updateManager: CoreUpdateManagerProvider, listLinkHandler: AddonModWikiListLinkHandler,
            tagAreaDelegate: CoreTagAreaDelegate, tagAreaHandler: AddonModWikiTagAreaHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        cronDelegate.register(syncHandler);
        linksDelegate.registerHandler(indexHandler);
        linksDelegate.registerHandler(pageOrMapHandler);
        linksDelegate.registerHandler(createHandler);
        linksDelegate.registerHandler(editHandler);
        linksDelegate.registerHandler(listLinkHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_mod_wiki_new_pages_store',
            newName: AddonModWikiOfflineProvider.NEW_PAGES_TABLE,
            fields: [
                {
                    name: 'subwikiWikiUserGroup',
                    delete: true
                },
                {
                    name: 'caneditpage',
                    type: 'boolean'
                }
            ]
        });
    }
}
