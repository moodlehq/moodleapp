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
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreDataPrivacyUserHandler } from './services/handlers/user';
import { Routes } from '@angular/router';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_DATAPRIVACY_PAGE_NAME } from './constants';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreDataPrivacyDataRequestsLinkHandler } from './services/handlers/datarequests-link';
import { CoreDataPrivacyCreateDataRequestLinkHandler } from './services/handlers/createdatarequest-link';

const routes: Routes = [
    {
        path: CORE_DATAPRIVACY_PAGE_NAME,
        loadChildren: () => import('./dataprivacy-lazy.module').then(m => m.CoreDataPrivacyLazyModule),
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
                CoreUserDelegate.registerHandler(CoreDataPrivacyUserHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreDataPrivacyDataRequestsLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreDataPrivacyCreateDataRequestLinkHandler.instance);
            },
        },
    ],
})
export class CoreDataPrivacyModule {}
