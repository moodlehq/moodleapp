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

import { NavController } from 'ionic-angular';
import { CoreContentLinksAction } from '../providers/delegate';
import { CoreContentLinksHandlerBase } from './base-handler';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

/**
 * Handler to handle URLs pointing to the grade of a module.
 */
export class CoreContentLinksModuleGradeHandler extends CoreContentLinksHandlerBase {

    /**
     * Whether the module can be reviewed in the app. If true, the handler needs to implement the goToReview function.
     */
    canReview: boolean;

    /**
     * If this boolean is set to true, the app will retrieve all modules with this modName with a single WS call.
     * This reduces the number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     */
    protected useModNameToGetModule = false;

    /**
     * Construct the handler.
     *
     * @param courseHelper The CoreCourseHelperProvider instance.
     * @param domUtils The CoreDomUtilsProvider instance.
     * @param sitesProvider The CoreSitesProvider instance.
     * @param addon Name of the addon as it's registered in course delegate. It'll be used to check if it's disabled.
     * @param modName Name of the module (assign, book, ...).
     */
    constructor(protected courseHelper: CoreCourseHelperProvider, protected domUtils: CoreDomUtilsProvider,
            protected sitesProvider: CoreSitesProvider, public addon: string, public modName: string) {
        super();

        // Match the grade.php URL with an id param.
        this.pattern = new RegExp('\/mod\/' + modName + '\/grade\.php.*([\&\?]id=\\d+)');
        this.featureName = 'CoreCourseModuleDelegate_' + addon;
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

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                // Check if userid is the site's current user.
                const modal = this.domUtils.showModalLoading();
                this.sitesProvider.getSite(siteId).then((site) => {
                    if (!params.userid || params.userid == site.getUserId()) {
                        // No user specified or current user. Navigate to module.
                        this.courseHelper.navigateToModule(parseInt(params.id, 10), siteId, courseId, undefined,
                                this.useModNameToGetModule ? this.modName : undefined, undefined, navCtrl);
                    } else if (this.canReview) {
                        // Use the goToReview function.
                        this.goToReview(url, params, courseId, siteId, navCtrl);
                    } else {
                        // Not current user and cannot review it in the app, open it in browser.
                        site.openInBrowserWithAutoLogin(url);
                    }
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
    }

    /**
     * Go to the page to review.
     *
     * @param url The URL to treat.
     * @param params The params of the URL. E.g. 'mysite.com?id=1' -> {id: 1}
     * @param courseId Course ID related to the URL.
     * @param siteId Site to use.
     * @param navCtrl Nav Controller to use to navigate.
     * @return Promise resolved when done.
     */
    protected goToReview(url: string, params: any, courseId: number, siteId: string, navCtrl?: NavController): Promise<any> {
        // This function should be overridden.
        return Promise.resolve();
    }
}
