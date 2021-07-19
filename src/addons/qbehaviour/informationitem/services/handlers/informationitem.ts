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

import { CoreQuestionBehaviourHandler, CoreQuestionQuestionWithAnswers } from '@features/question/services/behaviour-delegate';
import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionState } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { makeSingleton } from '@singletons';
import { AddonQbehaviourInformationItemComponent } from '../../component/informationitem';

/**
 * Handler to support information item question behaviour.
 */
@Injectable({ providedIn: 'root' })
export class AddonQbehaviourInformationItemHandlerService implements CoreQuestionBehaviourHandler {

    name = 'AddonQbehaviourInformationItem';
    type = 'informationitem';

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
        question: CoreQuestionQuestionWithAnswers,
    ): CoreQuestionState | Promise<CoreQuestionState> {
        if (question.answers?.['-seen']) {
            return CoreQuestion.getState('complete');
        }

        return CoreQuestion.getState(question.state || 'todo');
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
    handleQuestion(question: CoreQuestionQuestionParsed): void | Type<unknown>[] {
        if (CoreQuestionHelper.extractQbehaviourSeenInput(question)) {
            return [AddonQbehaviourInformationItemComponent];
        }
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

export const AddonQbehaviourInformationItemHandler = makeSingleton(AddonQbehaviourInformationItemHandlerService);
