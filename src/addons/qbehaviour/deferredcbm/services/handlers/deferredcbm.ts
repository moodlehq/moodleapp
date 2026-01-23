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

import { AddonQbehaviourDeferredFeedbackHandler } from '@addons/qbehaviour/deferredfeedback/services/handlers/deferredfeedback';
import { CoreQuestionBehaviourHandler, CoreQuestionQuestionWithAnswers } from '@features/question/services/behaviour-delegate';
import { makeSingleton } from '@singletons';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers, CoreQuestionState } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { AddonQbehaviourDeferredCBMComponent } from '../../component/deferredcbm';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { QuestionCompleteGradableResponse } from '@features/question/constants';

/**
 * Handler to support deferred CBM question behaviour.
 */
@Injectable({ providedIn: 'root' })
export class AddonQbehaviourDeferredCBMHandlerService implements CoreQuestionBehaviourHandler {

    name = 'AddonQbehaviourDeferredCBM';
    type = 'deferredcbm';

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns New state (or promise resolved with state).
     */
    determineNewState(
        component: string,
        attemptId: number,
        question: CoreQuestionQuestionWithAnswers,
        componentId: string | number,
        siteId?: string,
    ): CoreQuestionState | Promise<CoreQuestionState> {
        // Depends on deferredfeedback.
        return AddonQbehaviourDeferredFeedbackHandler.determineNewStateDeferred(
            component,
            attemptId,
            question,
            componentId,
            siteId,
            (...args) => this.isCompleteResponse(...args),
            (...args) => this.isSameResponse(...args),
        );
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param question The question.
     * @returns Components (or promise resolved with components) to render some extra data in the question
     *         (e.g. certainty options). Don't return anything if no extra data is required.
     */
    handleQuestion(question: CoreQuestionQuestionParsed): void | Type<unknown>[] {
        if (CoreQuestionHelper.extractQbehaviourCBM(question)) {
            return [AddonQbehaviourDeferredCBMComponent];
        }
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
    protected isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): QuestionCompleteGradableResponse {
        // First check if the question answer is complete.
        const complete = CoreQuestionDelegate.isCompleteResponse(question, answers, component, componentId);
        if (complete > 0) {
            // Answer is complete, check the user answered CBM too.
            return answers['-certainty'] ? QuestionCompleteGradableResponse.YES : QuestionCompleteGradableResponse.NO;
        }

        return complete;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param prevBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
     * @param newAnswers Object with the new question answers.
     * @param newBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns Whether they're the same.
     */
    protected isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        prevBasicAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
        newBasicAnswers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): boolean {
        // First check if the question answer is the same.
        const sameResponse = CoreQuestionDelegate.isSameResponse(
            question,
            prevBasicAnswers,
            newBasicAnswers,
            component,
            componentId,
        );

        if (sameResponse) {
            // Same response, check the CBM is the same too.
            return prevAnswers['-certainty'] == newAnswers['-certainty'];
        }

        return sameResponse;
    }

}

export const AddonQbehaviourDeferredCBMHandler = makeSingleton(AddonQbehaviourDeferredCBMHandlerService);
