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
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonModChatComponentsModule } from './components/components.module';
import { AddonModChatProvider } from './services/chat';
import { AddonModChatHelperProvider } from './services/chat-helper';
import { AddonModChatIndexLinkHandler } from './services/handlers/index-link';
import { AddonModChatListLinkHandler } from './services/handlers/list-link';
import { AddonModChatModuleHandler, AddonModChatModuleHandlerService } from './services/handlers/module';
import { AddonModChatPrefetchHandler } from './services/handlers/prefetch';

export const ADDON_MOD_CHAT_SERVICES: Type<unknown>[] = [
    AddonModChatProvider,
    AddonModChatHelperProvider,
];

const routes: Routes = [
    {
        path: AddonModChatModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./chat-lazy.module').then(m => m.AddonModChatLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModChatComponentsModule,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModChatModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChatIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChatListLinkHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModChatPrefetchHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(AddonModChatProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModChatModule {}
