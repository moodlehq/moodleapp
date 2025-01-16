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

import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { makeSingleton } from '@singletons';
import { AddonQtypeMultichoiceHandler } from '@addons/qtype/multichoice/services/handlers/multichoice';

/**
 * Handler to support calculated multi question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeCalculatedMultiHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeCalculatedMulti';
    type = 'qtype_calculatedmulti';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        // Calculated multi behaves like a multichoice, use the same component.
        const { AddonQtypeMultichoiceComponent } = await import('@addons/qtype/multichoice/component/multichoice');

        return AddonQtypeMultichoiceComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        // This question type depends on multichoice.
        return AddonQtypeMultichoiceHandler.isCompleteResponseSingle(answers);
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
        // This question type depends on multichoice.
        return AddonQtypeMultichoiceHandler.isGradableResponseSingle(answers);
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        // This question type depends on multichoice.
        return AddonQtypeMultichoiceHandler.isSameResponseSingle(prevAnswers, newAnswers);
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        return AddonQtypeMultichoiceHandler.getValidationError(question, answers);
    }

}

export const AddonQtypeCalculatedMultiHandler = makeSingleton(AddonQtypeCalculatedMultiHandlerService);
