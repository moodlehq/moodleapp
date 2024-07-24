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
import type { AddonModDataDeleteLinkHandlerLazyService } from '@addons/mod/data/services/handlers/delete-link-lazy';

export class AddonModDataDeleteLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModDataDeleteLinkHandler';
    featureName = ADDON_MOD_DATA_FEATURE_NAME;
    pattern = /\/mod\/data\/view\.php.*([?&](d|delete)=\d+)/;

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
 * Get delete link handler instance.
 *
 * @returns Link handler.
 */
export function getDeleteLinkHandlerInstance(): CoreContentLinksHandler {
    const lazyHandler = asyncInstance<
        AddonModDataDeleteLinkHandlerLazyService,
        AddonModDataDeleteLinkHandlerService
    >(async () => {
        const { AddonModDataDeleteLinkHandler } = await import('./delete-link-lazy');

        return AddonModDataDeleteLinkHandler.instance;
    });

    lazyHandler.setEagerInstance(new AddonModDataDeleteLinkHandlerService());
    lazyHandler.setLazyOverrides(['isEnabled', 'handleAction']);

    return lazyHandler;
}
