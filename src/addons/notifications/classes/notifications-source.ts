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

import {
    AddonNotifications,
    AddonNotificationsGetReadType,
    AddonNotificationsProvider,
} from '@addons/notifications/services/notifications';
import { AddonNotificationsNotificationToRender } from '@addons/notifications/services/notifications-helper';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';

/**
 * Provides a list of notifications.
 */
export class AddonNotificationsNotificationsSource extends CoreRoutedItemsManagerSource<AddonNotificationsNotificationToRender> {

    protected totals: Record<string, number> = {};

    /**
     * @inheritdoc
     */
    getItemPath(notification: AddonNotificationsNotificationToRender): string {
        return notification.id.toString();
    }

    /**
     * @inheritdoc
     */
    reset(): void {
        this.totals = {};

        super.reset();
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{
        items: AddonNotificationsNotificationToRender[];
        hasMoreItems: boolean;
    }> {
        const results = await this.loadNotifications(AddonNotificationsGetReadType.BOTH, page * this.getPageLength());

        return {
            items: results.notifications,
            hasMoreItems: results.hasMoreNotifications,
        };
    }

    /**
     * Load notifications of the given type.
     *
     * @param type Type.
     * @param offset Offset.
     * @param limit Limit.
     * @returns Notifications and whether there are any more.
     */
    protected async loadNotifications(type: AddonNotificationsGetReadType, offset: number, limit?: number): Promise<{
        notifications: AddonNotificationsNotificationToRender[];
        hasMoreNotifications: boolean;
    }> {
        limit = limit ?? this.getPageLength();

        if (type in this.totals && this.totals[type] <= offset) {
            return {
                notifications: [],
                hasMoreNotifications: false,
            };
        }

        const notifications = await AddonNotifications.getNotificationsWithStatus(type, { offset, limit });

        if (notifications.length < limit) {
            this.totals[type] = offset + notifications.length;
        }

        return {
            notifications,
            hasMoreNotifications: (this.totals[type] ?? Number.MAX_VALUE) > offset + limit,
        };
    }

    /**
     * @inheritdoc
     */
    protected setItems(notifications: AddonNotificationsNotificationToRender[], hasMoreItems: boolean): void {
        const sortedNotifications = notifications.slice(0);

        sortedNotifications.sort((a, b) => a.timecreated < b.timecreated ? 1 : -1);

        super.setItems(sortedNotifications, hasMoreItems);
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return AddonNotificationsProvider.LIST_LIMIT;
    }

}
