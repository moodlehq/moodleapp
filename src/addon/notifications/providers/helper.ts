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
import { CoreSitesProvider } from '@providers/sites';
import {
    AddonNotificationsProvider, AddonNotificationsAnyNotification, AddonNotificationsGetMessagesMessage
} from './notifications';

/**
 * Service that provides some helper functions for notifications.
 */
@Injectable()
export class AddonNotificationsHelperProvider {

    constructor(private notificationsProvider: AddonNotificationsProvider, private sitesProvider: CoreSitesProvider) {
    }

    /**
     * Get some notifications. It will try to use the new WS if available.
     *
     * @param notifications Current list of loaded notifications. It's used to calculate the offset.
     * @param limit Number of notifications to get. Defaults to LIST_LIMIT.
     * @param toDisplay True if notifications will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with notifications and if can load more.
     */
    getNotifications(notifications: any[], limit?: number, toDisplay: boolean = true, forceCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<{notifications: AddonNotificationsAnyNotification[], canLoadMore: boolean}> {

        notifications = notifications || [];
        limit = limit || AddonNotificationsProvider.LIST_LIMIT;
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.notificationsProvider.isPopupAvailable(siteId).then((available) => {

            if (available) {
                return this.notificationsProvider.getPopupNotifications(notifications.length, limit, toDisplay, forceCache,
                        ignoreCache, siteId);

            } else {
                // Fallback to get_messages. We need 2 calls, one for read and the other one for unread.
                const unreadFrom = notifications.reduce((total, current) => {
                    return total + (current.read ? 0 : 1);
                }, 0);

                return this.notificationsProvider.getUnreadNotifications(unreadFrom, limit, toDisplay, forceCache, ignoreCache,
                        siteId).then((unread) => {

                    let promise;

                    if (unread.length < limit) {
                        // Limit not reached. Get read notifications until reach the limit.
                        const readLimit = limit - unread.length,
                            readFrom = notifications.length - unreadFrom;

                        promise = this.notificationsProvider.getReadNotifications(readFrom, readLimit, toDisplay, forceCache,
                                ignoreCache, siteId).then((read) => {
                            return unread.concat(read);
                        }).catch((error): any => {
                            if (unread.length > 0) {
                                // We were able to get some unread, return only the unread ones.
                                return unread;
                            }

                            return Promise.reject(error);
                        });
                    } else {
                        promise = Promise.resolve(unread);
                    }

                    return promise.then((notifications: AddonNotificationsGetMessagesMessage[]) => {
                        return {
                            notifications: notifications,
                            canLoadMore: notifications.length >= limit
                        };
                    });
                });
            }
        });
    }
}
