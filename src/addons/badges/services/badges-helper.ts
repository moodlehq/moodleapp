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

import { makeSingleton } from '@singletons';
import { AddonBadges } from './badges';
import { CoreSites } from '@services/sites';

/**
 * Helper service that provides some features for badges.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesHelperProvider {

    /**
     * Return whether the badge can be opened in the app.
     *
     * @param badgeHash Badge hash.
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether the badge can be opened in the app.
     */
    async canOpenBadge(badgeHash: string, siteId?: string): Promise<boolean> {
        if (!AddonBadges.isPluginEnabled(siteId)) {
            return false;
        }

        const site = await CoreSites.getSite(siteId);

        if (site.isVersionGreaterEqualThan('4.5')) {
            // The WS to fetch a badge by hash is available and it returns the name of the recipient.
            return true;
        }

        // Open in app if badge is one of the user badges.
        const badges = await AddonBadges.getUserBadges(0, site.getUserId());
        const badge = badges.find((badge) => badgeHash == badge.uniquehash);

        return badge !== undefined;
    }

}

export const AddonBadgesHelper = makeSingleton(AddonBadgesHelperProvider);
