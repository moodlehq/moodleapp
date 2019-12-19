
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
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { AddonQtypeEssayComponent } from '../component/essay';

/**
 * Handler to support essay question type.
 */
@Injectable()
export class AddonQtypeEssayHandler implements CoreQuestionHandler {
    name = 'AddonQtypeEssay';
    type = 'qtype_essay';

    constructor(private utils: CoreUtilsProvider, private questionHelper: CoreQuestionHelperProvider,
            private textUtils: CoreTextUtilsProvider, private domUtils: CoreDomUtilsProvider) { }

    /**
     * Return the name of the behaviour to use for the question.
     * If the question should use the default behaviour you shouldn't implement this function.
     *
     * @param question The question.
     * @param behaviour The default behaviour.
     * @return The behaviour to use.
     */
    getBehaviour(question: any, behaviour: string): string {
        return 'manualgraded';
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
        return AddonQtypeEssayComponent;
    }

    /**
     * Check if a question can be submitted.
     * If a question cannot be submitted it should return a message explaining why (translated or not).
     *
     * @param question The question.
     * @return Prevent submit message. Undefined or empty if can be submitted.
     */
    getPreventSubmitMessage(question: any): string {
        const element = this.domUtils.convertToElement(question.html);

        if (element.querySelector('div[id*=filemanager]')) {
            // The question allows attachments. Since the app cannot attach files yet we will prevent submitting the question.
            return 'core.question.errorattachmentsnotsupported';
        }

        if (this.questionHelper.hasDraftFileUrls(element.innerHTML)) {
            return 'core.question.errorinlinefilesnotsupported';
        }
    }

    /**
     * Check if a response is complete.
     *
     * @param question The question.
     * @param answers Object with the question answers (without prefix).
     * @return 1 if complete, 0 if not complete, -1 if cannot determine.
     */
    isCompleteResponse(question: any, answers: any): number {
        const element = this.domUtils.convertToElement(question.html);

        const hasInlineText = answers['answer'] && answers['answer'] !== '',
            allowsAttachments = !!element.querySelector('div[id*=filemanager]');

        if (!allowsAttachments) {
            return hasInlineText ? 1 : 0;
        }

        // We can't know if the attachments are required or if the user added any in web.
        return -1;
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
        const element = this.domUtils.convertToElement(question.html);

        // Search the textarea to get its name.
        const textarea = <HTMLTextAreaElement> element.querySelector('textarea[name*=_answer]');

        if (textarea && typeof answers[textarea.name] != 'undefined') {
            // Add some HTML to the text if needed.
            answers[textarea.name] = this.textUtils.formatHtmlLines(answers[textarea.name]);
        }
    }
}
