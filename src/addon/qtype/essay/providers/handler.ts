
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
import { CoreFileSession } from '@providers/file-session';
import { CoreSites } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploader } from '@core/fileuploader/providers/fileuploader';
import { CoreQuestionHandler } from '@core/question/providers/delegate';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';
import { CoreQuestion } from '@core/question/providers/question';
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
     * Clear temporary data after the data has been saved.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     */
    clearTmpData(question: any, component: string, componentId: string | number): void {
        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const files = CoreFileSession.instance.getFiles(component, questionComponentId);

        // Clear the files in session for this question.
        CoreFileSession.instance.clearFiles(component, questionComponentId);

        // Now delete the local files from the tmp folder.
        CoreFileUploader.instance.clearTmpFiles(files);
    }

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
        const uploadFilesSupported = typeof question.responsefileareas != 'undefined';

        if (!uploadFilesSupported && element.querySelector('div[id*=filemanager]')) {
            // The question allows attachments. Since the app cannot attach files yet we will prevent submitting the question.
            return 'core.question.errorattachmentsnotsupportedinsite';
        }

        if (!uploadFilesSupported && this.questionHelper.hasDraftFileUrls(element.innerHTML)) {
            return 'core.question.errorinlinefilesnotsupportedinsite';
        }
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
        const element = this.domUtils.convertToElement(question.html);

        const hasInlineText = answers['answer'] && answers['answer'] !== '';
        const allowsInlineText = !!element.querySelector('textarea[name*=_answer]');
        const allowsAttachments = !!element.querySelector('div[id*=filemanager]');
        const uploadFilesSupported = typeof question.responsefileareas != 'undefined';

        if (!allowsAttachments) {
            return hasInlineText ? 1 : 0;
        }

        if (!uploadFilesSupported) {
            // We can't know if the attachments are required or if the user added any in web.
            return -1;
        }

        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);

        if (!allowsInlineText) {
            return attachments && attachments.length > 0 ? 1 : 0;
        }

        // If any of the fields is missing return -1 because we can't know if they're required or not.
        return hasInlineText && attachments && attachments.length > 0 ? 1 : -1;
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
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @return Whether they're the same.
     */
    isSameResponse(question: any, prevAnswers: any, newAnswers: any, component: string, componentId: string | number): boolean {
        const element = this.domUtils.convertToElement(question.html);
        const allowsInlineText = !!element.querySelector('textarea[name*=_answer]');
        const allowsAttachments = !!element.querySelector('div[id*=filemanager]');
        const uploadFilesSupported = typeof question.responsefileareas != 'undefined';

        // First check the inline text.
        const answerIsEqual = allowsInlineText ? this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') : true;

        if (!allowsAttachments || !uploadFilesSupported || !answerIsEqual) {
            // No need to check attachments.
            return answerIsEqual;
        }

        // Check attachments now.
        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);
        const originalAttachments = this.questionHelper.getResponseFileAreaFiles(question, 'attachments');

        return CoreFileUploader.instance.areFileListDifferent(attachments, originalAttachments);
    }

    /**
     * Prepare and add to answers the data to send to server based in the input. Return promise if async.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    async prepareAnswers(question: any, answers: any, offline: boolean, component: string, componentId: string | number,
            siteId?: string): Promise<void> {

        const element = this.domUtils.convertToElement(question.html);
        const attachmentsInput = <HTMLInputElement> element.querySelector('.attachments input[name*=_attachments]');

        // Search the textarea to get its name.
        const textarea = <HTMLTextAreaElement> element.querySelector('textarea[name*=_answer]');

        if (textarea && typeof answers[textarea.name] != 'undefined') {
            if (this.questionHelper.hasDraftFileUrls(question.html) && question.responsefileareas) {
                // Restore draftfile URLs.
                const site = await CoreSites.instance.getSite(siteId);

                answers[textarea.name] = this.textUtils.restoreDraftfileUrls(site.getURL(), answers[textarea.name],
                        question.html, this.questionHelper.getResponseFileAreaFiles(question, 'answer'));
            }

            // Add some HTML to the text if needed.
            answers[textarea.name] = this.textUtils.formatHtmlLines(answers[textarea.name]);
        }

        if (attachmentsInput) {
            // Treat attachments if any.
            const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
            const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);
            const draftId = Number(attachmentsInput.value);

            if (offline) {
                // @TODO Support offline.
            } else {
                await CoreFileUploader.instance.uploadFiles(draftId, attachments, siteId);
            }
        }
    }
}
