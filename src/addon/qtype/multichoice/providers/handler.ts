
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

import { Injectable, Injector } from '@angular/core';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { AddonQtypeMultichoiceComponent } from '../component/multichoice';

/**
 * Handler to support multichoice question type.
 */
@Injectable()
export class AddonQtypeMultichoiceHandler implements CoreQuestionHandler {
    name = 'AddonQtypeMultichoice';
    type = 'qtype_multichoice';

    constructor(private utils: CoreUtilsProvider) { }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        return AddonQtypeMultichoiceComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        let isSingle = true,
            isMultiComplete = false;

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
    isCompleteResponseSingle(answers: any): number {
        return (answers['answer'] && answers['answer'] !== '') ? 1 : 0;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any): number {
        return this.isCompleteResponse(question, answers);
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted. Only for single answer.
     *
     * @param answers Object with the question answers (without prefix).
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponseSingle(answers: any): number {
        return this.isCompleteResponseSingle(answers);
    }

    /**
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any): boolean {
        let isSingle = true,
            isMultiSame = true;

        // To know if it's single or multi answer we need to search for answers with "choice" in the name.
        for (const name in newAnswers) {
            if (name.indexOf('choice') != -1) {
                isSingle = false;
                if (!this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, name)) {
                    isMultiSame = false;
                }
            }
        }

        if (isSingle) {
            return this.isSameResponseSingle(prevAnswers, newAnswers);
        } else {
            return isMultiSame ;
        }
    }

    /**
     * Check if two responses are the same. Only for single answer.
     *
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponseSingle(prevAnswers: any, newAnswers: any): boolean {
        return this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    }

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    prepareAnswers(question: any, answers: any, offline: boolean, siteId?: string): void | Promise<any> {
        if (question && !question.multi && typeof answers[question.optionsName] != 'undefined' && !answers[question.optionsName]) {
            /* It's a single choice and the user hasn't answered. Delete the answer because
               sending an empty string (default value) will mark the first option as selected. */
            delete answers[question.optionsName];
        }
    }
}
