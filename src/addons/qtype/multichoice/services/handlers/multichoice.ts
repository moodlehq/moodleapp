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

import { AddonModQuizMultichoiceQuestion } from '@features/question/classes/base-question-component';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonQtypeMultichoiceComponent } from '../../component/multichoice';

/**
 * Handler to support multichoice question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeMultichoiceHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeMultichoice';
    type = 'qtype_multichoice';

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> {
        return AddonQtypeMultichoiceComponent;
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
        component: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): number {
        let isSingle = true;
        let isMultiComplete = false;

        // To know if it's single or multi answer we need to search for answers with "choice" in the name.
        for (const name in answers) {
            if (name.indexOf('choice') != -1) {
                isSingle = false;
                if (answers[name]) {
                    isMultiComplete = true;
                }
            }
        }

        if (isSingle) {
            // Single.
            return this.isCompleteResponseSingle(answers);
        } else {
            // Multi.
            return isMultiComplete ? 1 : 0;
        }
    }

    /**
     * Check if a response is complete. Only for single answer.
     *
     * @param question The question.uestion answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponseSingle(answers: CoreQuestionsAnswers): number {
        return (answers.answer && answers.answer !== '') ? 1 : 0;
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
        component: string,
        componentId: string | number,
    ): number {
        return this.isCompleteResponse(question, answers, component, componentId);
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted. Only for single answer.
     *
     * @param answers Object with the question answers (without prefix).
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponseSingle(answers: CoreQuestionsAnswers): number {
        return this.isCompleteResponseSingle(answers);
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
        let isSingle = true;
        let isMultiSame = true;

        // To know if it's single or multi answer we need to search for answers with "choice" in the name.
        for (const name in newAnswers) {
            if (name.indexOf('choice') != -1) {
                isSingle = false;
                if (!CoreUtils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, name)) {
                    isMultiSame = false;
                    break;
                }
            }
        }

        if (isSingle) {
            return this.isSameResponseSingle(prevAnswers, newAnswers);
        } else {
            return isMultiSame;
        }
    }

    /**
     * Check if two responses are the same. Only for single answer.
     *
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponseSingle(prevAnswers: CoreQuestionsAnswers, newAnswers: CoreQuestionsAnswers): boolean {
        return CoreUtils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    }

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers(
        question: AddonModQuizMultichoiceQuestion,
        answers: CoreQuestionsAnswers,
    ): void {
        if (question && !question.multi && answers[question.optionsName!] !== undefined && !answers[question.optionsName!]) {
            /* It's a single choice and the user hasn't answered. Delete the answer because
               sending an empty string (default value) will mark the first option as selected. */
            delete answers[question.optionsName!];
        }
    }

}

export const AddonQtypeMultichoiceHandler = makeSingleton(AddonQtypeMultichoiceHandlerService);
