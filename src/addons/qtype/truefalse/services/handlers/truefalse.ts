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

import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreObject } from '@singletons/object';
import { AddonModQuizMultichoiceQuestion } from '@features/question/classes/base-question-component';
import { makeSingleton, Translate } from '@singletons';
import { QuestionCompleteGradableResponse } from '@features/question/constants';

/**
 * Handler to support true/false question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeTrueFalseHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeTrueFalse';
    type = 'qtype_truefalse';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        // True/false behaves like a multichoice, use the same component.
        const { AddonQtypeMultichoiceComponent } = await import('@addons/qtype/multichoice/component/multichoice');

        return AddonQtypeMultichoiceComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): QuestionCompleteGradableResponse {
        return answers.answer ? QuestionCompleteGradableResponse.YES : QuestionCompleteGradableResponse.NO;
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
    ): QuestionCompleteGradableResponse {
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
    prepareAnswers(
        question: AddonModQuizMultichoiceQuestion,
        answers: CoreQuestionsAnswers,
    ): void | Promise<void> {
        if (question && question.optionsName && answers[question.optionsName] !== undefined && !answers[question.optionsName]) {
            // The user hasn't answered. Delete the answer to prevent marking one of the answers automatically.
            delete answers[question.optionsName];
        }
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        if (this.isGradableResponse(question, answers) === QuestionCompleteGradableResponse.YES) {
            return;
        }

        return Translate.instant('addon.qtype_truefalse.pleaseselectananswer');
    }

}

export const AddonQtypeTrueFalseHandler = makeSingleton(AddonQtypeTrueFalseHandlerService);
