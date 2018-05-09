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
import { CoreQuestionState } from './question';
import { CoreQuestionDelegate } from './delegate';
import { CoreQuestionBehaviourDefaultHandler } from './default-behaviour-handler';

/**
 * Interface that all question behaviour handlers must implement.
 */
export interface CoreQuestionBehaviourHandler extends CoreDelegateHandler {
    /**
     * Type of the behaviour the handler supports. E.g. 'adaptive'.
     * @type {string}
     */
    type: string;

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param {string} component Component the question belongs to.
     * @param {number} attemptId Attempt ID the question belongs to.
     * @param {any} question The question.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {CoreQuestionState|Promise<CoreQuestionState>} State (or promise resolved with state).
     */
    determineNewState?(component: string, attemptId: number, question: any, siteId?: string)
        : CoreQuestionState | Promise<CoreQuestionState>;

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question.
     * @return {any[]|Promise<any[]>} Components (or promise resolved with components) to render some extra data in the question
     *                                (e.g. certainty options). Don't return anything if no extra data is required.
     */
    handleQuestion?(injector: Injector, question: any): any[] | Promise<any[]>;
}

/**
 * Delegate to register question behaviour handlers.
 */
@Injectable()
export class CoreQuestionBehaviourDelegate extends CoreDelegate {

    protected handlerNameProperty = 'type';

    constructor(logger: CoreLoggerProvider, sitesProvider: CoreSitesProvider, eventsProvider: CoreEventsProvider,
            protected questionDelegate: CoreQuestionDelegate, protected defaultHandler: CoreQuestionBehaviourDefaultHandler) {
        super('CoreQuestionBehaviourDelegate', logger, sitesProvider, eventsProvider);
    }

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param {string} component Component the question belongs to.
     * @param {number} attemptId Attempt ID the question belongs to.
     * @param {any} question The question.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<CoreQuestionState>} Promise resolved with state.
     */
    determineNewState(behaviour: string, component: string, attemptId: number, question: any, siteId?: string)
            : Promise<CoreQuestionState> {
        behaviour = this.questionDelegate.getBehaviourForQuestion(question, behaviour);

        return Promise.resolve(this.executeFunctionOnEnabled(behaviour, 'determineNewState',
                [component, attemptId, question, siteId]));
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return a directive to render it.
     *
     * @param {Injector} injector Injector.
     * @param {string} behaviour Default behaviour.
     * @param {any} question The question.
     * @return {Promise<any[]>} Promise resolved with components to render some extra data in the question.
     */
    handleQuestion(injector: Injector, behaviour: string, question: any): Promise<any[]> {
        behaviour = this.questionDelegate.getBehaviourForQuestion(question, behaviour);

        return Promise.resolve(this.executeFunctionOnEnabled(behaviour, 'handleQuestion', [injector, question]));
    }

    /**
     * Check if a question behaviour is supported.
     *
     * @param {string} behaviour Name of the behaviour.
     * @return {boolean} Whether it's supported.
     */
    isBehaviourSupported(behaviour: string): boolean {
        return this.hasHandler(behaviour, true);
    }
}
