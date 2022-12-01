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

import { CoreCanceledError } from '@classes/errors/cancelederror';
import { CoreError } from '@classes/errors/error';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import { AddonModQuizPreflightModalComponent } from '../components/preflight-modal/preflight-modal';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import { AddonModQuizModuleHandlerService } from './handlers/module';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizCombinedReviewOptions,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizProvider,
    AddonModQuizQuizWSData,
} from './quiz';
import { AddonModQuizOffline } from './quiz-offline';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizHelperProvider {

    /**
     * Validate a preflight data or show a modal to input the preflight data if required.
     * It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param preflightData Object where to store the preflight data.
     * @param attempt Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param offline Whether the attempt is offline.
     * @param prefetch Whether user is prefetching.
     * @param title The title to display in the modal and in the submit button.
     * @param siteId Site ID. If not defined, current site.
     * @param retrying Whether we're retrying after a failure.
     * @returns Promise resolved when the preflight data is validated. The resolve param is the attempt.
     */
    async getAndCheckPreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        preflightData: Record<string, string>,
        attempt?: AddonModQuizAttemptWSData,
        offline?: boolean,
        prefetch?: boolean,
        title?: string,
        siteId?: string,
        retrying?: boolean,
    ): Promise<AddonModQuizAttemptWSData> {

        const rules = accessInfo?.activerulenames;

        // Check if the user needs to input preflight data.
        const preflightCheckRequired = await AddonModQuizAccessRuleDelegate.isPreflightCheckRequired(
            rules,
            quiz,
            attempt,
            prefetch,
            siteId,
        );

        if (preflightCheckRequired) {
            // Preflight check is required. Show a modal with the preflight form.
            const data = await this.getPreflightData(quiz, accessInfo, attempt, prefetch, title, siteId);

            // Data entered by the user, add it to preflight data and check it again.
            Object.assign(preflightData, data);
        }

        // Get some fixed preflight data from access rules (data that doesn't require user interaction).
        await AddonModQuizAccessRuleDelegate.getFixedPreflightData(rules, quiz, preflightData, attempt, prefetch, siteId);

        try {
            // All the preflight data is gathered, now validate it.
            return await this.validatePreflightData(quiz, accessInfo, preflightData, attempt, offline, prefetch, siteId);
        } catch (error) {

            if (prefetch) {
                throw error;
            } else if (retrying && !preflightCheckRequired) {
                // We're retrying after a failure, but the preflight check wasn't required.
                // This means there's something wrong with some access rule or user is offline and data isn't cached.
                // Don't retry again because it would lead to an infinite loop.
                throw error;
            }

            // Show error and ask for the preflight again.
            // Wait to show the error because we want it to be shown over the preflight modal.
            setTimeout(() => {
                CoreDomUtils.showErrorModalDefault(error, 'core.error', true);
            }, 100);

            return this.getAndCheckPreflightData(
                quiz,
                accessInfo,
                preflightData,
                attempt,
                offline,
                prefetch,
                title,
                siteId,
                true,
            );
        }
    }

    /**
     * Get the preflight data from the user using a modal.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param attempt The attempt started/continued. If not supplied, user is starting a new attempt.
     * @param prefetch Whether the user is prefetching the quiz.
     * @param title The title to display in the modal and in the submit button.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the preflight data. Rejected if user cancels.
     */
    async getPreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        attempt?: AddonModQuizAttemptWSData,
        prefetch?: boolean,
        title?: string,
        siteId?: string,
    ): Promise<Record<string, string>> {
        const notSupported: string[] = [];
        const rules = accessInfo?.activerulenames;

        // Check if there is any unsupported rule.
        rules.forEach((rule) => {
            if (!AddonModQuizAccessRuleDelegate.isAccessRuleSupported(rule)) {
                notSupported.push(rule);
            }
        });

        if (notSupported.length) {
            throw new CoreError(
                Translate.instant('addon.mod_quiz.errorrulesnotsupported') + ' ' + JSON.stringify(notSupported),
            );
        }

        // Create and show the modal.
        const modalData = await CoreDomUtils.openModal<Record<string, string>>({
            component: AddonModQuizPreflightModalComponent,
            componentProps: {
                title: title,
                quiz,
                attempt,
                prefetch: !!prefetch,
                siteId: siteId,
                rules: rules,
            },
        });

        if (!modalData) {
            throw new CoreCanceledError();
        }

        return modalData;
    }

    /**
     * Gets the mark string from a question HTML.
     * Example result: "Marked out of 1.00".
     *
     * @param html Question's HTML.
     * @returns Question's mark.
     */
    getQuestionMarkFromHtml(html: string): string | undefined {
        const element = CoreDomUtils.convertToElement(html);

        return CoreDomUtils.getContentsOfElement(element, '.grade');
    }

    /**
     * Get a quiz ID by attempt ID.
     *
     * @param attemptId Attempt ID.
     * @param options Other options.
     * @returns Promise resolved with the quiz ID.
     */
    async getQuizIdByAttemptId(attemptId: number, options: { cmId?: number; siteId?: string } = {}): Promise<number> {
        // Use getAttemptReview to retrieve the quiz ID.
        const reviewData = await AddonModQuiz.getAttemptReview(attemptId, options);

        if (reviewData.attempt.quiz) {
            return reviewData.attempt.quiz;
        }

        throw new CoreError('Cannot get quiz ID.');
    }

    /**
     * Handle a review link.
     *
     * @param attemptId Attempt ID.
     * @param page Page to load, -1 to all questions in same page.
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async handleReviewLink(attemptId: number, page?: number, quizId?: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const modal = await CoreDomUtils.showModalLoading();

        try {
            if (!quizId) {
                quizId = await this.getQuizIdByAttemptId(attemptId, { siteId });
            }

            const module = await CoreCourse.getModuleBasicInfoByInstance(
                quizId,
                'quiz',
                { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
            );

            // Go to the review page.
            await CoreNavigator.navigateToSitePath(
                `${AddonModQuizModuleHandlerService.PAGE_NAME}/${module.course}/${module.id}/review/${attemptId}`,
                {
                    params: {
                        page: page == undefined || isNaN(page) ? -1 : page,
                    },
                    siteId,
                },
            );
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'An error occurred while loading the required data.');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Add some calculated data to the attempt.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param highlight Whether we should check if attempt should be highlighted.
     * @param bestGrade Quiz's best grade (formatted). Required if highlight=true.
     * @param isLastAttempt Whether the attempt is the last one.
     * @param siteId Site ID.
     * @returns Quiz attemptw with calculated data.
     */
    async setAttemptCalculatedData(
        quiz: AddonModQuizQuizData,
        attempt: AddonModQuizAttemptWSData,
        highlight?: boolean,
        bestGrade?: string,
        isLastAttempt?: boolean,
        siteId?: string,
    ): Promise<AddonModQuizAttempt> {
        const formattedAttempt = <AddonModQuizAttempt> attempt;

        formattedAttempt.rescaledGrade = AddonModQuiz.rescaleGrade(attempt.sumgrades, quiz, false);
        formattedAttempt.finished = AddonModQuiz.isAttemptFinished(attempt.state);
        formattedAttempt.readableState = AddonModQuiz.getAttemptReadableState(quiz, attempt);

        if (quiz.showMarkColumn && formattedAttempt.finished) {
            formattedAttempt.readableMark = AddonModQuiz.formatGrade(attempt.sumgrades, quiz.decimalpoints);
        } else {
            formattedAttempt.readableMark = '';
        }

        if (quiz.showGradeColumn && formattedAttempt.finished) {
            formattedAttempt.readableGrade = AddonModQuiz.formatGrade(
                Number(formattedAttempt.rescaledGrade),
                quiz.decimalpoints,
            );

            // Highlight the highest grade if appropriate.
            formattedAttempt.highlightGrade = !!(highlight && !attempt.preview &&
                attempt.state == AddonModQuizProvider.ATTEMPT_FINISHED && formattedAttempt.readableGrade == bestGrade);
        } else {
            formattedAttempt.readableGrade = '';
        }

        if (isLastAttempt || isLastAttempt === undefined) {
            formattedAttempt.finishedOffline = await AddonModQuiz.isAttemptFinishedOffline(attempt.id, siteId);
        }

        return formattedAttempt;
    }

    /**
     * Add some calculated data to the quiz.
     *
     * @param quiz Quiz.
     * @param options Review options.
     * @returns Quiz data with some calculated more.
     */
    setQuizCalculatedData(quiz: AddonModQuizQuizWSData, options: AddonModQuizCombinedReviewOptions): AddonModQuizQuizData {
        const formattedQuiz = <AddonModQuizQuizData> quiz;

        formattedQuiz.sumGradesFormatted = AddonModQuiz.formatGrade(quiz.sumgrades, quiz.decimalpoints);
        formattedQuiz.gradeFormatted = AddonModQuiz.formatGrade(quiz.grade, quiz.decimalpoints);

        formattedQuiz.showAttemptColumn = quiz.attempts != 1;
        formattedQuiz.showGradeColumn = options.someoptions.marks >= AddonModQuizProvider.QUESTION_OPTIONS_MARK_AND_MAX &&
            AddonModQuiz.quizHasGrades(quiz);
        formattedQuiz.showMarkColumn = formattedQuiz.showGradeColumn && quiz.grade != quiz.sumgrades;
        formattedQuiz.showFeedbackColumn = !!quiz.hasfeedback && !!options.alloptions.overallfeedback;

        return formattedQuiz;
    }

    /**
     * Validate the preflight data. It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param preflightData Object where to store the preflight data.
     * @param attempt Attempt to continue. Don't pass any value if the user needs to start a new attempt.
     * @param offline Whether the attempt is offline.
     * @param prefetch Whether user is prefetching.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the preflight data is validated.
     */
    async validatePreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        preflightData: Record<string, string>,
        attempt?: AddonModQuizAttempt,
        offline?: boolean,
        prefetch?: boolean,
        siteId?: string,
    ): Promise<AddonModQuizAttempt> {

        const rules = accessInfo.activerulenames;
        const modOptions = {
            cmId: quiz.coursemodule,
            readingStrategy: offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };

        try {
            if (attempt) {
                if (attempt.state != AddonModQuizProvider.ATTEMPT_OVERDUE && !attempt.finishedOffline) {
                    // We're continuing an attempt. Call getAttemptData to validate the preflight data.
                    await AddonModQuiz.getAttemptData(attempt.id, attempt.currentpage!, preflightData, modOptions);

                    if (offline) {
                        // Get current page stored in local.
                        const storedAttempt = await CoreUtils.ignoreErrors(
                            AddonModQuizOffline.getAttemptById(attempt.id),
                        );

                        attempt.currentpage = storedAttempt?.currentpage ?? attempt.currentpage;
                    }
                } else {
                    // Attempt is overdue or finished in offline, we can only see the summary.
                    // Call getAttemptSummary to validate the preflight data.
                    await AddonModQuiz.getAttemptSummary(attempt.id, preflightData, modOptions);
                }
            } else {
                // We're starting a new attempt, call startAttempt.
                attempt = await AddonModQuiz.startAttempt(quiz.id, preflightData, false, siteId);
            }

            // Preflight data validated.
            AddonModQuizAccessRuleDelegate.notifyPreflightCheckPassed(
                rules,
                quiz,
                attempt,
                preflightData,
                prefetch,
                siteId,
            );

            return attempt;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService returned an error, assume the preflight failed.
                AddonModQuizAccessRuleDelegate.notifyPreflightCheckFailed(
                    rules,
                    quiz,
                    attempt,
                    preflightData,
                    prefetch,
                    siteId,
                );
            }

            throw error;
        }
    }

}

export const AddonModQuizHelper = makeSingleton(AddonModQuizHelperProvider);

/**
 * Quiz data with calculated data.
 */
export type AddonModQuizQuizData = AddonModQuizQuizWSData & {
    sumGradesFormatted?: string;
    gradeFormatted?: string;
    showAttemptColumn?: boolean;
    showGradeColumn?: boolean;
    showMarkColumn?: boolean;
    showFeedbackColumn?: boolean;
};

/**
 * Attempt data with calculated data.
 */
export type AddonModQuizAttempt = AddonModQuizAttemptWSData & {
    finishedOffline?: boolean;
    rescaledGrade?: string;
    finished?: boolean;
    readableState?: string[];
    readableMark?: string;
    readableGrade?: string;
    highlightGrade?: boolean;
};
