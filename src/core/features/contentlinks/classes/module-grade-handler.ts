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

import { CoreContentLinksAction } from '../services/contentlinks-delegate';
import { CoreContentLinksHandlerBase } from './base-handler';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseHelper } from '@features/course/services/course-helper';

/**
 * Handler to handle URLs pointing to the grade of a module.
 */
export class CoreContentLinksModuleGradeHandler extends CoreContentLinksHandlerBase {

    /**
     * Whether the module can be reviewed in the app. If true, the handler needs to implement the goToReview function.
     */
    canReview = false;

    /**
     * If this boolean is set to true, the app will retrieve all modules with this modName with a single WS call.
     * This reduces the number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     */
    protected useModNameToGetModule = false;

    /**
     * Construct the handler.
     *
     * @param addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param modName Name of the module (assign, book, ...).
     */
    constructor(
        public addon: string,
        public modName: string,
    ) {
        super();

        // Match the grade.php URL with an id param.
        this.pattern = new RegExp('/mod/' + modName + '/grade.php.*([&?]id=\\d+)');
        this.featureName = 'CoreCourseModuleDelegate_' + addon;
    }

    /**
     * Get the list of actions for a link (url).
     *
     * @param siteIds Unused. List of sites the URL belongs to.
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL. Optional but recommended.
     * @return List of (or promise resolved with list of) actions.
     */
    getActions(
        siteIds: string[],
        url: string,
        params: Record<string, string>,
        courseId?: number,
    ): CoreContentLinksAction[] | Promise<CoreContentLinksAction[]> {

        courseId = Number(courseId || params.courseid || params.cid);

        return [{
            action: async (siteId): Promise<void> => {
                // Check if userid is the site's current user.
                const modal = await CoreDomUtils.showModalLoading();
                const site = await CoreSites.getSite(siteId);
                if (!params.userid || Number(params.userid) == site.getUserId()) {
                    // No user specified or current user. Navigate to module.
                    CoreCourseHelper.navigateToModule(
                        Number(params.id),
                        siteId,
                        courseId,
                        undefined,
                        this.useModNameToGetModule ? this.modName : undefined,
                    );
                } else if (this.canReview) {
                    // Use the goToReview function.
                    this.goToReview(url, params, courseId!, siteId);
                } else {
                    // Not current user and cannot review it in the app, open it in browser.
                    site.openInBrowserWithAutoLogin(url);
                }

                modal.dismiss();
            },
        }];
    }

    /**
     * Go to the page to review.
     *
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL.
     * @param siteId Site to use.
     * @return Promise resolved when done.
     */
    protected async goToReview(
        url: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        params: Record<string, string>, // eslint-disable-line @typescript-eslint/no-unused-vars
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<void> {
        // This function should be overridden.
        return;
    }

}
