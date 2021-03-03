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

import { AddonQtypeCalculatedComponent } from '@addons/qtype/calculated/component/calculated';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { AddonQtypeCalculatedHandler } from '@addons/qtype/calculated/services/handlers/calculated';
import { CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { makeSingleton } from '@singletons';

/**
 * Handler to support calculated simple question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeCalculatedSimpleHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeCalculatedSimple';
    type = 'qtype_calculatedsimple';

    /**
     * Return the Component to use to display the question.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(): Type<unknown> {
        // Calculated simple behaves like a calculated, use the same component.
        return AddonQtypeCalculatedComponent;
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
        component: string,
        componentId: string | number,
    ): number {
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isCompleteResponse(question, answers, component, componentId);
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
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isGradableResponse(question, answers, component, componentId);
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
        component: string,
        componentId: string | number,
    ): boolean {
        // This question type depends on calculated.
        return AddonQtypeCalculatedHandler.isSameResponse(question, prevAnswers, newAnswers, component, componentId);
    }

}

export const AddonQtypeCalculatedSimpleHandler = makeSingleton(AddonQtypeCalculatedSimpleHandlerService);
