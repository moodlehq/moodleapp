
// (C) Copyright 2015 Martin Dougiamas
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
import { AddonQtypeShortAnswerComponent } from '@addon/qtype/shortanswer/component/shortanswer';

/**
 * Handler to support numerical question type.
 */
@Injectable()
export class AddonQtypeNumericalHandler implements CoreQuestionHandler {
    name = 'AddonQtypeNumerical';
    type = 'qtype_numerical';

    constructor(private utils: CoreUtilsProvider) { }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        // Numerical behaves like a short answer, use the same component.
        return AddonQtypeShortAnswerComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        if (this.isGradableResponse(question, answers) === 0 || !this.validateUnits(answers['answer'])) {
            return 0;
        }

        return -1;
    }

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @return {boolean|Promise<boolean>} True or promise resolved with true if enabled.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Check if a student has provided enough of an answer for the question to be graded automatically,
     * or whether it must be considered aborted.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any): number {
        return (answers['answer'] || answers['answer'] === '0' || answers['answer'] === 0) ? 1 : 0;
    }

    /**
     * Check if two responses are the same.
     *
     * @param {any} question Question.
     * @param {any} prevAnswers Object with the previous question answers.
     * @param {any} newAnswers Object with the new question answers.
     * @return {boolean} Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any): boolean {
        return this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer');
    }

    /**
     * Validate a number with units. We don't have the list of valid units and conversions, so we can't perform
     * a full validation. If this function returns true it means we can't be sure it's valid.
     *
     * @param {string} answer Answer.
     * @return {boolean} False if answer isn't valid, true if we aren't sure if it's valid.
     */
    validateUnits(answer: string): boolean {
        if (!answer) {
            return false;
        }

        const regexString = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?';

        // Strip spaces (which may be thousands separators) and change other forms of writing e to e.
        answer = answer.replace(' ', '');
        answer = answer.replace(/(?:e|E|(?:x|\*|×)10(?:\^|\*\*))([+-]?\d+)/, 'e$1');

        // If a '.' is present or there are multiple ',' (i.e. 2,456,789) assume ',' is a thousands separator and stip it.
        // Else assume it is a decimal separator, and change it to '.'.
        if (answer.indexOf('.') != -1 || answer.split(',').length - 1 > 1) {
            answer = answer.replace(',', '');
        } else {
            answer = answer.replace(',', '.');
        }

        // We don't know if units should be before or after so we check both.
        if (answer.match(new RegExp('^' + regexString)) === null || answer.match(new RegExp(regexString + '$')) === null) {
            return false;
        }

        return true;
    }
}
