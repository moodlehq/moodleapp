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

import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/user';
import { CoreUserComponentsModule } from './components/components.module';
import { CoreUserDelegate, CoreUserDelegateService } from './services/user-delegate';
import { CoreUserProfileMailHandler } from './services/handlers/profile-mail';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserProfileLinkHandler } from './services/handlers/profile-link';
import { CoreCronDelegate } from '@services/cron';
import { CoreUserSyncCronHandler } from './services/handlers/sync-cron';
import { CoreUserTagAreaHandler } from './services/handlers/tag-area';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCourseIndexRoutingModule } from '@features/course/pages/index/index-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreUserCourseOptionHandler } from './services/handlers/course-option';
import { CoreUserProfileFieldDelegateService } from './services/user-profile-field-delegate';
import { CoreUserProvider } from './services/user';
import { CoreUserHelperProvider } from './services/user-helper';
import { CoreUserOfflineProvider } from './services/user-offline';
import { CoreUserSyncProvider } from './services/user-sync';

export const CORE_USER_SERVICES: Type<unknown>[] = [
    CoreUserDelegateService,
    CoreUserProfileFieldDelegateService,
    CoreUserProvider,
    CoreUserHelperProvider,
    CoreUserOfflineProvider,
    CoreUserSyncProvider,
];

const routes: Routes = [
    {
        path: 'user',
        loadChildren: () => import('@features/user/user-lazy.module').then(m => m.CoreUserLazyModule),
    },
];

const courseIndexRoutes: Routes = [
    {
        path: 'participants',
        loadChildren: () => import('@features/user/user-course-lazy.module').then(m => m.CoreUserCourseLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreUserComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [
                SITE_SCHEMA,
                OFFLINE_SITE_SCHEMA,
            ],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreUserDelegate.registerHandler(CoreUserProfileMailHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreUserProfileLinkHandler.instance);
                CoreCronDelegate.register(CoreUserSyncCronHandler.instance);
                CoreTagAreaDelegate.registerHandler(CoreUserTagAreaHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(CoreUserCourseOptionHandler.instance);
            },
        },
    ],
})
export class CoreUserModule {}
