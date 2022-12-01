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
import { AddonMessages } from '../messages';

/**
 * Content links handler for a discussion.
 * Match message index URL with params id, user1 or user2.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesDiscussionLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonMessagesDiscussionLinkHandler';
    pattern = /\/message\/index\.php.*([?&](id|user1|user2)=\d+)/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId): void => {
                const userId = parseInt(params.id || params.user2, 10);
                CoreNavigator.navigateToSitePath(`/messages/discussion/user/${userId}`, { siteId });
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
     * @returns Whether the handler is enabled for the URL and site.
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        const enabled = await AddonMessages.isPluginEnabled(siteId);
        if (!enabled) {
            return false;
        }

        if (params.id === undefined && params.user2 === undefined) {
            // Other user not defined, cannot treat the URL.
            return false;
        }

        if (params.user1 !== undefined) {
            // Check if user1 is the current user, since the app only supports current user.
            const site = await CoreSites.getSite(siteId);

            return parseInt(params.user1, 10) == site.getUserId();
        }

        return true;
    }

}

export const AddonMessagesDiscussionLinkHandler = makeSingleton(AddonMessagesDiscussionLinkHandlerService);
