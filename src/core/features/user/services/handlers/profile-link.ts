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
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { makeSingleton } from '@singletons';

/**
 * Handler to treat links to user profiles.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProfileLinkHandlerService extends CoreContentLinksHandlerBase {

    name = 'CoreUserProfileLinkHandler';
    // Match user/view.php and user/profile.php but NOT grade/report/user/.
    pattern = /(\/user\/view\.php)|(\/user\/profile\.php)/;

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
                let userId = params.id ? parseInt(params.id, 10) : 0;
                if (!userId) {
                    const site = await CoreSites.getSite(siteId);
                    userId = site.getUserId();
                }

                const pageParams = {
                    courseId: params.course,
                    userId,
                };

                CoreNavigator.navigateToSitePath('/user', { params: pageParams, siteId });
            },
        }];
    }

    /**
     * @inheritdoc
     */
    async isEnabled(siteId: string, url: string): Promise<boolean> {
        return url.indexOf('/grade/report/') === -1;
    }

}

export const CoreUserProfileLinkHandler = makeSingleton(CoreUserProfileLinkHandlerService);
