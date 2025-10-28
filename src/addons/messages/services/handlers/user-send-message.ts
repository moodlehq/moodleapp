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
import { Params } from '@angular/router';
import { CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserProfileHandlerType,
    CoreUserProfileHandler,
    CoreUserProfileButtonHandlerData,
} from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonMessages } from '../messages';

/**
 * Profile send message handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesSendMessageUserHandlerService implements CoreUserProfileHandler {

    readonly type = CoreUserProfileHandlerType.BUTTON;
    name = 'AddonMessages:sendMessage';
    priority = 1000;

    /**
     * @inheritdoc
     */
    isEnabled(): Promise<boolean> {
        return AddonMessages.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForContext(): Promise<boolean> {
        return !!CoreSites.getCurrentSite();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        const currentSite = CoreSites.getRequiredCurrentSite();

        // From 3.7 you can send messages to yourself.
        return user.id != CoreSites.getCurrentSiteUserId() || currentSite.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreUserProfileButtonHandlerData {
        return {
            icon: 'fas-paper-plane',
            title: 'addon.messages.message',
            class: 'addon-messages-send-message-handler',
            action: (event: Event, user: CoreUserProfile): void => {
                event.preventDefault();
                event.stopPropagation();

                const pageParams: Params = {
                    showKeyboard: true,
                    hideInfo: true,
                };
                CoreNavigator.navigateToSitePath(`/messages/discussion/user/${user.id}`, { params: pageParams });
            },
        };
    }

}

export const AddonMessagesSendMessageUserHandler = makeSingleton(AddonMessagesSendMessageUserHandlerService);
