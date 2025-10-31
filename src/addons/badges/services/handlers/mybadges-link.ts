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
import { AddonBadges } from '../badges';
import { ADDONS_BADGES_USER_MENU_FEATURE_NAME } from '@addons/badges/constants';

/**
 * Handler to treat links to user badges page.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesMyBadgesLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBadgesMyBadgesLinkHandler';
    featureName = ADDONS_BADGES_USER_MENU_FEATURE_NAME;
    pattern = /\/badges\/mybadges\.php/;

    /**
     * @inheritdoc
     */
    getActions(): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath('/badges', { siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        return AddonBadges.isPluginEnabled(siteId);
    }

}

export const AddonBadgesMyBadgesLinkHandler = makeSingleton(AddonBadgesMyBadgesLinkHandlerService);
