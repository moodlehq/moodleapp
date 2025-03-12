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
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreLoadings } from '@services/overlays/loadings';
import { makeSingleton } from '@singletons';
import { ADDON_MOD_FORUM_FEATURE_NAME, ADDON_MOD_FORUM_PAGE_NAME } from '../../constants';

/**
 * Content links handler for forum new discussion.
 * Match mod/forum/post.php?forum=6 with a valid data.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumPostLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModForumPostLinkHandler';
    featureName = ADDON_MOD_FORUM_FEATURE_NAME;
    pattern = /\/mod\/forum\/post\.php.*([?&](forum)=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId): Promise<void> => {
                const modal = await CoreLoadings.show();
                const forumId = parseInt(params.forum, 10);

                try {
                    const module = await CoreCourse.getModuleBasicInfoByInstance(
                        forumId,
                        'forum',
                        { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                    );

                    await CoreNavigator.navigateToSitePath(
                        `${ADDON_MOD_FORUM_PAGE_NAME}/${module.course}/${module.id}/new/0`,
                        { siteId, params: { forumId: module.instance } },
                    );
                } finally {
                    // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
                    modal.dismiss();
                }
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string, params: Record<string, string>): Promise<boolean> {
        return params.forum !== undefined;
    }

}

export const AddonModForumPostLinkHandler = makeSingleton(AddonModForumPostLinkHandlerService);
