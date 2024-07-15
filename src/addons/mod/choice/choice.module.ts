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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { OFFLINE_SITE_SCHEMA } from './services/database/choice';
import { AddonModChoiceIndexLinkHandler } from './services/handlers/index-link';
import { AddonModChoiceListLinkHandler } from './services/handlers/list-link';
import { AddonModChoiceModuleHandler } from './services/handlers/module';
import { AddonModChoicePrefetchHandler } from './services/handlers/prefetch';
import { AddonModChoiceSyncCronHandler } from './services/handlers/sync-cron';
import { ADDON_MOD_CHOICE_COMPONENT, ADDON_MOD_CHOICE_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_MOD_CHOICE_PAGE_NAME,
        loadChildren: () => import('./choice-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModChoiceModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModChoicePrefetchHandler.instance);
                CoreCronDelegate.register(AddonModChoiceSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChoiceIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChoiceListLinkHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_CHOICE_COMPONENT);
            },
        },
    ],
})
export class AddonModChoiceModule {}
