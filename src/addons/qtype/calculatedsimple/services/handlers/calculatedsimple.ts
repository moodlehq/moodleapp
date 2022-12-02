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

import { AddonQtypeCalculatedComponent } from '@addons/qtype/calculated/component/calculated';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { AddonQtypeCalculatedHandler } from '@addons/qtype/calculated/services/handlers/calculated';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { makeSingleton } from '@singletons';

/**
 * Handler to support calculated simple question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeCalculatedSimpleHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeCalculatedSimple';
    type = 'qtype_calculatedsimple';

    /**
     * @inheritdoc
     */
    getComponent(): Type<unknown> {
        // Calculated simple behaves like a calculated, use the same component.
        return AddonQtypeCalculatedComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isCompleteResponse(question, answers);
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isGradableResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isGradableResponse(question, answers);
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isSameResponse(question, prevAnswers, newAnswers);
    }

}

export const AddonQtypeCalculatedSimpleHandler = makeSingleton(AddonQtypeCalculatedSimpleHandlerService);
