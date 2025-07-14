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
import { AddonModBookModuleHandler } from './services/handlers/module';
import { AddonModBookIndexLinkHandler } from './services/handlers/index-link';
import { AddonModBookListLinkHandler } from './services/handlers/list-link';
import { AddonModBookPrefetchHandler } from './services/handlers/prefetch';
import { AddonModBookTagAreaHandler } from './services/handlers/tag-area';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { BOOK_SITE_SCHEMA } from './services/database/book';
import { ADDON_MOD_BOOK_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_MOD_BOOK_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId',
                loadComponent: () => import('./pages/index/index'),
            },
            {
                path: ':courseId/:cmId/contents',
                loadComponent: () => import('./pages/contents/contents'),
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
            useValue: [BOOK_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModBookModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModBookIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModBookListLinkHandler.instance);
            CoreCourseModulePrefetchDelegate.registerHandler(AddonModBookPrefetchHandler.instance);
            CoreTagAreaDelegate.registerHandler(AddonModBookTagAreaHandler.instance);
        }),
    ],
})
export class AddonModBookModule {}
