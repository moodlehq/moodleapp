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
import { AddonQtypeMultiAnswerComponent } from '../../component/multianswer';

/**
 * Handler to support multianswer question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeMultiAnswerHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeMultiAnswer';
    type = 'qtype_multianswer';

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
     */
    getBehaviour(question: CoreQuestionQuestionParsed, behaviour: string): string {
        if (behaviour === 'interactive') {
            return 'interactivecountback';
        }

        return behaviour;
    }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> {
        return AddonQtypeMultiAnswerComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
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
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
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
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return Whether they're the same.
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        return CoreQuestion.compareAllAnswers(prevAnswers, newAnswers);
    }

    /**
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @return Whether sequencecheck is valid.
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
