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

import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/user';
import { CoreUserComponentsModule } from './components/components.module';
import { CoreUserDelegate } from './services/user-delegate';
import { CoreUserProfileMailHandler } from './services/handlers/profile-mail';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserProfileLinkHandler } from './services/handlers/profile-link';
import { CoreCronDelegate } from '@services/cron';
import { CoreUserSyncCronHandler } from './services/handlers/sync-cron';
import { CoreUserTagAreaHandler } from './services/handlers/tag-area';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';

const routes: Routes = [
    {
        path: 'user',
        loadChildren: () => import('@features/user/user-lazy.module').then(m => m.CoreUserLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
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
                CoreUserDelegate.instance.registerHandler(CoreUserProfileMailHandler.instance);
                CoreContentLinksDelegate.instance.registerHandler(CoreUserProfileLinkHandler.instance);
                CoreCronDelegate.instance.register(CoreUserSyncCronHandler.instance);
                CoreTagAreaDelegate.instance.registerHandler(CoreUserTagAreaHandler.instance);
            },
        },
    ],
})
export class CoreUserModule {}
