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
import { ADDONS_NOTICATIONS_MENU_FEATURE_NAME, ADDONS_NOTIFICATIONS_READ_CRON_EVENT } from '@addons/notifications/constants';

/**
 * Notifications cron handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsCronHandlerService implements CoreCronHandler {

    name = 'AddonNotificationsCronHandler';

    /**
     * @inheritdoc
     */
    getInterval(): number {
        return CorePlatform.isMobile() ? 600000 : 240000; // 4 or 10 minutes.
    }

    /**
     * @inheritdoc
     */
    isSync(): boolean {
        return false;
    }

    /**
     * @inheritdoc
     */
    canManualSync(): boolean {
        return true;
    }

    /**
     * @inheritdoc
     */
    async execute(siteId?: string): Promise<void> {
        const site = CoreSites.getCurrentSite();

        if (
            !CoreSites.isCurrentSite(siteId) ||
            !site ||
            site.isFeatureDisabled(ADDONS_NOTICATIONS_MENU_FEATURE_NAME)
        ) {
            return;
        }

        CoreEvents.trigger(ADDONS_NOTIFICATIONS_READ_CRON_EVENT, {}, CoreSites.getCurrentSiteId());
    }

}

export const AddonNotificationsCronHandler = makeSingleton(AddonNotificationsCronHandlerService);
