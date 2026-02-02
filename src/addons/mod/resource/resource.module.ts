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
import { AddonModResourceIndexLinkHandler } from './services/handlers/index-link';
import { AddonModResourceListLinkHandler } from './services/handlers/list-link';
import { AddonModResourceModuleHandler } from './services/handlers/module';
import { AddonModResourcePluginFileHandler } from './services/handlers/pluginfile';
import { AddonModResourcePrefetchHandler } from './services/handlers/prefetch';
import { ADDON_MOD_RESOURCE_PAGE_NAME } from './constants';
import { CoreCourseForceLanguageSource } from '@features/course/constants';

const routes: Routes = [
    {
        path: `${ADDON_MOD_RESOURCE_PAGE_NAME}/:courseId/:cmId`,
        loadComponent: () => import('./pages/index/index'),
        data: { checkForcedLanguage: CoreCourseForceLanguageSource.MODULE },
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModResourceModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModResourceIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModResourceListLinkHandler.instance);
            CoreCourseModulePrefetchDelegate.registerHandler(AddonModResourcePrefetchHandler.instance);
            CorePluginFileDelegate.registerHandler(AddonModResourcePluginFileHandler.instance);
        }),
    ],
})
export class AddonModResourceModule {}
