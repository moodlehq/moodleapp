// (C) Copyright 2015 Martin Dougiamas
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
import { AddonModLabelProvider } from './providers/label';
import { AddonModLabelModuleHandler } from './providers/module-handler';
import { AddonModLabelLinkHandler } from './providers/link-handler';
import { AddonModLabelPrefetchHandler } from './providers/prefetch-handler';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonModLabelProvider,
        AddonModLabelModuleHandler,
        AddonModLabelLinkHandler,
        AddonModLabelPrefetchHandler
    ]
})
export class AddonModLabelModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModLabelModuleHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModLabelLinkHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModLabelPrefetchHandler) {
        moduleDelegate.registerHandler(moduleHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
    }
}
