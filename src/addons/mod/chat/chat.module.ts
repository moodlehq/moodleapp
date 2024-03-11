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
import { AddonModChatIndexLinkHandler } from './services/handlers/index-link';
import { AddonModChatListLinkHandler } from './services/handlers/list-link';
import { AddonModChatModuleHandler } from './services/handlers/module';
import { getPrefetchHandlerInstance } from './services/handlers/prefetch';
import { ADDON_MOD_CHAT_COMPONENT, ADDON_MOD_CHAT_PAGE_NAME } from './constants';

/**
 * Get mod chat services.
 *
 * @returns Returns mod chat services.
 */
export async function getModChatServices(): Promise<Type<unknown>[]> {
    const { AddonModChatProvider } = await import('@addons/mod/chat/services/chat');
    const { AddonModChatHelperProvider } = await import('@addons/mod/chat/services/chat-helper');

    return [
        AddonModChatProvider,
        AddonModChatHelperProvider,
    ];
}

/**
 * Get mod chat component modules.
 *
 * @returns Chat component modules.
 */
export async function getModChatComponentModules(): Promise<unknown[]> {
    const { AddonModChatComponentsModule } = await import('@addons/mod/chat/components/components.module');

    return [AddonModChatComponentsModule];
}

const routes: Routes = [
    {
        path: ADDON_MOD_CHAT_PAGE_NAME,
        loadChildren: () => import('./chat-lazy.module').then(m => m.AddonModChatLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModulePrefetchDelegate.registerHandler(getPrefetchHandlerInstance());

                CoreCourseModuleDelegate.registerHandler(AddonModChatModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChatIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModChatListLinkHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_CHAT_COMPONENT);
            },
        },
    ],
})
export class AddonModChatModule {}
