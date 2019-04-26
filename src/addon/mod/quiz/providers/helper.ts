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
import { ModalController, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModQuizProvider } from './quiz';
import { AddonModQuizOfflineProvider } from './quiz-offline';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable()
export class AddonModQuizHelperProvider {

    constructor(private domUtils: CoreDomUtilsProvider, private translate: TranslateService, private utils: CoreUtilsProvider,
            private accessRuleDelegate: AddonModQuizAccessRuleDelegate, private quizProvider: AddonModQuizProvider,
            private modalCtrl: ModalController, private quizOfflineProvider: AddonModQuizOfflineProvider,
            private courseHelper: CoreCourseHelperProvider, private sitesProvider: CoreSitesProvider,
            private linkHelper: CoreContentLinksHelperProvider) { }

    /**
     * Validate a preflight data or show a modal to input the preflight data if required.
     * It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param {any} quiz Quiz.
     * @param {any} accessInfo Quiz access info returned by AddonModQuizProvider.getQuizAccessInformation.
     * @param {any} preflightData Object where to store the preflight data.
     * @param {any} [attempt] Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param {boolean} [offline] Whether the attempt is offline.
     * @param {boolean} [prefetch] Whether user is prefetching.
     * @param {string} [title] The title to display in the modal and in the submit button.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [retrying] Whether we're retrying after a failure.
     * @return {Promise<any>} Promise resolved when the preflight data is validated. The resolve param is the attempt.
     */
    getAndCheckPreflightData(quiz: any, accessInfo: any, preflightData: any, attempt: any, offline?: boolean, prefetch?: boolean,
            title?: string, siteId?: string, retrying?: boolean): Promise<any> {

        const rules = accessInfo && accessInfo.activerulenames;
        let isPreflightCheckRequired = false;

        // Check if the user needs to input preflight data.
        return this.accessRuleDelegate.isPreflightCheckRequired(rules, quiz, attempt, prefetch, siteId).then((required) => {
            isPreflightCheckRequired = required;

            if (required) {
                // Preflight check is required but no preflightData has been sent. Show a modal with the preflight form.
                return this.getPreflightData(quiz, accessInfo, attempt, prefetch, title, siteId).then((data) => {
                    // Data entered by the user, add it to preflight data and check it again.
                    Object.assign(preflightData, data);
                });
            }
        }).then(() => {
            // Get some fixed preflight data from access rules (data that doesn't require user interaction).
            return this.accessRuleDelegate.getFixedPreflightData(rules, quiz, preflightData, attempt, prefetch, siteId);
        }).then(() => {

            // All the preflight data is gathered, now validate it.
            return this.validatePreflightData(quiz, accessInfo, preflightData, attempt, offline, prefetch, siteId)
                    .catch((error) => {

                if (prefetch) {
                    return Promise.reject(error);
                } else if (retrying && !isPreflightCheckRequired) {
                    // We're retrying after a failure, but the preflight check wasn't required.
                    // This means there's something wrong with some access rule or user is offline and data isn't cached.
                    // Don't retry again because it would lead to an infinite loop.
                    return Promise.reject(error);
                } else {
                    // Show error and ask for the preflight again.
                    // Wait to show the error because we want it to be shown over the preflight modal.
                    setTimeout(() => {
                        this.domUtils.showErrorModalDefault(error, 'core.error', true);
                    }, 100);

                    return this.getAndCheckPreflightData(quiz, accessInfo, preflightData, attempt, offline, prefetch,
                            title, siteId, true);
                }
            });
        });
    }

    /**
     * Get the preflight data from the user using a modal.
     *
     * @param {any} quiz Quiz.
     * @param {any} accessInfo Quiz access info returned by AddonModQuizProvider.getQuizAccessInformation.
     * @param {any} [attempt] The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param {boolean} [prefetch] Whether the user is prefetching the quiz.
     * @param {string} [title] The title to display in the modal and in the submit button.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the preflight data. Rejected if user cancels.
     */
    getPreflightData(quiz: any, accessInfo: any, attempt: any, prefetch?: boolean, title?: string, siteId?: string): Promise<any> {
        const notSupported: string[] = [];

        // Check if there is any unsupported rule.
        accessInfo.activerulenames.forEach((rule) => {
            if (!this.accessRuleDelegate.isAccessRuleSupported(rule)) {
                notSupported.push(rule);
            }
        });

        if (notSupported.length) {
            return Promise.reject(this.translate.instant('addon.mod_quiz.errorrulesnotsupported') + ' ' +
                    JSON.stringify(notSupported));
        }

        // Create and show the modal.
        const modal = this.modalCtrl.create('AddonModQuizPreflightModalPage', {
            title: title,
            quiz: quiz,
            attempt: attempt,
            prefetch: !!prefetch,
            siteId: siteId,
            rules: accessInfo.activerulenames
        });

        modal.present();

        // Wait for modal to be dismissed.
        return new Promise((resolve, reject): void => {
            modal.onDidDismiss((data) => {
                if (typeof data != 'undefined') {
                    resolve(data);
                } else {
                    reject(this.domUtils.createCanceledError());
                }
            });
        });
    }

    /**
     * Gets the mark string from a question HTML.
     * Example result: "Marked out of 1.00".
     *
     * @param  {string} html Question's HTML.
     * @return {string}      Question's mark.
     */
    getQuestionMarkFromHtml(html: string): string {
        const element = this.domUtils.convertToElement(html);

        return this.domUtils.getContentsOfElement(element, '.grade');
    }

    /**
     * Get a quiz ID by attempt ID.
     *
     * @param {number} attemptId Attempt ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the quiz ID.
     */
    getQuizIdByAttemptId(attemptId: number, siteId?: string): Promise<number> {
        // Use getAttemptReview to retrieve the quiz ID.
        return this.quizProvider.getAttemptReview(attemptId, undefined, false, siteId).then((reviewData) => {
            if (reviewData.attempt && reviewData.attempt.quiz) {
                return reviewData.attempt.quiz;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Handle a review link.
     *
     * @param {NavController} navCtrl Nav controller, can be undefined/null.
     * @param {number} attemptId Attempt ID.
     * @param {number} [page] Page to load, -1 to all questions in same page.
     * @param {number} [courseId] Course ID.
     * @param {number} [quizId] Quiz ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleReviewLink(navCtrl: NavController, attemptId: number, page?: number, courseId?: number, quizId?: number,
            siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const modal = this.domUtils.showModalLoading();
        let promise;

        if (quizId) {
            promise = Promise.resolve(quizId);
        } else {
            // Retrieve the quiz ID using the attempt ID.
            promise = this.getQuizIdByAttemptId(attemptId);
        }

        return promise.then((id) => {
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
                page: isNaN(page) ? -1 : page
            };

            return this.linkHelper.goInSite(navCtrl, 'AddonModQuizReviewPage', pageParams, siteId);
        }).catch((error) => {

            this.domUtils.showErrorModalDefault(error, 'An error occurred while loading the required data.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Add some calculated data to the attempt.
     *
     * @param {any} quiz Quiz.
     * @param {any} attempt Attempt.
     * @param {boolean} highlight Whether we should check if attempt should be highlighted.
     * @param {number} [bestGrade] Quiz's best grade (formatted). Required if highlight=true.
     */
    setAttemptCalculatedData(quiz: any, attempt: any, highlight?: boolean, bestGrade?: string): void {

        attempt.rescaledGrade = this.quizProvider.rescaleGrade(attempt.sumgrades, quiz, false);
        attempt.finished = this.quizProvider.isAttemptFinished(attempt.state);
        attempt.readableState = this.quizProvider.getAttemptReadableState(quiz, attempt);

        if (quiz.showMarkColumn && attempt.finished) {
            attempt.readableMark = this.quizProvider.formatGrade(attempt.sumgrades, quiz.decimalpoints);
        } else {
            attempt.readableMark = '';
        }

        if (quiz.showGradeColumn && attempt.finished) {
            attempt.readableGrade = this.quizProvider.formatGrade(attempt.rescaledGrade, quiz.decimalpoints);

            // Highlight the highest grade if appropriate.
            attempt.highlightGrade = highlight && !attempt.preview && attempt.state == AddonModQuizProvider.ATTEMPT_FINISHED &&
                                        attempt.readableGrade == bestGrade;
        } else {
            attempt.readableGrade = '';
        }
    }

    /**
     * Add some calculated data to the quiz.
     *
     * @param {any} quiz Quiz.
     * @param {any} options Options returned by AddonModQuizProvider.getCombinedReviewOptions.
     */
    setQuizCalculatedData(quiz: any, options: any): void {
        quiz.sumGradesFormatted = this.quizProvider.formatGrade(quiz.sumgrades, quiz.decimalpoints);
        quiz.gradeFormatted = this.quizProvider.formatGrade(quiz.grade, quiz.decimalpoints);

        quiz.showAttemptColumn = quiz.attempts != 1;
        quiz.showGradeColumn = options.someoptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX &&
                                    this.quizProvider.quizHasGrades(quiz);
        quiz.showMarkColumn = quiz.showGradeColumn && quiz.grade != quiz.sumgrades;
        quiz.showFeedbackColumn = quiz.hasfeedback && options.alloptions.overallfeedback;
    }

    /**
     * Validate the preflight data. It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param {any} quiz Quiz.
     * @param {any} accessInfo Quiz access info returned by AddonModQuizProvider.getQuizAccessInformation.
     * @param {any} preflightData Object where to store the preflight data.
     * @param {any} [attempt] Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param {boolean} [offline] Whether the attempt is offline.
     * @param {boolean} [sent] Whether preflight data has been entered by the user.
     * @param {boolean} [prefetch] Whether user is prefetching.
     * @param {string} [title] The title to display in the modal and in the submit button.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the preflight data is validated.
     */
    validatePreflightData(quiz: any, accessInfo: any, preflightData: any, attempt: any, offline?: boolean, prefetch?: boolean,
            siteId?: string): Promise<any> {

        const rules = accessInfo.activerulenames;
        let promise;

        if (attempt) {
            if (attempt.state != AddonModQuizProvider.ATTEMPT_OVERDUE && !attempt.finishedOffline) {
                // We're continuing an attempt. Call getAttemptData to validate the preflight data.
                const page = attempt.currentpage;

                promise = this.quizProvider.getAttemptData(attempt.id, page, preflightData, offline, true, siteId).then(() => {
                    if (offline) {
                        // Get current page stored in local.
                        return this.quizOfflineProvider.getAttemptById(attempt.id).then((localAttempt) => {
                            attempt.currentpage = localAttempt.currentpage;
                        }).catch(() => {
                            // No local data.
                        });
                    }
                });
            } else {
                // Attempt is overdue or finished in offline, we can only see the summary.
                // Call getAttemptSummary to validate the preflight data.
                promise = this.quizProvider.getAttemptSummary(attempt.id, preflightData, offline, true, false, siteId);
            }
        } else {
            // We're starting a new attempt, call startAttempt.
            promise = this.quizProvider.startAttempt(quiz.id, preflightData, false, siteId).then((att) => {
                attempt = att;
            });
        }

        return promise.then(() => {
            // Preflight data validated.
            this.accessRuleDelegate.notifyPreflightCheckPassed(rules, quiz, attempt, preflightData, prefetch, siteId);

            return attempt;
        }).catch((error) => {
            if (this.utils.isWebServiceError(error)) {
                // The WebService returned an error, assume the preflight failed.
                this.accessRuleDelegate.notifyPreflightCheckFailed(rules, quiz, attempt, preflightData, prefetch, siteId);
            }

            return Promise.reject(error);
        });
    }
}
