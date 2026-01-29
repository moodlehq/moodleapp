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
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@singletons/utils';
import { makeSingleton } from '@singletons';
import { AddonMessages } from '../messages';
import { ADDON_MESSAGES_PAGE_NAME, ADDONS_MESSAGES_MENU_FEATURE_NAME } from '@addons/messages/constants';

/**
 * Handler for messaging push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonMessagesPushClickHandler';
    priority = 200;
    featureName = ADDONS_MESSAGES_MENU_FEATURE_NAME;

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @returns Whether the notification click is handled by this handler
     */
    async handles(notification: AddonMessagesPushNotificationData): Promise<boolean> {
        if (CoreUtils.isTrueOrOne(notification.notif) && notification.name !== 'messagecontactrequests') {
            return false;
        }

        // Check that messaging is enabled.
        return AddonMessages.isPluginEnabled(notification.site);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @returns Promise resolved when done.
     */
    async handleClick(notification: AddonMessagesPushNotificationData): Promise<void> {
        let conversationId: number | undefined;
        let userId: number | undefined;

        // Check if we have enough information to open the conversation.
        if (notification.convid) {
            conversationId = Number(notification.convid);
        } else if (notification.userfromid) {
            userId = Number(notification.userfromid);
        }

        await CoreNavigator.navigateToSitePath(ADDON_MESSAGES_PAGE_NAME, {
            siteId: notification.site,
            preferCurrentTab: false,
            nextNavigation: conversationId ?
                { path: `discussion/${conversationId}` } :
                (userId ? { path: `discussion/user/${userId}` } : undefined),
        });
    }

}

export const AddonMessagesPushClickHandler = makeSingleton(AddonMessagesPushClickHandlerService);

type AddonMessagesPushNotificationData = CorePushNotificationsNotificationBasicData & {
    convid?: number; // Conversation Id.
};
