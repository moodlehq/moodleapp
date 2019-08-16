// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreMainMenuHandler, CoreMainMenuHandlerData } from '@core/mainmenu/providers/delegate';
import { AddonNotificationsProvider } from './notifications';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';
import { CorePushNotificationsDelegate } from '@core/pushnotifications/providers/delegate';

/**
 * Handler to inject an option into main menu.
 */
@Injectable()
export class AddonNotificationsMainMenuHandler implements CoreMainMenuHandler {
    name = 'AddonNotifications';
    priority = 700;

    protected handler: CoreMainMenuHandlerData = {
        icon: 'notifications',
        title: 'addon.notifications.notifications',
        page: 'AddonNotificationsListPage',
        class: 'addon-notifications-handler',
        showBadge: true,
        badge: '',
        loading: true,
    };

    constructor(eventsProvider: CoreEventsProvider, private sitesProvider: CoreSitesProvider,
            utils: CoreUtilsProvider, private notificationsProvider: AddonNotificationsProvider,
            private pushNotificationsProvider: CorePushNotificationsProvider,
            pushNotificationsDelegate: CorePushNotificationsDelegate) {

        eventsProvider.on(AddonNotificationsProvider.READ_CHANGED_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        eventsProvider.on(AddonNotificationsProvider.READ_CRON_EVENT, (data) => {
            this.updateBadge(data.siteId);
        });

        // Reset info on logout.
        eventsProvider.on(CoreEventsProvider.LOGOUT, (data) => {
            this.handler.badge = '';
            this.handler.loading = true;
        });

        // If a push notification is received, refresh the count.
        pushNotificationsDelegate.on('receive').subscribe((notification) => {
            // New notification received. If it's from current site, refresh the data.
            if (utils.isTrueOrOne(notification.notif) && this.sitesProvider.isCurrentSite(notification.site)) {
                this.updateBadge(notification.site);
            }
        });

        // Register Badge counter.
        pushNotificationsDelegate.registerCounterHandler('AddonNotifications');
    }

    /**
     * Check if the handler is enabled on a site level.
     *
     * @return {boolean} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreMainMenuHandlerData} Data needed to render the handler.
     */
    getDisplayData(): CoreMainMenuHandlerData {
        if (this.handler.loading) {
            this.updateBadge();
        }

        return this.handler;
    }

    /**
     * Triggers an update for the badge number and loading status. Mandatory if showBadge is enabled.
     *
     * @param {string} [siteId] Site ID or current Site if undefined.
     */
    updateBadge(siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        if (!siteId) {
            return;
        }

        this.notificationsProvider.getUnreadNotificationsCount(null, siteId).then((unread) => {
            this.handler.badge = unread > 0 ? String(unread) : '';
            this.pushNotificationsProvider.updateAddonCounter('AddonNotifications', unread, siteId);
        }).catch(() => {
            this.handler.badge = '';
        }).finally(() => {
            this.handler.loading = false;
        });
    }
}
