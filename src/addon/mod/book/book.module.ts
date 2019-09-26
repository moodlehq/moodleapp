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
import { AddonModBookComponentsModule } from './components/components.module';
import { AddonModBookProvider } from './providers/book';
import { AddonModBookModuleHandler } from './providers/module-handler';
import { AddonModBookLinkHandler } from './providers/link-handler';
import { AddonModBookListLinkHandler } from './providers/list-link-handler';
import { AddonModBookPrefetchHandler } from './providers/prefetch-handler';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreTagAreaDelegate } from '@core/tag/providers/area-delegate';
import { AddonModBookTagAreaHandler } from './providers/tag-area-handler';

// List of providers (without handlers).
export const ADDON_MOD_BOOK_PROVIDERS: any[] = [
    AddonModBookProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModBookComponentsModule
    ],
    providers: [
        AddonModBookProvider,
        AddonModBookModuleHandler,
        AddonModBookLinkHandler,
        AddonModBookListLinkHandler,
        AddonModBookPrefetchHandler,
        AddonModBookTagAreaHandler
    ]
})
export class AddonModBookModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModBookModuleHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModBookLinkHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModBookPrefetchHandler,
            listLinkHandler: AddonModBookListLinkHandler, tagAreaDelegate: CoreTagAreaDelegate,
            tagAreaHandler: AddonModBookTagAreaHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
        tagAreaDelegate.registerHandler(tagAreaHandler);
    }
}
