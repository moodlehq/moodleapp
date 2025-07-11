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

import { NgModule, provideAppInitializer } from '@angular/core';
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
import { ADDON_MOD_CHAT_COMPONENT_LEGACY, ADDON_MOD_CHAT_PAGE_NAME } from './constants';
import { conditionalRoutes } from '@/app/app-routing.module';
import { canLeaveGuard } from '@guards/can-leave';
import { CoreScreen } from '@services/screen';

const commonRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index/index'),
    },
    {
        path: ':courseId/:cmId/chat',
        loadComponent: () => import('./pages/chat/chat'),
        canDeactivate: [canLeaveGuard],
    },
];

const mobileRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/sessions',
        loadComponent: () => import('./pages/sessions/sessions'),
    },
    {
        path: ':courseId/:cmId/sessions/:sessionStart/:sessionEnd',
        loadComponent: () => import('./pages/session-messages/session-messages'),
    },
];

const tabletRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/sessions',
        loadComponent: () => import('./pages/sessions/sessions'),
        loadChildren: () => [
            {
                path: ':sessionStart/:sessionEnd',
                loadComponent: () => import('./pages/session-messages/session-messages'),
            },
        ],
    },
];

const routes: Routes = [
    {
        path: ADDON_MOD_CHAT_PAGE_NAME,
        loadChildren: () => [
            ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
            ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        ],
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(() => {
            CoreCourseModulePrefetchDelegate.registerHandler(getPrefetchHandlerInstance());

            CoreCourseModuleDelegate.registerHandler(AddonModChatModuleHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModChatIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModChatListLinkHandler.instance);

            CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_CHAT_COMPONENT_LEGACY);
        }),
    ],
})
export class AddonModChatModule {}
