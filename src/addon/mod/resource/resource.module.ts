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
import { AddonModResourceComponentsModule } from './components/components.module';
import { AddonModResourceModuleHandler } from './providers/module-handler';
import { AddonModResourceProvider } from './providers/resource';
import { AddonModResourcePrefetchHandler } from './providers/prefetch-handler';
import { AddonModResourceLinkHandler } from './providers/link-handler';
import { AddonModResourceListLinkHandler } from './providers/list-link-handler';
import { AddonModResourcePluginFileHandler } from './providers/pluginfile-handler';
import { AddonModResourceHelperProvider } from './providers/helper';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

// List of providers (without handlers).
export const ADDON_MOD_RESOURCE_PROVIDERS: any[] = [
    AddonModResourceProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModResourceComponentsModule
    ],
    providers: [
        AddonModResourceProvider,
        AddonModResourceModuleHandler,
        AddonModResourceHelperProvider,
        AddonModResourcePrefetchHandler,
        AddonModResourceLinkHandler,
        AddonModResourceListLinkHandler,
        AddonModResourcePluginFileHandler
    ]
})
export class AddonModResourceModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModResourceModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModResourcePrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModResourceLinkHandler,
            pluginfileDelegate: CorePluginFileDelegate, pluginfileHandler: AddonModResourcePluginFileHandler,
            listLinkHandler: AddonModResourceListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        pluginfileDelegate.registerHandler(pluginfileHandler);
    }
}
