
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
import { CoreQuestionProvider } from '@core/question/providers/question';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { AddonQtypeDdImageOrTextComponent } from '../component/ddimageortext';

/**
 * Handler to support drag-and-drop onto image question type.
 */
@Injectable()
export class AddonQtypeDdImageOrTextHandler implements CoreQuestionHandler {
    name = 'AddonQtypeDdImageOrText';
    type = 'qtype_ddimageortext';

    constructor(private questionProvider: CoreQuestionProvider) { }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param {any} question The question.
     * @param {string} behaviour The default behaviour.
     * @return {string} The behaviour to use.
     */
    getBehaviour(question: any, behaviour: string): string {
        if (behaviour === 'interactive') {
            return 'interactivecountback';
        }

        return behaviour;
    }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        return AddonQtypeDdImageOrTextComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        // An answer is complete if all drop zones have an answer.
        // We should always receive all the drop zones with their value ('' if not answered).
        for (const name in answers) {
            const value = answers[name];
            if (!value || value === '0') {
                return 0;
            }
        }

        return 1;
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
        for (const name in answers) {
            const value = answers[name];
            if (value && value !== '0') {
                return 1;
            }
        }

        return 0;
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
        return this.questionProvider.compareAllAnswers(prevAnswers, newAnswers);
    }
}
