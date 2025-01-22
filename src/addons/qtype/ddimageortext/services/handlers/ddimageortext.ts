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
import { QuestionCompleteGradableResponse } from '@features/question/constants';

import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { makeSingleton, Translate } from '@singletons';

/**
 * Handler to support drag-and-drop onto image question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDdImageOrTextHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeDdImageOrText';
    type = 'qtype_ddimageortext';

    /**
     * @inheritdoc
     */
    getBehaviour(question: CoreQuestionQuestionParsed, behaviour: string): string {
        if (behaviour === 'interactive') {
            return 'interactivecountback';
        }

        return behaviour;
    }

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeDdImageOrTextComponent } = await import('../../component/ddimageortext');

        return AddonQtypeDdImageOrTextComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): QuestionCompleteGradableResponse {
        // An answer is complete if all drop zones have an answer.
        // We should always receive all the drop zones with their value ('' if not answered).
        for (const name in answers) {
            const value = answers[name];
            if (!value || value === '0') {
                return QuestionCompleteGradableResponse.NO;
            }
        }

        return QuestionCompleteGradableResponse.YES;
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
    ): QuestionCompleteGradableResponse{
        for (const name in answers) {
            const value = answers[name];
            if (value && value !== '0') {
                return QuestionCompleteGradableResponse.YES;
            }
        }

        return QuestionCompleteGradableResponse.NO;
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        return CoreQuestion.compareAllAnswers(prevAnswers, newAnswers);
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        if (this.isCompleteResponse(question, answers) === QuestionCompleteGradableResponse.YES) {
            return;
        }

        return Translate.instant('addon.qtype_ddimageortext.pleasedraganimagetoeachdropregion');
    }

}

export const AddonQtypeDdImageOrTextHandler = makeSingleton(AddonQtypeDdImageOrTextHandlerService);
