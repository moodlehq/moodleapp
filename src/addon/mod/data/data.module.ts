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
import { AddonModDataComponentsModule } from './components/components.module';
import { AddonModDataModuleHandler } from './providers/module-handler';
import { AddonModDataProvider } from './providers/data';
import { AddonModDataLinkHandler } from './providers/link-handler';
import { AddonModDataApproveLinkHandler } from './providers/approve-link-handler';
import { AddonModDataDeleteLinkHandler } from './providers/delete-link-handler';
import { AddonModDataShowLinkHandler } from './providers/show-link-handler';
import { AddonModDataEditLinkHandler } from './providers/edit-link-handler';
import { AddonModDataListLinkHandler } from './providers/list-link-handler';
import { AddonModDataHelperProvider } from './providers/helper';
import { AddonModDataPrefetchHandler } from './providers/prefetch-handler';
import { AddonModDataSyncProvider } from './providers/sync';
import { AddonModDataSyncCronHandler } from './providers/sync-cron-handler';
import { AddonModDataOfflineProvider } from './providers/offline';
import { AddonModDataFieldsDelegate } from './providers/fields-delegate';
import { AddonModDataDefaultFieldHandler } from './providers/default-field-handler';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { AddonModDataTagAreaHandler } from './providers/tag-area-handler';
import { AddonModDataFieldModule } from './fields/field.module';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_MOD_DATA_PROVIDERS: any[] = [
    AddonModDataProvider,
    AddonModDataHelperProvider,
    AddonModDataSyncProvider,
    AddonModDataOfflineProvider,
    AddonModDataFieldsDelegate
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModDataComponentsModule,
        AddonModDataFieldModule
    ],
    providers: [
        AddonModDataProvider,
        AddonModDataHelperProvider,
        AddonModDataSyncProvider,
        AddonModDataOfflineProvider,
        AddonModDataFieldsDelegate,
        AddonModDataModuleHandler,
        AddonModDataPrefetchHandler,
        AddonModDataLinkHandler,
        AddonModDataApproveLinkHandler,
        AddonModDataDeleteLinkHandler,
        AddonModDataShowLinkHandler,
        AddonModDataEditLinkHandler,
        AddonModDataListLinkHandler,
        AddonModDataSyncCronHandler,
        AddonModDataDefaultFieldHandler,
        AddonModDataTagAreaHandler
    ]
})
export class AddonModDataModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModDataModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModDataPrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModDataLinkHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonModDataSyncCronHandler, updateManager: CoreUpdateManagerProvider,
            approveLinkHandler: AddonModDataApproveLinkHandler, deleteLinkHandler: AddonModDataDeleteLinkHandler,
            showLinkHandler: AddonModDataShowLinkHandler, editLinkHandler: AddonModDataEditLinkHandler,
            listLinkHandler: AddonModDataListLinkHandler, tagAreaDelegate: CoreTagAreaDelegate,
            tagAreaHandler: AddonModDataTagAreaHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(approveLinkHandler);
        contentLinksDelegate.registerHandler(deleteLinkHandler);
        contentLinksDelegate.registerHandler(showLinkHandler);
        contentLinksDelegate.registerHandler(editLinkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        cronDelegate.register(syncHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_mod_data_entry',
            newName: AddonModDataOfflineProvider.DATA_ENTRY_TABLE,
            fields: [
                {
                    name: 'fields',
                    type: 'object'
                },
                {
                    name: 'dataAndEntry',
                    delete: true
                }
            ]
        });
    }
}
