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
import type { AddonModWikiCreateLinkHandlerLazyService } from '@addons/mod/wiki/services/handlers/create-link-lazy';

export class AddonModWikiCreateLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModWikiCreateLinkHandler';
    featureName = ADDON_MOD_WIKI_FEATURE_NAME;
    pattern = /\/mod\/wiki\/create\.php.*([&?]swid=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] {
        courseId = Number(courseId || params.courseid || params.cid);

        return [{
            action: (siteId) => this.handleAction(siteId, courseId, params),
        }];
    }

    /**
     * Handle link action.
     *
     * @param siteId Site id.
     * @param courseId Course id.
     * @param params Params.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleAction(siteId: string, courseId: number | undefined, params: Record<string, string>): Promise<void> {
        // Stub to override.
    }

}

/**
 * Get create link handler instance.
 *
 * @returns Link handler.
 */
export function getCreateLinkHandlerInstance(): CoreContentLinksHandler {
    const lazyHandler = asyncInstance<
        AddonModWikiCreateLinkHandlerLazyService,
        AddonModWikiCreateLinkHandlerService
    >(async () => {
        const { AddonModWikiCreateLinkHandler } = await import('./create-link-lazy');

        return AddonModWikiCreateLinkHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModWikiCreateLinkHandlerService());
    lazyHandler.setLazyOverrides(['handleAction']);

    return lazyHandler;
}
