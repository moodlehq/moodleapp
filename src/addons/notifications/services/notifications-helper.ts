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

import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import {
    AddonNotifications,
    AddonNotificationsAnyNotification,
    AddonNotificationsGetNotificationsOptions,
    AddonNotificationsProvider,
} from './notifications';

/**
 * Service that provides some helper functions for notifications.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsHelperProvider {

    /**
     * Get some notifications. It will try to use the new WS if available.
     *
     * @param notifications Current list of loaded notifications. It's used to calculate the offset.
     * @param options Other options.
     * @return Promise resolved with notifications and if can load more.
     */
    async getNotifications(
        notifications: AddonNotificationsAnyNotification[],
        options?: AddonNotificationsGetNotificationsOptions,
    ): Promise<{notifications: AddonNotificationsAnyNotification[]; canLoadMore: boolean}> {

        notifications = notifications || [];
        options = options || {};
        options.limit = options.limit || AddonNotificationsProvider.LIST_LIMIT;
        options.siteId = options.siteId || CoreSites.instance.getCurrentSiteId();

        const available = await AddonNotifications.instance.isPopupAvailable(options.siteId);

        if (available) {
            return AddonNotifications.instance.getPopupNotifications(notifications.length, options);
        }

        // Fallback to get_messages. We need 2 calls, one for read and the other one for unread.
        const unreadFrom = notifications.reduce((total, current) => total + (current.read ? 0 : 1), 0);

        const unread = await AddonNotifications.instance.getUnreadNotifications(unreadFrom, options);

        let newNotifications = unread;

        if (unread.length < options.limit) {
            // Limit not reached. Get read notifications until reach the limit.
            const readLimit = options.limit - unread.length;
            const readFrom = notifications.length - unreadFrom;
            const readOptions = Object.assign({}, options, { limit: readLimit });

            try {
                const read = await AddonNotifications.instance.getReadNotifications(readFrom, readOptions);

                newNotifications = unread.concat(read);
            } catch (error) {
                if (unread.length <= 0) {
                    throw error;
                }
            }
        }

        return {
            notifications: newNotifications,
            canLoadMore: notifications.length >= options.limit,
        };
    }

}

export class AddonNotificationsHelper extends makeSingleton(AddonNotificationsHelperProvider) {}
