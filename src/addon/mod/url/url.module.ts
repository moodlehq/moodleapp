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
import { AddonModUrlComponentsModule } from './components/components.module';
import { AddonModUrlModuleHandler } from './providers/module-handler';
import { AddonModUrlProvider } from './providers/url';
import { AddonModUrlLinkHandler } from './providers/link-handler';
import { AddonModUrlListLinkHandler } from './providers/list-link-handler';
import { AddonModUrlPrefetchHandler } from './providers/prefetch-handler';
import { AddonModUrlHelperProvider } from './providers/helper';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';

// List of providers (without handlers).
export const ADDON_MOD_URL_PROVIDERS: any[] = [
    AddonModUrlProvider,
    AddonModUrlHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModUrlComponentsModule
    ],
    providers: [
        AddonModUrlProvider,
        AddonModUrlHelperProvider,
        AddonModUrlModuleHandler,
        AddonModUrlLinkHandler,
        AddonModUrlListLinkHandler,
        AddonModUrlPrefetchHandler
    ]
})
export class AddonModUrlModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate,
            moduleHandler: AddonModUrlModuleHandler,
            contentLinksDelegate: CoreContentLinksDelegate,
            linkHandler: AddonModUrlLinkHandler,
            listLinkHandler: AddonModUrlListLinkHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate,
            prefetchHandler: AddonModUrlPrefetchHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
    }
}
