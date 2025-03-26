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

import { AddonMessageOutputHandler, AddonMessageOutputHandlerData } from '@addons/messageoutput/services/messageoutput-delegate';
import { makeSingleton } from '@singletons';
import { ADDON_MESSAGEOUTPUT_AIRNOTIFIER_PAGE_NAME } from '../../constants';

/**
 * Airnotifier message output handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessageOutputAirnotifierHandlerService implements AddonMessageOutputHandler {

    name = 'AddonMessageOutputAirnotifier';
    processorName = 'airnotifier';

    /**
     * Whether or not the module is enabled for the site.
     *
     * @returns True if enabled, false otherwise.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param processor The processor object.
     * @returns Data.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getDisplayData(processor: Record<string, unknown>): AddonMessageOutputHandlerData {
        return {
            priority: 600,
            label: 'addon.messageoutput_airnotifier.processorsettingsdesc',
            icon: 'fas-gear',
            page: ADDON_MESSAGEOUTPUT_AIRNOTIFIER_PAGE_NAME,
        };
    }

}

export const AddonMessageOutputAirnotifierHandler = makeSingleton(AddonMessageOutputAirnotifierHandlerService);
