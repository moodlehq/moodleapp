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
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonModBBBComponentsModule } from './components/components.module';
import { AddonModBBBService } from './services/bigbluebuttonbn';
import { AddonModBBBIndexLinkHandler } from './services/handlers/index-link';
import { AddonModBBBListLinkHandler } from './services/handlers/list-link';
import { AddonModBBBModuleHandler, ADDON_MOD_BBB_MAIN_MENU_PAGE_NAME } from './services/handlers/module';

export const ADDON_MOD_BBB_SERVICES: Type<unknown>[] = [
    AddonModBBBService,
];

const routes: Routes = [
    {
        path: ADDON_MOD_BBB_MAIN_MENU_PAGE_NAME,
        loadChildren: () => import('./bigbluebuttonbn-lazy.module').then(m => m.AddonModBBBLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModBBBComponentsModule,
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModBBBModuleHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModBBBIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModBBBListLinkHandler.instance);
            },
        },
    ],
})
export class AddonModBBBModule {}
