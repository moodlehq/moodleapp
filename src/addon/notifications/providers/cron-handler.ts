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
import { CoreAppProvider } from '@providers/app';
import { CoreCronHandler } from '@providers/cron';
import { CoreEventsProvider } from '@providers/events';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreEmulatorHelperProvider } from '@core/emulator/providers/helper';
import { AddonNotificationsProvider } from './notifications';
import { AddonNotificationsHelperProvider } from './helper';

/**
 * Notifications cron handler.
 */
@Injectable()
export class AddonNotificationsCronHandler implements CoreCronHandler {
    name = 'AddonNotificationsCronHandler';

    constructor(private appProvider: CoreAppProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private localNotifications: CoreLocalNotificationsProvider,
            private notificationsProvider: AddonNotificationsProvider, private textUtils: CoreTextUtilsProvider,
            private emulatorHelper: CoreEmulatorHelperProvider, private notificationsHelper: AddonNotificationsHelperProvider) {}

    /**
     * Get the time between consecutive executions.
     *
     * @return {number} Time between consecutive executions (in ms).
     */
    getInterval(): number {
        return this.appProvider.isDesktop() ? 60000 : 600000; // 1 or 10 minutes.
    }

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @return {boolean} Whether it's a synchronization process or not.
     */
    isSync(): boolean {
        // This is done to use only wifi if using the fallback function.
        // In desktop it is always sync, since it fetches notification to see if there's a new one.
        return !this.notificationsProvider.isPreciseNotificationCountEnabled() || this.appProvider.isDesktop();
    }

    /**
     * Check whether the sync can be executed manually. Call isSync if not defined.
     *
     * @return {boolean} Whether the sync can be executed manually.
     */
    canManualSync(): boolean {
        return true;
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param  {string} [siteId] ID of the site affected, undefined for all sites.
     * @param {boolean} [force] Wether the execution is forced (manual sync).
     * @return {Promise<any>}         Promise resolved when done, rejected if failure. If the promise is rejected, this function
     *                                will be called again often, it shouldn't be abused.
     */
    execute(siteId?: string, force?: boolean): Promise<any> {
        if (this.sitesProvider.isCurrentSite(siteId)) {
            this.eventsProvider.trigger(AddonNotificationsProvider.READ_CRON_EVENT, {}, this.sitesProvider.getCurrentSiteId());
        }

        if (this.appProvider.isDesktop() && this.localNotifications.isAvailable()) {
            this.emulatorHelper.checkNewNotifications(
                AddonNotificationsProvider.PUSH_SIMULATION_COMPONENT,
                this.fetchNotifications.bind(this), this.getTitleAndText.bind(this), siteId);
        }

        return Promise.resolve(null);
    }

    /**
     * Get the latest unread notifications from a site.
     *
     * @param  {string} siteId  Site ID.
     * @return {Promise<any[]>} Promise resolved with the notifications.
     */
    protected fetchNotifications(siteId: string): Promise<any[]> {
        return this.notificationsHelper.getNotifications([], undefined, true, false, true, siteId).then((result) => {
            return result.notifications;
        });
    }

    /**
     * Given a notification, return the title and the text for the notification.
     *
     * @param  {any} notification Notification.
     * @return {Promise<any>} Promise resvoled with an object with title and text.
     */
    protected getTitleAndText(notification: any): Promise<any> {
        const data = {
            title: notification.subject || notification.userfromfullname,
            text: notification.mobiletext.replace(/-{4,}/ig, '')
        };
        data.text = this.textUtils.replaceNewLines(data.text, '<br>');

        return Promise.resolve(data);
    }
}
