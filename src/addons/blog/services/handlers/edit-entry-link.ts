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
 * Handler to treat links to edit blog entry page.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlogEditEntryLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'AddonBlogEditEntryLinkHandler';
    featureName = ADDONS_BLOG_USER_PROFILE_FEATURE_NAME;
    pattern = /\/blog\/(add|edit)\.php/;

    /**
     * @inheritdoc
     */
    getActions(siteIds: string[], url: string, params: Record<string, string>): CoreContentLinksAction[] {
        const pageParams: Params = {};

        pageParams.courseId = params.courseid;
        pageParams.cmId = params.modid;

        return [{
            action: async (siteId: string): Promise<void> => {
                await CoreNavigator.navigateToSitePath(`/blog/edit/${params.entryid ?? 0}`, { params: pageParams, siteId });
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
export const AddonBlogEditEntryLinkHandler = makeSingleton(AddonBlogEditEntryLinkHandlerService);
