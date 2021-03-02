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

import { CoreSites } from '@services/sites';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreSiteHome } from '../sitehome';
import { makeSingleton } from '@singletons';
import { CoreNavigator } from '@services/navigator';

/**
 * Handler to treat links to site home index.
 */
@Injectable({ providedIn: 'root' })
export class CoreSiteHomeIndexLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreSiteHomeIndexLinkHandler';
    featureName = 'CoreMainMenuDelegate_CoreSiteHome';
    pattern = /\/course\/view\.php.*([?&]id=\d+)/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId: string): void => {
                // @todo This should open the 'sitehome' setting as well.
                CoreNavigator.navigateToSiteHome({ siteId });
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
    async isEnabled(siteId: string, url: string, params: Record<string, string>, courseId?: number): Promise<boolean> {
        courseId = parseInt(params.id, 10);
        if (!courseId) {
            return false;
        }

        const site = await CoreSites.getSite(siteId);
        if (courseId != site.getSiteHomeId()) {
            // The course is not site home.
            return false;
        }

        return CoreSiteHome.isAvailable(siteId).then(() => true).catch(() => false);
    }

}

export const CoreSiteHomeIndexLinkHandler = makeSingleton(CoreSiteHomeIndexLinkHandlerService);
