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

import { SafeNumber } from '@/core/utils/types';
import { Injectable } from '@angular/core';

import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreGradesFormattedItem, CoreGradesHelper } from '@features/grades/services/grades-helper';
import {
    CoreQuestion,
    CoreQuestionQuestionParsed,
    CoreQuestionQuestionWSData,
    CoreQuestionsAnswers,
} from '@features/question/services/question';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreTime } from '@singletons/time';
import { CoreUtils } from '@singletons/utils';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { AddonModQuizAccessRuleDelegate } from './access-rules-delegate';
import { AddonModQuizOffline, AddonModQuizQuestionsWithAnswers } from './quiz-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    QUESTION_INVALID_STATE_CLASSES,
    QUESTION_TODO_STATE_CLASSES,
    QuestionDisplayOptionsMarks,
    QuestionDisplayOptionsValues,
} from '@features/question/constants';
import {
    ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT,
    AddonModQuizAttemptStates,
    ADDON_MOD_QUIZ_COMPONENT_LEGACY,
    AddonModQuizGradeMethods,
    AddonModQuizDisplayOptionsAttemptStates,
    ADDON_MOD_QUIZ_IMMEDIATELY_AFTER_PERIOD,
    AddonModQuizNavMethods,
} from '../constants';
import { CoreIonicColorNames } from '@singletons/colors';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import { CoreObject } from '@singletons/object';
import { CoreArray } from '@singletons/array';
import { CoreTextFormat } from '@singletons/text';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT]: AddonModQuizAttemptFinishedData;
    }

}

/**
 * Service that provides some features for quiz.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModQuiz:';

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonModQuizProvider');
    }

    /**
     * Formats a grade to be displayed.
     *
     * @param grade Grade.
     * @param decimals Decimals to use.
     * @returns Grade to display.
     */
    formatGrade(grade?: number | null, decimals?: number): string {
        if (grade === undefined || grade === -1 || grade === null || isNaN(grade)) {
            return Translate.instant('addon.mod_quiz.notyetgraded');
        }

        return CoreUtils.formatFloat(grade.toFixed(decimals ?? 2));
    }

    /**
     * Get attempt questions. Returns all of them or just the ones in certain pages.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param preflightData Preflight required data (like password).
     * @param options Other options.
     * @returns Promise resolved with the questions.
     */
    async getAllQuestionsData(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        preflightData: Record<string, string>,
        options: AddonModQuizAllQuestionsDataOptions = {},
    ): Promise<Record<number, CoreQuestionQuestionParsed>> {

        const questions: Record<number, CoreQuestionQuestionParsed> = {};
        const isSequential = this.isNavigationSequential(quiz);
        const pages = options.pages || this.getPagesFromLayout(attempt.layout);

        await Promise.all(pages.map(async (page) => {
            if (isSequential && page < (attempt.currentpage || 0)) {
                // Sequential quiz, cannot get pages before the current one.
                return;
            }

            // Get the questions in the page.
            const data = await this.getAttemptData(attempt.id, page, preflightData, options);

            // Add the questions to the result object.
            data.questions.forEach((question) => {
                questions[question.slot] = question;
            });
        }));

        return questions;
    }

    /**
     * Get cache key for get attempt access information WS calls.
     *
     * @param quizId Quiz ID.
     * @param attemptId Attempt ID.
     * @returns Cache key.
     */
    protected getAttemptAccessInformationCacheKey(quizId: number, attemptId: number): string {
        return this.getAttemptAccessInformationCommonCacheKey(quizId) + ':' + attemptId;
    }

    /**
     * Get common cache key for get attempt access information WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getAttemptAccessInformationCommonCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'attemptAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @param quizId Quiz ID.
     * @param attemptId Attempt ID. 0 for user's last attempt.
     * @param options Other options.
     * @returns Promise resolved with the access information.
     */
    async getAttemptAccessInformation(
        quizId: number,
        attemptId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModQuizGetAttemptAccessInformationWSResponse> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetAttemptAccessInformationWSParams = {
            quizid: quizId,
            attemptid: attemptId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptAccessInformationCacheKey(quizId, attemptId),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_quiz_get_attempt_access_information', params, preSets);
    }

    /**
     * Get cache key for get attempt data WS calls.
     *
     * @param attemptId Attempt ID.
     * @param page Page.
     * @returns Cache key.
     */
    protected getAttemptDataCacheKey(attemptId: number, page: number): string {
        return this.getAttemptDataCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt data WS calls.
     *
     * @param attemptId Attempt ID.
     * @returns Cache key.
     */
    protected getAttemptDataCommonCacheKey(attemptId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'attemptData:' + attemptId;
    }

    /**
     * Get an attempt's data.
     *
     * @param attemptId Attempt ID.
     * @param page Page number.
     * @param preflightData Preflight required data (like password).
     * @param options Other options.
     * @returns Promise resolved with the attempt data.
     */
    async getAttemptData(
        attemptId: number,
        page: number,
        preflightData: Record<string, string>,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModQuizGetAttemptDataResponse> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetAttemptDataWSParams = {
            attemptid: attemptId,
            page: page,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
                true,
            ),
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptDataCacheKey(attemptId, page),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModQuizGetAttemptDataWSResponse>('mod_quiz_get_attempt_data', params, preSets);

        result.questions = CoreQuestion.parseQuestions(result.questions);

        return result;
    }

    /**
     * Get an attempt's due date.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @returns Attempt's due date, 0 if no due date or invalid data.
     */
    getAttemptDueDate(quiz: AddonModQuizQuizWSData, attempt: AddonModQuizAttemptWSData): number {
        const deadlines: number[] = [];

        if (quiz.timelimit && attempt.timestart) {
            deadlines.push(attempt.timestart + quiz.timelimit);
        }
        if (quiz.timeclose) {
            deadlines.push(quiz.timeclose);
        }

        if (!deadlines.length) {
            return 0;
        }

        // Get min due date.
        const dueDate: number = Math.min.apply(null, deadlines);
        if (!dueDate) {
            return 0;
        }

        switch (attempt.state) {
            case AddonModQuizAttemptStates.IN_PROGRESS:
                return dueDate * 1000;

            case AddonModQuizAttemptStates.OVERDUE:
                return (dueDate + (quiz.graceperiod ?? 0)) * 1000;

            default:
                this.logger.warn('Unexpected state when getting due date: ' + attempt.state);

                return 0;
        }
    }

    /**
     * Get an attempt's warning because of due date.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @returns Attempt's warning, undefined if no due date.
     */
    getAttemptDueDateWarning(quiz: AddonModQuizQuizWSData, attempt: AddonModQuizAttemptWSData): string | undefined {
        const dueDate = this.getAttemptDueDate(quiz, attempt);

        if (attempt.state === AddonModQuizAttemptStates.OVERDUE) {
            return Translate.instant(
                'addon.mod_quiz.overduemustbesubmittedby',
                { $a: CoreTime.userDate(dueDate) },
            );
        } else if (dueDate) {
            return Translate.instant('addon.mod_quiz.mustbesubmittedby', { $a: CoreTime.userDate(dueDate) });
        }
    }

    /**
     * Get the display option value related to the attempt state.
     * Equivalent to LMS quiz_attempt_state.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @returns Display option value.
     */
    getAttemptStateDisplayOption(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
    ): AddonModQuizDisplayOptionsAttemptStates {
        if (attempt.state === AddonModQuizAttemptStates.IN_PROGRESS) {
            return AddonModQuizDisplayOptionsAttemptStates.DURING;
        } else if (quiz.timeclose && Date.now() >= quiz.timeclose * 1000) {
            return AddonModQuizDisplayOptionsAttemptStates.AFTER_CLOSE;
        } else if (Date.now() < ((attempt.timefinish ?? 0) + ADDON_MOD_QUIZ_IMMEDIATELY_AFTER_PERIOD) * 1000) {
            return AddonModQuizDisplayOptionsAttemptStates.IMMEDIATELY_AFTER;
        }

        return AddonModQuizDisplayOptionsAttemptStates.LATER_WHILE_OPEN;
    }

    /**
     * Get display options for a certain quiz.
     * Equivalent to LMS display_options::make_from_quiz.
     *
     * @param quiz Quiz.
     * @param state State.
     * @returns Display options.
     */
    getDisplayOptionsForQuiz(
        quiz: AddonModQuizQuizWSData,
        state: AddonModQuizDisplayOptionsAttemptStates,
    ): AddonModQuizDisplayOptions {
        const marksOption = this.calculateDisplayOptionValue(
            quiz.reviewmarks ?? 0,
            state,
            QuestionDisplayOptionsMarks.MARK_AND_MAX,
            QuestionDisplayOptionsMarks.MAX_ONLY,
        );
        const feedbackOption = this.calculateDisplayOptionValue(quiz.reviewspecificfeedback ?? 0, state);

        return {
            attempt: this.calculateDisplayOptionValue(quiz.reviewattempt ?? 0, state, true, false),
            correctness: this.calculateDisplayOptionValue(quiz.reviewcorrectness ?? 0, state),
            marks: quiz.reviewmaxmarks !== undefined ?
                this.calculateDisplayOptionValue<QuestionDisplayOptionsMarks | QuestionDisplayOptionsValues>(
                    quiz.reviewmaxmarks,
                    state,
                    marksOption,
                    QuestionDisplayOptionsValues.HIDDEN,
                ) :
                marksOption,
            feedback: feedbackOption,
            generalfeedback: this.calculateDisplayOptionValue(quiz.reviewgeneralfeedback ?? 0, state),
            rightanswer: this.calculateDisplayOptionValue(quiz.reviewrightanswer ?? 0, state),
            overallfeedback: this.calculateDisplayOptionValue(quiz.reviewoverallfeedback ?? 0, state),
            numpartscorrect: feedbackOption,
            manualcomment: feedbackOption,
            markdp: quiz.questiondecimalpoints !== undefined && quiz.questiondecimalpoints !== -1 ?
                quiz.questiondecimalpoints :
                (quiz.decimalpoints ?? 0),
        };
    }

    /**
     * Calculate the value for a certain display option.
     *
     * @param setting Setting value related to the option.
     * @param state Display options state.
     * @param whenSet Value to return if setting is set.
     * @param whenNotSet Value to return if setting is not set.
     * @returns Display option.
     */
    protected calculateDisplayOptionValue<T = AddonModQuizDisplayOptionValue>(
        setting: number,
        state: AddonModQuizDisplayOptionsAttemptStates,
        whenSet: T,
        whenNotSet: T,
    ): T;
    protected calculateDisplayOptionValue(
        setting: number,
        state: AddonModQuizDisplayOptionsAttemptStates,
    ): QuestionDisplayOptionsValues;
    protected calculateDisplayOptionValue(
        setting: number,
        state: AddonModQuizDisplayOptionsAttemptStates,
        whenSet: AddonModQuizDisplayOptionValue = QuestionDisplayOptionsValues.VISIBLE,
        whenNotSet: AddonModQuizDisplayOptionValue = QuestionDisplayOptionsValues.HIDDEN,
    ): AddonModQuizDisplayOptionValue {
        // eslint-disable-next-line no-bitwise
        if (setting & state) {
            return whenSet;
        }

        return whenNotSet;
    }

    /**
     * Turn attempt's state into a readable state name.
     *
     * @param state State.
     * @param finishedOffline Whether the attempt was finished offline.
     * @returns Readable state name.
     */
    getAttemptReadableStateName(state: string, finishedOffline = false): string {
        if (finishedOffline) {
            return Translate.instant('core.submittedoffline');
        }

        switch (state) {
            case AddonModQuizAttemptStates.IN_PROGRESS:
                return Translate.instant('addon.mod_quiz.stateinprogress');

            case AddonModQuizAttemptStates.OVERDUE:
                return Translate.instant('addon.mod_quiz.stateoverdue');

            case AddonModQuizAttemptStates.FINISHED:
                return Translate.instant('addon.mod_quiz.statefinished');

            case AddonModQuizAttemptStates.ABANDONED:
                return Translate.instant('addon.mod_quiz.stateabandoned');

            default:
                return '';
        }
    }

    /**
     * Get the color to apply to the attempt state.
     *
     * @param state State.
     * @param finishedOffline Whether the attempt was finished offline.
     * @returns State color.
     */
    getAttemptStateColor(state: string, finishedOffline = false): string {
        if (finishedOffline) {
            return CoreIonicColorNames.MEDIUM;
        }

        switch (state) {
            case AddonModQuizAttemptStates.IN_PROGRESS:
                return CoreIonicColorNames.WARNING;

            case AddonModQuizAttemptStates.OVERDUE:
                return CoreIonicColorNames.INFO;

            case AddonModQuizAttemptStates.FINISHED:
                return CoreIonicColorNames.SUCCESS;

            case AddonModQuizAttemptStates.ABANDONED:
                return CoreIonicColorNames.DANGER;

            default:
                return '';
        }
    }

    /**
     * Get cache key for get attempt review WS calls.
     *
     * @param attemptId Attempt ID.
     * @param page Page.
     * @returns Cache key.
     */
    protected getAttemptReviewCacheKey(attemptId: number, page: number): string {
        return this.getAttemptReviewCommonCacheKey(attemptId) + ':' + page;
    }

    /**
     * Get common cache key for get attempt review WS calls.
     *
     * @param attemptId Attempt ID.
     * @returns Cache key.
     */
    protected getAttemptReviewCommonCacheKey(attemptId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'attemptReview:' + attemptId;
    }

    /**
     * Get an attempt's review.
     *
     * @param attemptId Attempt ID.
     * @param options Other options.
     * @returns Promise resolved with the attempt review.
     */
    async getAttemptReview(
        attemptId: number,
        options: AddonModQuizGetAttemptReviewOptions = {},
    ): Promise<AddonModQuizGetAttemptReviewResponse> {
        const page = options.page === undefined ? -1 : options.page;

        const site = await CoreSites.getSite(options.siteId);

        const params = {
            attemptid: attemptId,
            page: page,
        };
        const preSets = {
            cacheKey: this.getAttemptReviewCacheKey(attemptId, page),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            deleteCacheIfWSError: true,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const result = await site.read<AddonModQuizGetAttemptReviewWSResponse>('mod_quiz_get_attempt_review', params, preSets);

        result.questions = CoreQuestion.parseQuestions(result.questions);

        return result;
    }

    /**
     * Get cache key for get attempt summary WS calls.
     *
     * @param attemptId Attempt ID.
     * @returns Cache key.
     */
    protected getAttemptSummaryCacheKey(attemptId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'attemptSummary:' + attemptId;
    }

    /**
     * Get an attempt's summary.
     *
     * @param attemptId Attempt ID.
     * @param preflightData Preflight required data (like password).
     * @param options Other options.
     * @returns Promise resolved with the list of questions for the attempt summary.
     */
    async getAttemptSummary(
        attemptId: number,
        preflightData: Record<string, string>,
        options: AddonModQuizGetAttemptSummaryOptions = {},
    ): Promise<CoreQuestionQuestionParsed[]> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetAttemptSummaryWSParams = {
            attemptid: attemptId,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
                true,
            ),
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAttemptSummaryCacheKey(attemptId),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModQuizGetAttemptSummaryWSResponse>('mod_quiz_get_attempt_summary', params, preSets);

        const questions = CoreQuestion.parseQuestions(response.questions);

        if (options.loadLocal) {
            return AddonModQuizOffline.loadQuestionsLocalStates(attemptId, questions, site.getId());
        }

        return questions;
    }

    /**
     * Get cache key for get combined review options WS calls.
     *
     * @param quizId Quiz ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCombinedReviewOptionsCacheKey(quizId: number, userId: number): string {
        return this.getCombinedReviewOptionsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get combined review options WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getCombinedReviewOptionsCommonCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'combinedReviewOptions:' + quizId;
    }

    /**
     * Get a quiz combined review options.
     *
     * @param quizId Quiz ID.
     * @param options Other options.
     * @returns Promise resolved with the combined review options.
     */
    async getCombinedReviewOptions(
        quizId: number,
        options: AddonModQuizUserOptions = {},
    ): Promise<AddonModQuizCombinedReviewOptions> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModQuizGetCombinedReviewOptionsWSParams = {
            quizid: quizId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCombinedReviewOptionsCacheKey(quizId, userId),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModQuizGetCombinedReviewOptionsWSResponse>(
            'mod_quiz_get_combined_review_options',
            params,
            preSets,
        );

        // Convert the arrays to objects with name -> value.
        return {
            someoptions: <Record<string, number>> CoreObject.toKeyValueMap(response.someoptions, 'name', 'value'),
            alloptions: <Record<string, number>> CoreObject.toKeyValueMap(response.alloptions, 'name', 'value'),
            warnings: response.warnings,
        };
    }

    /**
     * Get cache key for get feedback for grade WS calls.
     *
     * @param quizId Quiz ID.
     * @param grade Grade.
     * @returns Cache key.
     */
    protected getFeedbackForGradeCacheKey(quizId: number, grade: number): string {
        return this.getFeedbackForGradeCommonCacheKey(quizId) + ':' + grade;
    }

    /**
     * Get common cache key for get feedback for grade WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getFeedbackForGradeCommonCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'feedbackForGrade:' + quizId;
    }

    /**
     * Get the feedback for a certain grade.
     *
     * @param quizId Quiz ID.
     * @param grade Grade.
     * @param options Other options.
     * @returns Promise resolved with the feedback.
     */
    async getFeedbackForGrade(
        quizId: number,
        grade: SafeNumber,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModQuizGetQuizFeedbackForGradeWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetQuizFeedbackForGradeWSParams = {
            quizid: quizId,
            grade: grade,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getFeedbackForGradeCacheKey(quizId, grade),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_quiz_get_quiz_feedback_for_grade', params, preSets);
    }

    /**
     * Determine the correct number of decimal places required to format a grade.
     * Based on Moodle's quiz_get_grade_format.
     *
     * @param quiz Quiz.
     * @returns Number of decimals.
     */
    getGradeDecimals(quiz: AddonModQuizQuizWSData): number {
        if (quiz.questiondecimalpoints === undefined) {
            quiz.questiondecimalpoints = -1;
        }

        if (quiz.questiondecimalpoints == -1) {
            return quiz.decimalpoints ?? 1;
        }

        return quiz.questiondecimalpoints;
    }

    /**
     * Gets a quiz grade and feedback from the gradebook.
     *
     * @param courseId Course ID.
     * @param moduleId Quiz module ID.
     * @param ignoreCache Whether it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved with an object containing the grade and the feedback.
     */
    async getGradeFromGradebook(
        courseId: number,
        moduleId: number,
        ignoreCache?: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<CoreGradesFormattedItem | undefined> {

        const items = await CoreGradesHelper.getGradeModuleItems(
            courseId,
            moduleId,
            userId,
            undefined,
            siteId,
            ignoreCache,
        );

        return items.shift();
    }

    /**
     * Given a list of attempts, returns the last completed attempt.
     *
     * @param attempts Attempts sorted. First attempt should be the first on the list.
     * @returns Last completed attempt.
     */
    getLastCompletedAttemptFromList(attempts?: AddonModQuizAttemptWSData[]): AddonModQuizAttemptWSData | undefined {
        if (!attempts) {
            return;
        }

        for (let i = attempts.length - 1; i >= 0; i--) {
            const attempt = attempts[i];

            if (this.isAttemptCompleted(attempt.state)) {
                return attempt;
            }
        }
    }

    /**
     * Given a list of questions, check if the quiz can be submitted.
     * Will return an array with the messages to prevent the submit. Empty array if quiz can be submitted.
     *
     * @param questions Questions.
     * @returns List of prevent submit messages. Empty array if quiz can be submitted.
     */
    getPreventSubmitMessages(questions: CoreQuestionQuestionParsed[]): string[] {
        const messages: string[] = [];

        questions.forEach((question) => {
            if (question.type != 'random' && !CoreQuestionDelegate.isQuestionSupported(question.type)) {
                // The question isn't supported.
                messages.push(Translate.instant('core.question.questionmessage', {
                    $a: question.slot,
                    $b: Translate.instant('core.question.errorquestionnotsupported', { $a: question.type }),
                }));
            } else {
                let message = CoreQuestionDelegate.getPreventSubmitMessage(question);
                if (message) {
                    message = Translate.instant(message);
                    messages.push(Translate.instant('core.question.questionmessage', { $a: question.slot, $b: message }));
                }
            }
        });

        return messages;
    }

    /**
     * Get cache key for quiz data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getQuizDataCacheKey(courseId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'quiz:' + courseId;
    }

    /**
     * Get a Quiz with key=value. If more than one is found, only the first will be returned.
     *
     * @param courseId Course ID.
     * @param key Name of the property to check.
     * @param value Value to search.
     * @param options Other options.
     * @returns Promise resolved when the Quiz is retrieved.
     */
    protected async getQuizByField(
        courseId: number,
        key: string,
        value: unknown,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModQuizQuizWSData> {

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetQuizzesByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getQuizDataCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModQuizGetQuizzesByCoursesWSResponse>(
            'mod_quiz_get_quizzes_by_courses',
            params,
            preSets,
        );

        // Search the quiz.
        const quiz = response.quizzes.find(quiz => quiz[key] == value);

        if (!quiz) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        return quiz;
    }

    /**
     * Get a quiz by module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the quiz is retrieved.
     */
    getQuiz(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModQuizQuizWSData> {
        return this.getQuizByField(courseId, 'coursemodule', cmId, options);
    }

    /**
     * Get a quiz by quiz ID.
     *
     * @param courseId Course ID.
     * @param id Quiz ID.
     * @param options Other options.
     * @returns Promise resolved when the quiz is retrieved.
     */
    getQuizById(courseId: number, id: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModQuizQuizWSData> {
        return this.getQuizByField(courseId, 'id', id, options);
    }

    /**
     * Get cache key for get quiz access information WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getQuizAccessInformationCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'quizAccessInformation:' + quizId;
    }

    /**
     * Get access information for an attempt.
     *
     * @param quizId Quiz ID.
     * @param options Other options.
     * @returns Promise resolved with the access information.
     */
    async getQuizAccessInformation(
        quizId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModQuizGetQuizAccessInformationWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetQuizAccessInformationWSParams = {
            quizid: quizId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getQuizAccessInformationCacheKey(quizId),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_quiz_get_quiz_access_information', params, preSets);
    }

    /**
     * Get a readable Quiz grade method.
     *
     * @param method Grading method.
     * @returns Readable grading method.
     */
    getQuizGradeMethod(method?: number | string): string {
        if (method === undefined) {
            return '';
        }

        if (typeof method == 'string') {
            method = parseInt(method, 10);
        }

        switch (method) {
            case AddonModQuizGradeMethods.HIGHEST_GRADE:
                return Translate.instant('addon.mod_quiz.gradehighest');
            case AddonModQuizGradeMethods.AVERAGE_GRADE:
                return Translate.instant('addon.mod_quiz.gradeaverage');
            case AddonModQuizGradeMethods.FIRST_ATTEMPT:
                return Translate.instant('addon.mod_quiz.attemptfirst');
            case AddonModQuizGradeMethods.LAST_ATTEMPT:
                return Translate.instant('addon.mod_quiz.attemptlast');
            default:
                return '';
        }
    }

    /**
     * Get cache key for get quiz required qtypes WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getQuizRequiredQtypesCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'quizRequiredQtypes:' + quizId;
    }

    /**
     * Get the potential question types that would be required for a given quiz.
     *
     * @param quizId Quiz ID.
     * @param options Other options.
     * @returns Promise resolved with the access information.
     */
    async getQuizRequiredQtypes(quizId: number, options: CoreCourseCommonModWSOptions = {}): Promise<string[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModQuizGetQuizRequiredQtypesWSParams = {
            quizid: quizId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getQuizRequiredQtypesCacheKey(quizId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModQuizGetQuizRequiredQtypesWSResponse>(
            'mod_quiz_get_quiz_required_qtypes',
            params,
            preSets,
        );

        return response.questiontypes;
    }

    /**
     * Given an attempt's layout, return the list of pages.
     *
     * @param layout Attempt's layout.
     * @returns Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    getPagesFromLayout(layout?: string): number[] {
        if (!layout) {
            return [];
        }

        const split = layout.split(',');
        const pages: number[] = [];
        let page = 0;

        for (let i = 0; i < split.length; i++) {
            if (split[i] == '0') {
                pages.push(page);
                page++;
            }
        }

        return pages;
    }

    /**
     * Given an attempt's layout and a list of questions identified by question slot,
     * return the list of pages that have at least 1 of the questions.
     *
     * @param layout Attempt's layout.
     * @param questions List of questions. It needs to be an object where the keys are question slot.
     * @returns Pages.
     * @description
     * An attempt's layout is a string with the question numbers separated by commas. A 0 indicates a change of page.
     * Example: 1,2,3,0,4,5,6,0
     * In the example above, first page has questions 1, 2 and 3. Second page has questions 4, 5 and 6.
     *
     * This function returns a list of pages.
     */
    getPagesFromLayoutAndQuestions(layout: string, questions: AddonModQuizQuestionsWithAnswers): number[] {
        const split = layout.split(',');
        const pages: number[] = [];
        let page = 0;
        let pageAdded = false;

        for (let i = 0; i < split.length; i++) {
            const value = Number(split[i]);

            if (value == 0) {
                page++;
                pageAdded = false;
            } else if (!pageAdded && questions[value]) {
                pages.push(page);
                pageAdded = true;
            }
        }

        return pages;
    }

    /**
     * Given a list of question types, returns the types that aren't supported.
     *
     * @param questionTypes Question types to check.
     * @returns Not supported question types.
     */
    getUnsupportedQuestions(questionTypes: string[]): string[] {
        const notSupported: string[] = [];

        questionTypes.forEach((type) => {
            if (type != 'random' && !CoreQuestionDelegate.isQuestionSupported(type)) {
                notSupported.push(type);
            }
        });

        return notSupported;
    }

    /**
     * Given a list of access rules names, returns the rules that aren't supported.
     *
     * @param rulesNames Rules to check.
     * @returns Not supported rules names.
     */
    getUnsupportedRules(rulesNames: string[]): string[] {
        const notSupported: string[] = [];

        rulesNames.forEach((name) => {
            if (!AddonModQuizAccessRuleDelegate.isAccessRuleSupported(name)) {
                notSupported.push(name);
            }
        });

        return notSupported;
    }

    /**
     * Get cache key for get user attempts WS calls.
     *
     * @param quizId Quiz ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserAttemptsCacheKey(quizId: number, userId: number): string {
        return this.getUserAttemptsCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user attempts WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getUserAttemptsCommonCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'userAttempts:' + quizId;
    }

    /**
     * Get quiz attempts for a certain user.
     *
     * @param quizId Quiz ID.
     * @param options Other options.
     * @returns Promise resolved with the attempts.
     */
    async getUserAttempts(
        quizId: number,
        options: AddonModQuizGetUserAttemptsOptions = {},
    ): Promise<AddonModQuizAttemptWSData[]> {

        const status = options.status || 'all';
        const includePreviews = options.includePreviews === undefined ? true : options.includePreviews;

        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModQuizGetUserAttemptsWSParams = {
            quizid: quizId,
            userid: userId,
            status: status,
            includepreviews: !!includePreviews,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserAttemptsCacheKey(quizId, userId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModQuizGetUserAttemptsWSResponse>('mod_quiz_get_user_attempts', params, preSets);

        return response.attempts;
    }

    /**
     * Get cache key for get user best grade WS calls.
     *
     * @param quizId Quiz ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getUserBestGradeCacheKey(quizId: number, userId: number): string {
        return this.getUserBestGradeCommonCacheKey(quizId) + ':' + userId;
    }

    /**
     * Get common cache key for get user best grade WS calls.
     *
     * @param quizId Quiz ID.
     * @returns Cache key.
     */
    protected getUserBestGradeCommonCacheKey(quizId: number): string {
        return AddonModQuizProvider.ROOT_CACHE_KEY + 'userBestGrade:' + quizId;
    }

    /**
     * Get best grade in a quiz for a certain user.
     *
     * @param quizId Quiz ID.
     * @param options Other options.
     * @returns Promise resolved with the best grade data.
     */
    async getUserBestGrade(quizId: number, options: AddonModQuizUserOptions = {}): Promise<AddonModQuizGetUserBestGradeWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const userId = options.userId || site.getUserId();
        const params: AddonModQuizGetUserBestGradeWSParams = {
            quizid: quizId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getUserBestGradeCacheKey(quizId, userId),
            component: ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_quiz_get_user_best_grade', params, preSets);
    }

    /**
     * Invalidates all the data related to a certain quiz.
     *
     * @param quizId Quiz ID.
     * @param courseId Course ID.
     * @param attemptId Attempt ID to invalidate some WS calls.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllQuizData(
        quizId: number,
        courseId?: number,
        attemptId?: number,
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const promises: Promise<void>[] = [];

        promises.push(this.invalidateAttemptAccessInformation(quizId, siteId));
        promises.push(this.invalidateCombinedReviewOptionsForUser(quizId, siteId, userId));
        promises.push(this.invalidateFeedback(quizId, siteId));
        promises.push(this.invalidateQuizAccessInformation(quizId, siteId));
        promises.push(this.invalidateQuizRequiredQtypes(quizId, siteId));
        promises.push(this.invalidateUserAttemptsForUser(quizId, siteId, userId));
        promises.push(this.invalidateUserBestGradeForUser(quizId, siteId, userId));

        if (attemptId) {
            promises.push(this.invalidateAttemptData(attemptId, siteId));
            promises.push(this.invalidateAttemptReview(attemptId, siteId));
            promises.push(this.invalidateAttemptSummary(attemptId, siteId));
        }

        if (courseId) {
            promises.push(this.invalidateGradeFromGradebook(courseId, siteId, userId));
        }

        await Promise.all(promises);
    }

    /**
     * Invalidates attempt access information for all attempts in a quiz.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptAccessInformation(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getAttemptAccessInformationCommonCacheKey(quizId));
    }

    /**
     * Invalidates attempt access information for an attempt.
     *
     * @param quizId Quiz ID.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptAccessInformationForAttempt(quizId: number, attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptAccessInformationCacheKey(quizId, attemptId));
    }

    /**
     * Invalidates attempt data for all pages.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptData(attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getAttemptDataCommonCacheKey(attemptId));
    }

    /**
     * Invalidates attempt data for a certain page.
     *
     * @param attemptId Attempt ID.
     * @param page Page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptDataForPage(attemptId: number, page: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptDataCacheKey(attemptId, page));
    }

    /**
     * Invalidates attempt review for all pages.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptReview(attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getAttemptReviewCommonCacheKey(attemptId));
    }

    /**
     * Invalidates attempt review for a certain page.
     *
     * @param attemptId Attempt ID.
     * @param page Page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptReviewForPage(attemptId: number, page: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptReviewCacheKey(attemptId, page));
    }

    /**
     * Invalidates attempt summary.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAttemptSummary(attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAttemptSummaryCacheKey(attemptId));
    }

    /**
     * Invalidates combined review options for all users.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCombinedReviewOptions(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getCombinedReviewOptionsCommonCacheKey(quizId));
    }

    /**
     * Invalidates combined review options for a certain user.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCombinedReviewOptionsForUser(quizId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getCombinedReviewOptionsCacheKey(quizId, userId || site.getUserId()));
    }

    /**
     * Invalidate the prefetched content except files.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Get required data to call the invalidate functions.
        const quiz = await this.getQuiz(courseId, moduleId, {
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        const attempts = await this.getUserAttempts(quiz.id, { cmId: moduleId, siteId });

        // Now invalidate it.
        const lastAttemptId = attempts.length ? attempts[attempts.length - 1].id : undefined;

        await this.invalidateAllQuizData(quiz.id, courseId, lastAttemptId, siteId);
    }

    /**
     * Invalidates feedback for all grades of a quiz.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateFeedback(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getFeedbackForGradeCommonCacheKey(quizId));
    }

    /**
     * Invalidates feedback for a certain grade.
     *
     * @param quizId Quiz ID.
     * @param grade Grade.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateFeedbackForGrade(quizId: number, grade: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getFeedbackForGradeCacheKey(quizId, grade));
    }

    /**
     * Invalidates grade from gradebook for a certain user.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateGradeFromGradebook(courseId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await CoreGradesHelper.invalidateGradeModuleItems(courseId, userId || site.getUserId(), undefined, siteId);
    }

    /**
     * Invalidates quiz access information for a quiz.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateQuizAccessInformation(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getQuizAccessInformationCacheKey(quizId));
    }

    /**
     * Invalidates required qtypes for a quiz.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateQuizRequiredQtypes(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getQuizRequiredQtypesCacheKey(quizId));
    }

    /**
     * Invalidates user attempts for all users.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserAttempts(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserAttemptsCommonCacheKey(quizId));
    }

    /**
     * Invalidates user attempts for a certain user.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserAttemptsForUser(quizId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserAttemptsCacheKey(quizId, userId || site.getUserId()));
    }

    /**
     * Invalidates user best grade for all users.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserBestGrade(quizId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getUserBestGradeCommonCacheKey(quizId));
    }

    /**
     * Invalidates user best grade for a certain user.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined use site's current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateUserBestGradeForUser(quizId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getUserBestGradeCacheKey(quizId, userId || site.getUserId()));
    }

    /**
     * Invalidates quiz data.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateQuizData(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getQuizDataCacheKey(courseId));
    }

    /**
     * Check if an attempt is "completed": finished or abandoned.
     *
     * @param state Attempt's state.
     * @returns Whether it's finished.
     */
    isAttemptCompleted(state?: string): boolean {
        return state === AddonModQuizAttemptStates.FINISHED || state === AddonModQuizAttemptStates.ABANDONED;
    }

    /**
     * Check if an attempt is finished in offline but not synced.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if finished in offline but not synced, false otherwise.
     */
    async isAttemptFinishedOffline(attemptId: number, siteId?: string): Promise<boolean> {
        try {
            const attempt = await AddonModQuizOffline.getAttemptById(attemptId, siteId);

            return !!attempt.finished;
        } catch {
            return false;
        }
    }

    /**
     * Check if an attempt is nearly over. We consider an attempt nearly over or over if:
     * - Is not in progress
     * OR
     * - It finished before autosaveperiod passes.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @returns Whether it's nearly over or over.
     */
    isAttemptTimeNearlyOver(quiz: AddonModQuizQuizWSData, attempt: AddonModQuizAttemptWSData): boolean {
        if (attempt.state !== AddonModQuizAttemptStates.IN_PROGRESS) {
            // Attempt not in progress, return true.
            return true;
        }

        const dueDate = this.getAttemptDueDate(quiz, attempt);
        const autoSavePeriod = quiz.autosaveperiod || 0;

        if (dueDate > 0 && Date.now() + autoSavePeriod >= dueDate) {
            return true;
        }

        return false;
    }

    /**
     * Check if last attempt is offline and unfinished.
     *
     * @param quiz Quiz data.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, user current site's user.
     * @returns Promise resolved with boolean: true if last offline attempt is unfinished, false otherwise.
     */
    async isLastAttemptOfflineUnfinished(quiz: AddonModQuizQuizWSData, siteId?: string, userId?: number): Promise<boolean> {
        try {
            const attempts = await AddonModQuizOffline.getQuizAttempts(quiz.id, siteId, userId);

            const last = attempts.pop();

            return !!last && !last.finished;
        } catch {
            return false;
        }
    }

    /**
     * Check if a quiz navigation is sequential.
     *
     * @param quiz Quiz.
     * @returns Whether navigation is sequential.
     */
    isNavigationSequential(quiz: AddonModQuizQuizWSData): boolean {
        return quiz.navmethod === AddonModQuizNavMethods.SEQ;
    }

    /**
     * Check if a question is blocked.
     *
     * @param question Question.
     * @returns Whether it's blocked.
     */
    isQuestionBlocked(question: CoreQuestionQuestionParsed): boolean {
        const element = convertTextToHTMLElement(question.html);

        return !!element.querySelector('.mod_quiz-blocked_question_warning');
    }

    /**
     * Check if a question is unanswered.
     *
     * @param question Question.
     * @returns Whether it's unanswered.
     */
    isQuestionUnanswered(question: CoreQuestionQuestionParsed): boolean {
        if (!question.stateclass) {
            return false;
        }

        return QUESTION_TODO_STATE_CLASSES.some(stateClass => stateClass === question.stateclass)
            || QUESTION_INVALID_STATE_CLASSES.some(stateClass => stateClass === question.stateclass);
    }

    /**
     * Check if a quiz is enabled to be used in offline.
     *
     * @param quiz Quiz.
     * @returns Whether offline is enabled.
     */
    isQuizOffline(quiz: AddonModQuizQuizWSData): boolean {
        // Don't allow downloading the quiz if offline is disabled to prevent wasting a lot of data when opening it.
        return !!quiz.allowofflineattempts
            && !this.isNavigationSequential(quiz)
            && !CoreSites.getCurrentSite()?.isOfflineDisabled();
    }

    /**
     * Report an attempt as being viewed. It did not store logs offline because order of the log is important.
     *
     * @param attemptId Attempt ID.
     * @param page Page number.
     * @param preflightData Preflight required data (like password).
     * @param offline Whether attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logViewAttempt(
        attemptId: number,
        page: number = 0,
        preflightData: Record<string, string> = {},
        offline?: boolean,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModQuizViewAttemptWSParams = {
            attemptid: attemptId,
            page: page,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
            ),
        };
        const promises: Promise<unknown>[] = [];

        promises.push(site.write('mod_quiz_view_attempt', params));
        if (offline) {
            promises.push(AddonModQuizOffline.setAttemptCurrentPage(attemptId, page, site.getId()));
        }

        await Promise.all(promises);
    }

    /**
     * Report an attempt's review as being viewed.
     *
     * @param attemptId Attempt ID.
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logViewAttemptReview(attemptId: number, quizId: number, siteId?: string): Promise<void> {
        const params: AddonModQuizViewAttemptReviewWSParams = {
            attemptid: attemptId,
        };

        return CoreCourseLogHelper.log(
            'mod_quiz_view_attempt_review',
            params,
            ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            quizId,
            siteId,
        );
    }

    /**
     * Report an attempt's summary as being viewed.
     *
     * @param attemptId Attempt ID.
     * @param preflightData Preflight required data (like password).
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logViewAttemptSummary(
        attemptId: number,
        preflightData: Record<string, string>,
        quizId: number,
        siteId?: string,
    ): Promise<void> {
        const params: AddonModQuizViewAttemptSummaryWSParams = {
            attemptid: attemptId,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
            ),
        };

        return CoreCourseLogHelper.log(
            'mod_quiz_view_attempt_summary',
            params,
            ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            quizId,
            siteId,
        );
    }

    /**
     * Report a quiz as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logViewQuiz(id: number, siteId?: string): Promise<void> {
        const params: AddonModQuizViewQuizWSParams = {
            quizid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_quiz_view_quiz',
            params,
            ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            id,
            siteId,
        );
    }

    /**
     * Process an attempt, saving its data.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param data Data to save.
     * @param preflightData Preflight required data (like password).
     * @param finish Whether to finish the quiz.
     * @param timeUp Whether the quiz time is up, false otherwise.
     * @param offline Whether the attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async processAttempt(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        data: CoreQuestionsAnswers,
        preflightData: Record<string, string>,
        finish?: boolean,
        timeUp?: boolean,
        offline?: boolean,
        siteId?: string,
    ): Promise<void> {
        if (offline) {
            return this.processAttemptOffline(quiz, attempt, data, preflightData, finish, siteId);
        }

        await this.processAttemptOnline(attempt.id, data, preflightData, finish, timeUp, siteId);
    }

    /**
     * Process an online attempt, saving its data.
     *
     * @param attemptId Attempt ID.
     * @param data Data to save.
     * @param preflightData Preflight required data (like password).
     * @param finish Whether to finish the quiz.
     * @param timeUp Whether the quiz time is up, false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    protected async processAttemptOnline(
        attemptId: number,
        data: CoreQuestionsAnswers,
        preflightData: Record<string, string>,
        finish?: boolean,
        timeUp?: boolean,
        siteId?: string,
    ): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModQuizProcessAttemptWSParams = {
            attemptid: attemptId,
            data: CoreObject.toArrayOfObjects(data, 'name', 'value'),
            finishattempt: !!finish,
            timeup: !!timeUp,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
            ),
        };

        const response = await site.write<AddonModQuizProcessAttemptWSResponse>('mod_quiz_process_attempt', params);

        if (response.warnings?.length) {
            // Reject with the first warning.
            throw new CoreWSError(response.warnings[0]);
        }

        return response.state;
    }

    /**
     * Process an offline attempt, saving its data.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param data Data to save.
     * @param preflightData Preflight required data (like password).
     * @param finish Whether to finish the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    protected async processAttemptOffline(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        data: CoreQuestionsAnswers,
        preflightData: Record<string, string>,
        finish?: boolean,
        siteId?: string,
    ): Promise<void> {

        // Get attempt summary to have the list of questions.
        const questionsArray = await this.getAttemptSummary(attempt.id, preflightData, {
            cmId: quiz.coursemodule,
            loadLocal: true,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
            siteId,
        });

        // Convert the question array to an object.
        const questions = CoreArray.toObject(questionsArray, 'slot');

        return AddonModQuizOffline.processAttempt(quiz, attempt, questions, data, finish, siteId);
    }

    /**
     * Check if it's a graded quiz. Based on Moodle's quiz_has_grades.
     *
     * @param quiz Quiz.
     * @returns Whether quiz is graded.
     */
    quizHasGrades(quiz: AddonModQuizQuizWSData): boolean {
        return (quiz.grade ?? 0) >= 0.000005 && (quiz.sumgrades ?? 0) >= 0.000005;
    }

    /**
     * Convert the raw grade into a grade out of the maximum grade for this quiz.
     * Based on Moodle's quiz_rescale_grade.
     *
     * @param rawGrade The unadjusted grade, for example attempt.sumgrades.
     * @param quiz Quiz.
     * @param format True to format the results for display, 'question' to format a question grade
     *               (different number of decimal places), false to not format it.
     * @returns Grade to display.
     */
    rescaleGrade(
        rawGrade: string | number | undefined | null,
        quiz: AddonModQuizQuizWSData,
        format: boolean | string = true,
    ): string | undefined {
        let grade: number | undefined;

        const rawGradeNum = typeof rawGrade === 'string' ? parseFloat(rawGrade) : rawGrade;
        if (rawGradeNum !== undefined && rawGradeNum !== null && !isNaN(rawGradeNum)) {
            if (quiz.sumgrades && quiz.sumgrades >= 0.000005) {
                grade = rawGradeNum * (quiz.grade ?? 0) / quiz.sumgrades;
            } else {
                grade = 0;
            }
        }

        if (grade === null || grade === undefined) {
            return;
        }

        if (format === 'question') {
            return this.formatGrade(grade, this.getGradeDecimals(quiz));
        } else if (format) {
            return this.formatGrade(grade, quiz.decimalpoints ?? 1);
        }

        return String(grade);
    }

    /**
     * Save an attempt data.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param data Data to save.
     * @param preflightData Preflight required data (like password).
     * @param offline Whether attempt is offline.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async saveAttempt(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        data: CoreQuestionsAnswers,
        preflightData: Record<string, string>,
        offline?: boolean,
        siteId?: string,
    ): Promise<void> {
        try {
            if (offline) {
                return await this.processAttemptOffline(quiz, attempt, data, preflightData, false, siteId);
            }

            await this.saveAttemptOnline(attempt.id, data, preflightData, siteId);
        } catch (error) {
            this.logger.error(error);

            throw error;
        }
    }

    /**
     * Save an attempt data.
     *
     * @param attemptId Attempt ID.
     * @param data Data to save.
     * @param preflightData Preflight required data (like password).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    protected async saveAttemptOnline(
        attemptId: number,
        data: CoreQuestionsAnswers,
        preflightData: Record<string, string>,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModQuizSaveAttemptWSParams = {
            attemptid: attemptId,
            data: CoreObject.toArrayOfObjects(data, 'name', 'value'),
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
            ),
        };

        const response = await site.write<CoreStatusWithWarningsWSResponse>('mod_quiz_save_attempt', params);

        if (response.warnings?.length) {
            // Reject with the first warning.
            throw new CoreWSError(response.warnings[0]);
        } else if (!response.status) {
            // It shouldn't happen that status is false and no warnings were returned.
            throw new CoreError('Cannot save data.');
        }
    }

    /**
     * Check if time left should be shown.
     *
     * @param rules List of active rules names.
     * @param attempt Attempt.
     * @param endTime The attempt end time (in seconds).
     * @returns Whether time left should be displayed.
     */
    shouldShowTimeLeft(rules: string[], attempt: AddonModQuizAttemptWSData, endTime: number): boolean {
        const timeNow = CoreTime.timestamp();

        if (attempt.state !== AddonModQuizAttemptStates.IN_PROGRESS) {
            return false;
        }

        return AddonModQuizAccessRuleDelegate.shouldShowTimeLeft(rules, attempt, endTime, timeNow);
    }

    /**
     * Start an attempt.
     *
     * @param quizId Quiz ID.
     * @param preflightData Preflight required data (like password).
     * @param forceNew Whether to force a new attempt or not.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the attempt data.
     */
    async startAttempt(
        quizId: number,
        preflightData: Record<string, string>,
        forceNew?: boolean,
        siteId?: string,
    ): Promise<AddonModQuizAttemptWSData> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModQuizStartAttemptWSParams = {
            quizid: quizId,
            preflightdata: CoreObject.toArrayOfObjects<AddonModQuizPreflightDataWSParam>(
                preflightData,
                'name',
                'value',
            ),
            forcenew: !!forceNew,
        };

        const response = await site.write<AddonModQuizStartAttemptWSResponse>('mod_quiz_start_attempt', params);

        if (response.warnings?.length) {
            // Reject with the first warning.
            throw new CoreWSError(response.warnings[0]);
        }

        return response.attempt;
    }

}

export const AddonModQuiz = makeSingleton(AddonModQuizProvider);

/**
 * Common options with user ID.
 */
export type AddonModQuizUserOptions = CoreCourseCommonModWSOptions & {
    userId?: number; // User ID. If not defined use site's current user.
};

/**
 * Options to pass to getAllQuestionsData.
 */
export type AddonModQuizAllQuestionsDataOptions = CoreCourseCommonModWSOptions & {
    pages?: number[]; // List of pages to get. If not defined, all pages.
};

/**
 * Options to pass to getAttemptReview.
 */
export type AddonModQuizGetAttemptReviewOptions = CoreCourseCommonModWSOptions & {
    page?: number; // List of pages to get. If not defined, all pages.
};

/**
 * Options to pass to getAttemptSummary.
 */
export type AddonModQuizGetAttemptSummaryOptions = CoreCourseCommonModWSOptions & {
    loadLocal?: boolean; // Whether it should load local state for each question.
};

/**
 * Options to pass to getUserAttempts.
 */
export type AddonModQuizGetUserAttemptsOptions = CoreCourseCommonModWSOptions & {
    status?: string; // Status of the attempts to get. By default, 'all'.
    includePreviews?: boolean; // Whether to include previews. Defaults to true.
    userId?: number; // User ID. If not defined use site's current user.
};

/**
 * Preflight data in the format accepted by the WebServices.
 */
type AddonModQuizPreflightDataWSParam = {
    name: string; // Data name.
    value: string; // Data value.
};

/**
 * Params of mod_quiz_get_attempt_access_information WS.
 */
export type AddonModQuizGetAttemptAccessInformationWSParams = {
    quizid: number; // Quiz instance id.
    attemptid?: number; // Attempt id, 0 for the user last attempt if exists.
};

/**
 * Data returned by mod_quiz_get_attempt_access_information WS.
 */
export type AddonModQuizGetAttemptAccessInformationWSResponse = {
    endtime?: number; // When the attempt must be submitted (determined by rules).
    isfinished: boolean; // Whether there is no way the user will ever be allowed to attempt.
    ispreflightcheckrequired?: boolean; // Whether a check is required before the user starts/continues his attempt.
    preventnewattemptreasons: string[]; // List of reasons.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_attempt_data WS.
 */
export type AddonModQuizGetAttemptDataWSParams = {
    attemptid: number; // Attempt id.
    page: number; // Page number.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Data returned by mod_quiz_get_attempt_data WS.
 */
export type AddonModQuizGetAttemptDataWSResponse = {
    attempt: AddonModQuizAttemptWSData;
    messages: string[]; // Access messages, will only be returned for users with mod/quiz:preview capability.
    nextpage: number; // Next page number.
    questions: CoreQuestionQuestionWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Attempt data returned by several WebServices.
 */
export type AddonModQuizAttemptWSData = {
    id: number; // Attempt id.
    quiz?: number; // Foreign key reference to the quiz that was attempted.
    userid?: number; // Foreign key reference to the user whose attempt this is.
    attempt?: number; // Sequentially numbers this students attempts at this quiz.
    uniqueid?: number; // Foreign key reference to the question_usage that holds the details of the the question_attempts.
    layout?: string; // Attempt layout.
    currentpage?: number; // Attempt current page.
    preview?: number; // Whether is a preview attempt or not.
    state?: string; // The current state of the attempts. 'inprogress', 'overdue', 'finished' or 'abandoned'.
    timestart?: number; // Time when the attempt was started.
    timefinish?: number; // Time when the attempt was submitted. 0 if the attempt has not been submitted yet.
    timemodified?: number; // Last modified time.
    timemodifiedoffline?: number; // Last modified time via webservices.
    timecheckstate?: number; // Next time quiz cron should check attempt for state changes. NULL means never check.
    sumgrades?: SafeNumber | null; // Total marks for this attempt.
    gradeitemmarks?: { // @since 4.4. If the quiz has additional grades set up, the mark for each grade for this attempt.
        name: string; // The name of this grade item.
        grade: number; // The grade this attempt earned for this item.
        maxgrade: number; // The total this grade is out of.
    }[];
};

/**
 * Get attempt data response with parsed questions.
 */
export type AddonModQuizGetAttemptDataResponse = Omit<AddonModQuizGetAttemptDataWSResponse, 'questions'> & {
    questions: CoreQuestionQuestionParsed[];
};

/**
 * Params of mod_quiz_get_attempt_review WS.
 */
export type AddonModQuizGetAttemptReviewWSParams = {
    attemptid: number; // Attempt id.
    page?: number; // Page number, empty for all the questions in all the pages.
};

/**
 * Data returned by mod_quiz_get_attempt_review WS.
 */
export type AddonModQuizGetAttemptReviewWSResponse = {
    grade: string; // Grade for the quiz (or empty or "notyetgraded").
    attempt: AddonModQuizAttemptWSData;
    additionaldata: AddonModQuizWSAdditionalData[];
    questions: CoreQuestionQuestionWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Additional data returned by mod_quiz_get_attempt_review WS.
 */
export type AddonModQuizWSAdditionalData = {
    id: string; // Id of the data.
    title: string; // Data title.
    content: string; // Data content.
};

/**
 * Get attempt review response with parsed questions.
 */
export type AddonModQuizGetAttemptReviewResponse = Omit<AddonModQuizGetAttemptReviewWSResponse, 'questions'> & {
    questions: CoreQuestionQuestionParsed[];
};

/**
 * Params of mod_quiz_get_attempt_summary WS.
 */
export type AddonModQuizGetAttemptSummaryWSParams = {
    attemptid: number; // Attempt id.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Data returned by mod_quiz_get_attempt_summary WS.
 */
export type AddonModQuizGetAttemptSummaryWSResponse = {
    questions: CoreQuestionQuestionWSData[];
    totalunanswered?: number; // @since 4.4. Total unanswered questions.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_combined_review_options WS.
 */
export type AddonModQuizGetCombinedReviewOptionsWSParams = {
    quizid: number; // Quiz instance id.
    userid?: number; // User id (empty for current user).
};

/**
 * Data returned by mod_quiz_get_combined_review_options WS.
 */
export type AddonModQuizGetCombinedReviewOptionsWSResponse = {
    someoptions: AddonModQuizWSReviewOption[];
    alloptions: AddonModQuizWSReviewOption[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Option data returned by mod_quiz_get_combined_review_options.
 */
export type AddonModQuizWSReviewOption = {
    name: string; // Option name.
    value: number; // Option value.
};

/**
 * Data returned by mod_quiz_get_combined_review_options WS, formatted to convert the options to objects.
 */
export type AddonModQuizCombinedReviewOptions = Omit<AddonModQuizGetCombinedReviewOptionsWSResponse, 'alloptions'|'someoptions'> & {
    someoptions: Record<string, number>;
    alloptions: Record<string, number>;
};

/**
 * Params of mod_quiz_get_quiz_feedback_for_grade WS.
 */
export type AddonModQuizGetQuizFeedbackForGradeWSParams = {
    quizid: number; // Quiz instance id.
    grade: number; // The grade to check.
};

/**
 * Data returned by mod_quiz_get_quiz_feedback_for_grade WS.
 */
export type AddonModQuizGetQuizFeedbackForGradeWSResponse = {
    feedbacktext: string; // The comment that corresponds to this grade (empty for none).
    feedbacktextformat?: CoreTextFormat; // Feedbacktext format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    feedbackinlinefiles?: CoreWSExternalFile[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_quizzes_by_courses WS.
 */
export type AddonModQuizGetQuizzesByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_quiz_get_quizzes_by_courses WS.
 */
export type AddonModQuizGetQuizzesByCoursesWSResponse = {
    quizzes: AddonModQuizQuizWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Quiz data returned by mod_quiz_get_quizzes_by_courses WS.
 */
export type AddonModQuizQuizWSData = {
    id: number; // Standard Moodle primary key.
    course: number; // Foreign key reference to the course this quiz is part of.
    coursemodule: number; // Course module id.
    name: string; // Quiz name.
    intro?: string; // Quiz introduction text.
    introformat?: CoreTextFormat; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    timeopen?: number; // The time when this quiz opens. (0 = no restriction.).
    timeclose?: number; // The time when this quiz closes. (0 = no restriction.).
    timelimit?: number; // The time limit for quiz attempts, in seconds.
    overduehandling?: string; // The method used to handle overdue attempts. 'autosubmit', 'graceperiod' or 'autoabandon'.
    graceperiod?: number; // The amount of time (in seconds) after time limit during which attempts can still be submitted.
    preferredbehaviour?: string; // The behaviour to ask questions to use.
    canredoquestions?: number; // Allows students to redo any completed question within a quiz attempt.
    attempts?: number; // The maximum number of attempts a student is allowed.
    attemptonlast?: number; // Whether subsequent attempts start from the answer to the previous attempt (1) or start blank (0).
    grademethod?: number; // One of the values QUIZ_GRADEHIGHEST, QUIZ_GRADEAVERAGE, QUIZ_ATTEMPTFIRST or QUIZ_ATTEMPTLAST.
    decimalpoints?: number; // Number of decimal points to use when displaying grades.
    questiondecimalpoints?: number; // Number of decimal points to use when displaying question grades.
    reviewattempt?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewcorrectness?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewmaxmarks?: number; // @since 4.3. Whether users are allowed to review their quiz attempts at various times.
    reviewmarks?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewspecificfeedback?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewgeneralfeedback?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewrightanswer?: number; // Whether users are allowed to review their quiz attempts at various times.
    reviewoverallfeedback?: number; // Whether users are allowed to review their quiz attempts at various times.
    questionsperpage?: number; // How often to insert a page break when editing the quiz, or when shuffling the question order.
    navmethod?: AddonModQuizNavMethods; // Any constraints on how the user is allowed to navigate around the quiz.
    shuffleanswers?: number; // Whether the parts of the question should be shuffled, in those question types that support it.
    sumgrades?: number | null; // The total of all the question instance maxmarks.
    grade?: number; // The total that the quiz overall grade is scaled to be out of.
    timecreated?: number; // The time when the quiz was added to the course.
    timemodified?: number; // Last modified time.
    password?: string; // A password that the student must enter before starting or continuing a quiz attempt.
    subnet?: string; // Used to restrict the IP addresses from which this quiz can be attempted.
    browsersecurity?: string; // Restriciton on the browser the student must use. E.g. 'securewindow'.
    delay1?: number; // Delay that must be left between the first and second attempt, in seconds.
    delay2?: number; // Delay that must be left between the second and subsequent attempt, in seconds.
    showuserpicture?: number; // Option to show the user's picture during the attempt and on the review page.
    showblocks?: number; // Whether blocks should be shown on the attempt.php and review.php pages.
    completionattemptsexhausted?: number; // Mark quiz complete when the student has exhausted the maximum number of attempts.
    completionpass?: number; // Whether to require passing grade.
    allowofflineattempts?: number; // Whether to allow the quiz to be attempted offline in the mobile app.
    autosaveperiod?: number; // Auto-save delay.
    hasfeedback?: number; // Whether the quiz has any non-blank feedback text.
    hasquestions?: number; // Whether the quiz has questions.
    section?: number; // Course section id.
    visible?: number; // Module visibility.
    groupmode?: number; // Group mode.
    groupingid?: number; // Grouping id.
};

/**
 * Params of mod_quiz_get_quiz_access_information WS.
 */
export type AddonModQuizGetQuizAccessInformationWSParams = {
    quizid: number; // Quiz instance id.
};

/**
 * Data returned by mod_quiz_get_quiz_access_information WS.
 */
export type AddonModQuizGetQuizAccessInformationWSResponse = {
    canattempt: boolean; // Whether the user can do the quiz or not.
    canmanage: boolean; // Whether the user can edit the quiz settings or not.
    canpreview: boolean; // Whether the user can preview the quiz or not.
    canreviewmyattempts: boolean; // Whether the users can review their previous attempts or not.
    canviewreports: boolean; // Whether the user can view the quiz reports or not.
    accessrules: string[]; // List of rules.
    activerulenames: string[]; // List of active rules.
    preventaccessreasons: string[]; // List of reasons.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_quiz_required_qtypes WS.
 */
export type AddonModQuizGetQuizRequiredQtypesWSParams = {
    quizid: number; // Quiz instance id.
};

/**
 * Data returned by mod_quiz_get_quiz_required_qtypes WS.
 */
export type AddonModQuizGetQuizRequiredQtypesWSResponse = {
    questiontypes: string[]; // List of question types used in the quiz.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_user_attempts WS.
 */
export type AddonModQuizGetUserAttemptsWSParams = {
    quizid: number; // Quiz instance id.
    userid?: number; // User id, empty for current user.
    status?: string; // Quiz status: all, finished or unfinished.
    includepreviews?: boolean; // Whether to include previews or not.
};

/**
 * Data returned by mod_quiz_get_user_attempts WS.
 */
export type AddonModQuizGetUserAttemptsWSResponse = {
    attempts: AddonModQuizAttemptWSData[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_get_user_best_grade WS.
 */
export type AddonModQuizGetUserBestGradeWSParams = {
    quizid: number; // Quiz instance id.
    userid?: number; // User id.
};

/**
 * Data returned by mod_quiz_get_user_best_grade WS.
 */
export type AddonModQuizGetUserBestGradeWSResponse = {
    hasgrade: boolean; // Whether the user has a grade on the given quiz.
    grade?: SafeNumber; // The grade (only if the user has a grade).
    gradetopass?: number; // @since 3.11. The grade to pass the quiz (only if set).
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_view_attempt WS.
 */
export type AddonModQuizViewAttemptWSParams = {
    attemptid: number; // Attempt id.
    page: number; // Page number.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Params of mod_quiz_process_attempt WS.
 */
export type AddonModQuizProcessAttemptWSParams = {
    attemptid: number; // Attempt id.
    data?: { // The data to be saved.
        name: string; // Data name.
        value: string; // Data value.
    }[];
    finishattempt?: boolean; // Whether to finish or not the attempt.
    timeup?: boolean; // Whether the WS was called by a timer when the time is up.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Data returned by mod_quiz_process_attempt WS.
 */
export type AddonModQuizProcessAttemptWSResponse = {
    state: string; // The new attempt state: inprogress, finished, overdue, abandoned.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_save_attempt WS.
 */
export type AddonModQuizSaveAttemptWSParams = {
    attemptid: number; // Attempt id.
    data: { // The data to be saved.
        name: string; // Data name.
        value: string; // Data value.
    }[];
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Params of mod_quiz_start_attempt WS.
 */
export type AddonModQuizStartAttemptWSParams = {
    quizid: number; // Quiz instance id.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
    forcenew?: boolean; // Whether to force a new attempt or not.
};

/**
 * Data returned by mod_quiz_start_attempt WS.
 */
export type AddonModQuizStartAttemptWSResponse = {
    attempt: AddonModQuizAttemptWSData;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_quiz_view_attempt_review WS.
 */
export type AddonModQuizViewAttemptReviewWSParams = {
    attemptid: number; // Attempt id.
};

/**
 * Params of mod_quiz_view_attempt_summary WS.
 */
export type AddonModQuizViewAttemptSummaryWSParams = {
    attemptid: number; // Attempt id.
    preflightdata?: AddonModQuizPreflightDataWSParam[]; // Preflight required data (like passwords).
};

/**
 * Params of mod_quiz_view_quiz WS.
 */
export type AddonModQuizViewQuizWSParams = {
    quizid: number; // Quiz instance id.
};

/**
 * Data passed to ADDON_MOD_QUIZ_ATTEMPT_FINISHED_EVENT event.
 */
export type AddonModQuizAttemptFinishedData = {
    quizId: number;
    attemptId: number;
    synced: boolean;
};

/**
 * Quiz display option value.
 */
export type AddonModQuizDisplayOptionValue = QuestionDisplayOptionsMarks | QuestionDisplayOptionsValues | boolean;

/**
 * Quiz display options, it can be used to determine which options to display.
 */
export type AddonModQuizDisplayOptions = {
    attempt: boolean;
    correctness: QuestionDisplayOptionsValues;
    marks: QuestionDisplayOptionsMarks | QuestionDisplayOptionsValues;
    feedback: QuestionDisplayOptionsValues;
    generalfeedback: QuestionDisplayOptionsValues;
    rightanswer: QuestionDisplayOptionsValues;
    overallfeedback: QuestionDisplayOptionsValues;
    numpartscorrect: QuestionDisplayOptionsValues;
    manualcomment: QuestionDisplayOptionsValues;
    markdp: number;
};
