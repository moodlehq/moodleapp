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

import { CoreCronHandler } from '@services/cron';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonNotificationsProvider } from '../notifications';

/**
 * Notifications cron handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsCronHandlerService implements CoreCronHandler {

    name = 'AddonNotificationsCronHandler';

    /**
     * Get the time between consecutive executions.
     *
     * @returns Time between consecutive executions (in ms).
     */
    getInterval(): number {
        return CorePlatform.isMobile() ? 600000 : 60000; // 1 or 10 minutes.
    }

    /**
     * Check whether it's a synchronization process or not. True if not defined.
     *
     * @returns Whether it's a synchronization process or not.
     */
    isSync(): boolean {
        return false;
    }

    /**
     * Check whether the sync can be executed manually. Call isSync if not defined.
     *
     * @returns Whether the sync can be executed manually.
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
     * @returns Promise resolved when done, rejected if failure. If the promise is rejected, this function
     *         will be called again often, it shouldn't be abused.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async execute(siteId?: string, force?: boolean): Promise<void> {
        const site = CoreSites.getCurrentSite();

        if (
            !CoreSites.isCurrentSite(siteId) ||
            !site ||
            site.isFeatureDisabled('CoreMainMenuDelegate_AddonNotifications')
        ) {
            return;
        }

        CoreEvents.trigger(AddonNotificationsProvider.READ_CRON_EVENT, {}, CoreSites.getCurrentSiteId());
    }

}

export const AddonNotificationsCronHandler = makeSingleton(AddonNotificationsCronHandlerService);
