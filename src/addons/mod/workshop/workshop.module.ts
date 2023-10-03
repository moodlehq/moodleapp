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
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModWorkshopAssessmentStrategyModule } from '@addons/mod/workshop/assessment/assessment.module';
import { ADDON_MOD_WORKSHOP_OFFLINE_SITE_SCHEMA } from './services/database/workshop';
import { AddonModWorkshopIndexLinkHandler } from './services/handlers/index-link';
import { AddonModWorkshopListLinkHandler } from './services/handlers/list-link';
import { AddonModWorkshopModuleHandler } from './services/handlers/module';
import { ADDON_MOD_WORKSHOP_COMPONENT, ADDON_MOD_WORKSHOP_PAGE_NAME } from '@addons/mod/workshop/constants';
import { AddonModWorkshopPrefetchHandler } from '@addons/mod/workshop/services/handlers/prefetch-lazy';
import { AddonModWorkshopSyncCronHandler } from '@addons/mod/workshop/services/handlers/sync-cron-lazy';

/**
 * Get workshop services.
 *
 * @returns Workshop services.
 */
export async function getWorkshopServices(): Promise<Type<unknown>[]> {
    const { AddonModWorkshopProvider } = await import('@addons/mod/workshop/services/workshop');
    const { AddonModWorkshopOfflineProvider } = await import('@addons/mod/workshop/services/workshop-offline');
    const { AddonModWorkshopSyncProvider } = await import('@addons/mod/workshop/services/workshop-sync');
    const { AddonModWorkshopHelperProvider } = await import('@addons/mod/workshop/services/workshop-helper');
    const { AddonWorkshopAssessmentStrategyDelegateService } =
        await import('@addons/mod/workshop/services/assessment-strategy-delegate');

    return [
        AddonModWorkshopProvider,
        AddonModWorkshopOfflineProvider,
        AddonModWorkshopSyncProvider,
        AddonModWorkshopHelperProvider,
        AddonWorkshopAssessmentStrategyDelegateService,
    ];
}

/**
 * Get workshop component modules.
 *
 * @returns Workshop component modules.
 */
export async function getWorkshopComponentModules(): Promise<unknown[]> {
    const { AddonModWorkshopComponentsModule } = await import('@addons/mod/workshop/components/components.module');

    return [AddonModWorkshopComponentsModule];
}

const routes: Routes = [
    {
        path: ADDON_MOD_WORKSHOP_PAGE_NAME,
        loadChildren: () => import('./workshop-lazy.module').then(m => m.AddonModWorkshopLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModWorkshopAssessmentStrategyModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [ADDON_MOD_WORKSHOP_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                // TODO use async instances
                // CoreCourseModulePrefetchDelegate.registerHandler(getPrefetchHandlerInstance());
                // CoreCronDelegate.register(getCronHandlerInstance());

                CoreCourseModuleDelegate.registerHandler(AddonModWorkshopModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModWorkshopPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModWorkshopSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWorkshopIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWorkshopListLinkHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_WORKSHOP_COMPONENT);
            },
        },
    ],
})
export class AddonModWorkshopModule {}
