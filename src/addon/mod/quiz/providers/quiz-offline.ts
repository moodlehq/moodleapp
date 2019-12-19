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
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionProvider } from '@core/question/providers/question';
import { CoreQuestionBehaviourDelegate } from '@core/question/providers/behaviour-delegate';
import { AddonModQuizProvider } from './quiz';
import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Service to handle offline quiz.
 */
@Injectable()
export class AddonModQuizOfflineProvider {

    protected logger;

    // Variables for database.
    static ATTEMPTS_TABLE = 'addon_mod_quiz_attempts';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModQuizOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModQuizOfflineProvider.ATTEMPTS_TABLE,
                columns: [
                    {
                        name: 'id', // Attempt ID.
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'attempt', // Attempt number.
                        type: 'INTEGER'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'quizid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'currentpage',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'finished',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider,
            private questionProvider: CoreQuestionProvider, private translate: TranslateService, private utils: CoreUtilsProvider,
            private behaviourDelegate: CoreQuestionBehaviourDelegate) {
        this.logger = logger.getInstance('AddonModQuizOfflineProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Classify the answers in questions.
     *
     * @param answers List of answers.
     * @return Object with the questions, the keys are the slot. Each question contains its answers.
     */
    classifyAnswersInQuestions(answers: any): any {
        const questionsWithAnswers = {};

        // Classify the answers in each question.
        for (const name in answers) {
            const slot = this.questionProvider.getQuestionSlotFromName(name),
                nameWithoutPrefix = this.questionProvider.removeQuestionPrefix(name);

            if (!questionsWithAnswers[slot]) {
                questionsWithAnswers[slot] = {
                    answers: {},
                    prefix: name.substr(0, name.indexOf(nameWithoutPrefix))
                };
            }
            questionsWithAnswers[slot].answers[nameWithoutPrefix] = answers[name];
        }

        return questionsWithAnswers;
    }

    /**
     * Given a list of questions with answers classified in it (@see AddonModQuizOfflineProvider.classifyAnswersInQuestions),
     * returns a list of answers (including prefix in the name).
     *
     * @param questions Questions.
     * @return Answers.
     */
    extractAnswersFromQuestions(questions: any): any {
        const answers = {};

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
     * @return Promise resolved with the offline attempts.
     */
    getAllAttempts(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getAllRecords(AddonModQuizOfflineProvider.ATTEMPTS_TABLE);
        });
    }

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the answers.
     */
    getAttemptAnswers(attemptId: number, siteId?: string): Promise<any[]> {
        return this.questionProvider.getAttemptAnswers(AddonModQuizProvider.COMPONENT, attemptId, siteId);
    }

    /**
     * Retrieve an attempt from site DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the attempt.
     */
    getAttemptById(attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.getRecord(AddonModQuizOfflineProvider.ATTEMPTS_TABLE, {id: attemptId});
        });
    }

    /**
     * Retrieve an attempt from site DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, user current site's user.
     * @return Promise resolved with the attempts.
     */
    getQuizAttempts(quizId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.getDb().getRecords(AddonModQuizOfflineProvider.ATTEMPTS_TABLE, {quizid: quizId, userid: userId});
        });
    }

    /**
     * Load local state in the questions.
     *
     * @param attemptId Attempt ID.
     * @param questions List of questions.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    loadQuestionsLocalStates(attemptId: number, questions: any[], siteId?: string): Promise<any[]> {
        const promises = [];

        questions.forEach((question) => {
            promises.push(this.questionProvider.getQuestion(AddonModQuizProvider.COMPONENT, attemptId, question.slot, siteId)
                    .then((q) => {

                const state = this.questionProvider.getState(q.state);
                question.state = q.state;
                question.status = this.translate.instant('core.question.' + state.status);
            }).catch(() => {
                // Question not found.
            }));
        });

        return Promise.all(promises).then(() => {
            return questions;
        });
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
     * @return Promise resolved in success, rejected otherwise.
     */
    processAttempt(quiz: any, attempt: any, questions: any, data: any, finish?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const now = this.timeUtils.timestamp();
        let db: SQLiteDB;

        return this.sitesProvider.getSiteDb(siteId).then((siteDb) => {
            db = siteDb;

            // Check if an attempt already exists.
            return this.getAttemptById(attempt.id, siteId).catch(() => {
                // Attempt doesn't exist, create a new entry.
                return {
                    quizid: quiz.id,
                    userid: attempt.userid,
                    id: attempt.id,
                    courseid: quiz.course,
                    timecreated: now,
                    attempt: attempt.attempt,
                    currentpage: attempt.currentpage
                };
            });
        }).then((entry) => {
            // Save attempt in DB.
            entry.timemodified = now;
            entry.finished = finish ? 1 : 0;

            return db.insertRecord(AddonModQuizOfflineProvider.ATTEMPTS_TABLE, entry);
        }).then(() => {
            // Attempt has been saved, now we need to save the answers.
            return this.saveAnswers(quiz, attempt, questions, data, now, siteId);
        });
    }

    /**
     * Remove an attempt and its answers from local DB.
     *
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeAttemptAndAnswers(attemptId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        // Remove stored answers and questions.
        promises.push(this.questionProvider.removeAttemptAnswers(AddonModQuizProvider.COMPONENT, attemptId, siteId));
        promises.push(this.questionProvider.removeAttemptQuestions(AddonModQuizProvider.COMPONENT, attemptId, siteId));

        // Remove the attempt.
        promises.push(this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.deleteRecords(AddonModQuizOfflineProvider.ATTEMPTS_TABLE, {id: attemptId});
        }));

        return Promise.all(promises);
    }

    /**
     * Remove a question and its answers from local DB.
     *
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when finished.
     */
    removeQuestionAndAnswers(attemptId: number, slot: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const promises = [];

        promises.push(this.questionProvider.removeQuestion(AddonModQuizProvider.COMPONENT, attemptId, slot, siteId));
        promises.push(this.questionProvider.removeQuestionAnswers(AddonModQuizProvider.COMPONENT, attemptId, slot, siteId));

        return Promise.all(promises);
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
     * @return Promise resolved when done.
     */
    saveAnswers(quiz: any, attempt: any, questions: any, answers: any, timeMod?: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        timeMod = timeMod || this.timeUtils.timestamp();

        const questionsWithAnswers = {},
            newStates = {};
        let promises = [];

        // Classify the answers in each question.
        for (const name in answers) {
            const slot = this.questionProvider.getQuestionSlotFromName(name),
                nameWithoutPrefix = this.questionProvider.removeQuestionPrefix(name);

            if (questions[slot]) {
                if (!questionsWithAnswers[slot]) {
                    questionsWithAnswers[slot] = questions[slot];
                    questionsWithAnswers[slot].answers = {};
                }
                questionsWithAnswers[slot].answers[nameWithoutPrefix] = answers[name];
            }
        }

        // First determine the new state of each question. We won't save the new state yet.
        for (const slot in questionsWithAnswers) {
            const question = questionsWithAnswers[slot];

            promises.push(this.behaviourDelegate.determineNewState(
                        quiz.preferredbehaviour, AddonModQuizProvider.COMPONENT, attempt.id, question, siteId).then((state) => {
                // Check if state has changed.
                if (state && state.name != question.state) {
                    newStates[question.slot] = state.name;
                }
            }));
        }

        return Promise.all(promises).then(() => {
            // Now save the answers.
            return this.questionProvider.saveAnswers(AddonModQuizProvider.COMPONENT, quiz.id, attempt.id, attempt.userid,
                    answers, timeMod, siteId);
        }).then(() => {
            // Answers have been saved, now we can save the questions with the states.
            promises = [];

            for (const slot in newStates) {
                const question = questionsWithAnswers[slot];

                promises.push(this.questionProvider.saveQuestion(AddonModQuizProvider.COMPONENT, quiz.id, attempt.id,
                    attempt.userid, question, newStates[slot], siteId));
            }

            return this.utils.allPromises(promises).catch((err) => {
                // Ignore errors when saving question state.
                this.logger.error('Error saving question state', err);
            });
        });
    }

    /**
     * Set attempt's current page.
     *
     * @param attemptId Attempt ID.
     * @param page Page to set.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved in success, rejected otherwise.
     */
    setAttemptCurrentPage(attemptId: number, page: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSiteDb(siteId).then((db) => {
            return db.updateRecords(AddonModQuizOfflineProvider.ATTEMPTS_TABLE, {currentpage: page}, {id: attemptId});
        });
    }
}
