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
import { CoreUserDelegateService, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { AddonMessages } from '../messages';

/**
 * Profile send message handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesSendMessageUserHandlerService implements CoreUserProfileHandler {

    name = 'AddonMessages:sendMessage';
    priority = 1000;
    type = CoreUserDelegateService.TYPE_COMMUNICATION;

    /**
     * Check if handler is enabled.
     *
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isEnabled(): Promise<boolean> {
        return AddonMessages.isPluginEnabled();
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(): Promise<boolean> {
        return !!CoreSites.getCurrentSite();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        const currentSite = CoreSites.getCurrentSite()!;

        // From 3.7 you can send messages to yourself.
        return user.id != CoreSites.getCurrentSiteUserId() || currentSite.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(): CoreUserProfileHandlerData {
        return {
            icon: 'fas-paper-plane',
            title: 'addon.messages.message',
            class: 'addon-messages-send-message-handler',
            action: (event: Event, user: CoreUserProfile): void => {
                event.preventDefault();
                event.stopPropagation();

                const pageParams: Params = {
                    showKeyboard: true,
                    userId: user.id,
                    hideInfo: true,
                };
                CoreNavigator.navigateToSitePath('/messages/discussion', { params: pageParams });
            },
        };
    }

}

export const AddonMessagesSendMessageUserHandler = makeSingleton(AddonMessagesSendMessageUserHandlerService);
