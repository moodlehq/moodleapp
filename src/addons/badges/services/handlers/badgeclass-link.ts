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

/**
 * Handler to treat links to badge classes.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesBadgeClassLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBadgesBadgeClassLinkHandler';
    pattern = /\/badges\/badgeclass\.php.*([?&]id=)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {

        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(`/badgeclass/${params.id}`, { siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        const pluginEnabled = await AddonBadges.isPluginEnabled(siteId);
        const wsAvailable = await AddonBadges.isGetBadgeClassAvailable(siteId);

        return pluginEnabled && wsAvailable;
    }

}

export const AddonBadgesBadgeClassLinkHandler = makeSingleton(AddonBadgesBadgeClassLinkHandlerService);
