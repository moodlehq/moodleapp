
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
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { AddonQtypeMatchHandler } from '@addon/qtype/match/providers/handler';
import { AddonQtypeMatchComponent } from '@addon/qtype/match/component/match';

/**
 * Handler to support random short-answer matching question type.
 */
@Injectable()
export class AddonQtypeRandomSaMatchHandler implements CoreQuestionHandler {
    name = 'AddonQtypeRandomSaMatch';
    type = 'qtype_randomsamatch';

    constructor(private matchHandler: AddonQtypeMatchHandler) { }

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @param {any} question The question to render.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        // Random behaves like a match question, use the same component.
        return AddonQtypeMatchComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param {any} question The question.
     * @param {any} answers Object with the question answers (without prefix).
     * @return {number} 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        // This question behaves like a match question.
        return this.matchHandler.isCompleteResponse(question, answers);
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
        // This question behaves like a match question.
        return this.matchHandler.isGradableResponse(question, answers);
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
        // This question behaves like a match question.
        return this.matchHandler.isSameResponse(question, prevAnswers, newAnswers);
    }
}
