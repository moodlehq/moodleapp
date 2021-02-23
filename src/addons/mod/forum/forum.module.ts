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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { conditionalRoutes } from '@/app/app-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreCourseContentsRoutingModule } from '@features/course/pages/contents/contents-routing.module';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreScreen } from '@services/screen';

import { AddonModForumComponentsModule } from './components/components.module';
import { AddonModForumModuleHandler, AddonModForumModuleHandlerService } from './services/handlers/module';
import { SITE_SCHEMA } from './services/offline-db';

const mainMenuRoutes: Routes = [
    {
        path: AddonModForumModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./forum-lazy.module').then(m => m.AddonModForumLazyModule),
    },
    ...conditionalRoutes(
        [
            {
                path: 'course/index/contents/mod_forum/:discussionId',
                loadChildren: () => import('./pages/discussion/discussion.module').then(m => m.AddonForumDiscussionPageModule),
            },
        ],
        () => CoreScreen.instance.isMobile,
    ),
];

const courseContentsRoutes: Routes = conditionalRoutes(
    [
        {
            path: 'mod_forum/:discussionId',
            loadChildren: () => import('./pages/discussion/discussion.module').then(m => m.AddonForumDiscussionPageModule),
        },
    ],
    () => CoreScreen.instance.isTablet,
);

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuRoutes),
        CoreCourseContentsRoutingModule.forChild({ children: courseContentsRoutes }),
        AddonModForumComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => CoreCourseModuleDelegate.instance.registerHandler(AddonModForumModuleHandler.instance),
        },
    ],
})
export class AddonModForumModule {}
