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

import { CoreNavigator } from '@services/navigator';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CorePushNotificationsClickHandler } from '@features/pushnotifications/services/push-delegate';
import { CorePushNotificationsNotificationBasicData } from '@features/pushnotifications/services/pushnotifications';
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';
import { AddonNotifications, AddonNotificationsProvider } from '../notifications';
import { AddonNotificationsMainMenuHandlerService } from './mainmenu';

/**
 * Handler for non-messaging push notifications clicks.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsPushClickHandlerService implements CorePushNotificationsClickHandler {

    name = 'AddonNotificationsPushClickHandler';
    priority = 0; // Low priority so it's used as a fallback if no other handler treats the notification.
    featureName = 'CoreMainMenuDelegate_AddonNotifications';

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    async handles(notification: AddonNotificationsNotificationData): Promise<boolean> {
        if (!notification.moodlecomponent) {
            // The notification doesn't come from Moodle. Handle it.
            return true;
        }

        if (CoreUtils.isTrueOrOne(notification.notif)) {
            // Notification clicked, mark as read. Don't block for this.
            this.markAsRead(notification);

            return true;
        }

        return false;
    }

    /**
     * Mark the notification as read.
     *
     * @param notification Notification to mark.
     * @return Promise resolved when done.
     */
    protected async markAsRead(notification: AddonNotificationsNotificationData): Promise<void> {
        const notifId = notification.savedmessageid || notification.id;

        if (!notifId) {
            return;
        }

        await CoreUtils.ignoreErrors(AddonNotifications.markNotificationRead(notifId, notification.site));

        CoreEvents.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, {}, notification.site);
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    async handleClick(notification: AddonNotificationsNotificationData): Promise<void> {

        if (notification.customdata?.extendedtext) {
            // Display the text in a modal.
            return CoreTextUtils.viewText(notification.title || '', <string> notification.customdata.extendedtext, {
                displayCopyButton: true,
                modalOptions: { cssClass: 'core-modal-fullscreen' },
            });
        }

        // Try to handle the appurl.
        if (notification.customdata?.appurl) {
            const url = <string> notification.customdata.appurl;

            switch (notification.customdata.appurlopenin) {
                case 'inapp':
                    CoreUtils.openInApp(url);

                    return;

                case 'browser':
                    return CoreUtils.openInBrowser(url);

                default:
                    if (CoreContentLinksHelper.handleLink(url, undefined, undefined, true)) {
                        // Link treated, stop.
                        return;
                    }
            }
        }

        // No appurl or cannot be handled by the app. Try to handle the contexturl now.
        if (notification.contexturl) {
            if (CoreContentLinksHelper.handleLink(notification.contexturl)) {
                // Link treated, stop.
                return;
            }
        }

        // No contexturl or cannot be handled by the app. Open the notifications page.
        await CoreUtils.ignoreErrors(AddonNotifications.invalidateNotificationsList(notification.site));

        await CoreNavigator.navigateToSitePath(
            AddonNotificationsMainMenuHandlerService.PAGE_NAME,
            {
                siteId: notification.site,
                preferCurrentTab: false,
            },
        );
    }

}

export const AddonNotificationsPushClickHandler = makeSingleton(AddonNotificationsPushClickHandlerService);

type AddonNotificationsNotificationData = CorePushNotificationsNotificationBasicData & {
    contexturl?: string; // URL related to the notification.
    savedmessageid?: number; // Notification ID (optional).
    id?: number; // Notification ID (optional).
};
