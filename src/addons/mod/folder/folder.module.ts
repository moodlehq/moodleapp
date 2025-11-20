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
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { AddonModFolderIndexLinkHandler } from './services/handlers/index-link';
import { AddonModFolderListLinkHandler } from './services/handlers/list-link';
import { AddonModFolderModuleHandler } from './services/handlers/module';
import { AddonModFolderPluginFileHandler } from './services/handlers/pluginfile';
import { AddonModFolderPrefetchHandler } from './services/handlers/prefetch';
import { ADDON_MOD_FOLDER_PAGE_NAME } from './constants';

const routes: Routes = [
    {
        path: ADDON_MOD_FOLDER_PAGE_NAME,
        loadChildren: () => [
            {
                path: ':courseId/:cmId/:hash',
                loadComponent: () => import('./pages/index/index'),
            },
            {
                path: ':courseId/:cmId',
                redirectTo: ':courseId/:cmId/', // Fake "hash".
                pathMatch: 'full',
            },
        ],
        data: { checkForcedLanguage: 'module' },
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModFolderModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModFolderIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModFolderListLinkHandler.instance);
            CoreCourseModulePrefetchDelegate.registerHandler(AddonModFolderPrefetchHandler.instance);
            CorePluginFileDelegate.registerHandler(AddonModFolderPluginFileHandler.instance);
        }),
    ],
})
export class AddonModFolderModule {}
