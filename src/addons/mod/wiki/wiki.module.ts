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

import { NgModule, provideAppInitializer } from '@angular/core';
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
import { getCreateLinkHandlerInstance } from './services/handlers/create-link';
import { getEditLinkHandlerInstance } from './services/handlers/edit-link';
import { AddonModWikiIndexLinkHandler } from './services/handlers/index-link';
import { AddonModWikiListLinkHandler } from './services/handlers/list-link';
import { AddonModWikiModuleHandler } from './services/handlers/module';
import { getPageOrMapLinkHandlerInstance } from './services/handlers/page-or-map-link';
import { getPrefetchHandlerInstance } from './services/handlers/prefetch';
import { getCronHandlerInstance } from './services/handlers/sync-cron';
import { AddonModWikiTagAreaHandler } from './services/handlers/tag-area';
import { ADDON_MOD_WIKI_COMPONENT_LEGACY, ADDON_MOD_WIKI_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

const routes: Routes = [
    {
        path: ADDON_MOD_WIKI_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId',
                redirectTo: ':courseId/:cmId/page/root',
            },
            {
                path: ':courseId/:cmId/page/:hash',
                loadComponent: () => import('./pages/index/index'),
            },
            {
                path: ':courseId/:cmId/edit',
                loadComponent: () => import('./pages/edit/edit'),
                canDeactivate: [canLeaveGuard],
            },
        ],
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
        provideAppInitializer(() => {
            CoreContentLinksDelegate.registerHandler(getCreateLinkHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getEditLinkHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getPageOrMapLinkHandlerInstance());
            CoreCourseModulePrefetchDelegate.registerHandler(getPrefetchHandlerInstance());
            CoreCronDelegate.register(getCronHandlerInstance());

            CoreCourseModuleDelegate.registerHandler(AddonModWikiModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModWikiIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModWikiListLinkHandler.instance);
            CoreTagAreaDelegate.registerHandler(AddonModWikiTagAreaHandler.instance);

            CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_WIKI_COMPONENT_LEGACY);
        }),
    ],
})
export class AddonModWikiModule {}
