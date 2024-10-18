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
import { CoreSearchGlobalSearch } from '@features/search/services/global-search';
import { CORE_SEARCH_PAGE_NAME } from '@features/search/services/handlers/mainmenu';
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to search page.
 */
@Injectable( { providedIn: 'root' })
export class CoreSearchGlobalSearchLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreSearchSearchLinkHandler';
    pattern = /\/search/;

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string): Promise<boolean> {
        return CoreSearchGlobalSearch.isEnabled(siteId);
    }

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(CORE_SEARCH_PAGE_NAME, {
                    siteId,
                    params: {
                        query: params.q,
                    },
                });
            },
        }];
    }

}
export const CoreSearchGlobalSearchLinkHandler = makeSingleton(CoreSearchGlobalSearchLinkHandlerService);
