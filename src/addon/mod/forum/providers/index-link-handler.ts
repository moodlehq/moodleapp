// (C) Copyright 2015 Martin Dougiamas
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
import { CoreContentLinksModuleIndexHandler } from '@core/contentlinks/classes/module-index-handler';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModForumProvider } from './forum';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Handler to treat links to forum index.
 */
@Injectable()
export class AddonModForumIndexLinkHandler extends CoreContentLinksModuleIndexHandler {
    name = 'AddonModForumIndexLinkHandler';

    constructor(courseHelper: CoreCourseHelperProvider, protected forumProvider: AddonModForumProvider,
            private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider) {
        super(courseHelper, 'AddonModForum', 'forum');

        // Match the view.php URL with an id param.
        this.pattern = new RegExp('\/mod\/forum\/view\.php.*([\&\?](f|id)=\\d+)');
    }

    /**
     * Check if the handler is enabled for a certain site (site + user) and a URL.
     * If not defined, defaults to true.
     *
     * @param {string} siteId The site ID.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {boolean|Promise<boolean>} Whether the handler is enabled for the URL and site.
     */
    isEnabled(siteId: string, url: string, params: any, courseId?: number): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param {string[]} siteIds List of sites the URL belongs to.
     * @param {string} url The URL to treat.
     * @param {any} params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param {number} [courseId] Course ID related to the URL. Optional but recommended.
     * @return {CoreContentLinksAction[]|Promise<CoreContentLinksAction[]>} List of (or promise resolved with list of) actions.
     */
    getActions(siteIds: string[], url: string, params: any, courseId?: number):
            CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        if (typeof params.f != 'undefined') {
            return [{
                action: (siteId, navCtrl?): void => {
                    const modal = this.domUtils.showModalLoading(),
                        forumId = parseInt(params.f, 10);

                    this.courseProvider.getModuleBasicInfoByInstance(forumId, 'forum', siteId).then((module) => {
                        this.courseHelper.navigateToModule(parseInt(module.id, 10), siteId, module.course, undefined,
                                undefined, undefined, navCtrl);
                    }).finally(() => {
                        // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
                        modal.dismiss();
                    });
                }
            }];
        }

        return super.getActions(siteIds, url, params, courseId);
    }
}
