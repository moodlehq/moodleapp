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
import { ADDON_MOD_DATA_FEATURE_NAME } from '@addons/mod/data/constants';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction, CoreContentLinksHandler } from '@features/contentlinks/services/contentlinks-delegate';
import type { AddonModDataEditLinkHandlerLazyService } from '@addons/mod/data/services/handlers/edit-link-lazy';

export class AddonModDataEditLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModDataEditLinkHandler';
    featureName = ADDON_MOD_DATA_FEATURE_NAME;
    pattern = /\/mod\/data\/edit\.php.*([?&](d|rid)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        return [{
            action: (siteId) => this.handleAction(siteId, params),
        }];
    }

    /**
     * Handle link action.
     *
     * @param siteId Site id.
     * @param params Params.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleAction(siteId: string, params: Record<string, string>): Promise<void> {
        // Stub to override.
    }

}

/**
 * Get edit link handler instance.
 *
 * @returns Link handler.
 */
export function getEditLinkHandlerInstance(): CoreContentLinksHandler {
    const lazyHandler = asyncInstance<
        AddonModDataEditLinkHandlerLazyService,
        AddonModDataEditLinkHandlerService
    >(async () => {
        const { AddonModDataEditLinkHandler } = await import('./edit-link-lazy');

        return AddonModDataEditLinkHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModDataEditLinkHandlerService());
    lazyHandler.setLazyOverrides(['isEnabled', 'handleAction']);

    return lazyHandler;
}
