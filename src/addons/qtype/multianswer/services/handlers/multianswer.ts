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
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { makeSingleton } from '@singletons';

/**
 * Handler to support multianswer question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeMultiAnswerHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeMultiAnswer';
    type = 'qtype_multianswer';

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
        const { AddonQtypeMultiAnswerComponent } = await import('../../component/multianswer');

        return AddonQtypeMultiAnswerComponent;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        // Get all the inputs in the question to check if they've all been answered.
        const names = CoreQuestion.getBasicAnswers<boolean>(
            CoreQuestionHelper.getAllInputNamesFromHtml(question.html || ''),
        );
        for (const name in names) {
            const value = answers[name];
            if (!value) {
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
        // We should always get a value for each select so we can assume we receive all the possible answers.
        for (const name in answers) {
            const value = answers[name];
            if (value || value === false) {
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

    /**
     * @inheritdoc
     */
    validateSequenceCheck(question: CoreQuestionQuestionParsed, offlineSequenceCheck: string): boolean {
        if (question.sequencecheck == Number(offlineSequenceCheck)) {
            return true;
        }

        // For some reason, viewing a multianswer for the first time without answering it creates a new step "todo".
        // We'll treat this case as valid.
        if (question.sequencecheck == 2 && question.state == 'todo' && offlineSequenceCheck == '1') {
            return true;
        }

        return false;
    }

}

export const AddonQtypeMultiAnswerHandler = makeSingleton(AddonQtypeMultiAnswerHandlerService);
