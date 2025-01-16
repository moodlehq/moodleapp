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
import { CoreObject } from '@singletons/object';
import { makeSingleton, Translate } from '@singletons';

/**
 * Handler to support short answer question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeShortAnswerHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeShortAnswer';
    type = 'qtype_shortanswer';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeShortAnswerComponent } = await import('../../component/shortanswer');

        return AddonQtypeShortAnswerComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        return answers.answer ? 1 : 0;
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
        return this.isCompleteResponse(question, answers);
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        return CoreObject.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        if (this.isGradableResponse(question, answers)) {
            return;
        }

        return Translate.instant('addon.qtype_shortanswer.pleaseenterananswer');
    }

}

export const AddonQtypeShortAnswerHandler = makeSingleton(AddonQtypeShortAnswerHandlerService);
