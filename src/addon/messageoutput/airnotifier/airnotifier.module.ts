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
import { CoreEventsProvider } from '@providers/events';
import { AddonMessageOutputDelegate } from '@addon/messageoutput/providers/delegate';
import { AddonMessageOutputAirnotifierProvider } from './providers/airnotifier';
import { AddonMessageOutputAirnotifierHandler } from './providers/handler';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        AddonMessageOutputAirnotifierProvider,
        AddonMessageOutputAirnotifierHandler,
    ]
})
export class AddonMessageOutputAirnotifierModule {
    constructor(messageOutputDelegate: AddonMessageOutputDelegate, airnotifierHandler: AddonMessageOutputAirnotifierHandler,
            eventsProvider: CoreEventsProvider, airnotifierProvider: AddonMessageOutputAirnotifierProvider) {
        messageOutputDelegate.registerHandler(airnotifierHandler);

        eventsProvider.on(CoreEventsProvider.DEVICE_REGISTERED_IN_MOODLE, async (data) => {
            // Get user devices to make Moodle send the devices data to Airnotifier.
            airnotifierProvider.getUserDevices(true, data.siteId);
        });
    }
}
