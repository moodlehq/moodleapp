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
import { Params } from '@angular/router';
import { CoreContentLinksHandlerBase } from '@features/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton } from '@singletons';
import { AddonModForumModuleHandlerService } from './module';

/**
 * Content links handler for forum new discussion.
 * Match mod/forum/post.php?forum=6 with a valid data.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumPostLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModForumPostLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModForum';
    pattern = /\/mod\/forum\/post\.php.*([?&](forum)=\d+)/;

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Params,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: async (siteId): Promise<void> => {
                const modal = await CoreDomUtils.showModalLoading();
                const forumId = parseInt(params.forum, 10);

                try {
                    const module = await CoreCourse.getModuleBasicInfoByInstance(forumId, 'forum', siteId);

                    await CoreNavigator.navigateToSitePath(
                        `${AddonModForumModuleHandlerService.PAGE_NAME}/${module.course}/${module.id}/new/0`,
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
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param siteId The site ID.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return Whether the handler is enabled for the URL and site.
     */
    async isEnabled(siteId: string, url: string, params: Params): Promise<boolean> {
        return typeof params.forum != 'undefined';
    }

}

export const AddonModForumPostLinkHandler = makeSingleton(AddonModForumPostLinkHandlerService);
