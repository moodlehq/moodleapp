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
import { makeSingleton } from '@singletons';
import { CoreQuestionBehaviourDefaultHandler } from './handlers/default-behaviour';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers, CoreQuestionState } from './question';
import { CoreQuestionDelegate } from './question-delegate';

/**
 * Interface that all question behaviour handlers must implement.
 */
export interface CoreQuestionBehaviourHandler extends CoreDelegateHandler {
    /**
     * Type of the behaviour the handler supports. E.g. 'adaptive'.
     */
    type: string;

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns State (or promise resolved with state).
     */
    determineNewState?(
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionWithAnswers,
        componentId: string | number,
        siteId?: string,
    ): CoreQuestionState | Promise<CoreQuestionState>;

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param question The question.
     * @returns Components (or promise resolved with components) to render some extra data in the question
     *         (e.g. certainty options). Don't return anything if no extra data is required.
     */
    handleQuestion?(question: CoreQuestionQuestionParsed): void | Type<unknown>[] | Promise<Type<unknown>[]>;
}

/**
 * Delegate to register question behaviour handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreQuestionBehaviourDelegateService extends CoreDelegate<CoreQuestionBehaviourHandler> {

    protected handlerNameProperty = 'type';

    constructor(protected defaultHandler: CoreQuestionBehaviourDefaultHandler) {
        super('CoreQuestionBehaviourDelegate', true);
    }

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param behaviour Name of the behaviour.
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with state.
     */
    async determineNewState(
        behaviour: string,
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionWithAnswers,
        componentId: string | number,
        siteId?: string,
    ): Promise<CoreQuestionState | undefined> {
        behaviour = CoreQuestionDelegate.getBehaviourForQuestion(question, behaviour);

        return this.executeFunctionOnEnabled(
            behaviour,
            'determineNewState',
            [component, attemptId, question, componentId, siteId],
        );
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return a directive to render it.
     *
     * @param behaviour Default behaviour.
     * @param question The question.
     * @returns Promise resolved with components to render some extra data in the question.
     */
    async handleQuestion(behaviour: string, question: CoreQuestionQuestionParsed): Promise<Type<unknown>[] | undefined> {
        behaviour = CoreQuestionDelegate.getBehaviourForQuestion(question, behaviour);

        return this.executeFunctionOnEnabled(behaviour, 'handleQuestion', [question]);
    }

    /**
     * Check if a question behaviour is supported.
     *
     * @param behaviour Name of the behaviour.
     * @returns Whether it's supported.
     */
    isBehaviourSupported(behaviour: string): boolean {
        return this.hasHandler(behaviour, true);
    }

}

export const CoreQuestionBehaviourDelegate = makeSingleton(CoreQuestionBehaviourDelegateService);

/**
 * Answers classified by question slot.
 */
export type CoreQuestionQuestionWithAnswers = CoreQuestionQuestionParsed & {
    answers: CoreQuestionsAnswers;
};
