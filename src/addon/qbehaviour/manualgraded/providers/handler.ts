
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
import { CoreQuestionBehaviourHandler } from '@core/question/providers/behaviour-delegate';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';
import { CoreQuestionProvider, CoreQuestionState } from '@core/question/providers/question';
import { AddonQbehaviourDeferredFeedbackHandler } from '@addon/qbehaviour/deferredfeedback/providers/handler';

/**
 * Handler to support manual graded question behaviour.
 */
@Injectable()
export class AddonQbehaviourManualGradedHandler implements CoreQuestionBehaviourHandler {
    name = 'AddonQbehaviourManualGraded';
    type = 'manualgraded';

    constructor(protected questionDelegate: CoreQuestionDelegate,
            protected questionProvider: CoreQuestionProvider,
            protected deferredFeedbackHandler: AddonQbehaviourDeferredFeedbackHandler) {
        // Nothing to do.
    }

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
    determineNewState(component: string, attemptId: number, question: any, componentId: string | number, siteId?: string)
            : CoreQuestionState | Promise<CoreQuestionState> {
        // Same implementation as the deferred feedback. Use that function instead of replicating it.
        return this.deferredFeedbackHandler.determineNewStateDeferred(component, attemptId, question, componentId, siteId);
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }
}
