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
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModSurveyComponentsModule } from './components/components.module';
import { ADDON_MOD_SURVEY_OFFLINE_SITE_SCHEMA } from './services/database/survey';
import { AddonModSurveyIndexLinkHandler } from './services/handlers/index-link';
import { AddonModSurveyListLinkHandler } from './services/handlers/list-link';
import { AddonModSurveyModuleHandler, AddonModSurveyModuleHandlerService } from './services/handlers/module';
import { AddonModSurveyPrefetchHandler } from './services/handlers/prefetch';
import { AddonModSurveySyncCronHandler } from './services/handlers/sync-cron';
import { AddonModSurveyProvider } from './services/survey';
import { AddonModSurveyHelperProvider } from './services/survey-helper';
import { AddonModSurveyOfflineProvider } from './services/survey-offline';
import { AddonModSurveySyncProvider } from './services/survey-sync';

// List of providers (without handlers).
export const ADDON_MOD_SURVEY_SERVICES: Type<unknown>[] = [
    AddonModSurveyProvider,
    AddonModSurveyHelperProvider,
    AddonModSurveySyncProvider,
    AddonModSurveyOfflineProvider,
];

const routes: Routes = [
    {
        path: AddonModSurveyModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./survey-lazy.module').then(m => m.AddonModSurveyLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModSurveyComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [ADDON_MOD_SURVEY_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreCourseModuleDelegate.registerHandler(AddonModSurveyModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModSurveyPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModSurveySyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModSurveyIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModSurveyListLinkHandler.instance);
            },
        },
    ],
})
export class AddonModSurveyModule {}
