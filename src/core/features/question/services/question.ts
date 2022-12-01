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

import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSExternalFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CorePath } from '@singletons/path';
import {
    CoreQuestionAnswerDBRecord,
    CoreQuestionDBRecord,
    QUESTION_ANSWERS_TABLE_NAME,
    QUESTION_TABLE_NAME,
} from './database/question';

const QUESTION_PREFIX_REGEX = /q\d+:(\d+)_/;
const STATES: Record<string, CoreQuestionState> = {
    todo: {
        name: 'todo',
        class: 'core-question-notyetanswered',
        status: 'notyetanswered',
        active: true,
        finished: false,
    },
    invalid: {
        name: 'invalid',
        class: 'core-question-invalidanswer',
        status: 'invalidanswer',
        active: true,
        finished: false,
    },
    complete: {
        name: 'complete',
        class: 'core-question-answersaved',
        status: 'answersaved',
        active: true,
        finished: false,
    },
    needsgrading: {
        name: 'needsgrading',
        class: 'core-question-requiresgrading',
        status: 'requiresgrading',
        active: false,
        finished: true,
    },
    finished: {
        name: 'finished',
        class: 'core-question-complete',
        status: 'complete',
        active: false,
        finished: true,
    },
    gaveup: {
        name: 'gaveup',
        class: 'core-question-notanswered',
        status: 'notanswered',
        active: false,
        finished: true,
    },
    gradedwrong: {
        name: 'gradedwrong',
        class: 'core-question-incorrect',
        status: 'incorrect',
        active: false,
        finished: true,
    },
    gradedpartial: {
        name: 'gradedpartial',
        class: 'core-question-partiallycorrect',
        status: 'partiallycorrect',
        active: false,
        finished: true,
    },
    gradedright: {
        name: 'gradedright',
        class: 'core-question-correct',
        status: 'correct',
        active: false,
        finished: true,
    },
    mangrwrong: {
        name: 'mangrwrong',
        class: 'core-question-incorrect',
        status: 'incorrect',
        active: false,
        finished: true,
    },
    mangrpartial: {
        name: 'mangrpartial',
        class: 'core-question-partiallycorrect',
        status: 'partiallycorrect',
        active: false,
        finished: true,
    },
    mangrright: {
        name: 'mangrright',
        class: 'core-question-correct',
        status: 'correct',
        active: false,
        finished: true,
    },
    cannotdeterminestatus: { // Special state for Mobile, sometimes we won't have enough data to detemrine the state.
        name: 'cannotdeterminestatus',
        class: 'core-question-unknown',
        status: 'cannotdeterminestatus',
        active: true,
        finished: false,
    },
};

/**
 * Service to handle questions.
 */
@Injectable({ providedIn: 'root' })
export class CoreQuestionProvider {

    static readonly COMPONENT = 'mmQuestion';

    /**
     * Compare that all the answers in two objects are equal, except some extra data like sequencecheck or certainty.
     *
     * @param prevAnswers Object with previous answers.
     * @param newAnswers Object with new answers.
     * @returns Whether all answers are equal.
     */
    compareAllAnswers(prevAnswers: Record<string, unknown>, newAnswers: Record<string, unknown>): boolean {
        // Get all the keys.
        const keys = CoreUtils.mergeArraysWithoutDuplicates(Object.keys(prevAnswers), Object.keys(newAnswers));

        // Check that all the keys have the same value on both objects.
        for (const i in keys) {
            const key = keys[i];

            // Ignore extra answers like sequencecheck or certainty.
            if (!this.isExtraAnswer(key[0])) {
                if (!CoreUtils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, key)) {
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
     * @returns Object with name -> value.
     */
    convertAnswersArrayToObject(answers: CoreQuestionAnswerDBRecord[], removePrefix?: boolean): Record<string, string> {
        const result: Record<string, string> = {};

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
     * @returns Promise resolved with the answer.
     */
    async getAnswer(component: string, attemptId: number, name: string, siteId?: string): Promise<CoreQuestionAnswerDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(QUESTION_ANSWERS_TABLE_NAME, { component, attemptid: attemptId, name });
    }

    /**
     * Retrieve an attempt answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the answers.
     */
    async getAttemptAnswers(component: string, attemptId: number, siteId?: string): Promise<CoreQuestionAnswerDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(QUESTION_ANSWERS_TABLE_NAME, { component, attemptid: attemptId });
    }

    /**
     * Retrieve an attempt questions from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the questions.
     */
    async getAttemptQuestions(component: string, attemptId: number, siteId?: string): Promise<CoreQuestionDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(QUESTION_TABLE_NAME, { component, attemptid: attemptId });
    }

    /**
     * Get all the answers that aren't "extra" (sequencecheck, certainty, ...).
     *
     * @param answers Object with all the answers.
     * @returns Object with the basic answers.
     */
    getBasicAnswers<T = string>(answers: Record<string, T>): Record<string, T> {
        const result: Record<string, T> = {};

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
     * @returns List with the basic answers.
     */
    protected getBasicAnswersFromArray(answers: CoreQuestionAnswerDBRecord[]): CoreQuestionAnswerDBRecord[] {
        const result: CoreQuestionAnswerDBRecord[] = [];

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
     * @returns Promise resolved with the question.
     */
    async getQuestion(component: string, attemptId: number, slot: number, siteId?: string): Promise<CoreQuestionDBRecord> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecord(QUESTION_TABLE_NAME, { component, attemptid: attemptId, slot });
    }

    /**
     * Retrieve a question answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param filter Whether it should ignore "extra" answers like sequencecheck or certainty.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the answers.
     */
    async getQuestionAnswers(
        component: string,
        attemptId: number,
        slot: number,
        filter?: boolean,
        siteId?: string,
    ): Promise<CoreQuestionAnswerDBRecord[]> {
        const db = await CoreSites.getSiteDb(siteId);

        const answers = await db.getRecords<CoreQuestionAnswerDBRecord>(
            QUESTION_ANSWERS_TABLE_NAME,
            { component, attemptid: attemptId, questionslot: slot },
        );

        if (filter) {
            // Get only answers that isn't "extra" data like sequencecheck or certainty.
            return this.getBasicAnswersFromArray(answers);
        } else {
            return answers;
        }
    }

    /**
     * Given a question and a componentId, return a componentId that is unique for the question.
     *
     * @param question Question.
     * @param componentId Component ID.
     * @returns Question component ID.
     */
    getQuestionComponentId(question: CoreQuestionQuestionParsed, componentId: string | number): string {
        return componentId + '_' + question.number;
    }

    /**
     * Get the path to the folder where to store files for an offline question.
     *
     * @param type Question type.
     * @param component Component the question is related to.
     * @param componentId Question component ID, returned by getQuestionComponentId.
     * @param siteId Site ID. If not defined, current site.
     * @returns Folder path.
     */
    getQuestionFolder(type: string, component: string, componentId: string, siteId?: string): string {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const siteFolderPath = CoreFile.getSiteFolder(siteId);
        const questionFolderPath = 'offlinequestion/' + type + '/' + component + '/' + componentId;

        return CorePath.concatenatePaths(siteFolderPath, questionFolderPath);
    }

    /**
     * Extract the question slot from a question name.
     *
     * @param name Question name.
     * @returns Question slot.
     */
    getQuestionSlotFromName(name: string): number {
        if (name) {
            const match = name.match(QUESTION_PREFIX_REGEX);
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
     * @returns State.
     */
    getState(name?: string): CoreQuestionState {
        return STATES[name || 'cannotdeterminestatus'];
    }

    /**
     * Check if an answer is extra data like sequencecheck or certainty.
     *
     * @param name Answer name.
     * @returns Whether it's extra data.
     */
    isExtraAnswer(name: string): boolean {
        // Maybe the name still has the prefix.
        name = this.removeQuestionPrefix(name);

        return name[0] == '-' || name[0] == ':';
    }

    /**
     * Parse questions of a WS response.
     *
     * @param questions Questions to parse.
     * @returns Parsed questions.
     */
    parseQuestions(questions: CoreQuestionQuestionWSData[]): CoreQuestionQuestionParsed[] {
        const parsedQuestions: CoreQuestionQuestionParsed[] = questions;

        parsedQuestions.forEach((question) => {
            if (!question.settings) {
                return;
            }

            question.parsedSettings = CoreTextUtils.parseJSON(question.settings, null);
        });

        return parsedQuestions;
    }

    /**
     * Remove an attempt answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async removeAttemptAnswers(component: string, attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(QUESTION_ANSWERS_TABLE_NAME, { component, attemptid: attemptId });
    }

    /**
     * Remove an attempt questions from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async removeAttemptQuestions(component: string, attemptId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(QUESTION_TABLE_NAME, { component, attemptid: attemptId });
    }

    /**
     * Remove an answer from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param name Answer's name.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async removeAnswer(component: string, attemptId: number, name: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(QUESTION_ANSWERS_TABLE_NAME, { component, attemptid: attemptId, name });
    }

    /**
     * Remove a question from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async removeQuestion(component: string, attemptId: number, slot: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(QUESTION_TABLE_NAME, { component, attemptid: attemptId, slot });
    }

    /**
     * Remove a question answers from site DB.
     *
     * @param component Component the attempt belongs to.
     * @param attemptId Attempt ID.
     * @param slot Question slot.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async removeQuestionAnswers(component: string, attemptId: number, slot: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(QUESTION_ANSWERS_TABLE_NAME, { component, attemptid: attemptId, questionslot: slot });
    }

    /**
     * Remove the prefix from a question answer name.
     *
     * @param name Question name.
     * @returns Name without prefix.
     */
    removeQuestionPrefix(name: string): string {
        if (name) {
            return name.replace(QUESTION_PREFIX_REGEX, '');
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
     * @returns Promise resolved when done.
     */
    async saveAnswers(
        component: string,
        componentId: number,
        attemptId: number,
        userId: number,
        answers: CoreQuestionsAnswers,
        timemodified?: number,
        siteId?: string,
    ): Promise<void> {
        timemodified = timemodified || CoreTimeUtils.timestamp();

        const db = await CoreSites.getSiteDb(siteId);
        const promises: Promise<unknown>[] = [];

        for (const name in answers) {
            const entry: CoreQuestionAnswerDBRecord = {
                component,
                componentid: componentId,
                attemptid: attemptId,
                userid: userId,
                questionslot: this.getQuestionSlotFromName(name),
                name,
                value: String(answers[name]),
                timemodified,
            };

            promises.push(db.insertRecord(QUESTION_ANSWERS_TABLE_NAME, entry));
        }

        await Promise.all(promises);
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
     * @returns Promise resolved when done.
     */
    async saveQuestion(
        component: string,
        componentId: number,
        attemptId: number,
        userId: number,
        question: CoreQuestionQuestionParsed,
        state: string,
        siteId?: string,
    ): Promise<void> {

        const site = await CoreSites.getSite(siteId);
        const entry: CoreQuestionDBRecord = {
            component,
            componentid: componentId,
            attemptid: attemptId,
            userid: userId,
            number: question.number, // eslint-disable-line id-blacklist
            slot: question.slot,
            state: state,
        };

        await site.getDb().insertRecord(QUESTION_TABLE_NAME, entry);
    }

}

export const CoreQuestion = makeSingleton(CoreQuestionProvider);

/**
 * Question state.
 */
export type CoreQuestionState = {
    name: string; // Name of the state.
    class: string; // Class to style the state.
    status: string; // The string key to translate the state.
    active: boolean; // Whether the question with this state is active.
    finished: boolean; // Whether the question with this state is finished.
};

/**
 * Data returned by WS for a question.
 * Currently this specification is based on quiz WS because they're the only ones returning questions.
 */
export type CoreQuestionQuestionWSData = {
    slot: number; // Slot number.
    type: string; // Question type, i.e: multichoice.
    page: number; // Page of the quiz this question appears on.
    html: string; // The question rendered.
    responsefileareas?: { // Response file areas including files.
        area: string; // File area name.
        files?: CoreWSExternalFile[];
    }[];
    sequencecheck?: number; // The number of real steps in this attempt.
    lastactiontime?: number; // The timestamp of the most recent step in this question attempt.
    hasautosavedstep?: boolean; // Whether this question attempt has autosaved data.
    flagged: boolean; // Whether the question is flagged or not.
    // eslint-disable-next-line id-blacklist
    number?: number; // Question ordering number in the quiz.
    state?: string; // The state where the question is in. It won't be returned if the user cannot see it.
    status?: string; // Current formatted state of the question.
    blockedbyprevious?: boolean; // Whether the question is blocked by the previous question.
    mark?: string; // The mark awarded. It will be returned only if the user is allowed to see it.
    maxmark?: number; // The maximum mark possible for this question attempt.
    settings?: string; // Question settings (JSON encoded).
};
/**
 * Question data with parsed data.
 */
export type CoreQuestionQuestionParsed = CoreQuestionQuestionWSData & {
    parsedSettings?: Record<string, unknown> | null;
};

/**
 * List of answers to a set of questions.
 */
export type CoreQuestionsAnswers = Record<string, string | boolean>;
