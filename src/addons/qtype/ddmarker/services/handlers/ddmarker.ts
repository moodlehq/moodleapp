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
import { CoreQuestionHelper, CoreQuestionQuestion } from '@features/question/services/question-helper';
import { CoreWSFile } from '@services/ws';
import { makeSingleton } from '@singletons';
import { AddonQtypeDdMarkerComponent } from '../../component/ddmarker';

/**
 * Handler to support drag-and-drop markers question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeDdMarkerHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeDdMarker';
    type = 'qtype_ddmarker';

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
        return AddonQtypeDdMarkerComponent;
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
        // If 1 dragitem is set we assume the answer is complete (like Moodle does).
        for (const name in answers) {
            if (answers[name]) {
                return 1;
            }
        }

        return 0;
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
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @return List of files or URLs.
     */
    getAdditionalDownloadableFiles(question: CoreQuestionQuestionParsed, usageId?: number): CoreWSFile[] {
        const treatedQuestion: CoreQuestionQuestion = question;

        CoreQuestionHelper.extractQuestionScripts(treatedQuestion, usageId);

        if (treatedQuestion.amdArgs && typeof treatedQuestion.amdArgs[1] == 'string') {
            // Moodle 3.6+.
            return [{
                fileurl: treatedQuestion.amdArgs[1],
            }];
        }

        return [];
    }

}

export const AddonQtypeDdMarkerHandler = makeSingleton(AddonQtypeDdMarkerHandlerService);
