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

import { Injector } from '@angular/core';
import { CoreQuestionHandler } from '../providers/delegate';

/**
 * Base handler for question types.
 *
 * This class is needed because parent classes cannot have @Injectable in Angular v6, so the default handler cannot be a
 * parent class.
 */
export class CoreQuestionBaseHandler implements CoreQuestionHandler {
    name = 'CoreQuestionBase';
    type = 'base';

    constructor() {
        // Nothing to do.
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        // There is no default component for questions.
    }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
     */
    getBehaviour(question: any, behaviour: string): string {
        return behaviour;
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question The question.
     * @return Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage(question: any): string {
        // Never prevent by default.
        return '';
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        return -1;
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any): number {
        return -1;
    }

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any): boolean {
        return false;
    }

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers(question: any, answers: any, offline: boolean, siteId?: string): void | Promise<any> {
        // Nothing to do.
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @return Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: any, offlineSequenceCheck: string): boolean {
        return question.sequencecheck == offlineSequenceCheck;
    }
}
