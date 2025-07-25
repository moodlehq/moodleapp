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
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { ADDON_MOD_DATA_OFFLINE_SITE_SCHEMA } from './services/database/data';
import { getApproveLinkHandlerInstance } from './services/handlers/approve-link';
import { getDeleteLinkHandlerInstance } from './services/handlers/delete-link';
import { getEditLinkHandlerInstance } from './services/handlers/edit-link';
import { AddonModDataIndexLinkHandler } from './services/handlers/index-link';
import { AddonModDataListLinkHandler } from './services/handlers/list-link';
import { AddonModDataModuleHandler } from './services/handlers/module';
import { getPrefetchHandlerInstance } from './services/handlers/prefetch';
import { getShowLinkHandlerInstance } from './services/handlers/show-link';
import { getCronHandlerInstance } from './services/handlers/sync-cron';
import { AddonModDataTagAreaHandler } from './services/handlers/tag-area';
import { AddonModDataFieldModule } from './fields/field.module';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { ADDON_MOD_DATA_COMPONENT_LEGACY, ADDON_MOD_DATA_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

const routes: Routes = [
    {
        path: ADDON_MOD_DATA_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId',
                loadComponent: () => import('./pages/index/index'),
            },
            {
                path: ':courseId/:cmId/edit',
                loadComponent: () => import('./pages/edit/edit'),
                canDeactivate: [canLeaveGuard],
            },
            {
                path: ':courseId/:cmId/edit/:entryId',
                loadComponent: () => import('./pages/edit/edit'),
                canDeactivate: [canLeaveGuard],
            },
            {
                path: ':courseId/:cmId/:entryId',
                loadComponent: () => import('./pages/entry/entry'),
            },
        ],
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModDataFieldModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [ADDON_MOD_DATA_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCourseModulePrefetchDelegate.registerHandler(getPrefetchHandlerInstance());
            CoreCronDelegate.register(getCronHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getApproveLinkHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getDeleteLinkHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getShowLinkHandlerInstance());
            CoreContentLinksDelegate.registerHandler(getEditLinkHandlerInstance());

            CoreCourseModuleDelegate.registerHandler(AddonModDataModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModDataIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModDataListLinkHandler.instance);
            CoreTagAreaDelegate.registerHandler(AddonModDataTagAreaHandler.instance);

            CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_DATA_COMPONENT_LEGACY);
        }),
    ],
})
export class AddonModDataModule {}
