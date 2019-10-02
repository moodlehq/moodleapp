
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
import { AddonQtypeMultiAnswerComponent } from '../component/multianswer';

/**
 * Handler to support multianswer question type.
 */
@Injectable()
export class AddonQtypeMultiAnswerHandler implements CoreQuestionHandler {
    name = 'AddonQtypeMultiAnswer';
    type = 'qtype_multianswer';

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
        return AddonQtypeMultiAnswerComponent;
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        // Get all the inputs in the question to check if they've all been answered.
        const names = this.questionProvider.getBasicAnswers(this.questionHelper.getAllInputNamesFromHtml(question.html));
        for (const name in names) {
            const value = answers[name];
            if (!value && value !== false && value !== 0) {
                return 0;
            }
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
     * @return 1 if gradable, 0 if not gradable, -1 if cannot determine.
     */
    isGradableResponse(question: any, answers: any): number {
        // We should always get a value for each select so we can assume we receive all the possible answers.
        for (const name in answers) {
            const value = answers[name];
            if (value || value === false) {
                return 1;
            }
        }

        return 0;
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
     * Validate if an offline sequencecheck is valid compared with the online one.
     * This function only needs to be implemented if a specific compare is required.
     *
     * @param question The question.
     * @param offlineSequenceCheck Sequence check stored in offline.
     * @return Whether sequencecheck is valid.
     */
    validateSequenceCheck(question: any, offlineSequenceCheck: string): boolean {
        if (question.sequencecheck == offlineSequenceCheck) {
            return true;
        }

        // For some reason, viewing a multianswer for the first time without answering it creates a new step "todo".
        // We'll treat this case as valid.
        if (question.sequencecheck == 2 && question.state == 'todo' && offlineSequenceCheck == '1') {
            return true;
        }

        return false;
    }
}
