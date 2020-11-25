
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
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { AddonQtypeCalculatedComponent } from '../component/calculated';

/**
 * Handler to support calculated question type.
 */
@Injectable()
export class AddonQtypeCalculatedHandler implements CoreQuestionHandler {
    static UNITINPUT = '0';
    static UNITRADIO = '1';
    static UNITSELECT = '2';
    static UNITNONE = '3';

    static UNITGRADED = '1';
    static UNITOPTIONAL = '0';

    name = 'AddonQtypeCalculated';
    type = 'qtype_calculated';

    constructor(private utils: CoreUtilsProvider, private domUtils: CoreDomUtilsProvider) { }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        return AddonQtypeCalculatedComponent;
    }

    /**
     * Check if the units are in a separate field for the question.
     *
     * @param question Question.
     * @return Whether units are in a separate field.
     */
    hasSeparateUnitField(question: any): boolean {
        if (!question.settings) {
            const element = this.domUtils.convertToElement(question.html);

            return !!(element.querySelector('select[name*=unit]') || element.querySelector('input[type="radio"]'));
        }

        return question.settings.unitdisplay === AddonQtypeCalculatedHandler.UNITRADIO ||
                question.settings.unitdisplay === AddonQtypeCalculatedHandler.UNITSELECT;
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
    isCompleteResponse(question: any, answers: any, component: string, componentId: string | number): number {
        if (!this.isGradableResponse(question, answers, component, componentId)) {
            return 0;
        }

        const parsedAnswer = this.parseAnswer(question, answers['answer']);
        if (parsedAnswer.answer === null) {
            return 0;
        }

        if (!question.settings) {
            if (this.hasSeparateUnitField(question)) {
                return this.isValidValue(answers['unit']) ? 1 : 0;
            }

            // We cannot know if the answer should contain units or not.
            return -1;
        }

        if (question.settings.unitdisplay != AddonQtypeCalculatedHandler.UNITINPUT && parsedAnswer.unit) {
            // There should be no units or be outside of the input, not valid.
            return 0;
        }

        if (this.hasSeparateUnitField(question) && !this.isValidValue(answers['unit'])) {
            // Unit not supplied as a separate field and it's required.
            return 0;
        }

        if (question.settings.unitdisplay == AddonQtypeCalculatedHandler.UNITINPUT &&
                question.settings.unitgradingtype == AddonQtypeCalculatedHandler.UNITGRADED &&
                !this.isValidValue(parsedAnswer.unit)) {
            // Unit not supplied inside the input and it's required.
            return 0;
        }

        return 1;
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
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any, component: string, componentId: string | number): number {
        return this.isValidValue(answers['answer']) ? 1 : 0;
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
    isSameResponse(question: any, prevAnswers: any, newAnswers: any, component: string, componentId: string | number): boolean {
        return this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') &&
            this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'unit');
    }

    /**
     * Check if a value is valid (not empty).
     *
     * @param value Value to check.
     * @return Whether the value is valid.
     */
    isValidValue(value: string | number): boolean {
        return !!value || value === '0' || value === 0;
    }

    /**
     * Parse an answer string.
     *
     * @param question Question.
     * @param answer Answer.
     * @return 0 if answer isn't valid, 1 if answer is valid, -1 if we aren't sure if it's valid.
     */
    parseAnswer(question: any, answer: string): {answer: number, unit: string} {
        if (!answer) {
            return {answer: null, unit: null};
        }

        let regexString = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?';

        // Strip spaces (which may be thousands separators) and change other forms of writing e to e.
        answer = answer.replace(/ /g, '');
        answer = answer.replace(/(?:e|E|(?:x|\*|×)10(?:\^|\*\*))([+-]?\d+)/, 'e$1');

        // If a '.' is present or there are multiple ',' (i.e. 2,456,789) assume ',' is a thousands separator and strip it.
        // Else assume it is a decimal separator, and change it to '.'.
        if (answer.indexOf('.') != -1 || answer.split(',').length - 1 > 1) {
            answer = answer.replace(',', '');
        } else {
            answer = answer.replace(',', '.');
        }

        let unitsLeft = false;
        let match = null;

        if (!question.settings || question.settings.unitsleft === null) {
            // We don't know if units should be before or after so we check both.
            match = answer.match(new RegExp('^' + regexString));
            if (!match) {
                unitsLeft = true;
                match = answer.match(new RegExp(regexString + '$'));
            }
        } else {
            unitsLeft = question.settings.unitsleft == '1';
            regexString = unitsLeft ? regexString + '$' : '^' + regexString;

            match = answer.match(new RegExp(regexString));
        }

        if (!match) {
            return {answer: null, unit: null};
        }

        const numberString = match[0];
        const unit = unitsLeft ? answer.substr(0, answer.length - match[0].length) : answer.substr(match[0].length);

        // No need to calculate the multiplier.
        return {answer: Number(numberString), unit: unit};
    }
}
