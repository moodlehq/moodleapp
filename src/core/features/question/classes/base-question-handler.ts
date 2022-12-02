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

import { Type } from '@angular/core';

import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '../services/question';
import { CoreQuestionHandler } from '../services/question-delegate';

/**
 * Base handler for question types.
 *
 * This class is needed because parent classes cannot have @Injectable in Angular v6, so the default handler cannot be a
 * parent class.
 */
export class CoreQuestionBaseHandler implements CoreQuestionHandler {

    name = 'CoreQuestionBase';
    type = 'base';

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param question The question to render.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getComponent(question: CoreQuestionQuestionParsed): undefined | Type<unknown> | Promise<Type<unknown>> {
        // There is no default component for questions.
        return undefined;
    }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @returns The behaviour to use.
     */
    getBehaviour(question: CoreQuestionQuestionParsed, behaviour: string): string {
        return behaviour;
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question The question.
     * @returns Prevent submit message. Undefined or empty if can be submitted.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getPreventSubmitMessage(question: CoreQuestionQuestionParsed): string | undefined {
        // Never prevent by default.
        return undefined;
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        onlineError: string,
    ): string | undefined {
        return onlineError;
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed, // eslint-disable-line @typescript-eslint/no-unused-vars
        answers: CoreQuestionsAnswers, // eslint-disable-line @typescript-eslint/no-unused-vars
        component: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): number {
        return -1;
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(
        question: CoreQuestionQuestionParsed, // eslint-disable-line @typescript-eslint/no-unused-vars
        answers: CoreQuestionsAnswers, // eslint-disable-line @typescript-eslint/no-unused-vars
        component: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): number {
        return -1;
    }

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @returns Whether they're the same.
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed, // eslint-disable-line @typescript-eslint/no-unused-vars
        prevAnswers: CoreQuestionsAnswers, // eslint-disable-line @typescript-eslint/no-unused-vars
        newAnswers: CoreQuestionsAnswers, // eslint-disable-line @typescript-eslint/no-unused-vars
        component: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): boolean {
        return false;
    }

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     */
    prepareAnswers(
        question: CoreQuestionQuestionParsed, // eslint-disable-line @typescript-eslint/no-unused-vars
        answers: CoreQuestionsAnswers, // eslint-disable-line @typescript-eslint/no-unused-vars
        offline: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
        component: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): void | Promise<void> {
        // Nothing to do.
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @returns Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: CoreQuestionQuestionParsed, offlineSequenceCheck: string): boolean {
        return question.sequencecheck == Number(offlineSequenceCheck);
    }

}
