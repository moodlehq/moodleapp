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
import { AddonBlog } from '../blog';
import { ADDONS_BLOG_USER_PROFILE_FEATURE_NAME } from '@addons/blog/constants';

/**
 * Handler to treat links to blog page.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogIndexLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBlogIndexLinkHandler';
    featureName = ADDONS_BLOG_USER_PROFILE_FEATURE_NAME;
    pattern = /\/blog\/index\.php/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        const pageParams: Params = {};

        if (params.userid) {
            pageParams['userId'] = parseInt(params.userid, 10);
        }
        if (params.modid) {
            pageParams['cmId'] = parseInt(params.modid, 10);
        }
        if (params.courseid) {
            pageParams['courseId'] = parseInt(params.courseid, 10);
        }
        if (params.entryid) {
            pageParams['entryId'] = parseInt(params.entryid, 10);
        }
        if (params.groupid) {
            pageParams['groupId'] = parseInt(params.groupid, 10);
        }
        if (params.tagid) {
            pageParams['tagId'] = parseInt(params.tagid, 10);
        }

        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath('/blog', { params: pageParams, siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    isEnabled(siteId: string): Promise<boolean> {
        return AddonBlog.isPluginEnabled(siteId);
    }

}
export const AddonBlogIndexLinkHandler = makeSingleton(AddonBlogIndexLinkHandlerService);
