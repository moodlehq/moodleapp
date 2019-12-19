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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * An object to represent a question state.
 */
export interface CoreQuestionState {
    /**
     * Name of the state.
     */
    name: string;

    /**
     * Class of the state.
     */
    class: string;

    /**
     * The string key to translate the status.
     */
    status: string;

    /**
     * Whether the question with this state is active.
     */
    active: boolean;

    /**
     * Whether the question with this state is finished.
     */
    finished: boolean;
}

/**
 * Service to handle questions.
 */
@Injectable()
export class CoreQuestionProvider {
    static COMPONENT = 'mmQuestion';

    // Variables for database.
    protected QUESTION_TABLE = 'questions';
    protected QUESTION_ANSWERS_TABLE = 'question_answers';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreQuestionProvider',
        version: 1,
        tables: [
            {
                name: this.QUESTION_TABLE,
                columns: [
                    {
                        name: 'component',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'attemptid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'slot',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'componentid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'number',
                        type: 'INTEGER'
                    },
                    {
                        name: 'state',
                        type: 'TEXT'
                    }
                ],
                primaryKeys: ['component', 'attemptid', 'slot']
            },
            {
                name: this.QUESTION_ANSWERS_TABLE,
                columns: [
                    {
                        name: 'component',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'attemptid',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'name',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'componentid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'questionslot',
                        type: 'INTEGER'
                    },
                    {
                        name: 'value',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['component', 'attemptid', 'name']
            }
        ]
    };

    protected QUESTION_PREFIX_REGEX = /q\d+:(\d+)_/;
    protected STATES: {[name: string]: CoreQuestionState} = {
        todo: {
            name: 'todo',
            class: 'core-question-notyetanswered',
            status: 'notyetanswered',
            active: true,
            finished: false
        },
        invalid: {
            name: 'invalid',
            class: 'core-question-invalidanswer',
            status: 'invalidanswer',
            active: true,
            finished: false
        },
        complete: {
            name: 'complete',
            class: 'core-question-answersaved',
            status: 'answersaved',
            active: true,
            finished: false
        },
        needsgrading: {
            name: 'needsgrading',
            class: 'core-question-requiresgrading',
            status: 'requiresgrading',
            active: false,
            finished: true
        },
        finished: {
            name: 'finished',
            class: 'core-question-complete',
            status: 'complete',
            active: false,
            finished: true
        },
        gaveup: {
            name: 'gaveup',
            class: 'core-question-notanswered',
            status: 'notanswered',
            active: false,
            finished: true
        },
        gradedwrong: {
            name: 'gradedwrong',
            class: 'core-question-incorrect',
            status: 'incorrect',
            active: false,
            finished: true
        },
        gradedpartial: {
            name: 'gradedpartial',
            class: 'core-question-partiallycorrect',
            status: 'partiallycorrect',
            active: false,
            finished: true
        },
        gradedright: {
            name: 'gradedright',
            class: 'core-question-correct',
            status: 'correct',
            active: false,
            finished: true
        },
        mangrwrong: {
            name: 'mangrwrong',
            class: 'core-question-incorrect',
            status: 'incorrect',
            active: false,
            finished: true
        },
        mangrpartial: {
            name: 'mangrpartial',
            class: 'core-question-partiallycorrect',
            status: 'partiallycorrect',
            active: false,
            finished: true
        },
        mangrright: {
            name: 'mangrright',
            class: 'core-question-correct',
            status: 'correct',
            active: false,
            finished: true
        },
        cannotdeterminestatus: { // Special state for Mobile, sometimes we won't have enough data to detemrine the state.
            name: 'cannotdeterminestatus',
            class: 'core-question-unknown',
            status: 'cannotdeterminestatus',
            active: true,
            finished: false
        }
    };

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('CoreQuestionProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Compare that all the answers in two objects are equal, except some extra data like sequencecheck or certainty.
     *
     * @param prevAnswers Object with previous answers.
     * @param newAnswers Object with new answers.
     * @return Whether all answers are equal.
     */
    compareAllAnswers(prevAnswers: any, newAnswers: any): boolean {
        // Get all the keys.
        const keys = this.utils.mergeArraysWithoutDuplicates(Object.keys(prevAnswers), Object.keys(newAnswers));

        // Check that all the keys have the same value on both objects.
        for (const i in keys) {
            const key = keys[i];

            // Ignore extra answers like sequencecheck or certainty.
            if (!this.isExtraAnswer(key[0])) {
                if (!this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, key)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Convert a list of answers retrieved from local DB to an object with name - value.
     *
     * @param answers List of answers.
     * @param removePrefix Whether to remove the prefix in the answer's name.
     * @return Object with name -> value.
     */
    convertAnswersArrayToObject(answers: any[], removePrefix?: boolean): any {
        const result = {};

        answers.forEach((answer) => {
            if (removePrefix) {
                const nameWithoutPrefix = this.removeQuestionPrefix(answer.name);
                result[nameWithoutPrefix] = answer.value;
            } else {
                result[answer.name] = answer.value;
            }
        });

        return result;
    }

    /**
     * Retrieve an answer from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param name Answer's name.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the answer.
     */
    getAnswer(component: string, attemptId: number, name: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId, name: name});
        });
    }

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the answers.
     */
    getAttemptAnswers(component: string, attemptId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId});
        });
    }

    /**
     * Retrieve an attempt questions from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the questions.
     */
    getAttemptQuestions(component: string, attemptId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(this.QUESTION_TABLE, {component: component, attemptid: attemptId});
        });
    }

    /**
     * Get all the answers that aren't "extra" (sequencecheck, certainty, ...).
     *
     * @param answers Object with all the answers.
     * @return Object with the basic answers.
     */
    getBasicAnswers(answers: any): any {
        const result = {};

        for (const name in answers) {
            if (!this.isExtraAnswer(name)) {
                result[name] = answers[name];
            }
        }

        return result;
    }

    /**
     * Get all the answers that aren't "extra" (sequencecheck, certainty, ...).
     *
     * @param answers List of answers.
     * @return List with the basic answers.
     */
    getBasicAnswersFromArray(answers: any[]): any[] {
        const result = [];

        answers.forEach((answer) => {
            if (this.isExtraAnswer(answer.name)) {
                result.push(answer);
            }
        });

        return result;
    }

    /**
     * Retrieve a question from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the question.
     */
    getQuestion(component: string, attemptId: number, slot: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(this.QUESTION_TABLE, {component: component, attemptid: attemptId, slot: slot});
        });
    }

    /**
     * Retrieve a question answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param filter Whether it should ignore "extra" answers like sequencecheck or certainty.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the answers.
     */
    getQuestionAnswers(component: string, attemptId: number, slot: number, filter?: boolean, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId,
                    questionslot: slot}).then((answers) => {

                if (filter) {
                    // Get only answers that isn't "extra" data like sequencecheck or certainty.
                    return this.getBasicAnswersFromArray(answers);
                } else {
                    return answers;
                }
            });
        });
    }

    /**
     * Extract the question slot from a question name.
     *
     * @param name Question name.
     * @return Question slot.
     */
    getQuestionSlotFromName(name: string): number {
        if (name) {
            const match = name.match(this.QUESTION_PREFIX_REGEX);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
        }

        return -1;
    }

    /**
     * Get question state based on state name.
     *
     * @param name State name.
     * @return State.
     */
    getState(name: string): CoreQuestionState {
        return this.STATES[name || 'cannotdeterminestatus'];
    }

    /**
     * Check if an answer is extra data like sequencecheck or certainty.
     *
     * @param name Answer name.
     * @return Whether it's extra data.
     */
    isExtraAnswer(name: string): boolean {
        // Maybe the name still has the prefix.
        name = this.removeQuestionPrefix(name);

        return name[0] == '-' || name[0] == ':';
    }

    /**
     * Remove an attempt answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeAttemptAnswers(component: string, attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId});
        });
    }

    /**
     * Remove an attempt questions from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeAttemptQuestions(component: string, attemptId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.QUESTION_TABLE, {component: component, attemptid: attemptId});
        });
    }

    /**
     * Remove an answer from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param name Answer's name.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeAnswer(component: string, attemptId: number, name: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId,
                    name: name});
        });
    }

    /**
     * Remove a question from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeQuestion(component: string, attemptId: number, slot: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.QUESTION_TABLE, {component: component, attemptid: attemptId, slot: slot});
        });
    }

    /**
     * Remove a question answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    removeQuestionAnswers(component: string, attemptId: number, slot: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(this.QUESTION_ANSWERS_TABLE, {component: component, attemptid: attemptId,
                    questionslot: slot});
        });
    }

    /**
     * Remove the prefix from a question answer name.
     *
     * @param name Question name.
     * @return Name without prefix.
     */
    removeQuestionPrefix(name: string): string {
        if (name) {
            return name.replace(this.QUESTION_PREFIX_REGEX, '');
        }

        return '';
    }

    /**
     * Save answers in local DB.
     *
     * @param component Component the answers belong to. E.g. 'mmaModQuiz'.
     * @param componentId ID of the component the answers belong to.
     * @param attemptId Attempt ID.
     * @param userId User ID.
     * @param answers Object with the answers to save.
     * @param timemodified Time modified to set in the answers. If not defined, current time.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    saveAnswers(component: string, componentId: number, attemptId: number, userId: number, answers: any, timemodified?: number,
            siteId?: string): Promise<any> {
        timemodified = timemodified || this.timeUtils.timestamp();

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                promises = [];

            for (const name in answers) {
                const value = answers[name],
                    entry = {
                        component: component,
                        componentid: componentId,
                        attemptid: attemptId,
                        userid: userId,
                        questionslot: this.getQuestionSlotFromName(name),
                        name: name,
                        value: value,
                        timemodified: timemodified
                    };

                promises.push(db.insertRecord(this.QUESTION_ANSWERS_TABLE, entry));
            }

            return Promise.all(promises);
        });
    }

    /**
     * Save a question in local DB.
     *
     * @param component Component the question belongs to. E.g. 'mmaModQuiz'.
     * @param componentId ID of the component the question belongs to.
     * @param attemptId Attempt ID.
     * @param userId User ID.
     * @param question The question to save.
     * @param state Question's state.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    saveQuestion(component: string, componentId: number, attemptId: number, userId: number, question: any, state: string,
            siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                component: component,
                componentid: componentId,
                attemptid: attemptId,
                userid: userId,
                number: question.number,
                slot: question.slot,
                state: state
            };

            return site.getDb().insertRecord(this.QUESTION_TABLE, entry);
        });
    }
}
