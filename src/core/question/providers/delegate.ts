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

import { Injectable, Injector } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreQuestionDefaultHandler } from './default-question-handler';
import { CoreWSExternalFile } from '@providers/ws';

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
     * @param injector Injector.
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any>;

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
     */
    getBehaviour?(question: any, behaviour: string): string;

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question The question.
     * @return Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage?(question: any): string;

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse?(question: any, answers: any, component: string, componentId: string | number): number;

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse?(question: any, answers: any, component: string, componentId: string | number): number;

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponse?(question: any, prevAnswers: any, newAnswers: any, component: string, componentId: string | number): boolean;

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers?(question: any, answers: any, offline: boolean, component: string, componentId: string | number,
            siteId?: string): void | Promise<any>;

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @return Whether sequencecheck is valid.
     */
    validateSequenceCheck?(question: any, offlineSequenceCheck: string): boolean;

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @return List of files or URLs.
     */
    getAdditionalDownloadableFiles?(question: any, usageId: number): (string | CoreWSExternalFile)[];

    /**
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return If async, promise resolved when done.
     */
    clearTmpData?(question: any, component: string, componentId: string | number): void | Promise<void>;

    /**
     * Delete any stored data for the question.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If async, promise resolved when done.
     */
    deleteOfflineData?(question: any, component: string, componentId: string | number, siteId?: string): void | Promise<void>;

    /**
     * Prepare data to send when performing a synchronization.
     *
     * @param question Question.
     * @param answers Answers of the question, without the prefix.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If async, promise resolved when done.
     */
    prepareSyncData?(question: any, answers: {[name: string]: any}, component: string, componentId: string | number,
            siteId?: string): void | Promise<void>;
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
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
     */
    getBehaviourForQuestion(question: any, behaviour: string): string {
        const type = this.getTypeName(question),
            questionBehaviour = this.executeFunctionOnEnabled(type, 'getBehaviour', [question, behaviour]);

        return questionBehaviour || behaviour;
    }

    /**
     * Get the directive to use for a certain question type.
     *
     * @param injector Injector.
     * @param question The question to render.
     * @return Promise resolved with component to use, undefined if not found.
     */
    getComponentForQuestion(injector: Injector, question: any): Promise<any> {
        const type = this.getTypeName(question);

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'getComponent', [injector, question]));
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question Question.
     * @return Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage(question: any): string {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getPreventSubmitMessage', [question]);
    }

    /**
     * Given a type name, return the full name of that type. E.g. 'calculated' -> 'qtype_calculated'.
     *
     * @param type Type to treat.
     * @return Type full name.
     */
    protected getFullTypeName(type: string): string {
        return 'qtype_' + type;
    }

    /**
     * Given a question, return the full name of its question type.
     *
     * @param question Question.
     * @return Type name.
     */
    protected getTypeName(question: any): string {
        return this.getFullTypeName(question.type);
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any, component: string, componentId: string | number): number {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isCompleteResponse', [question, answers, component, componentId]);
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any, component: string, componentId: string | number): number {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isGradableResponse', [question, answers, component, componentId]);
    }

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any, component: string, componentId: string | number): boolean {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'isSameResponse', [question, prevAnswers, newAnswers, component, componentId]);
    }

    /**
     * Check if a question type is supported.
     *
     * @param type Question type.
     * @return Whether it's supported.
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
     * @return Promise resolved when data has been prepared.
     */
    prepareAnswersForQuestion(question: any, answers: any, offline: boolean, component: string, componentId: string | number,
            siteId?: string): Promise<any> {
        const type = this.getTypeName(question);

        return Promise.resolve(this.executeFunctionOnEnabled(type, 'prepareAnswers',
                [question, answers, offline, component, componentId, siteId]));
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @return Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: any, offlineSequenceCheck: string): boolean {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'validateSequenceCheck', [question, offlineSequenceCheck]);
    }

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @return List of files or URLs.
     */
    getAdditionalDownloadableFiles(question: any, usageId: number): (string | CoreWSExternalFile)[] {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'getAdditionalDownloadableFiles', [question, usageId]) || [];
    }

    /**
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return If async, promise resolved when done.
     */
    clearTmpData(question: any, component: string, componentId: string | number): void | Promise<void> {
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
     * @return If async, promise resolved when done.
     */
    deleteOfflineData(question: any, component: string, componentId: string | number, siteId?: string): void | Promise<void> {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'deleteOfflineData', [question, component, componentId, siteId]);
    }

    /**
     * Prepare data to send when performing a synchronization.
     *
     * @param question Question.
     * @param answers Answers of the question, without the prefix.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return If async, promise resolved when done.
     */
    prepareSyncData?(question: any, answers: {[name: string]: any}, component: string, componentId: string | number,
            siteId?: string): void | Promise<void> {
        const type = this.getTypeName(question);

        return this.executeFunctionOnEnabled(type, 'prepareSyncData', [question, answers, component, componentId, siteId]);
    }
}
