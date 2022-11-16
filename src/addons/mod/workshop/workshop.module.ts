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
import { AddonModWorkshopAssessmentStrategyModule } from './assessment/assessment.module';
import { AddonModWorkshopComponentsModule } from './components/components.module';
import { AddonWorkshopAssessmentStrategyDelegateService } from './services/assessment-strategy-delegate';
import { ADDON_MOD_WORKSHOP_OFFLINE_SITE_SCHEMA } from './services/database/workshop';
import { AddonModWorkshopIndexLinkHandler } from './services/handlers/index-link';
import { AddonModWorkshopListLinkHandler } from './services/handlers/list-link';
import { AddonModWorkshopModuleHandler, AddonModWorkshopModuleHandlerService } from './services/handlers/module';
import { AddonModWorkshopPrefetchHandler } from './services/handlers/prefetch';
import { AddonModWorkshopSyncCronHandler } from './services/handlers/sync-cron';
import { AddonModWorkshopProvider } from './services/workshop';
import { AddonModWorkshopHelperProvider } from './services/workshop-helper';
import { AddonModWorkshopOfflineProvider } from './services/workshop-offline';
import { AddonModWorkshopSyncProvider } from './services/workshop-sync';

// List of providers (without handlers).
export const ADDON_MOD_WORKSHOP_SERVICES: Type<unknown>[] = [
    AddonModWorkshopProvider,
    AddonModWorkshopOfflineProvider,
    AddonModWorkshopSyncProvider,
    AddonModWorkshopHelperProvider,
    AddonWorkshopAssessmentStrategyDelegateService,
];

const routes: Routes = [
    {
        path: AddonModWorkshopModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./workshop-lazy.module').then(m => m.AddonModWorkshopLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModWorkshopComponentsModule,
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
                CoreCourseModuleDelegate.registerHandler(AddonModWorkshopModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModWorkshopPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModWorkshopSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWorkshopIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWorkshopListLinkHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(AddonModWorkshopProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModWorkshopModule {}
