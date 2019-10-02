
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
import { CoreQuestionProvider } from '@core/question/providers/question';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonQtypeDdMarkerComponent } from '../component/ddmarker';

/**
 * Handler to support drag-and-drop markers question type.
 */
@Injectable()
export class AddonQtypeDdMarkerHandler implements CoreQuestionHandler {
    name = 'AddonQtypeDdMarker';
    type = 'qtype_ddmarker';

    constructor(private questionProvider: CoreQuestionProvider, private questionHelper: CoreQuestionHelperProvider) { }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
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
     * @param injector Injector.
     * @param question The question to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector, question: any): any | Promise<any> {
        return AddonQtypeDdMarkerComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
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
     * Check if two responses are the same.
     *
     * @param question Question.
     * @param prevAnswers Object with the previous question answers.
     * @param newAnswers Object with the new question answers.
     * @return Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any): boolean {
        return this.questionProvider.compareAllAnswers(prevAnswers, newAnswers);
    }

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @return List of URLs.
     */
    getAdditionalDownloadableFiles(question: any, usageId: number): string[] {
        this.questionHelper.extractQuestionScripts(question, usageId);

        if (question.amdArgs && typeof question.amdArgs[1] !== 'undefined') {
            // Moodle 3.6+.
            return [question.amdArgs[1]];
        }

        return [];
    }
}
