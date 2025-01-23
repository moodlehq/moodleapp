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
import { AddonMessages } from '../messages';
import { ADDON_MESSAGES_PAGE_NAME } from '@addons/messages/constants';

/**
 * Content links handler for messaging index.
 * Match message index URL without params id, user1 or user2.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesIndexLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonMessagesIndexLinkHandler';
    pattern = /\/message\/index\.php((?![?&](id|user1|user2)=\d+).)*$/;

    /**
     * Get the list of actions for a link (url).
     *
     * @returns List of (or promise resolved with list of) actions.
     */
    getActions(): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId): Promise<void> => {
                await CoreNavigator.navigateToSitePath(ADDON_MESSAGES_PAGE_NAME, {
                    siteId,
                    preferCurrentTab: false,
                });
            },
        }];
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @returns Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string): Promise<boolean> {
        return AddonMessages.isPluginEnabled(siteId);
    }

}

export const AddonMessagesIndexLinkHandler = makeSingleton(AddonMessagesIndexLinkHandlerService);
