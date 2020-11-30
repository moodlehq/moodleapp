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
import { CoreEventsProvider } from '@providers/events';
import { CoreTextUtils } from '@providers/utils/text';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CorePushNotificationsClickHandler } from '@core/pushnotifications/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonNotificationsProvider } from './notifications';

/**
 * Handler for non-messaging push notifications clicks.
 */
@Injectable()
export class AddonNotificationsPushClickHandler implements CorePushNotificationsClickHandler {
    name = 'AddonNotificationsPushClickHandler';
    priority = 0; // Low priority so it's used as a fallback if no other handler treats the notification.
    featureName = 'CoreMainMenuDelegate_AddonNotifications';

    constructor(private utils: CoreUtilsProvider, private notificationsProvider: AddonNotificationsProvider,
            private linkHelper: CoreContentLinksHelperProvider, private eventsProvider: CoreEventsProvider) {}

    /**
     * Check if a notification click is handled by this handler.
     *
     * @param notification The notification to check.
     * @return Whether the notification click is handled by this handler
     */
    handles(notification: any): boolean | Promise<boolean> {
        if (!notification.moodlecomponent) {
            // The notification doesn't come from Moodle. Handle it.
            return true;
        }

        if (this.utils.isTrueOrOne(notification.notif)) {
            // Notification clicked, mark as read. Don't block for this.
            const notifId = notification.savedmessageid || notification.id;

            this.notificationsProvider.markNotificationRead(notifId, notification.site).then(() => {
                this.eventsProvider.trigger(AddonNotificationsProvider.READ_CHANGED_EVENT, null, notification.site);
            }).catch(() => {
                // Ignore errors.
            });

            return true;
        }

        return false;
    }

    /**
     * Handle the notification click.
     *
     * @param notification The notification to check.
     * @return Promise resolved when done.
     */
    async handleClick(notification: any): Promise<void> {

        if (notification.customdata.extendedtext) {
            // Display the text in a modal.
            return CoreTextUtils.instance.viewText(notification.title, notification.customdata.extendedtext, {
                displayCopyButton: true,
                modalOptions: { cssClass: 'core-modal-fullscreen' },
            });
        }

        // Try to handle the appurl.
        if (notification.customdata && notification.customdata.appurl) {
            switch (notification.customdata.appurlopenin) {
                case 'inapp':
                    this.utils.openInApp(notification.customdata.appurl);

                    return;

                case 'browser':
                    return this.utils.openInBrowser(notification.customdata.appurl);

                default:
                    if (this.linkHelper.handleLink(notification.customdata.appurl, undefined, undefined, true)) {
                        // Link treated, stop.
                        return;
                    }
            }
        }

        // No appurl or cannot be handled by the app. Try to handle the contexturl now.
        if (notification.contexturl) {
            if (this.linkHelper.handleLink(notification.contexturl)) {
                // Link treated, stop.
                return;
            }
        }

        // No contexturl or cannot be handled by the app. Open the notifications page.
        await this.utils.ignoreErrors(this.notificationsProvider.invalidateNotificationsList(notification.site));

        await this.linkHelper.goInSite(undefined, 'AddonNotificationsListPage', undefined, notification.site);
    }
}
