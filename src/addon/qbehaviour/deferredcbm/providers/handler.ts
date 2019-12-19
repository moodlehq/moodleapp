
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
import { CoreQuestionBehaviourHandler } from '@core/question/providers/behaviour-delegate';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';
import { CoreQuestionState } from '@core/question/providers/question';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonQbehaviourDeferredFeedbackHandler } from '@addon/qbehaviour/deferredfeedback/providers/handler';
import { AddonQbehaviourDeferredCBMComponent } from '../component/deferredcbm';

/**
 * Handler to support deferred CBM question behaviour.
 */
@Injectable()
export class AddonQbehaviourDeferredCBMHandler implements CoreQuestionBehaviourHandler {
    name = 'AddonQbehaviourDeferredCBM';
    type = 'deferredcbm';

    constructor(private questionDelegate: CoreQuestionDelegate, private questionHelper: CoreQuestionHelperProvider,
            private deferredFeedbackHandler: AddonQbehaviourDeferredFeedbackHandler) {
        // Nothing to do.
    }

    /**
     * Determine a question new state based on its answer(s).
     *
     * @param component Component the question belongs to.
     * @param attemptId Attempt ID the question belongs to.
     * @param question The question.
     * @param siteId Site ID. If not defined, current site.
     * @return New state (or promise resolved with state).
     */
    determineNewState(component: string, attemptId: number, question: any, siteId?: string)
            : CoreQuestionState | Promise<CoreQuestionState> {
        // Depends on deferredfeedback.
        return this.deferredFeedbackHandler.determineNewStateDeferred(component, attemptId, question, siteId,
            this.isCompleteResponse.bind(this), this.isSameResponse.bind(this));
    }

    /**
     * Handle a question behaviour.
     * If the behaviour requires a submit button, it should add it to question.behaviourButtons.
     * If the behaviour requires to show some extra data, it should return the components to render it.
     *
     * @param injector Injector.
     * @param question The question.
     * @return Components (or promise resolved with components) to render some extra data in the question
     *         (e.g. certainty options). Don't return anything if no extra data is required.
     */
    handleQuestion(injector: Injector, question: any): any[] | Promise<any[]> {
        if (this.questionHelper.extractQbehaviourCBM(question)) {
            return [AddonQbehaviourDeferredCBMComponent];
        }
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    protected isCompleteResponse(question: any, answers: any): number {
        // First check if the question answer is complete.
        const complete = this.questionDelegate.isCompleteResponse(question, answers);
        if (complete > 0) {
            // Answer is complete, check the user answered CBM too.
            return answers['-certainty'] ? 1 : 0;
        }

        return complete;
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
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param prevBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
     * @param newAnswers Object with the new question answers.
     * @param newBasicAnswers Object with the previous basic" answers (without sequencecheck, certainty, ...).
     * @return Whether they're the same.
     */
    protected isSameResponse(question: any, prevAnswers: any, prevBasicAnswers: any, newAnswers: any, newBasicAnswers: any)
            : boolean {
        // First check if the question answer is the same.
        const same = this.questionDelegate.isSameResponse(question, prevBasicAnswers, newBasicAnswers);
        if (same) {
            // Same response, check the CBM is the same too.
            return prevAnswers['-certainty'] == newAnswers['-certainty'];
        }

        return same;
    }
}
