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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModDataProvider } from './services/data';
import { ADDON_MOD_DATA_OFFLINE_SITE_SCHEMA } from './services/database/data';
import { AddonModDataApproveLinkHandler } from './services/handlers/approve-link';
import { AddonModDataDeleteLinkHandler } from './services/handlers/delete-link';
import { AddonModDataEditLinkHandler } from './services/handlers/edit-link';
import { AddonModDataIndexLinkHandler } from './services/handlers/index-link';
import { AddonModDataListLinkHandler } from './services/handlers/list-link';
import { AddonModDataModuleHandler, AddonModDataModuleHandlerService } from './services/handlers/module';
import { AddonModDataPrefetchHandler } from './services/handlers/prefetch';
import { AddonModDataShowLinkHandler } from './services/handlers/show-link';
import { AddonModDataSyncCronHandler } from './services/handlers/sync-cron';
import { AddonModDataTagAreaHandler } from './services/handlers/tag-area';
import { AddonModDataFieldModule } from './fields/field.module';
import { AddonModDataComponentsModule } from './components/components.module';
import { CoreCourseHelper } from '@features/course/services/course-helper';

/**
 * Get mod data services.
 *
 * @returns Returns mod data services.
 */
export async function getModDataServices(): Promise<Type<unknown>[]> {
    const { AddonModDataProvider } = await import('@addons/mod/data/services/data');
    const { AddonModDataOfflineProvider } = await import('@addons/mod/data/services/data-offline');
    const { AddonModDataSyncProvider } = await import('@addons/mod/data/services/data-sync');
    const { AddonModDataHelperProvider } = await import('@addons/mod/data/services/data-helper');
    const { AddonModDataFieldsDelegateService } = await import('@addons/mod/data/services/data-fields-delegate');

    return [
        AddonModDataProvider,
        AddonModDataHelperProvider,
        AddonModDataSyncProvider,
        AddonModDataOfflineProvider,
        AddonModDataFieldsDelegateService,
    ];
}

const routes: Routes = [
    {
        path: AddonModDataModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./data-lazy.module').then(m => m.AddonModDataLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModDataFieldModule,
        AddonModDataComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [ADDON_MOD_DATA_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModDataModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModDataPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModDataSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataApproveLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataDeleteLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataShowLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModDataEditLinkHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonModDataTagAreaHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(AddonModDataProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModDataModule {}
