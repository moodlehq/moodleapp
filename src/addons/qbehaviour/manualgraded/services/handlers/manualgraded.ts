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

import { Injectable } from '@angular/core';

import { AddonQbehaviourDeferredFeedbackHandler } from '@addons/qbehaviour/deferredfeedback/services/handlers/deferredfeedback';
import { CoreQuestionBehaviourHandler, CoreQuestionQuestionWithAnswers } from '@features/question/services/behaviour-delegate';
import { CoreQuestionState } from '@features/question/services/question';
import { makeSingleton } from '@singletons';

/**
 * Handler to support manual graded question behaviour.
 */
@Injectable({ providedIn: 'root' })
export class AddonQbehaviourManualGradedHandlerService implements CoreQuestionBehaviourHandler {

    name = 'AddonQbehaviourManualGraded';
    type = 'manualgraded';

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
        // Same implementation as the deferred feedback. Use that function instead of replicating it.
        return AddonQbehaviourDeferredFeedbackHandler.determineNewStateDeferred(
            component,
            attemptId,
            question,
            componentId,
            siteId,
        );
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const AddonQbehaviourManualGradedHandler = makeSingleton(AddonQbehaviourManualGradedHandlerService);
