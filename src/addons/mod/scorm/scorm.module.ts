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
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModScormComponentsModule } from './components/components.module';
import { OFFLINE_SITE_SCHEMA } from './services/database/scorm';
import { AddonModScormGradeLinkHandler } from './services/handlers/grade-link';
import { AddonModScormIndexLinkHandler } from './services/handlers/index-link';
import { AddonModScormListLinkHandler } from './services/handlers/list-link';
import { AddonModScormModuleHandler, AddonModScormModuleHandlerService } from './services/handlers/module';
import { AddonModScormPlayerLinkHandler } from './services/handlers/player-link';
import { AddonModScormPluginFileHandler } from './services/handlers/pluginfile';
import { AddonModScormPrefetchHandler } from './services/handlers/prefetch';
import { AddonModScormSyncCronHandler } from './services/handlers/sync-cron';
import { AddonModScormProvider } from './services/scorm';
import { AddonModScormHelperProvider } from './services/scorm-helper';
import { AddonModScormOfflineProvider } from './services/scorm-offline';
import { AddonModScormSyncProvider } from './services/scorm-sync';

export const ADDON_MOD_SCORM_SERVICES: Type<unknown>[] = [
    AddonModScormProvider,
    AddonModScormOfflineProvider,
    AddonModScormHelperProvider,
    AddonModScormSyncProvider,
];

const routes: Routes = [
    {
        path: AddonModScormModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./scorm-lazy.module').then(m => m.AddonModScormLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModScormComponentsModule,
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
                CoreCourseModuleDelegate.registerHandler(AddonModScormModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModScormPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModScormSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModScormGradeLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModScormIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModScormListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModScormPlayerLinkHandler.instance);
                CorePluginFileDelegate.registerHandler(AddonModScormPluginFileHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(AddonModScormProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModScormModule {}
