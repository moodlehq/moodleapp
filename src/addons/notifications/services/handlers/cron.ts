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

import { CoreApp } from '@services/app';
import { CoreCronHandler } from '@services/cron';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonNotifications, AddonNotificationsProvider } from '../notifications';

/**
 * Notifications cron handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsCronHandlerService implements CoreCronHandler {

    name = 'AddonNotificationsCronHandler';

    /**
     * Get the time between consecutive executions.
     *
     * @return Time between consecutive executions (in ms).
     */
    getInterval(): number {
        return CoreApp.isMobile() ? 600000 : 60000; // 1 or 10 minutes.
    }

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @return Whether it's a synchronization process or not.
     */
    isSync(): boolean {
        // This is done to use only wifi if using the fallback function.
        return !AddonNotifications.isPreciseNotificationCountEnabled();
    }

    /**
     * Check whether the sync can be executed manually. Call isSync if not defined.
     *
     * @return Whether the sync can be executed manually.
     */
    canManualSync(): boolean {
        return true;
    }

    /**
     * Execute the process.
     * Receives the ID of the site affected, undefined for all sites.
     *
     * @param siteId ID of the site affected, undefined for all sites.
     * @param force Wether the execution is forced (manual sync).
     * @return Promise resolved when done, rejected if failure. If the promise is rejected, this function
     *         will be called again often, it shouldn't be abused.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(siteId?: string, force?: boolean): Promise<void> {
        if (!CoreSites.isCurrentSite(siteId)) {
            return;
        }

        CoreEvents.trigger(AddonNotificationsProvider.READ_CRON_EVENT, {}, CoreSites.getCurrentSiteId());
    }

}

export const AddonNotificationsCronHandler = makeSingleton(AddonNotificationsCronHandlerService);
