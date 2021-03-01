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
import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { AddonModFolderComponentsModule } from './components/components.module';
import { AddonModFolderProvider } from './services/folder';
import { AddonModFolderHelperProvider } from './services/folder-helper';
import { AddonModFolderIndexLinkHandler } from './services/handlers/index-link';
import { AddonModFolderListLinkHandler } from './services/handlers/list-link';
import { AddonModFolderModuleHandler, AddonModFolderModuleHandlerService } from './services/handlers/module';
import { AddonModFolderPluginFileHandler } from './services/handlers/pluginfile';
import { AddonModFolderPrefetchHandler } from './services/handlers/prefetch';

export const ADDON_MOD_FOLDER_SERVICES: Type<unknown>[] = [
    AddonModFolderProvider,
    AddonModFolderHelperProvider,
];

const routes: Routes = [
    {
        path: AddonModFolderModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./folder-lazy.module').then(m => m.AddonModFolderLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModFolderComponentsModule,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreCourseModuleDelegate.registerHandler(AddonModFolderModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModFolderIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModFolderListLinkHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModFolderPrefetchHandler.instance);
                CorePluginFileDelegate.registerHandler(AddonModFolderPluginFileHandler.instance);
            },
        },
    ],
})
export class AddonModFolderModule {}
