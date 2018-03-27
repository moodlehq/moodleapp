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
import { AddonNotificationsProvider } from './notifications';

/**
 * Notifications cron handler.
 */
@Injectable()
export class AddonNotificationsCronHandler implements CoreCronHandler {
    name = 'AddonNotificationsCronHandler';

    constructor(private appProvider: CoreAppProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private localNotifications: CoreLocalNotificationsProvider,
            private notificationsProvider: AddonNotificationsProvider) {}

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
     *
     * @param {string} [siteId] ID of the site affected. If not defined, all sites.
     * @return {Promise<any>} Promise resolved when done. If the promise is rejected, this function will be called again often,
     *                        it shouldn't be abused.
     */
    execute(siteId?: string): Promise<any> {
        if (this.sitesProvider.isCurrentSite(siteId)) {
            this.eventsProvider.trigger(AddonNotificationsProvider.READ_CRON_EVENT, {}, this.sitesProvider.getCurrentSiteId());
        }

        if (this.appProvider.isDesktop() && this.localNotifications.isAvailable()) {
            /* @todo
            $mmEmulatorHelper.checkNewNotifications(
                mmaNotificationsPushSimulationComponent, fetchNotifications, getTitleAndText, siteId);
            */
        }

        return Promise.resolve(null);
    }
}
