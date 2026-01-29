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
import { CoreSettingsHandler, CoreSettingsHandlerData } from '@features/settings/services/settings-delegate';
import { makeSingleton } from '@singletons';
import { AddonMessages } from '../messages';
import { ADDON_MESSAGES_SETTINGS_PAGE_NAME, ADDONS_MESSAGES_COMPONENT_NAME } from '@addons/messages/constants';

/**
 * Message settings handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesSettingsHandlerService implements CoreSettingsHandler {

    name = ADDONS_MESSAGES_COMPONENT_NAME;
    priority = 600;

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return AddonMessages.isPluginEnabled();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreSettingsHandlerData {
        return {
            icon: 'fas-comments',
            title: 'addon.messages.messages',
            page: ADDON_MESSAGES_SETTINGS_PAGE_NAME,
            class: 'addon-messages-settings-handler',
        };
    }

}

export const AddonMessagesSettingsHandler = makeSingleton(AddonMessagesSettingsHandlerService);
