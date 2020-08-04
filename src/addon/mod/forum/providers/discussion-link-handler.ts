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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Handler to treat links to forum review.
 */
@Injectable()
export class AddonModForumDiscussionLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModForumDiscussionLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModForum';
    pattern = /\/mod\/forum\/discuss\.php.*([\&\?]d=\d+)/;

    constructor(protected domUtils: CoreDomUtilsProvider, protected linkHelper: CoreContentLinksHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @param data Extra data to handle the URL.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number, data?: any):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        data = data || {};

        // On 3.6 downwards, it will open the discussion but without knowing the lock status of the discussion.
        // However canreply will be false.

        return [{
            action: (siteId, navCtrl?): void => {
                const pageParams: any = {
                    courseId: courseId || parseInt(params.courseid, 10) || parseInt(params.cid, 10) || undefined,
                    discussionId: parseInt(params.d, 10),
                    cmId: data.cmid && parseInt(data.cmid, 10),
                    forumId: data.instance && parseInt(data.instance, 10)
                };

                if (data.postid || params.urlHash) {
                    pageParams.postId = parseInt(data.postid || params.urlHash.replace('p', ''));
                }
                if (params.parent) {
                    pageParams.parent = parseInt(params.parent);
                }

                this.linkHelper.goInSite(navCtrl, 'AddonModForumDiscussionPage', pageParams, siteId);
            }
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
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        return true;
    }
}
