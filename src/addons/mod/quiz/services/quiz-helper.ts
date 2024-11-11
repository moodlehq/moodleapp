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
import { CoreWSError } from '@classes/errors/wserror';
import { makeSingleton, Translate } from '@singletons';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import {
    AddonModQuiz,
    AddonModQuizAttemptWSData,
    AddonModQuizCombinedReviewOptions,
    AddonModQuizGetQuizAccessInformationWSResponse,
    AddonModQuizQuizWSData,
} from './quiz';
import { AddonModQuizOffline } from './quiz-offline';
import {
    ADDON_MOD_QUIZ_IMMEDIATELY_AFTER_PERIOD,
    ADDON_MOD_QUIZ_PAGE_NAME,
    AddonModQuizAttemptStates,
    AddonModQuizDisplayOptionsAttemptStates,
} from '../constants';
import { QuestionDisplayOptionsMarks } from '@features/question/constants';
import { CoreGroups } from '@services/groups';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreModals } from '@services/modals';
import { CoreLoadings } from '@services/loadings';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizHelperProvider {

    /**
     * Check if current user can review an attempt.
     *
     * @param quiz Quiz.
     * @param accessInfo Access info.
     * @param attempt Attempt.
     * @returns Whether user can review the attempt.
     */
    async canReviewAttempt(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        attempt: AddonModQuizAttemptWSData,
    ): Promise<boolean> {
        if (!this.hasReviewCapabilityForAttempt(quiz, accessInfo, attempt)) {
            return false;
        }

        if (attempt.userid !== CoreSites.getCurrentSiteUserId()) {
            return this.canReviewOtherUserAttempt(quiz, accessInfo, attempt);
        }

        if (!AddonModQuiz.isAttemptCompleted(attempt.state)) {
            // Cannot review own uncompleted attempts.
            return false;
        }

        if (attempt.preview && accessInfo.canpreview) {
            // A teacher can always review their own preview no matter the review options settings.
            return true;
        }

        if (!attempt.preview && accessInfo.canviewreports) {
            // Users who can see reports should be shown everything, except during preview.
            // In LMS, the capability 'moodle/grade:viewhidden' is also checked but the app doesn't have this info.
            return true;
        }

        const options = AddonModQuiz.getDisplayOptionsForQuiz(quiz, AddonModQuiz.getAttemptStateDisplayOption(quiz, attempt));

        return options.attempt;
    }

    /**
     * Check if current user can review another user attempt.
     *
     * @param quiz Quiz.
     * @param accessInfo Access info.
     * @param attempt Attempt.
     * @returns Whether user can review the attempt.
     */
    protected async canReviewOtherUserAttempt(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        attempt: AddonModQuizAttemptWSData,
    ): Promise<boolean> {
        if (!accessInfo.canviewreports) {
            return false;
        }

        try {
            const groupInfo = await CoreGroups.getActivityGroupInfo(quiz.coursemodule);
            if (groupInfo.canAccessAllGroups || !groupInfo.separateGroups) {
                return true;
            }

            // Check if the current user and the attempt's user share any group.
            if (!groupInfo.groups.length) {
                return false;
            }

            const attemptUserGroups = await CoreGroups.getUserGroupsInCourse(quiz.course, undefined, attempt.userid);

            return attemptUserGroups.some(attemptUserGroup => groupInfo.groups.find(group => attemptUserGroup.id === group.id));
        } catch {
            return false;
        }
    }

    /**
     * Get cannot review message.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param short Whether to use a short message or not.
     * @returns Cannot review message, or empty string if no message to display.
     */
    getCannotReviewMessage(quiz: AddonModQuizQuizWSData, attempt: AddonModQuizAttemptWSData, short = false): string {
        const displayOption = AddonModQuiz.getAttemptStateDisplayOption(quiz, attempt);

        let reviewFrom = 0;
        switch (displayOption) {
            case AddonModQuizDisplayOptionsAttemptStates.DURING:
                return '';

            case AddonModQuizDisplayOptionsAttemptStates.IMMEDIATELY_AFTER:
                // eslint-disable-next-line no-bitwise
                if ((quiz.reviewattempt ?? 0) & AddonModQuizDisplayOptionsAttemptStates.LATER_WHILE_OPEN) {
                    reviewFrom = (attempt.timefinish ?? Date.now()) + ADDON_MOD_QUIZ_IMMEDIATELY_AFTER_PERIOD;
                    break;
                }
                // Fall through.

            case AddonModQuizDisplayOptionsAttemptStates.LATER_WHILE_OPEN:
                // eslint-disable-next-line no-bitwise
                if (quiz.timeclose && ((quiz.reviewattempt ?? 0) & AddonModQuizDisplayOptionsAttemptStates.AFTER_CLOSE)) {
                    reviewFrom = quiz.timeclose;
                    break;
                }
        }

        if (reviewFrom) {
            return Translate.instant('addon.mod_quiz.noreviewuntil' + (short ? 'short' : ''), {
                $a: CoreTimeUtils.userDate(reviewFrom * 1000, short ? 'core.strftimedatetimeshort': undefined),
            });
        } else {
            return Translate.instant('addon.mod_quiz.noreviewattempt');
        }
    }

    /**
     * Validate a preflight data or show a modal to input the preflight data if required.
     * It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param preflightData Object where to store the preflight data.
     * @param options Options.
     * @returns Promise resolved when the preflight data is validated. The resolve param is the attempt.
     */
    async getAndCheckPreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        preflightData: Record<string, string>,
        options: GetAndCheckPreflightOptions = {},
    ): Promise<AddonModQuizAttemptWSData> {

        const rules = accessInfo?.activerulenames;

        // Check if the user needs to input preflight data.
        const preflightCheckRequired = await AddonModQuizAccessRuleDelegate.isPreflightCheckRequired(
            rules,
            quiz,
            options.attempt,
            options.prefetch,
            options.siteId,
        );

        if (preflightCheckRequired) {
            // Preflight check is required. Show a modal with the preflight form.
            const data = await this.getPreflightData(quiz, accessInfo, options);

            // Data entered by the user, add it to preflight data and check it again.
            Object.assign(preflightData, data);
        }

        // Get some fixed preflight data from access rules (data that doesn't require user interaction).
        await AddonModQuizAccessRuleDelegate.getFixedPreflightData(
            rules,
            quiz,
            preflightData,
            options.attempt,
            options.prefetch,
            options.siteId,
        );

        try {
            // All the preflight data is gathered, now validate it.
            return await this.validatePreflightData(quiz, accessInfo, preflightData, options);
        } catch (error) {

            if (options.prefetch) {
                throw error;
            } else if (options.retrying && !preflightCheckRequired) {
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

            return this.getAndCheckPreflightData(quiz, accessInfo, preflightData, {
                ...options,
                retrying: true,
            });
        }
    }

    /**
     * Get the preflight data from the user using a modal.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param options Options.
     * @returns Promise resolved with the preflight data. Rejected if user cancels.
     */
    async getPreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        options: GetPreflightOptions = {},
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

        const { AddonModQuizPreflightModalComponent } =
            await import('@addons/mod/quiz/components/preflight-modal/preflight-modal');

        // Create and show the modal.
        const modalData = await CoreModals.openModal<Record<string, string>>({
            component: AddonModQuizPreflightModalComponent,
            componentProps: {
                title: options.title,
                quiz,
                attempt: options.attempt,
                prefetch: !!options.prefetch,
                siteId: options.siteId,
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
        const element = convertTextToHTMLElement(html);

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

        const modal = await CoreLoadings.show();

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
                `${ADDON_MOD_QUIZ_PAGE_NAME}/${module.course}/${module.id}/review/${attemptId}`,
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
     * Check if current user has the necessary capabilities to review an attempt.
     *
     * @param quiz Quiz.
     * @param accessInfo Access info.
     * @param attempt Attempt.
     * @returns Whether user has the capability.
     */
    hasReviewCapabilityForAttempt(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        attempt: AddonModQuizAttemptWSData,
    ): boolean {
        if (accessInfo.canviewreports || accessInfo.canpreview) {
            return true;
        }

        const displayOption = AddonModQuiz.getAttemptStateDisplayOption(quiz, attempt);

        return displayOption === AddonModQuizDisplayOptionsAttemptStates.IMMEDIATELY_AFTER ?
            accessInfo.canattempt : accessInfo.canreviewmyattempts;
    }

    /**
     * Add some calculated data to the attempt.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param siteId Site ID.
     * @returns Quiz attempt with calculated data.
     */
    async setAttemptCalculatedData(
        quiz: AddonModQuizQuizData,
        attempt: AddonModQuizAttemptWSData,
        siteId?: string,
    ): Promise<AddonModQuizAttempt> {
        const formattedAttempt = <AddonModQuizAttempt> attempt;

        formattedAttempt.finished = attempt.state === AddonModQuizAttemptStates.FINISHED;
        formattedAttempt.completed = AddonModQuiz.isAttemptCompleted(attempt.state);
        formattedAttempt.rescaledGrade = Number(AddonModQuiz.rescaleGrade(attempt.sumgrades, quiz, false));

        if (quiz.showAttemptsGrades && formattedAttempt.finished) {
            formattedAttempt.formattedGrade = AddonModQuiz.formatGrade(formattedAttempt.rescaledGrade, quiz.decimalpoints);
        } else {
            formattedAttempt.formattedGrade = '';
        }

        formattedAttempt.finishedOffline = await AddonModQuiz.isAttemptFinishedOffline(attempt.id, siteId);

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

        formattedQuiz.showAttemptsGrades = options.someoptions.marks >= QuestionDisplayOptionsMarks.MARK_AND_MAX &&
            AddonModQuiz.quizHasGrades(quiz);
        formattedQuiz.showAttemptsMarks = formattedQuiz.showAttemptsGrades && quiz.grade !== quiz.sumgrades;
        formattedQuiz.showFeedback = !!quiz.hasfeedback && !!options.alloptions.overallfeedback;

        return formattedQuiz;
    }

    /**
     * Validate the preflight data. It calls AddonModQuizProvider.startAttempt if a new attempt is needed.
     *
     * @param quiz Quiz.
     * @param accessInfo Quiz access info.
     * @param preflightData Object where to store the preflight data.
     * @param options Options
     * @returns Promise resolved when the preflight data is validated.
     */
    async validatePreflightData(
        quiz: AddonModQuizQuizWSData,
        accessInfo: AddonModQuizGetQuizAccessInformationWSResponse,
        preflightData: Record<string, string>,
        options: ValidatePreflightOptions = {},
    ): Promise<AddonModQuizAttempt> {

        const rules = accessInfo.activerulenames;
        const modOptions = {
            cmId: quiz.coursemodule,
            readingStrategy: options.offline ? CoreSitesReadingStrategy.PREFER_CACHE : CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId: options.siteId,
        };
        let attempt = options.attempt;

        try {

            if (attempt) {
                if (attempt.state !== AddonModQuizAttemptStates.OVERDUE && !options.finishedOffline) {
                    // We're continuing an attempt. Call getAttemptData to validate the preflight data.
                    await AddonModQuiz.getAttemptData(attempt.id, attempt.currentpage ?? 0, preflightData, modOptions);

                    if (options.offline) {
                        // Get current page stored in local.
                        const storedAttempt = await CorePromiseUtils.ignoreErrors(
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
                attempt = await AddonModQuiz.startAttempt(quiz.id, preflightData, false, options.siteId);
            }

            // Preflight data validated.
            AddonModQuizAccessRuleDelegate.notifyPreflightCheckPassed(
                rules,
                quiz,
                attempt,
                preflightData,
                options.prefetch,
                options.siteId,
            );

            return attempt;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // The WebService returned an error, assume the preflight failed.
                AddonModQuizAccessRuleDelegate.notifyPreflightCheckFailed(
                    rules,
                    quiz,
                    attempt,
                    preflightData,
                    options.prefetch,
                    options.siteId,
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
    showAttemptsGrades?: boolean;
    showAttemptsMarks?: boolean;
    showFeedback?: boolean;
};

/**
 * Attempt data with calculated data.
 */
export type AddonModQuizAttempt = AddonModQuizAttemptWSData & {
    finishedOffline?: boolean;
    rescaledGrade?: number;
    finished?: boolean;
    completed?: boolean;
    formattedGrade?: string;
};

/**
 * Options to validate preflight data.
 */
type ValidatePreflightOptions = {
    attempt?: AddonModQuizAttemptWSData; // Attempt to continue. Don't pass any value if the user needs to start a new attempt.
    offline?: boolean; // Whether the attempt is offline.
    finishedOffline?: boolean; // Whether the attempt is finished offline.
    prefetch?: boolean; // Whether user is prefetching.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options to check preflight data.
 */
type GetAndCheckPreflightOptions = ValidatePreflightOptions & {
    title?: string; // The title to display in the modal and in the submit button.
    retrying?: boolean; // Whether we're retrying after a failure.
};

/**
 * Options to get preflight data.
 */
type GetPreflightOptions = Omit<GetAndCheckPreflightOptions, 'offline'|'finishedOffline'|'retrying'>;
