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

import { Injectable, Type } from '@angular/core';

import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreQuestionDefaultHandler } from './handlers/default-question';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from './question';

/**
 * Interface that all question type handlers must implement.
 */
export interface CoreQuestionHandler extends CoreDelegateHandler {
    /**
     * Type of the question the handler supports. E.g. 'qtype_calculated'.
     */
    type: string;

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param question The question to render.
     * @returns The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(question: CoreQuestionQuestionParsed): undefined | Type<unknown> | Promise<Type<unknown>>;

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @returns The behaviour to use.
     */
    getBehaviour?(question: CoreQuestionQuestionParsed, behaviour: string): string;

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question The question.
     * @returns Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage?(question: CoreQuestionQuestionParsed): string | undefined;

    /**
     * Check if there's a validation error with the offline data.
     * In situations where isGradableResponse returns false, this method
     * should generate a description of what the problem is.
     *
     * @param question The question.
     * @param answers Object with the question offline answers (without prefix).
     * @param onlineError Online validation error.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns Error message if there's a validation error, undefined otherwise.
     */
    getValidationError?(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        onlineError: string | undefined,
        component: string,
        componentId: string | number,
    ): string | undefined;

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse?(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): number;

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
    isGradableResponse?(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): number;

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @returns Whether they're the same.
     */
    isSameResponse?(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): boolean;

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers?(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        offline: boolean,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @returns Whether sequencecheck is valid.
     */
    validateSequenceCheck?(question: CoreQuestionQuestionParsed, offlineSequenceCheck: string): boolean;

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @returns List of files or URLs.
     */
    getAdditionalDownloadableFiles?(question: CoreQuestionQuestionParsed, usageId?: number): CoreWSFile[];

    /**
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns If async, promise resolved when done.
     */
    clearTmpData?(question: CoreQuestionQuestionParsed, component: string, componentId: string | number): void | Promise<void>;

    /**
     * Delete any stored data for the question.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns If async, promise resolved when done.
     */
    deleteOfflineData?(
        question: CoreQuestionQuestionParsed,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): void | Promise<void>;

    /**
     * Prepare data to send when performing a synchronization.
     *
     * @param question Question.
     * @param answers Answers of the question, without the prefix.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns If async, promise resolved when done.
     */
    prepareSyncData?(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): void | Promise<void>;
}

/**
 * Delegate to register question handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreQuestionDelegateService extends CoreDelegate<CoreQuestionHandler> {

    protected handlerNameProperty = 'type';

    constructor(protected defaultHandler: CoreQuestionDefaultHandler) {
        super('CoreQuestionDelegate');
    }

    /**
     * Get the behaviour to use for a certain question type.
     * E.g. 'qtype_essay' uses 'manualgraded'.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @returns The behaviour to use.
     */
    getBehaviourForQuestion(question: CoreQuestionQuestionParsed, behaviour: string): string {
        const type = this.getTypeName(question);
        const questionBehaviour = this.executeFunctionOnEnabled<string>(type, 'getBehaviour', [question, behaviour]);

        return questionBehaviour || behaviour;
    }

    /**
     * Get the directive to use for a certain question type.
     *
     * @param question The question to render.
     * @returns Promise resolved with component to use, undefined if not found.
     */
    async getComponentForQuestion(question: CoreQuestionQuestionParsed): Promise<Type<unknown> | undefined> {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getComponent', [question]);
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question Question.
     * @returns Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage(question: CoreQuestionQuestionParsed): string | undefined {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled<string>(type, 'getPreventSubmitMessage', [question]);
    }

    /**
     * Given a type name, return the full name of that type. E.g. 'calculated' -> 'qtype_calculated'.
     *
     * @param type Type to treat.
     * @returns Type full name.
     */
    protected getFullTypeName(type: string): string {
        return 'qtype_' + type;
    }

    /**
     * Given a question, return the full name of its question type.
     *
     * @param question Question.
     * @returns Type name.
     */
    protected getTypeName(question: CoreQuestionQuestionParsed): string {
        return this.getFullTypeName(question.type);
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
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): number {
        const type = this.getTypeName(question);

        const isComplete = this.executeFunctionOnEnabled<number>(
            type,
            'isCompleteResponse',
            [question, answers, component, componentId],
        );

        return isComplete ?? -1;
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
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): number {
        const type = this.getTypeName(question);

        const isGradable = this.executeFunctionOnEnabled<number>(
            type,
            'isGradableResponse',
            [question, answers, component, componentId],
        );

        return isGradable ?? -1;
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
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): boolean {
        const type = this.getTypeName(question);

        return !!this.executeFunctionOnEnabled(type, 'isSameResponse', [question, prevAnswers, newAnswers, component, componentId]);
    }

    /**
     * Check if a question type is supported.
     *
     * @param type Question type.
     * @returns Whether it's supported.
     */
    isQuestionSupported(type: string): boolean {
        return this.hasHandler(this.getFullTypeName(type), true);
    }

    /**
     * Prepare the answers for a certain question.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data has been prepared.
     */
    async prepareAnswersForQuestion(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        offline: boolean,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {
        const type = this.getTypeName(question);

        await this.executeFunctionOnEnabled(
            type,
            'prepareAnswers',
            [question, answers, offline, component, componentId, siteId],
        );
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @returns Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: CoreQuestionQuestionParsed, offlineSequenceCheck: string): boolean {
        const type = this.getTypeName(question);

        return !!this.executeFunctionOnEnabled(type, 'validateSequenceCheck', [question, offlineSequenceCheck]);
    }

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @returns List of files or URLs.
     */
    getAdditionalDownloadableFiles(question: CoreQuestionQuestionParsed, usageId?: number): CoreWSFile[] {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getAdditionalDownloadableFiles', [question, usageId]) || [];
    }

    /**
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns If async, promise resolved when done.
     */
    clearTmpData(question: CoreQuestionQuestionParsed, component: string, componentId: string | number): void | Promise<void> {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'clearTmpData', [question, component, componentId]);
    }

    /**
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns If async, promise resolved when done.
     */
    async deleteOfflineData(
        question: CoreQuestionQuestionParsed,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {
        const type = this.getTypeName(question);

        await this.executeFunctionOnEnabled(type, 'deleteOfflineData', [question, component, componentId, siteId]);
    }

    /**
     * Prepare data to send when performing a synchronization.
     *
     * @param question Question.
     * @param answers Answers of the question, without the prefix.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns If async, promise resolved when done.
     */
    async prepareSyncData(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {
        const type = this.getTypeName(question);

        await this.executeFunctionOnEnabled(type, 'prepareSyncData', [question, answers, component, componentId, siteId]);
    }

    /**
     * Check if there's a validation error with the offline data.
     *
     * @param question The question.
     * @param answers Object with the question offline answers (without prefix).
     * @param onlineError Online validation error.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns Error message if there's a validation error, undefined otherwise.
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        onlineError: string | undefined,
        component: string,
        componentId: string | number,
    ): string | undefined {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getValidationError', [question, answers, onlineError, component, componentId]);
    }

}

export const CoreQuestionDelegate = makeSingleton(CoreQuestionDelegateService);
