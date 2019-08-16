// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable, Injector } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreQuestionDefaultHandler } from './default-question-handler';

/**
 * Interface that all question type handlers must implement.
 */
export interface CoreQuestionHandler extends CoreDelegateHandler {
    /**
     * Type of the question the handler supports. E.g. 'qtype_calculated'.
     * @type {string}
     */
    type: string;

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any>;

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param {any} question The question.
     * @param {string} behaviour The default behaviour.
     * @return {string} The behaviour to use.
     */
    getBehaviour?(question: any, behaviour: string): string;

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param {any} question The question.
     * @return {string} Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage?(question: any): string;

    /**
     * Check if a response is complete.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse?(question: any, answers: any): number;

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse?(question: any, answers: any): number;

    /**
     * Check if two responses are the same.
     *
     * @param {any} question Question.
     * @param {any} prevAnswers Object with the previous question answers.
     * @param {any} newAnswers Object with the new question answers.
     * @return {boolean} Whether they're the same.
     */
    isSameResponse?(question: any, prevAnswers: any, newAnswers: any): boolean;

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param {any} question Question.
     * @param {any} answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param {boolean} [offline] Whether the data should be saved in offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {void|Promise<any>} Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers?(question: any, answers: any, offline: boolean, siteId?: string): void | Promise<any>;

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param {any} question The question.
     * @param {string} offlineSequenceCheck Sequence check stored in offline.
     * @return {boolean} Whether sequencecheck is valid.
     */
    validateSequenceCheck?(question: any, offlineSequenceCheck: string): boolean;

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param {any} question Question.
     * @param {number} usageId Usage ID.
     * @return {string[]} List of URLs.
     */
    getAdditionalDownloadableFiles?(question: any, usageId: number): string[];
}

/**
 * Delegate to register question handlers.
 */
@Injectable()
export class CoreQuestionDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected defaultHandler: CoreQuestionDefaultHandler) {
        super('CoreQuestionDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Get the behaviour to use for a certain question type.
     * E.g. 'qtype_essay' uses 'manualgraded'.
     *
     * @param {any} question The question.
     * @param {string} behaviour The default behaviour.
     * @return {string} The behaviour to use.
     */
    getBehaviourForQuestion(question: any, behaviour: string): string {
        const type = this.getTypeName(question),
            questionBehaviour = this.executeFunctionOnEnabled(type, 'getBehaviour', [question, behaviour]);

        return questionBehaviour || behaviour;
    }

    /**
     * Get the directive to use for a certain question type.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {Promise<any>} Promise resolved with component to use, undefined if not found.
     */
    getComponentForQuestion(injector: Injector, question: any): Promise<any> {
        const type = this.getTypeName(question);

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'getComponent', [injector, question]));
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param {any} question Question.
     * @return {string} Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage(question: any): string {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getPreventSubmitMessage', [question]);
    }

    /**
     * Given a type name, return the full name of that type. E.g. 'calculated' -> 'qtype_calculated'.
     *
     * @param {string} type Type to treat.
     * @return {string} Type full name.
     */
    protected getFullTypeName(type: string): string {
        return 'qtype_' + type;
    }

    /**
     * Given a question, return the full name of its question type.
     *
     * @param {any} question Question.
     * @return {string} Type name.
     */
    protected getTypeName(question: any): string {
        return this.getFullTypeName(question.type);
    }

    /**
     * Check if a response is complete.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isCompleteResponse', [question, answers]);
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any): number {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isGradableResponse', [question, answers]);
    }

    /**
     * Check if two responses are the same.
     *
     * @param {any} question Question.
     * @param {any} prevAnswers Object with the previous question answers.
     * @param {any} newAnswers Object with the new question answers.
     * @return {boolean} Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any): boolean {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isSameResponse', [question, prevAnswers, newAnswers]);
    }

    /**
     * Check if a question type is supported.
     *
     * @param {string} type Question type.
     * @return {boolean} Whether it's supported.
     */
    isQuestionSupported(type: string): boolean {
        return this.hasHandler(this.getFullTypeName(type), true);
    }

    /**
     * Prepare the answers for a certain question.
     *
     * @param {any} question Question.
     * @param {any} answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param {boolean} [offline] Whether the data should be saved in offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when data has been prepared.
     */
    prepareAnswersForQuestion(question: any, answers: any, offline: boolean, siteId?: string): Promise<any> {
        const type = this.getTypeName(question);

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'prepareAnswers', [question, answers, offline, siteId]));
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     *
     * @param {any} question The question.
     * @param {string} offlineSequenceCheck Sequence check stored in offline.
     * @return {boolean} Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: any, offlineSequenceCheck: string): boolean {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'validateSequenceCheck', [question, offlineSequenceCheck]);
    }

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param {any} question Question.
     * @param {number} usageId Usage ID.
     * @return {string[]} List of URLs.
     */
    getAdditionalDownloadableFiles(question: any, usageId: number): string[] {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getAdditionalDownloadableFiles', [question, usageId]) || [];
    }
}
