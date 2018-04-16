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
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { AddonModFeedbackProvider } from './feedback';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Content links handler for feedback show entries questions.
 * Match mod/feedback/show_entries.php with a valid feedback id.
 */
@Injectable()
export class AddonModFeedbackShowEntriesLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModFeedbackShowEntriesLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModFeedback';
    pattern = /\/mod\/feedback\/show_entries\.php.*([\?\&](id|showcompleted)=\d+)/;

    constructor(private linkHelper: CoreContentLinksHelperProvider, private feedbackProvider: AddonModFeedbackProvider,
            private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider) {
        super();
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
        return [{
            action: (siteId, navCtrl?): void => {
                const modal = this.domUtils.showModalLoading(),
                    moduleId = params.id;

                this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
                    let stateParams;

                    if (typeof params.showcompleted == 'undefined') {
                        // Param showcompleted not defined. Show entry list.
                        stateParams = {
                            moduleId: module.id,
                            module: module,
                            courseId: module.course
                        };

                        return this.linkHelper.goInSite(navCtrl, 'AddonModFeedbackRespondentsPage', stateParams, siteId);
                    }

                    return this.feedbackProvider.getAttempt(module.instance, params.showcompleted, siteId).then((attempt) => {
                        stateParams = {
                            moduleId: module.id,
                            attempt: attempt,
                            attemptId: attempt.id,
                            feedbackId: module.instance
                        };

                        return this.linkHelper.goInSite(navCtrl, 'AddonModFeedbackAttemptPage', stateParams, siteId);
                    });
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
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
        return this.feedbackProvider.isPluginEnabled(siteId).then((enabled) => {
            if (!enabled) {
                return false;
            }

            if (typeof params.id == 'undefined') {
                // Cannot treat the URL.
                return false;
            }

            return true;
        });
    }
}
