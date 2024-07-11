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
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { OFFLINE_SITE_SCHEMA } from './services/database/wiki';
import { AddonModWikiCreateLinkHandler } from './services/handlers/create-link';
import { AddonModWikiEditLinkHandler } from './services/handlers/edit-link';
import { AddonModWikiIndexLinkHandler } from './services/handlers/index-link';
import { AddonModWikiListLinkHandler } from './services/handlers/list-link';
import { AddonModWikiModuleHandler } from './services/handlers/module';
import { AddonModWikiPageOrMapLinkHandler } from './services/handlers/page-or-map-link';
import { AddonModWikiPrefetchHandler } from './services/handlers/prefetch';
import { AddonModWikiSyncCronHandler } from './services/handlers/sync-cron';
import { AddonModWikiTagAreaHandler } from './services/handlers/tag-area';
import { ADDON_MOD_WIKI_COMPONENT, ADDON_MOD_WIKI_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_MOD_WIKI_PAGE_NAME,
        loadChildren: () => import('./wiki-lazy.module'),
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
                CoreCourseModuleDelegate.registerHandler(AddonModWikiModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModWikiPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModWikiSyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWikiIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWikiListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWikiCreateLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWikiEditLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModWikiPageOrMapLinkHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonModWikiTagAreaHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_WIKI_COMPONENT);
            },
        },
    ],
})
export class AddonModWikiModule {}
