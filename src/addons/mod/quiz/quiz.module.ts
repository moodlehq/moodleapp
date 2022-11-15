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
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModQuizAccessRulesModule } from './accessrules/accessrules.module';
import { AddonModQuizComponentsModule } from './components/components.module';
import { AddonModQuizAccessRuleDelegateService } from './services/access-rules-delegate';
import { SITE_SCHEMA } from './services/database/quiz';
import { AddonModQuizGradeLinkHandler } from './services/handlers/grade-link';
import { AddonModQuizIndexLinkHandler } from './services/handlers/index-link';
import { AddonModQuizListLinkHandler } from './services/handlers/list-link';
import { AddonModQuizModuleHandler, AddonModQuizModuleHandlerService } from './services/handlers/module';
import { AddonModQuizPrefetchHandler } from './services/handlers/prefetch';
import { AddonModQuizPushClickHandler } from './services/handlers/push-click';
import { AddonModQuizReviewLinkHandler } from './services/handlers/review-link';
import { AddonModQuizSyncCronHandler } from './services/handlers/sync-cron';
import { AddonModQuizProvider } from './services/quiz';
import { AddonModQuizHelperProvider } from './services/quiz-helper';
import { AddonModQuizOfflineProvider } from './services/quiz-offline';
import { AddonModQuizSyncProvider } from './services/quiz-sync';

export const ADDON_MOD_QUIZ_SERVICES: Type<unknown>[] = [
    AddonModQuizAccessRuleDelegateService,
    AddonModQuizProvider,
    AddonModQuizOfflineProvider,
    AddonModQuizHelperProvider,
    AddonModQuizSyncProvider,
];

const routes: Routes = [
    {
        path: AddonModQuizModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./quiz-lazy.module').then(m => m.AddonModQuizLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModQuizComponentsModule,
        AddonModQuizAccessRulesModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModQuizModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModQuizPrefetchHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModQuizGradeLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModQuizIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModQuizListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModQuizReviewLinkHandler.instance);
                CorePushNotificationsDelegate.registerClickHandler(AddonModQuizPushClickHandler.instance);
                CoreCronDelegate.register(AddonModQuizSyncCronHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(AddonModQuizProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModQuizModule {}
