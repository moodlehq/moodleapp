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

import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { makeSingleton } from '@singletons';
import { AddonQtypeDdwtosComponent } from '../../component/ddwtos';

/**
 * Handler to support drag-and-drop words into sentences question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDdwtosHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeDdwtos';
    type = 'qtype_ddwtos';

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
    getComponent(): Type<unknown> {
        return AddonQtypeDdwtosComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        for (const name in answers) {
            const value = answers[name];
            if (!value || value === '0') {
                return 0;
            }
        }

        return 1;
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
        for (const name in answers) {
            const value = answers[name];
            if (value && value !== '0') {
                return 1;
            }
        }

        return 0;
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

}

export const AddonQtypeDdwtosHandler = makeSingleton(AddonQtypeDdwtosHandlerService);
