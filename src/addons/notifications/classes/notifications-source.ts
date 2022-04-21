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

import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { AddonNotifications } from '../services/notifications';
import { AddonNotificationsHelper, AddonNotificationsNotificationToRender } from '../services/notifications-helper';

/**
 * Provides a list of notifications
 */
export class AddonsNotificationsNotificationsSource extends CoreRoutedItemsManagerSource<AddonNotificationsNotificationToRender> {

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{
        items: AddonNotificationsNotificationToRender[];
        hasMoreItems: boolean;
    }> {
        // TODO this should be refactored to avoid using the existing items.
        const { notifications, canLoadMore } = await AddonNotifications.getNotifications(page === 0 ? [] : this.getItems() ?? []);

        return {
            items: notifications.map(notification => AddonNotificationsHelper.formatNotificationText(notification)),
            hasMoreItems: canLoadMore,
        };
    }

    /**
     * @inheritdoc
     */
    getItemPath(notification: AddonNotificationsNotificationToRender): string {
        return notification.id.toString();
    }

}
