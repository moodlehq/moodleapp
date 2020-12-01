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

import { CoreMainMenuMoreRoutingModule } from '@features/mainmenu/pages/more/more-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/db/user';
import { CoreUserComponentsModule } from './components/components.module';
import { CoreUserDelegate } from './services/user-delegate';
import { CoreUserProfileMailHandler } from './services/handlers/profile-mail';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserProfileLinkHandler } from './services/handlers/profile-link';

const routes: Routes = [
    {
        path: 'user',
        loadChildren: () => import('@features/user/user-lazy.module').then(m => m.CoreUserLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuMoreRoutingModule.forChild({ siblings: routes }),
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
            deps: [CoreUserDelegate, CoreUserProfileMailHandler, CoreContentLinksDelegate, CoreUserProfileLinkHandler],
            useFactory: (
                userDelegate: CoreUserDelegate,
                mailHandler: CoreUserProfileMailHandler,
                linksDelegate: CoreContentLinksDelegate,
                profileLinkHandler: CoreUserProfileLinkHandler,

            ) => () => {
                // @todo: Register sync handler when init process has been fixed.
                userDelegate.registerHandler(mailHandler);
                linksDelegate.registerHandler(profileLinkHandler);
            },
        },
    ],
})
export class CoreUserModule {}
