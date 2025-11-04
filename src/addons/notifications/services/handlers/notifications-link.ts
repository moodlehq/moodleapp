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
import { makeSingleton } from '@singletons';
import { ADDONS_NOTICATIONS_MAIN_PAGE_NAME } from '@addons/notifications/constants';

/**
 * Handler to treat links to notifications.
 */
@Injectable({ providedIn: 'root' })
export class AddonNotificationsLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonNotificationsLinkHandler';
    pattern = /\/message\/output\/popup\/notifications\.php/;
    featureName = 'CoreMainMenuDelegate_AddonNotifications';

    /**
     * @inheritdoc
     */
    getActions(): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(ADDONS_NOTICATIONS_MAIN_PAGE_NAME, {
                    preferCurrentTab: false,
                    siteId,
                });
            },
        }];
    }

}

export const AddonNotificationsLinkHandler = makeSingleton(AddonNotificationsLinkHandlerService);
