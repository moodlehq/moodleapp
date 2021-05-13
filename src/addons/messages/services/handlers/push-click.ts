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
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonMessages } from '../messages';
import { AddonMessagesMainMenuHandlerService } from './mainmenu';

/**
 * Handler for messaging push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonMessagesPushClickHandler';
    priority = 200;
    featureName = 'CoreMainMenuDelegate_AddonMessages';

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    async handles(notification: AddonMessagesPushNotificationData): Promise<boolean> {
        if (CoreUtils.isTrueOrOne(notification.notif) && notification.name != 'messagecontactrequests') {
            return false;
        }

        // Check that messaging is enabled.
        return AddonMessages.isPluginEnabled(notification.site);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    async handleClick(notification: AddonMessagesPushNotificationData): Promise<void> {
        try {
            await AddonMessages.invalidateDiscussionsCache(notification.site);
        } catch {
            // Ignore errors.
        }

        // Check if group messaging is enabled, to determine which page should be loaded.
        const enabled = await AddonMessages.isGroupMessagingEnabledInSite(notification.site);

        let nextPageParams: Params | undefined;

        // Check if we have enough information to open the conversation.
        if (notification.convid && enabled) {
            nextPageParams = {
                conversationId: Number(notification.convid),
            };
        } else if (notification.userfromid) {
            nextPageParams = {
                userId: Number(notification.userfromid),
            };
        }

        await CoreNavigator.navigateToSitePath(AddonMessagesMainMenuHandlerService.PAGE_NAME, {
            siteId: notification.site,
            preferCurrentTab: false,
            nextNavigation: nextPageParams ?
                {
                    path: 'discussion',
                    options: { params: nextPageParams },
                } :
                undefined,
        });
    }

}

export const AddonMessagesPushClickHandler = makeSingleton(AddonMessagesPushClickHandlerService);

type AddonMessagesPushNotificationData = CorePushNotificationsNotificationBasicData & {
    convid?: number; // Conversation Id.
};
