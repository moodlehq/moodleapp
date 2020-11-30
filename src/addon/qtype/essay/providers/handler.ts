
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
import { CoreWSExternalFile } from '@providers/ws';

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
     * Delete any stored data for the question.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteOfflineData(question: any, component: string, componentId: string | number, siteId?: string): Promise<void> {
        return this.questionHelper.deleteStoredQuestionFiles(question, component, componentId, siteId);
    }

    /**
     * Get the list of files that needs to be downloaded in addition to the files embedded in the HTML.
     *
     * @param question Question.
     * @param usageId Usage ID.
     * @return List of files or URLs.
     */
    getAdditionalDownloadableFiles(question: any, usageId: number): (string | CoreWSExternalFile)[] {
        if (!question.responsefileareas) {
            return [];
        }

        return question.responsefileareas.reduce((urlsList, area) => {
            return urlsList.concat(area.files || []);
        }, []);
    }

    /**
     * Check whether the question allows text and/or attachments.
     *
     * @param question Question to check.
     * @return Allowed options.
     */
    protected getAllowedOptions(question: any): {text: boolean, attachments: boolean} {
        if (question.settings) {
            return {
                text: question.settings.responseformat != 'noinline',
                attachments: question.settings.attachments != '0',
            };
        } else {
            const element = this.domUtils.convertToElement(question.html);

            return {
                text: !!element.querySelector('textarea[name*=_answer]'),
                attachments: !!element.querySelector('div[id*=filemanager]'),
            };
        }
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
            return 'core.question.errorembeddedfilesnotsupportedinsite';
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

        const hasTextAnswer = answers['answer'] && answers['answer'] !== '';
        const uploadFilesSupported = typeof question.responsefileareas != 'undefined';
        const allowedOptions = this.getAllowedOptions(question);

        if (!allowedOptions.attachments) {
            return hasTextAnswer ? 1 : 0;
        }

        if (!uploadFilesSupported) {
            // We can't know if the attachments are required or if the user added any in web.
            return -1;
        }

        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);

        if (!allowedOptions.text) {
            return attachments && attachments.length >= Number(question.settings.attachmentsrequired) ? 1 : 0;
        }

        return ((hasTextAnswer || question.settings.responserequired == '0') &&
                (attachments && attachments.length >= Number(question.settings.attachmentsrequired))) ? 1 : 0;
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
        if (typeof question.responsefileareas == 'undefined') {
            return -1;
        }

        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);

        // Determine if the given response has online text or attachments.
        return (answers['answer'] && answers['answer'] !== '') || (attachments && attachments.length > 0) ? 1 : 0;
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
        const uploadFilesSupported = typeof question.responsefileareas != 'undefined';
        const allowedOptions = this.getAllowedOptions(question);

        // First check the inline text.
        const answerIsEqual = allowedOptions.text ? this.utils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') : true;

        if (!allowedOptions.attachments || !uploadFilesSupported || !answerIsEqual) {
            // No need to check attachments.
            return answerIsEqual;
        }

        // Check attachments now.
        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);
        const originalAttachments = this.questionHelper.getResponseFileAreaFiles(question, 'attachments');

        return !CoreFileUploader.instance.areFileListDifferent(attachments, originalAttachments);
    }

    /**
     * Prepare and add to answers the data to send to server based in the input.
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
            await this.prepareTextAnswer(question, answers, textarea, siteId);
        }

        if (attachmentsInput) {
            await this.prepareAttachments(question, answers, offline, component, componentId, attachmentsInput, siteId);
        }
    }

    /**
     * Prepare attachments.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param offline Whether the data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param attachmentsInput The HTML input containing the draft ID for attachments.
     * @param siteId Site ID. If not defined, current site.
     * @return Return a promise resolved when done if async, void if sync.
     */
    async prepareAttachments(question: any, answers: any, offline: boolean, component: string, componentId: string | number,
            attachmentsInput: HTMLInputElement, siteId?: string): Promise<void> {

        // Treat attachments if any.
        const questionComponentId = CoreQuestion.instance.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.instance.getFiles(component, questionComponentId);
        const draftId = Number(attachmentsInput.value);

        if (offline) {
            // Get the folder where to store the files.
            const folderPath = CoreQuestion.instance.getQuestionFolder(question.type, component, questionComponentId, siteId);

            const result = await CoreFileUploader.instance.storeFilesToUpload(folderPath, attachments);

            // Store the files in the answers.
            answers[attachmentsInput.name + '_offline'] = JSON.stringify(result);
        } else {
            // Check if any attachment was deleted.
            const originalAttachments = this.questionHelper.getResponseFileAreaFiles(question, 'attachments');
            const filesToDelete = CoreFileUploader.instance.getFilesToDelete(originalAttachments, attachments);

            if (filesToDelete.length > 0) {
                // Delete files.
                await CoreFileUploader.instance.deleteDraftFiles(draftId, filesToDelete, siteId);
            }

            await CoreFileUploader.instance.uploadFiles(draftId, attachments, siteId);
        }
    }

    /**
     * Prepare data to send when performing a synchronization.
     *
     * @param question Question.
     * @param answers Answers of the question, without the prefix.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async prepareSyncData(question: any, answers: {[name: string]: any}, component: string, componentId: string | number,
            siteId?: string): Promise<void> {

        const element = this.domUtils.convertToElement(question.html);
        const attachmentsInput = <HTMLInputElement> element.querySelector('.attachments input[name*=_attachments]');

        if (attachmentsInput) {
            // Update the draft ID, the stored one could no longer be valid.
            answers.attachments = attachmentsInput.value;
        }

        if (answers && answers.attachments_offline) {
            const attachmentsData = this.textUtils.parseJSON(answers.attachments_offline, {});

            // Check if any attachment was deleted.
            const originalAttachments = this.questionHelper.getResponseFileAreaFiles(question, 'attachments');
            const filesToDelete = CoreFileUploader.instance.getFilesToDelete(originalAttachments, attachmentsData.online);

            if (filesToDelete.length > 0) {
                // Delete files.
                await CoreFileUploader.instance.deleteDraftFiles(answers.attachments, filesToDelete, siteId);
            }

            if (attachmentsData.offline) {
                // Upload the offline files.
                const offlineFiles = await this.questionHelper.getStoredQuestionFiles(question, component, componentId, siteId);

                await CoreFileUploader.instance.uploadFiles(answers.attachments, attachmentsData.online.concat(offlineFiles),
                        siteId);
            }

            delete answers.attachments_offline;
        }
    }

    /**
     * Prepare the text answer.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param textarea The textarea HTML element of the question.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async prepareTextAnswer(question: any, answers: any, textarea: HTMLTextAreaElement, siteId?: string): Promise<void> {
        if (this.questionHelper.hasDraftFileUrls(question.html) && question.responsefileareas) {
            // Restore draftfile URLs.
            const site = await CoreSites.instance.getSite(siteId);

            answers[textarea.name] = this.textUtils.restoreDraftfileUrls(site.getURL(), answers[textarea.name],
                    question.html, this.questionHelper.getResponseFileAreaFiles(question, 'answer'));
        }

        let isPlainText = false;
        if (question.isPlainText !== undefined) {
            isPlainText = question.isPlainText;
        } else if (question.settings) {
            isPlainText = question.settings.responseformat == 'monospaced' || question.settings.responseformat == 'plain';
        } else {
            const questionEl = this.domUtils.convertToElement(question.html);
            isPlainText = !!questionEl.querySelector('.qtype_essay_monospaced') || !!questionEl.querySelector('.qtype_essay_plain');
        }

        if (!isPlainText) {
            // Add some HTML to the text if needed.
            answers[textarea.name] = this.textUtils.formatHtmlLines(answers[textarea.name]);
        }
    }
}
