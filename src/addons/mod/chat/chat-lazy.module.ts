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
import { CoreScreen } from '@services/screen';
import { conditionalRoutes } from '@/app/app-routing.module';
import { canLeaveGuard } from '@guards/can-leave';

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
        children: [
            {
                path: ':sessionStart/:sessionEnd',
                loadComponent: () => import('./pages/session-messages/session-messages'),
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
    ],
})
export default class AddonModChatLazyModule {}
