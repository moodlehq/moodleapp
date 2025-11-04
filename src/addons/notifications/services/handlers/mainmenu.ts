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
import { CoreUtils } from '@singletons/utils';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@features/mainmenu/services/mainmenu-delegate';
import { CorePushNotifications } from '@features/pushnotifications/services/pushnotifications';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonNotifications } from '../notifications';
import { MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT } from '@features/mainmenu/constants';
import {
    ADDONS_NOTICATIONS_MAIN_PAGE_NAME,
    ADDONS_NOTIFICATIONS_READ_CHANGED_EVENT,
    ADDONS_NOTIFICATIONS_READ_CRON_EVENT,
} from '@addons/notifications/constants';

/**
 * Handler to inject an option into main menu.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsMainMenuHandlerService implements CoreMainMenuHandler {

    name = 'AddonNotifications';
    priority = 600;

    protected handlerData: CoreMainMenuHandlerData = {
        icon: 'fas-bell',
        title: 'addon.notifications.notifications',
        page: ADDONS_NOTICATIONS_MAIN_PAGE_NAME,
        class: 'addon-notifications-handler',
        showBadge: true,
        badge: '',
        badgeA11yText: 'addon.notifications.unreadnotification',
        loading: true,
    };

    /**
     * Initialize the handler.
     */
    initialize(): void {
        CoreEvents.on(ADDONS_NOTIFICATIONS_READ_CHANGED_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        CoreEvents.on(ADDONS_NOTIFICATIONS_READ_CRON_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        // Reset info on logout.
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            this.handlerData.badge = '';
            this.handlerData.loading = true;
        });

        // If a push notification is received, refresh the count.
        CorePushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New notification received. If it's from current site, refresh the data.
            if (CoreUtils.isTrueOrOne(notification.notif) && CoreSites.isCurrentSite(notification.site)) {
                this.updateBadge(notification.site);
            }
        });

        // Register Badge counter.
        CorePushNotificationsDelegate.registerCounterHandler(AddonNotificationsMainMenuHandlerService.name);
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        if (this.handlerData.loading) {
            this.updateBadge();
        }

        return this.handlerData;
    }

    /**
     * Triggers an update for the badge number and loading status. Mandatory if showBadge is enabled.
     *
     * @param siteId Site ID or current Site if undefined.
     * @returns Promise resolved when done.
     */
    protected async updateBadge(siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        try {
            const unreadCountData = await AddonNotifications.getUnreadNotificationsCount(undefined, siteId);

            this.handlerData.badge = unreadCountData.count > 0
                ? unreadCountData.count + (unreadCountData.hasMore ? '+' : '')
                : '';

            CorePushNotifications.updateAddonCounter(AddonNotificationsMainMenuHandlerService.name, unreadCountData.count, siteId);

            CoreEvents.trigger(
                MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT,
                {
                    handler: AddonNotificationsMainMenuHandlerService.name,
                    value: unreadCountData.count,
                },
                siteId,
            );
        } catch {
            this.handlerData.badge = '';
        } finally {
            this.handlerData.loading = false;
        }
    }

}

export const AddonNotificationsMainMenuHandler = makeSingleton(AddonNotificationsMainMenuHandlerService);
