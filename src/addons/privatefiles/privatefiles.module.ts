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

import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { AddonPrivateFilesMainMenuHandler, AddonPrivateFilesMainMenuHandlerService } from './services/handlers/mainmenu';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { AddonPrivateFilesProvider } from './services/privatefiles';
import { AddonPrivateFilesHelperProvider } from './services/privatefiles-helper';

export const ADDON_PRIVATEFILES_SERVICES: Type<unknown>[] = [
    AddonPrivateFilesProvider,
    AddonPrivateFilesHelperProvider,
];

const routes: Routes = [
    {
        path: AddonPrivateFilesMainMenuHandlerService.PAGE_NAME,
        loadChildren: () => import('@/addons/privatefiles/privatefiles-lazy.module').then(m => m.AddonPrivateFilesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreMainMenuRoutingModule.forChild({ children: routes }),
    ],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreMainMenuDelegate.registerHandler(AddonPrivateFilesMainMenuHandler.instance);
            },
        },
    ],
})
export class AddonPrivateFilesModule {}
