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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonBlogProvider } from './blog';

/**
 * Handler to treat links to blog page.
 */
@Injectable()
export class AddonBlogIndexLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonBlogIndexLinkHandler';
    featureName = 'CoreUserDelegate_AddonBlog:blogs';
    pattern = /\/blog\/index\.php/;

    constructor(private blogProvider: AddonBlogProvider, private linkHelper: CoreContentLinksHelperProvider) {
        super();
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        const pageParams: any = {};

        params.userid ? pageParams['userId'] = parseInt(params.userid, 10) : null;
        params.modid ? pageParams['cmId'] = parseInt(params.modid, 10) : null;
        params.courseid ? pageParams['courseId'] = parseInt(params.courseid, 10) : null;
        params.entryid ? pageParams['entryId'] = parseInt(params.entryid, 10) : null;
        params.groupid ? pageParams['groupId'] = parseInt(params.groupid, 10) : null;
        params.tagid ? pageParams['tagId'] = parseInt(params.tagid, 10) : null;

        return [{
            action: (siteId, navCtrl?): void => {
                this.linkHelper.goInSite(navCtrl, 'AddonBlogEntriesPage', pageParams, siteId, !Object.keys(pageParams).length);
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

        return this.blogProvider.isPluginEnabled(siteId);
    }
}
