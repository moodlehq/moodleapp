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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreContentLinksHandlerBase } from '@core/contentlinks/classes/base-handler';
import { CoreContentLinksAction } from '@core/contentlinks/providers/delegate';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModQuizProvider } from './quiz';

/**
 * Handler to treat links to quiz review.
 */
@Injectable()
export class AddonModQuizReviewLinkHandler extends CoreContentLinksHandlerBase {
    name = 'AddonModQuizReviewLinkHandler';
    featureName = 'CoreCourseModuleDelegate_AddonModQuiz';
    pattern = /\/mod\/quiz\/review\.php.*([\&\?]attempt=\d+)/;

    constructor(protected domUtils: CoreDomUtilsProvider, protected quizProvider: AddonModQuizProvider,
            protected courseHelper: CoreCourseHelperProvider, protected linkHelper: CoreContentLinksHelperProvider) {
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

        courseId = courseId || params.courseid || params.cid;

        return [{
            action: (siteId, navCtrl?): void => {
                // Retrieve the quiz ID using the attempt ID.
                const modal = this.domUtils.showModalLoading(),
                    attemptId = parseInt(params.attempt, 10),
                    page = parseInt(params.page, 10);
                let quizId;

                this.getQuizIdByAttemptId(attemptId).then((id) => {
                    quizId = id;

                    // Get the courseId if we don't have it.
                    if (courseId) {
                        return courseId;
                    } else {
                        return this.courseHelper.getModuleCourseIdByInstance(quizId, 'quiz', siteId);
                    }
                }).then((courseId) => {
                    // Go to the review page.
                    const pageParams = {
                        quizId: quizId,
                        attemptId: attemptId,
                        courseId: courseId,
                        page: params.showall ? -1 : (isNaN(page) ? -1 : page)
                    };

                    this.linkHelper.goInSite(navCtrl, 'AddonModQuizReviewPage', pageParams, siteId);
                }).catch((error) => {

                    this.domUtils.showErrorModalDefault(error, 'An error occurred while loading the required data.');
                }).finally(() => {
                    modal.dismiss();
                });
            }
        }];
    }
    /**
     * Get a quiz ID by attempt ID.
     *
     * @param {number} attemptId Attempt ID.
     * @return {Promise<number>} Promise resolved with the quiz ID.
     */
    protected getQuizIdByAttemptId(attemptId: number): Promise<number> {
        // Use getAttemptReview to retrieve the quiz ID.
        return this.quizProvider.getAttemptReview(attemptId).then((reviewData) => {
            if (reviewData.attempt && reviewData.attempt.quiz) {
                return reviewData.attempt.quiz;
            }

            return Promise.reject(null);
        });
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
        return this.quizProvider.isPluginEnabled();
    }
}
