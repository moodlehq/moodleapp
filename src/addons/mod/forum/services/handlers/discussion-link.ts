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
import { CoreNavigator } from '@services/navigator';
import { makeSingleton } from '@singletons';
import { AddonModForumModuleHandlerService } from './module';

/**
 * Handler to treat links to forum review.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumDiscussionLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonModForumDiscussionLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModForum';
    pattern = /\/mod\/forum\/discuss\.php.*([&?]d=\d+)/;

    /**
     * @inheritdoc
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Params,
        courseId?: number,
        data?: { instance?: string; cmid?: string; postid?: string },
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        data = data || {};

        // On 3.6 downwards, it will open the discussion but without knowing the lock status of the discussion.
        // However canreply will be false.

        return [{
            action: (siteId): void => {
                const discussionId = parseInt(params.d, 10);
                const cmId = data?.cmid && Number(data.cmid);
                courseId = courseId || (params.courseid && Number(params.courseid)) || (params.cid && Number(params.cid));

                const pageParams: Params = {
                    forumId: data?.instance && parseInt(data.instance, 10),
                    cmId,
                    courseId,
                };

                if (data?.postid || params.urlHash) {
                    pageParams.postId = parseInt(data?.postid || params.urlHash.replace('p', ''));
                }

                if (params.parent) {
                    pageParams.parent = parseInt(params.parent);
                }

                CoreNavigator.navigateToSitePath(
                    `${AddonModForumModuleHandlerService.PAGE_NAME}/discussion/${discussionId}`,
                    { siteId, params: pageParams },
                );
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const AddonModForumDiscussionLinkHandler = makeSingleton(AddonModForumDiscussionLinkHandlerService);
