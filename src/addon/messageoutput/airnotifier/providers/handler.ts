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

import { Injectable } from '@angular/core';
import { AddonMessageOutputHandler, AddonMessageOutputHandlerData } from '@addon/messageoutput/providers/delegate';
import { AddonMessageOutputAirnotifierProvider } from './airnotifier';

/**
 * Airnotifier message output handler.
 */
@Injectable()
export class AddonMessageOutputAirnotifierHandler implements AddonMessageOutputHandler {
    name = 'AddonMessageOutputAirnotifier';
    processorName = 'airnotifier';

    constructor(private airnotifierProvider: AddonMessageOutputAirnotifierProvider) {}

    /**
     * Whether or not the module is enabled for the site.
     *
     * @return True if enabled, false otherwise.
     */
    isEnabled(): boolean {
        return this.airnotifierProvider.isEnabled();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param processor The processor object.
     * @return Data.
     */
    getDisplayData(processor: any): AddonMessageOutputHandlerData {
        return {
            priority: 600,
            label: 'addon.messageoutput_airnotifier.processorsettingsdesc',
            icon: 'settings',
            page: 'AddonMessageOutputAirnotifierDevicesPage',
        };
    }
}
