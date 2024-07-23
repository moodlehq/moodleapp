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

import { asyncInstance } from '@/core/utils/async-instance';
import { ADDON_MOD_WIKI_FEATURE_NAME } from '@addons/mod/wiki/constants';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction, CoreContentLinksHandler } from '@features/contentlinks/services/contentlinks-delegate';
import type { AddonModWikiPageOrMapLinkHandlerLazyService } from '@addons/mod/wiki/services/handlers/page-or-map-link-lazy';

export class AddonModWikiPageOrMapLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModWikiPageOrMapLinkHandler';
    featureName = ADDON_MOD_WIKI_FEATURE_NAME;
    pattern = /\/mod\/wiki\/(view|map)\.php.*([&?]pageid=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: (siteId) => this.handleAction(url, siteId, params),
        }];
    }

    /**
     * Handle link action.
     *
     * @param url Url.
     * @param siteId Site id.
     * @param params Params.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleAction(url: string, siteId: string, params: Record<string, string>): Promise<void> {
        // Stub to override.
    }

}

/**
 * Get page or map link handler instance.
 *
 * @returns Link handler.
 */
export function getPageOrMapLinkHandlerInstance(): CoreContentLinksHandler {
    const lazyHandler = asyncInstance<
        AddonModWikiPageOrMapLinkHandlerLazyService,
        AddonModWikiPageOrMapLinkHandlerService
    >(async () => {
        const { AddonModWikiPageOrMapLinkHandler } = await import('./page-or-map-link-lazy');

        return AddonModWikiPageOrMapLinkHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWikiPageOrMapLinkHandlerService());
    lazyHandler.setLazyOverrides(['isEnabled', 'handleAction']);

    return lazyHandler;
}
