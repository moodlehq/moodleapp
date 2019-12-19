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
    handleClick(notification: any): Promise<any> {
        let promise;

        // Try to handle the appurl first.
        if (notification.customdata && notification.customdata.appurl) {
            promise = this.linkHelper.handleLink(notification.customdata.appurl, undefined, undefined, true);
        } else {
            promise = Promise.resolve(false);
        }

        return promise.then((treated) => {

            if (!treated) {
                // No link or cannot be handled by the app. Try to handle the contexturl now.
                if (notification.contexturl) {
                    return this.linkHelper.handleLink(notification.contexturl);
                } else {
                    return false;
                }
            }

            return true;
        }).then((treated) => {

            if (!treated) {
                // No link or cannot be handled by the app. Open the notifications page.
                return this.notificationsProvider.invalidateNotificationsList(notification.site).catch(() => {
                    // Ignore errors.
                }).then(() => {
                    return this.linkHelper.goInSite(undefined, 'AddonNotificationsListPage', undefined, notification.site);
                });
            }
        });
    }
}
