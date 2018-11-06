
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
import { CoreQuestionBehaviourHandler } from '@core/question/providers/behaviour-delegate';
import { CoreQuestionProvider, CoreQuestionState } from '@core/question/providers/question';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonQbehaviourInformationItemComponent } from '../component/informationitem';

/**
 * Handler to support information item question behaviour.
 */
@Injectable()
export class AddonQbehaviourInformationItemHandler implements CoreQuestionBehaviourHandler {
    name = 'AddonQbehaviourInformationItem';
    type = 'informationitem';

    constructor(private questionHelper: CoreQuestionHelperProvider, private questionProvider: CoreQuestionProvider) { }

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param {string} component Component the question belongs to.
     * @param {number} attemptId Attempt ID the question belongs to.
     * @param {any} question The question.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {CoreQuestionState|Promise<CoreQuestionState>} New state (or promise resolved with state).
     */
    determineNewState(component: string, attemptId: number, question: any, siteId?: string)
            : CoreQuestionState | Promise<CoreQuestionState> {
        if (question.answers['-seen']) {
            return this.questionProvider.getState('complete');
        }

        return this.questionProvider.getState(question.state || 'todo');
    }

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
    handleQuestion(injector: Injector, question: any): any[] | Promise<any[]> {
        if (this.questionHelper.extractQbehaviourSeenInput(question)) {
            return [AddonQbehaviourInformationItemComponent];
        }
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
