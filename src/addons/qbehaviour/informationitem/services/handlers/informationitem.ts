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
     * @inheritdoc
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
     * @inheritdoc
     */
    handleQuestion(question: CoreQuestionQuestionParsed): void | Type<unknown>[] {
        if (CoreQuestionHelper.extractQbehaviourSeenInput(question)) {
            return [AddonQbehaviourInformationItemComponent];
        }
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}

export const AddonQbehaviourInformationItemHandler = makeSingleton(AddonQbehaviourInformationItemHandlerService);
