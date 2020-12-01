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
import { CoreContentLinksHelper } from '@features/contentlinks/services/contentlinks-helper';

/**
 * Handler to treat links to user profiles.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserProfileLinkHandler extends CoreContentLinksHandlerBase {

    name = 'CoreUserProfileLinkHandler';
    // Match user/view.php and user/profile.php but NOT grade/report/user/.
    pattern = /((\/user\/view\.php)|(\/user\/profile\.php)).*([?&]id=\d+)/;

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
    getActions(
        siteIds: string[],
        url: string,
        params: Params,
        courseId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        data?: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {
        return [{
            action: (siteId): void => {
                const pageParams = {
                    courseId: params.course,
                    userId: parseInt(params.id, 10),
                };

                CoreContentLinksHelper.instance.goInSite('/user', pageParams, siteId);
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isEnabled(siteId: string, url: string, params: Params, courseId?: number): boolean | Promise<boolean> {
        return url.indexOf('/grade/report/') == -1;
    }

}
