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
import { FileEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { AddonModQuizEssayQuestion } from '@features/question/classes/base-question-component';
import { CoreQuestion, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from '@features/question/services/question';
import { CoreQuestionHandler } from '@features/question/services/question-delegate';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreFileSession } from '@services/file-session';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonQtypeEssayComponent } from '../../component/essay';
import { CoreFileHelper } from '@services/file-helper';

/**
 * Handler to support essay question type.
 */
@Injectable({ providedIn: 'root' })
export class AddonQtypeEssayHandlerService implements CoreQuestionHandler {

    name = 'AddonQtypeEssay';
    type = 'qtype_essay';

    /**
     * @inheritdoc
     */
    clearTmpData(question: CoreQuestionQuestionParsed, component: string, componentId: string | number): void {
        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const files = CoreFileSession.getFiles(component, questionComponentId);

        // Clear the files in session for this question.
        CoreFileSession.clearFiles(component, questionComponentId);

        // Now delete the local files from the tmp folder.
        CoreFileUploader.clearTmpFiles(files);
    }

    /**
     * @inheritdoc
     */
    deleteOfflineData(
        question: CoreQuestionQuestionParsed,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {
        return CoreQuestionHelper.deleteStoredQuestionFiles(question, component, componentId, siteId);
    }

    /**
     * @inheritdoc
     */
    getAdditionalDownloadableFiles(question: CoreQuestionQuestionParsed): CoreWSFile[] {
        if (!question.responsefileareas) {
            return [];
        }

        return question.responsefileareas.reduce((urlsList, area) => urlsList.concat(area.files || []), <CoreWSFile[]> []);
    }

    /**
     * Check whether the question allows text and/or attachments.
     *
     * @param question Question to check.
     * @returns Allowed options.
     */
    protected getAllowedOptions(question: CoreQuestionQuestionParsed): { text: boolean; attachments: boolean } {
        if (question.parsedSettings) {
            return {
                text: question.parsedSettings.responseformat != 'noinline',
                attachments: question.parsedSettings.attachments != '0',
            };
        }

        const element = CoreDomUtils.convertToElement(question.html);

        return {
            text: !!element.querySelector('textarea[name*=_answer]'),
            attachments: !!element.querySelector('div[id*=filemanager]'),
        };
    }

    /**
     * @inheritdoc
     */
    getBehaviour(): string {
        return 'manualgraded';
    }

    /**
     * @inheritdoc
     */
    getComponent(): Type<unknown> {
        return AddonQtypeEssayComponent;
    }

    /**
     * @inheritdoc
     */
    getPreventSubmitMessage(question: CoreQuestionQuestionParsed): string | undefined {
        const element = CoreDomUtils.convertToElement(question.html);
        const uploadFilesSupported = question.responsefileareas !== undefined;

        if (!uploadFilesSupported && element.querySelector('div[id*=filemanager]')) {
            // The question allows attachments. Since the app cannot attach files yet we will prevent submitting the question.
            return 'core.question.errorattachmentsnotsupportedinsite';
        }

        if (!uploadFilesSupported && CoreQuestionHelper.hasDraftFileUrls(element.innerHTML)) {
            return 'core.question.errorembeddedfilesnotsupportedinsite';
        }
    }

    /**
     * @inheritdoc
     */
    getValidationError(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        onlineError: string | undefined,
    ): string | undefined {
        if (answers.answer === undefined) {
            // Not answered in offline.
            return onlineError;
        }

        if (!answers.answer) {
            // Not answered yet, no error.
            return;
        }

        return this.checkInputWordCount(question, <string> answers.answer, onlineError);
    }

    /**
     * Check the input word count and return a message to user when the number of words are outside the boundary settings.
     *
     * @param question The question.
     * @param answer Object with the question answers (without prefix).
     * @param onlineError Online validation error.
     * @returns Error message if there's a validation error, undefined otherwise.
     */
    protected checkInputWordCount(
        question: CoreQuestionQuestionParsed,
        answer: string,
        onlineError: string | undefined,
    ): string | undefined {
        if (!question.parsedSettings || question.parsedSettings.maxwordlimit === undefined ||
                question.parsedSettings.minwordlimit === undefined) {
            // Min/max not supported, use online error.
            return onlineError;
        }

        const minWords = Number(question.parsedSettings.minwordlimit);
        const maxWords = Number(question.parsedSettings.maxwordlimit);

        if (!maxWords && !minWords) {
            // No min and max, no error.
            return;
        }

        // Count the number of words in the response string.
        const count = CoreText.countWords(answer);
        if (maxWords && count > maxWords) {
            return Translate.instant('addon.qtype_essay.maxwordlimitboundary', { $a: { limit: maxWords, count: count } });
        } else if (count < minWords) {
            return Translate.instant('addon.qtype_essay.minwordlimitboundary', { $a: { limit: minWords, count: count } });
        }
    }

    /**
     * @inheritdoc
     */
    isCompleteResponse(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): number {

        const hasTextAnswer = !!answers.answer;
        const uploadFilesSupported = question.responsefileareas !== undefined;
        const allowedOptions = this.getAllowedOptions(question);

        if (hasTextAnswer && this.checkInputWordCount(question, <string> answers.answer, undefined)) {
            return 0;
        }

        if (!allowedOptions.attachments) {
            return hasTextAnswer ? 1 : 0;
        }

        if (!uploadFilesSupported || !question.parsedSettings) {
            // We can't know if the attachments are required or if the user added any in web.
            return -1;
        }

        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.getFiles(component, questionComponentId);

        if (!allowedOptions.text) {
            return attachments && attachments.length >= Number(question.parsedSettings.attachmentsrequired) ? 1 : 0;
        }

        return ((hasTextAnswer || question.parsedSettings.responserequired == '0') &&
                (attachments && attachments.length >= Number(question.parsedSettings.attachmentsrequired))) ? 1 : 0;
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
        component: string,
        componentId: string | number,
    ): number {
        if (question.responsefileareas === undefined) {
            return -1;
        }

        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.getFiles(component, questionComponentId);

        // Determine if the given response has online text or attachments.
        return (answers.answer && answers.answer !== '') || (attachments && attachments.length > 0) ? 1 : 0;
    }

    /**
     * @inheritdoc
     */
    isSameResponse(
        question: CoreQuestionQuestionParsed,
        prevAnswers: CoreQuestionsAnswers,
        newAnswers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
    ): boolean {
        const uploadFilesSupported = question.responsefileareas !== undefined;
        const allowedOptions = this.getAllowedOptions(question);

        // First check the inline text.
        const answerIsEqual = allowedOptions.text ?
            CoreUtils.sameAtKeyMissingIsBlank(prevAnswers, newAnswers, 'answer') : true;

        if (!allowedOptions.attachments || !uploadFilesSupported || !answerIsEqual) {
            // No need to check attachments.
            return answerIsEqual;
        }

        // Check attachments now.
        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.getFiles(component, questionComponentId);
        const originalAttachments = CoreQuestionHelper.getResponseFileAreaFiles(question, 'attachments');

        return !CoreFileUploader.areFileListDifferent(attachments, originalAttachments);
    }

    /**
     * @inheritdoc
     */
    async prepareAnswers(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        offline: boolean,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {

        const element = CoreDomUtils.convertToElement(question.html);
        const attachmentsInput = <HTMLInputElement> element.querySelector('.attachments input[name*=_attachments]');

        // Search the textarea to get its name.
        const textarea = <HTMLTextAreaElement> element.querySelector('textarea[name*=_answer]');

        if (textarea && answers[textarea.name] !== undefined) {
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
     * @returns Return a promise resolved when done if async, void if sync.
     */
    async prepareAttachments(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        offline: boolean,
        component: string,
        componentId: string | number,
        attachmentsInput: HTMLInputElement,
        siteId?: string,
    ): Promise<void> {

        // Treat attachments if any.
        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const attachments = CoreFileSession.getFiles(component, questionComponentId);
        const draftId = Number(attachmentsInput.value);

        if (offline) {
            // Get the folder where to store the files.
            const folderPath = CoreQuestion.getQuestionFolder(question.type, component, questionComponentId, siteId);

            const result = await CoreFileUploader.storeFilesToUpload(folderPath, attachments);

            // Store the files in the answers.
            answers[attachmentsInput.name + '_offline'] = JSON.stringify(result);
        } else {
            // Check if any attachment was deleted.
            const originalAttachments = CoreQuestionHelper.getResponseFileAreaFiles(question, 'attachments');
            const filesToDelete = CoreFileUploader.getFilesToDelete(originalAttachments, attachments);

            if (filesToDelete.length > 0) {
                // Delete files.
                await CoreFileUploader.deleteDraftFiles(draftId, filesToDelete, siteId);
            }

            await CoreFileUploader.uploadFiles(draftId, attachments, siteId);
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
     * @returns Promise resolved when done.
     */
    async prepareSyncData(
        question: CoreQuestionQuestionParsed,
        answers: CoreQuestionsAnswers,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {

        const element = CoreDomUtils.convertToElement(question.html);
        const attachmentsInput = <HTMLInputElement> element.querySelector('.attachments input[name*=_attachments]');

        if (attachmentsInput) {
            // Update the draft ID, the stored one could no longer be valid.
            answers.attachments = attachmentsInput.value;
        }

        if (!answers || !answers.attachments_offline) {
            return;
        }

        const attachmentsData: CoreFileUploaderStoreFilesResult = CoreText.parseJSON(
            <string> answers.attachments_offline,
            {
                online: [],
                offline: 0,
            },
        );
        delete answers.attachments_offline;

        // Check if any attachment was deleted.
        const originalAttachments = CoreQuestionHelper.getResponseFileAreaFiles(question, 'attachments');
        const filesToDelete = CoreFileUploader.getFilesToDelete(originalAttachments, attachmentsData.online);

        if (filesToDelete.length > 0) {
            // Delete files.
            await CoreFileUploader.deleteDraftFiles(Number(answers.attachments), filesToDelete, siteId);
        }

        if (!attachmentsData.offline) {
            return;
        }

        // Upload the offline files.
        const offlineFiles =
            <FileEntry[]> await CoreQuestionHelper.getStoredQuestionFiles(question, component, componentId, siteId);

        await CoreFileUploader.uploadFiles(
            Number(answers.attachments),
            [...attachmentsData.online, ...offlineFiles],
            siteId,
        );
    }

    /**
     * Prepare the text answer.
     *
     * @param question Question.
     * @param answers The answers retrieved from the form. Prepared answers must be stored in this object.
     * @param textarea The textarea HTML element of the question.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async prepareTextAnswer(
        question: AddonModQuizEssayQuestion,
        answers: CoreQuestionsAnswers,
        textarea: HTMLTextAreaElement,
        siteId?: string,
    ): Promise<void> {
        if (CoreQuestionHelper.hasDraftFileUrls(question.html) && question.responsefileareas) {
            // Restore draftfile URLs.
            const site = await CoreSites.getSite(siteId);

            answers[textarea.name] = CoreFileHelper.restoreDraftfileUrls(
                site.getURL(),
                <string> answers[textarea.name],
                question.html,
                CoreQuestionHelper.getResponseFileAreaFiles(question, 'answer'),
            );
        }

        let isPlainText = false;
        if (question.isPlainText !== undefined) {
            isPlainText = question.isPlainText;
        } else if (question.parsedSettings) {
            isPlainText = question.parsedSettings.responseformat == 'monospaced' ||
                question.parsedSettings.responseformat == 'plain';
        } else {
            const questionEl = CoreDomUtils.convertToElement(question.html);
            isPlainText = !!questionEl.querySelector('.qtype_essay_monospaced') || !!questionEl.querySelector('.qtype_essay_plain');
        }

        if (!isPlainText) {
            // Add some HTML to the text if needed.
            answers[textarea.name] = CoreText.formatHtmlLines(<string> answers[textarea.name] || '');
        }
    }

}

export const AddonQtypeEssayHandler = makeSingleton(AddonQtypeEssayHandlerService);
