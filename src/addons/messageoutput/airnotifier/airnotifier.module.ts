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
import { AddonMessageOutputDelegate } from '@addons/messageoutput/services/messageoutput-delegate';
import {
    AddonMessageOutputAirnotifierHandler,
    AddonMessageOutputAirnotifierHandlerService,
} from './services/handlers/messageoutput';
import { AddonMessageOutputAirnotifier } from './services/airnotifier';
import { CoreSharedModule } from '@/core/shared.module';
import { AddonMessageOutputAirnotifierDevicesPage } from '@addons/messageoutput/airnotifier/pages/devices/devices';

const routes: Routes = [
    {
        path: AddonMessageOutputAirnotifierHandlerService.PAGE_NAME,
        component: AddonMessageOutputAirnotifierDevicesPage,
    },
];

@NgModule({
    declarations: [
        AddonMessageOutputAirnotifierDevicesPage,
    ],
    imports: [
        CoreSharedModule,
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                AddonMessageOutputDelegate.registerHandler(AddonMessageOutputAirnotifierHandler.instance);
                AddonMessageOutputAirnotifier.initialize();
            },
        },
    ],
})
export class AddonMessageOutputAirnotifierModule {}
