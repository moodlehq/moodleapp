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
import { AddonModImscpComponentsModule } from './components/components.module';
import { AddonModImscpModuleHandler } from './providers/module-handler';
import { AddonModImscpProvider } from './providers/imscp';
import { AddonModImscpPrefetchHandler } from './providers/prefetch-handler';
import { AddonModImscpLinkHandler } from './providers/link-handler';
import { AddonModImscpListLinkHandler } from './providers/list-link-handler';
import { AddonModImscpPluginFileHandler } from './providers/pluginfile-handler';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

// List of providers (without handlers).
export const ADDON_MOD_IMSCP_PROVIDERS: any[] = [
    AddonModImscpProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModImscpComponentsModule
    ],
    providers: [
        AddonModImscpProvider,
        AddonModImscpModuleHandler,
        AddonModImscpPrefetchHandler,
        AddonModImscpLinkHandler,
        AddonModImscpListLinkHandler,
        AddonModImscpPluginFileHandler
    ]
})
export class AddonModImscpModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModImscpModuleHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModImscpPrefetchHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModImscpLinkHandler,
            pluginfileDelegate: CorePluginFileDelegate, pluginfileHandler: AddonModImscpPluginFileHandler,
            listLinkHandler: AddonModImscpListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        pluginfileDelegate.registerHandler(pluginfileHandler);
    }
}
