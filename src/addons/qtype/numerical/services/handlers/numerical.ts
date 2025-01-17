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
import { makeSingleton, Translate } from '@singletons';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreObject } from '@singletons/object';

/**
 * Handler to support numerical question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeNumericalHandlerService implements CoreQuestionHandler {

    static readonly UNITINPUT = '0';
    static readonly UNITRADIO = '1';
    static readonly UNITSELECT = '2';
    static readonly UNITNONE = '3';

    static readonly UNITGRADED = '1';
    static readonly UNITOPTIONAL = '0';

    name = 'AddonQtypeNumerical';
    type = 'qtype_numerical';

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonQtypeNumericalComponent } = await import('../../component/numerical');

        return AddonQtypeNumericalComponent;
    }

    /**
     * Check if the units are in a separate field for the question.
     *
     * @param question Question.
     * @returns Whether units are in a separate field.
     */
    protected hasSeparateUnitField(question: CoreQuestionQuestionParsed): boolean {
        if (!question.parsedSettings) {
            const element = convertTextToHTMLElement(question.html);

            return !!(element.querySelector('select[name*=unit]') || element.querySelector('input[type="radio"]'));
        }

        return question.parsedSettings.unitdisplay === AddonQtypeNumericalHandlerService.UNITRADIO ||
            question.parsedSettings.unitdisplay === AddonQtypeNumericalHandlerService.UNITSELECT;
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): number {
        if (!this.isGradableResponse(question, answers)) {
            return 0;
        }

        const { answer, unit } = this.parseAnswer(question, <string> answers.answer);
        if (answer === null) {
            return 0;
        }

        if (!question.parsedSettings) {
            if (this.hasSeparateUnitField(question)) {
                return this.isValidValue(<string> answers.unit) ? 1 : 0;
            }

            // We cannot know if the answer should contain units or not.
            return -1;
        }

        if (question.parsedSettings.unitdisplay !== AddonQtypeNumericalHandlerService.UNITINPUT && unit) {
            // There should be no units or be outside of the input, not valid.
            return 0;
        }

        if (this.hasSeparateUnitField(question) && !this.isValidValue(<string> answers.unit)) {
            // Unit not supplied as a separate field and it's required.
            return 0;
        }

        if (question.parsedSettings.unitdisplay === AddonQtypeNumericalHandlerService.UNITINPUT &&
                question.parsedSettings.unitgradingtype === AddonQtypeNumericalHandlerService.UNITGRADED &&
                !this.isValidValue(unit)) {
            // Unit not supplied inside the input and it's required.
            return 0;
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
        return this.isValidValue(<string> answers.answer) ? 1 : 0;
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
    ): boolean {
        return CoreObject.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') &&
            CoreObject.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'unit');
    }

    /**
     * Check if a value is valid (not empty).
     *
     * @param value Value to check.
     * @returns Whether the value is valid.
     */
    protected isValidValue(value: string | number | null): boolean {
        return !!value || value === '0' || value === 0;
    }

    /**
     * Parse an answer string.
     *
     * @param question Question.
     * @param answer Answer.
     * @returns Answer and unit.
     */
    protected parseAnswer(question: CoreQuestionQuestionParsed, answer: string): { answer: number | null; unit: string | null } {
        if (!answer) {
            return { answer: null, unit: null };
        }

        let regexString = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[-+]?\\d+)?';

        // Strip spaces (which may be thousands separators) and change other forms of writing e to e.
        answer = answer.replace(/ /g, '');
        answer = answer.replace(/(?:e|E|(?:x|\*|×)10(?:\^|\*\*))([+-]?\d+)/, 'e$1');

        // If a '.' is present or there are multiple ',' (i.e. 2,456,789) assume ',' is a thousands separator and strip it.
        // Else assume it is a decimal separator, and change it to '.'.
        if (answer.indexOf('.') !== -1 || answer.split(',').length - 1 > 1) {
            answer = answer.replace(',', '');
        } else {
            answer = answer.replace(',', '.');
        }

        let unitsLeft = false;
        let match: RegExpMatchArray | null = null;

        if (!question.parsedSettings || question.parsedSettings.unitsleft === null) {
            // We don't know if units should be before or after so we check both.
            match = answer.match(new RegExp('^' + regexString));
            if (!match) {
                unitsLeft = true;
                match = answer.match(new RegExp(regexString + '$'));
            }
        } else {
            unitsLeft = question.parsedSettings.unitsleft === '1';
            regexString = unitsLeft ? regexString + '$' : '^' + regexString;

            match = answer.match(new RegExp(regexString));
        }

        if (!match) {
            return { answer: null, unit: null };
        }

        const numberString = match[0];
        const unit = unitsLeft ? answer.substring(0, answer.length - match[0].length) : answer.substring(match[0].length);

        // No need to calculate the multiplier.
        return { answer: Number(numberString), unit };
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
    ): string | undefined {
        if (!this.isGradableResponse(question, answers)) {
            return Translate.instant('addon.qtype_numerical.pleaseenterananswer');
        }

        const { answer, unit } = this.parseAnswer(question, <string> answers.answer);
        if (answer === null) {
            return Translate.instant('addon.qtype_numerical.invalidnumber');
        }

        if (this.hasSeparateUnitField(question) && !this.isValidValue(<string> answers.unit)) {
            return Translate.instant('addon.qtype_numerical.unitnotselected');
        }

        if (!question.parsedSettings) {
            // We cannot check anything else without settings.
            return;
        }

        if (question.parsedSettings.unitdisplay !== AddonQtypeNumericalHandlerService.UNITINPUT && unit) {
            // There should be no units or be outside of the input, not valid.
            return Translate.instant('addon.qtype_numerical.invalidnumbernounit');
        }

        if (question.parsedSettings.unitdisplay === AddonQtypeNumericalHandlerService.UNITINPUT &&
            question.parsedSettings.unitgradingtype === AddonQtypeNumericalHandlerService.UNITGRADED &&
            !this.isValidValue(unit)) {
                return Translate.instant('addon.qtype_numerical.invalidnumber');
        }

        return;
    }

}

export const AddonQtypeNumericalHandler = makeSingleton(AddonQtypeNumericalHandlerService);
