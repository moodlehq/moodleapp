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
import { DISCUSSION_ROUTES } from '@addons/messages/messages-lazy.module';
import { CoreScreen } from '@services/screen';

import { CoreSharedModule } from '@/core/shared.module';

import { AddonMessagesGroupConversationsPage } from './group-conversations.page';
import { AddonMessagesMainMenuHandlerService } from '@addons/messages/services/handlers/mainmenu';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';

const mobileRoutes: Routes = [
    {
        path: '',
        data: {
            mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        },
        component: AddonMessagesGroupConversationsPage,
    },
    ...DISCUSSION_ROUTES,
];

const tabletRoutes: Routes = [
    {
        path: '',
        data: {
            mainMenuTabRoot: AddonMessagesMainMenuHandlerService.PAGE_NAME,
        },
        component: AddonMessagesGroupConversationsPage,
        children: DISCUSSION_ROUTES,
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
        CoreMainMenuComponentsModule,
    ],
    declarations: [
        AddonMessagesGroupConversationsPage,
    ],
    exports: [RouterModule],
})
export class AddonMessagesGroupConversationsPageModule {}
