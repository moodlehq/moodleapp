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

import { CoreQuestionBehaviourDelegate, CoreQuestionQuestionWithAnswers } from '@features/question/services/behaviour-delegate';
import { CoreQuestionAnswerDBRecord } from '@features/question/services/database/question';
import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreLogger } from '@singletons/logger';
import { AddonModQuizAttemptDBRecord, ATTEMPTS_TABLE_NAME } from './database/quiz';
import { AddonModQuizAttemptWSData, AddonModQuizQuizWSData } from './quiz';
import { ADDON_MOD_QUIZ_COMPONENT_LEGACY } from '../constants';

/**
 * Service to handle offline quiz.
 */
@Injectable({ providedIn: 'root' })
export class AddonModQuizOfflineProvider {

    protected logger: CoreLogger;

    constructor() {
        this.logger = CoreLogger.getInstance('AddonModQuizOfflineProvider');
    }

    /**
     * Classify the answers in questions.
     *
     * @param answers List of answers.
     * @returns Object with the questions, the keys are the slot. Each question contains its answers.
     */
    classifyAnswersInQuestions(answers: CoreQuestionsAnswers): AddonModQuizQuestionsWithAnswers {
        const questionsWithAnswers: AddonModQuizQuestionsWithAnswers = {};

        // Classify the answers in each question.
        for (const name in answers) {
            const slot = CoreQuestion.getQuestionSlotFromName(name);
            const nameWithoutPrefix = CoreQuestion.removeQuestionPrefix(name);

            if (!questionsWithAnswers[slot]) {
                questionsWithAnswers[slot] = {
                    answers: {},
                    prefix: name.substring(0, name.indexOf(nameWithoutPrefix)),
                };
            }
            questionsWithAnswers[slot].answers[nameWithoutPrefix] = answers[name];
        }

        return questionsWithAnswers;
    }

    /**
     * Given a list of questions with answers classified in it, returns a list of answers (including prefix in the name).
     *
     * @param questions Questions.
     * @returns Answers.
     */
    extractAnswersFromQuestions(questions: AddonModQuizQuestionsWithAnswers): CoreQuestionsAnswers {
        const answers: CoreQuestionsAnswers = {};

        for (const slot in questions) {
            const question = questions[slot];

            for (const name in question.answers) {
                answers[question.prefix + name] = question.answers[name];
            }
        }

        return answers;
    }

    /**
     * Get all the offline attempts in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the offline attempts.
     */
    async getAllAttempts(siteId?: string): Promise<AddonModQuizAttemptDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getAllRecords(ATTEMPTS_TABLE_NAME);
    }

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the answers.
     */
    getAttemptAnswers(attemptId: number, siteId?: string): Promise<CoreQuestionAnswerDBRecord[]> {
        return CoreQuestion.getAttemptAnswers(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, siteId);
    }

    /**
     * Retrieve an attempt from site DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the attempt.
     */
    async getAttemptById(attemptId: number, siteId?: string): Promise<AddonModQuizAttemptDBRecord> {
        const db = await CoreSites.getSiteDb(siteId);

        return db.getRecord(ATTEMPTS_TABLE_NAME, { id: attemptId });
    }

    /**
     * Retrieve an attempt from site DB.
     *
     * @param quizId Quiz ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, user current site's user.
     * @returns Promise resolved with the attempts.
     */
    async getQuizAttempts(quizId: number, siteId?: string, userId?: number): Promise<AddonModQuizAttemptDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(ATTEMPTS_TABLE_NAME, { quizid: quizId, userid: userId || site.getUserId() });
    }

    /**
     * Load local state in the questions.
     *
     * @param attemptId Attempt ID.
     * @param questions List of questions.
     * @param siteId Site ID. If not defined, current site.
     * @returns Questions with local states loaded.
     */
    async loadQuestionsLocalStates(
        attemptId: number,
        questions: CoreQuestionQuestionParsed[],
        siteId?: string,
    ): Promise<CoreQuestionQuestionParsed[]> {

        await Promise.all(questions.map(async (question) => {
            const dbQuestion = await CorePromiseUtils.ignoreErrors(
                CoreQuestion.getQuestion(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, question.slot, siteId),
            );

            if (!dbQuestion) {
                // Question not found.
                return;
            }

            const state = CoreQuestion.getState(dbQuestion.state);
            question.state = dbQuestion.state;
            question.status = Translate.instant(`core.question.${state.status}`);
            question.stateclass = state.stateclass;
        }));

        return questions;
    }

    /**
     * Process an attempt, saving its data.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param questions Object with the questions of the quiz. The keys should be the question slot.
     * @param data Data to save.
     * @param finish Whether to finish the quiz.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async processAttempt(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        questions: Record<number, CoreQuestionQuestionParsed>,
        data: CoreQuestionsAnswers,
        finish?: boolean,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        const now = CoreTime.timestamp();

        const db = await CoreSites.getSiteDb(siteId);

        // Check if an attempt already exists. Return a new one if it doesn't.
        let entry = await CorePromiseUtils.ignoreErrors(this.getAttemptById(attempt.id, siteId));

        if (entry) {
            entry.timemodified = now;
            entry.finished = finish ? 1 : 0;
        } else {
            entry = {
                quizid: quiz.id,
                userid: attempt.userid ?? CoreSites.getCurrentSiteUserId(),
                id: attempt.id,
                courseid: quiz.course,
                timecreated: now,
                attempt: attempt.attempt ?? 0,
                currentpage: attempt.currentpage,
                timemodified: now,
                finished: finish ? 1 : 0,
            };
        }

        // Save attempt in DB.
        await db.insertRecord(ATTEMPTS_TABLE_NAME, entry);

        // Attempt has been saved, now we need to save the answers.
        await this.saveAnswers(quiz, attempt, questions, data, now, siteId);
    }

    /**
     * Remove an attempt and its answers from local DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     */
    async removeAttemptAndAnswers(attemptId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const db = await CoreSites.getSiteDb(siteId);

        await Promise.all([
            CoreQuestion.removeAttemptAnswers(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, siteId),
            CoreQuestion.removeAttemptQuestions(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, siteId),
            db.deleteRecords(ATTEMPTS_TABLE_NAME, { id: attemptId }),
        ]);
    }

    /**
     * Remove a question and its answers from local DB.
     *
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when finished.
     */
    async removeQuestionAndAnswers(attemptId: number, slot: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await Promise.all([
            CoreQuestion.removeQuestion(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, slot, siteId),
            CoreQuestion.removeQuestionAnswers(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attemptId, slot, siteId),
        ]);
    }

    /**
     * Save an attempt's answers and calculate state for questions modified.
     *
     * @param quiz Quiz.
     * @param attempt Attempt.
     * @param questions Object with the questions of the quiz. The keys should be the question slot.
     * @param answers Answers to save.
     * @param timeMod Time modified to set in the answers. If not defined, current time.
     * @param siteId Site ID. If not defined, current site.
     */
    async saveAnswers(
        quiz: AddonModQuizQuizWSData,
        attempt: AddonModQuizAttemptWSData,
        questions: Record<number, CoreQuestionQuestionParsed>,
        answers: CoreQuestionsAnswers,
        timeMod?: number,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();
        timeMod = timeMod || CoreTime.timestamp();

        const questionsWithAnswers: Record<number, CoreQuestionQuestionWithAnswers> = {};
        const newStates: Record<number, string> = {};

        // Classify the answers in each question.
        for (const name in answers) {
            const slot = CoreQuestion.getQuestionSlotFromName(name);
            const nameWithoutPrefix = CoreQuestion.removeQuestionPrefix(name);

            if (questions[slot]) {
                if (!questionsWithAnswers[slot]) {
                    questionsWithAnswers[slot] = {
                        ...questions[slot],
                        answers: {},
                    };
                }
                questionsWithAnswers[slot].answers[nameWithoutPrefix] = answers[name];
            }
        }

        // First determine the new state of each question. We won't save the new state yet.
        await Promise.all(Object.values(questionsWithAnswers).map(async (question) => {

            const state = await CoreQuestionBehaviourDelegate.determineNewState(
                quiz.preferredbehaviour ?? '',
                ADDON_MOD_QUIZ_COMPONENT_LEGACY,
                attempt.id,
                question,
                quiz.coursemodule,
                siteId,
            );

            // Check if state has changed.
            if (state && state.name != question.state) {
                newStates[question.slot] = state.name;
            }

            // Delete previously stored answers for this question.
            await CoreQuestion.removeQuestionAnswers(ADDON_MOD_QUIZ_COMPONENT_LEGACY, attempt.id, question.slot, siteId);
        }));

        // Now save the answers.
        await CoreQuestion.saveAnswers(
            ADDON_MOD_QUIZ_COMPONENT_LEGACY,
            quiz.id,
            attempt.id,
            attempt.userid ?? CoreSites.getCurrentSiteUserId(),
            answers,
            timeMod,
            siteId,
        );

        try {
            // Answers have been saved, now we can save the questions with the states.
            await CorePromiseUtils.allPromises(Object.keys(newStates).map(async (slot) => {
                const question = questionsWithAnswers[Number(slot)];

                await CoreQuestion.saveQuestion(
                    ADDON_MOD_QUIZ_COMPONENT_LEGACY,
                    quiz.id,
                    attempt.id,
                    attempt.userid ?? CoreSites.getCurrentSiteUserId(),
                    question,
                    newStates[slot],
                    siteId,
                );
            }));
        } catch (error) {
            // Ignore errors when saving question state.
            this.logger.error('Error saving question state', error);
        }

    }

    /**
     * Set attempt's current page.
     *
     * @param attemptId Attempt ID.
     * @param page Page to set.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved in success, rejected otherwise.
     */
    async setAttemptCurrentPage(attemptId: number, page: number, siteId?: string): Promise<void> {
        const db = await CoreSites.getSiteDb(siteId);

        await db.updateRecords(ATTEMPTS_TABLE_NAME, { currentpage: page }, { id: attemptId });
    }

}

export const AddonModQuizOffline = makeSingleton(AddonModQuizOfflineProvider);

/**
 * Answers classified by question slot.
 */
export type AddonModQuizQuestionsWithAnswers = Record<number, {
    prefix: string;
    answers: CoreQuestionsAnswers;
}>;
