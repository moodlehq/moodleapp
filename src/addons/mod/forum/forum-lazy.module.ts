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

import { conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { CoreSharedModule } from '@/core/shared.module';

import { AddonModForumComponentsModule } from './components/components.module';
import { AddonModForumIndexPage } from './pages/index';

const mobileRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModForumIndexPage,
    },
    {
        path: ':courseId/:cmId/new/:timeCreated',
        loadChildren: () => import('./forum-new-discussion-lazy.module').then(m => m.AddonModForumNewDiscussionLazyModule),
    },
    {
        path: ':courseId/:cmId/:discussionId',
        loadChildren: () => import('./forum-discussion-lazy.module').then(m => m.AddonModForumDiscussionLazyModule),
    },
    {
        path: 'discussion/:discussionId', // Only for discussion link handling.
        loadChildren: () => import('./forum-discussion-lazy.module').then(m => m.AddonModForumDiscussionLazyModule),
    },
];

const tabletRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        component: AddonModForumIndexPage,
        children: [
            {
                path: 'new/:timeCreated',
                loadChildren: () => import('./forum-new-discussion-lazy.module').then(m => m.AddonModForumNewDiscussionLazyModule),
            },
            {
                path: ':discussionId',
                loadChildren: () => import('./forum-discussion-lazy.module').then(m => m.AddonModForumDiscussionLazyModule),
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
        AddonModForumComponentsModule,
    ],
    declarations: [
        AddonModForumIndexPage,
    ],
})
export class AddonModForumLazyModule {}
