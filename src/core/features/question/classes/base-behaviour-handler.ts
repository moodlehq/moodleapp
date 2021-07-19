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

import { CoreQuestion, CoreQuestionState } from '@features/question/services/question';
import { CoreQuestionBehaviourHandler } from '../services/behaviour-delegate';
import { CoreQuestionQuestionParsed } from '../services/question';

/**
 * Base handler for question behaviours.
 *
 * This class is needed because parent classes cannot have @Injectable in Angular v6, so the default handler cannot be a
 * parent class.
 */
export class CoreQuestionBehaviourBaseHandler implements CoreQuestionBehaviourHandler {

    name = 'CoreQuestionBehaviourBase';
    type = 'base';

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return New state (or promise resolved with state).
     */
    determineNewState(
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionParsed,
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): CoreQuestionState | Promise<CoreQuestionState> {
        // Return the current state.
        return CoreQuestion.getState(question.state);
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param question The question.
     * @return Components (or promise resolved with components) to render some extra data in the question
     *         (e.g. certainty options). Don't return anything if no extra data is required.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handleQuestion(question: CoreQuestionQuestionParsed): undefined | Type<unknown>[] | Promise<Type<unknown>[]> {
        // Nothing to do.
        return;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
