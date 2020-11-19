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
import { Routes } from '@angular/router';

import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu.delegate';
import { CoreMainMenuRoutingModule } from '@features/mainmenu/mainmenu-routing.module';
import { AddonPrivateFilesMainMenuHandler } from './services/handlers/mainmenu';

const routes: Routes = [
    {
        path: 'addon-privatefiles',
        loadChildren: () => import('@/addons/privatefiles/privatefiles.module').then(m => m.AddonPrivateFilesModule),
    },
];

@NgModule({
    imports: [CoreMainMenuRoutingModule.forChild(routes)],
    exports: [CoreMainMenuRoutingModule],
    providers: [
        AddonPrivateFilesMainMenuHandler,
    ],
})
export class AddonPrivateFilesInitModule {

    constructor(
        mainMenuDelegate: CoreMainMenuDelegate,
        mainMenuHandler: AddonPrivateFilesMainMenuHandler,
    ) {
        mainMenuDelegate.registerHandler(mainMenuHandler);
    }

}
