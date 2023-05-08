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

import { AddonNotificationsNotificationsSource } from '@addons/notifications/classes/notifications-source';
import {
    AddonNotificationsGetReadType,
    AddonNotificationsNotificationMessageFormatted,
} from '@addons/notifications/services/notifications';

/**
 * Provides a list of notifications using legacy web services.
 */
export class AddonLegacyNotificationsNotificationsSource extends AddonNotificationsNotificationsSource {

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{
        items: AddonNotificationsNotificationMessageFormatted[];
        hasMoreItems: boolean;
    }> {
        let items: AddonNotificationsNotificationMessageFormatted[] = [];
        let hasMoreItems = false;
        let pageUnreadCount = 0;
        const pageLength = this.getPageLength();
        const totalUnread = () => this.totals[AddonNotificationsGetReadType.UNREAD] ?? Number.MAX_VALUE;

        // Load unread notifications first.
        if (totalUnread() > page * pageLength) {
            const pageResults = await this.loadNotifications(AddonNotificationsGetReadType.UNREAD, page * pageLength);

            items = items.concat(pageResults.notifications);
            hasMoreItems = pageResults.hasMoreNotifications;
            pageUnreadCount = pageResults.notifications.length;
        }

        // If all unread notifications have been fetched, load read notifications first.
        if (totalUnread() < (page + 1) * pageLength) {
            const offset = Math.max(0, page * pageLength - totalUnread());
            const pageResults = await this.loadNotifications(
                AddonNotificationsGetReadType.READ,
                offset,
                pageLength - pageUnreadCount,
            );

            items = items.concat(pageResults.notifications);
            hasMoreItems = pageResults.hasMoreNotifications;
        }

        return { items, hasMoreItems };
    }

}
