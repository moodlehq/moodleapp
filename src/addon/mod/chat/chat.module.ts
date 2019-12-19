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
import { CoreContentLinksDelegate } from '@core/contentlinks/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { AddonModChatComponentsModule } from './components/components.module';
import { AddonModChatProvider } from './providers/chat';
import { AddonModChatHelperProvider } from './providers/helper';
import { AddonModChatLinkHandler } from './providers/link-handler';
import { AddonModChatListLinkHandler } from './providers/list-link-handler';
import { AddonModChatModuleHandler } from './providers/module-handler';
import { AddonModChatPrefetchHandler } from './providers/prefetch-handler';

// List of providers (without handlers).
export const ADDON_MOD_CHAT_PROVIDERS: any[] = [
    AddonModChatProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonModChatComponentsModule
    ],
    providers: [
        AddonModChatProvider,
        AddonModChatHelperProvider,
        AddonModChatLinkHandler,
        AddonModChatListLinkHandler,
        AddonModChatModuleHandler,
        AddonModChatPrefetchHandler
    ]
})
export class AddonModChatModule {
    constructor(moduleDelegate: CoreCourseModuleDelegate, moduleHandler: AddonModChatModuleHandler,
            contentLinksDelegate: CoreContentLinksDelegate, linkHandler: AddonModChatLinkHandler,
            prefetchDelegate: CoreCourseModulePrefetchDelegate, prefetchHandler: AddonModChatPrefetchHandler,
            listLinkHandler: AddonModChatListLinkHandler) {

        moduleDelegate.registerHandler(moduleHandler);
        contentLinksDelegate.registerHandler(linkHandler);
        contentLinksDelegate.registerHandler(listLinkHandler);
        prefetchDelegate.registerHandler(prefetchHandler);
    }
}
