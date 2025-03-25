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

import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';
import { ADDONS_NOTICATIONS_SETTINGS_PAGE_NAME } from '@addons/notifications/constants';

/**
 * Handler to treat links to notification preferences.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsPreferencesLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonNotificationsPreferencesLinkHandler';
    pattern = /\/message\/notificationpreferences\.php/;
    checkAllUsers = true;
    featureName = 'CoreMainMenuDelegate_AddonNotifications';

    /**
     * @inheritdoc
     */
    getActions(): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(
                    `preferences/${ADDONS_NOTICATIONS_SETTINGS_PAGE_NAME}`,
                    { siteId },
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        if (params.userid) {
            // Check it's current user ID.
            const site = await CoreSites.getSite(siteId);

            if (Number(params.userid) !== site.getUserId()) {
                return false;
            }
        }

        return true;
    }

}

export const AddonNotificationsPreferencesLinkHandler = makeSingleton(AddonNotificationsPreferencesLinkHandlerService);
