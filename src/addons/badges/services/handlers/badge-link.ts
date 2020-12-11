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
import { Params } from '@angular/router';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreNavHelper } from '@services/nav-helper';
import { makeSingleton } from '@singletons';
import { AddonBadges } from '../badges';


/**
 * Handler to treat links to user participants page.
 */
@Injectable({ providedIn: 'root' })
export class AddonBadgesBadgeLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBadgesBadgeLinkHandler';
    pattern = /\/badges\/badge\.php.*([?&]hash=)/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: Params): CoreContentLinksAction[] {

        return [{
            action: (siteId: string): void => {
                CoreNavHelper.instance.goInSite(
                    '/badges/issue',
                    { courseId: 0, badgeHash: params.hash },
                    siteId,
                );
            },
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string): Promise<boolean> {
        return AddonBadges.instance.isPluginEnabled(siteId);
    }

}

export class AddonBadgesBadgeLinkHandler extends makeSingleton(AddonBadgesBadgeLinkHandlerService) {}
