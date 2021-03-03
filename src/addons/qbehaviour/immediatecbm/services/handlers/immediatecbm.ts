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

import { AddonQbehaviourDeferredCBMComponent } from '@addons/qbehaviour/deferredcbm/component/deferredcbm';
import { Injectable, Type } from '@angular/core';

import { CoreQuestionBehaviourHandler } from '@features/question/services/behaviour-delegate';
import { CoreQuestionQuestionParsed } from '@features/question/services/question';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { makeSingleton } from '@singletons';

/**
 * Handler to support immediate CBM question behaviour.
 */
@Injectable({ providedIn: 'root' })
export class AddonQbehaviourImmediateCBMHandlerService implements CoreQuestionBehaviourHandler {

    name = 'AddonQbehaviourImmediateCBM';
    type = 'immediatecbm';

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
        CoreQuestionHelper.extractQbehaviourButtons(question);

        if (CoreQuestionHelper.extractQbehaviourCBM(question)) {
            // Depends on deferredcbm.
            return [AddonQbehaviourDeferredCBMComponent];
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

export const AddonQbehaviourImmediateCBMHandler = makeSingleton(AddonQbehaviourImmediateCBMHandlerService);
