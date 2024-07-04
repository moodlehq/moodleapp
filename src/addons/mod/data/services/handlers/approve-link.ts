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
import type { AddonModDataApproveLinkHandlerLazyService } from '@addons/mod/data/services/handlers/approve-link-lazy';

export class AddonModDataApproveLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModDataApproveLinkHandler';
    featureName = ADDON_MOD_DATA_FEATURE_NAME;
    pattern = /\/mod\/data\/view\.php.*([?&](d|approve|disapprove)=\d+)/;
    priority = 50; // Higher priority than the default link handler for view.php.

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>, courseId?: number): CoreContentLinksAction[] {
        return [{
            action: (siteId) => this.handleAction(siteId, params, courseId),
        }];
    }

    /**
     * Handle link action.
     *
     * @param siteId Site id.
     * @param params Params.
     * @param courseId Course id.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async handleAction(siteId: string, params: Record<string, string>, courseId?: number): Promise<void> {
        // Stub to override.
    }

}

/**
 * Get approve link handler instance.
 *
 * @returns Link handler.
 */
export function getApproveLinkHandlerInstance(): CoreContentLinksHandler {
    const lazyHandler = asyncInstance<
        AddonModDataApproveLinkHandlerLazyService,
        AddonModDataApproveLinkHandlerService
    >(async () => {
        const { AddonModDataApproveLinkHandler } = await import('./approve-link-lazy');

        return AddonModDataApproveLinkHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModDataApproveLinkHandlerService());
    lazyHandler.setLazyOverrides(['isEnabled', 'handleAction']);

    return lazyHandler;
}
