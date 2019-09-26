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

import { NgModule } from '@angular/core';
import { AddonModFolderProvider } from './providers/folder';
import { AddonModFolderHelperProvider } from './providers/helper';
import { AddonModFolderModuleHandler } from './providers/module-handler';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { AddonModFolderComponentsModule } from './components/components.module';
import { AddonModFolderPrefetchHandler } from './providers/prefetch-handler';
import { AddonModFolderLinkHandler } from './providers/link-handler';
import { AddonModFolderListLinkHandler } from './providers/list-link-handler';
import { AddonModFolderPluginFileHandler } from './providers/pluginfile-handler';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

// List of providers (without handlers).
export const ADDON_MOD_FOLDER_PROVIDERS: any[] = [
    AddonModFolderProvider,
    AddonModFolderHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModFolderComponentsModule
    ],
    providers: [
        AddonModFolderProvider,
        AddonModFolderHelperProvider,
        AddonModFolderModuleHandler,
        AddonModFolderPrefetchHandler,
        AddonModFolderLinkHandler,
        AddonModFolderListLinkHandler,
        AddonModFolderPluginFileHandler
    ]
})
export class AddonModFolderModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModFolderModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModFolderPrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModFolderLinkHandler,
            pluginfileDelegate: CorePluginFileDelegate, pluginfileHandler: AddonModFolderPluginFileHandler,
            listLinkHandler: AddonModFolderListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        pluginfileDelegate.registerHandler(pluginfileHandler);
    }
}
