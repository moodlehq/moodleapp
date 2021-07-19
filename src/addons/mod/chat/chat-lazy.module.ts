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
import { RouterModule, Routes } from '@angular/router';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonModChatComponentsModule } from './components/components.module';
import { AddonModChatIndexPage } from './pages/index/index';
import { AddonModChatChatPage } from './pages/chat/chat';
import { AddonModChatSessionMessagesPage } from './pages/session-messages/session-messages';
import { CoreScreen } from '@services/screen';
import { conditionalRoutes } from '@/app/app-routing.module';
import { AddonModChatSessionsPage } from './pages/sessions/sessions';
import { CanLeaveGuard } from '@guards/can-leave';

const commonRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModChatIndexPage,
    },
    {
        path: ':courseId/:cmId/chat',
        component: AddonModChatChatPage,
        canDeactivate: [CanLeaveGuard],
    },
];

const mobileRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/sessions',
        component: AddonModChatSessionsPage,
    },
    {
        path: ':courseId/:cmId/sessions/:sessionStart/:sessionEnd',
        component: AddonModChatSessionMessagesPage,
    },
];

const tabletRoutes: Routes = [
    ...commonRoutes,
    {
        path: ':courseId/:cmId/sessions',
        component: AddonModChatSessionsPage,
        children: [
            {
                path: ':sessionStart/:sessionEnd',
                component: AddonModChatSessionMessagesPage,
            },
        ],
    },
];

const routes: Routes = [
    ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
    ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CoreSharedModule,
        AddonModChatComponentsModule,
    ],
    declarations: [
        AddonModChatIndexPage,
        AddonModChatChatPage,
        AddonModChatSessionsPage,
        AddonModChatSessionMessagesPage,
    ],
})
export class AddonModChatLazyModule {}
