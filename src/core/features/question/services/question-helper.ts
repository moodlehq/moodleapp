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

import { Injectable, EventEmitter } from '@angular/core';
import { FileEntry, DirectoryEntry } from '@awesome-cordova-plugins/file/ngx';

import { CoreFile } from '@services/file';
import { CoreFileHelper } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreWSFile } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { CoreQuestion, CoreQuestionProvider, CoreQuestionQuestionParsed, CoreQuestionsAnswers } from './question';
import { CoreQuestionDelegate } from './question-delegate';
import { CoreIcons } from '@singletons/icons';
import { CoreUrl } from '@singletons/url';
import { ContextLevel } from '@/core/constants';
import { CoreIonicColorNames } from '@singletons/colors';
import { CoreViewer } from '@features/viewer/services/viewer';

/**
 * Service with some common functions to handle questions.
 */
@Injectable({ providedIn: 'root' })
export class CoreQuestionHelperProvider {

    protected lastErrorShown = 0;

    /**
     * Add a behaviour button to the question's "behaviourButtons" property.
     *
     * @param question Question.
     * @param button Behaviour button (DOM element).
     */
    protected addBehaviourButton(question: CoreQuestionQuestion, button: HTMLElement): void {
        if (!button || !question) {
            return;
        }

        question.behaviourButtons = question.behaviourButtons || [];

        // Extract the data we want.
        if (button instanceof HTMLInputElement) {
            // Old behaviour that changed in 4.2 because of MDL-78874.
            question.behaviourButtons.push({
                id: button.id,
                name: button.name,
                value: button.value,
                disabled: button.disabled,
            });

            return;
        }

        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        question.behaviourButtons.push({
            id: button.id,
            name: button.name,
            value: button.innerHTML,
            disabled: button.disabled,
        });
    }

    /**
     * Clear questions temporary data after the data has been saved.
     *
     * @param questions The list of questions.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @returns Promise resolved when done.
     */
    async clearTmpData(questions: CoreQuestionQuestionParsed[], component: string, componentId: string | number): Promise<void> {
        questions = questions || [];

        await Promise.all(questions.map(async (question) => {
            await CoreQuestionDelegate.clearTmpData(question, component, componentId);
        }));
    }

    /**
     * Delete files stored for a question.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteStoredQuestionFiles(
        question: CoreQuestionQuestionParsed,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<void> {
        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const folderPath = CoreQuestion.getQuestionFolder(question.type, component, questionComponentId, siteId);

        // Ignore errors, maybe the folder doesn't exist.
        await CoreUtils.ignoreErrors(CoreFile.removeDir(folderPath));
    }

    /**
     * Extract question behaviour submit buttons from the question's HTML and add them to "behaviourButtons" property.
     * The buttons aren't deleted from the content because all the im-controls block will be removed afterwards.
     *
     * @param question Question to treat.
     * @param selector Selector to search the buttons. By default, '.im-controls [type="submit"]'.
     */
    extractQbehaviourButtons(question: CoreQuestionQuestionParsed, selector?: string): void {
        if (CoreQuestionDelegate.getPreventSubmitMessage(question)) {
            // The question is not fully supported, don't extract the buttons.
            return;
        }

        selector = selector || '.im-controls [type="submit"]';

        const element = CoreDomUtils.convertToElement(question.html);

        // Search the buttons.
        const buttons = <HTMLInputElement[]> Array.from(element.querySelectorAll(selector));
        buttons.forEach((button) => {
            this.addBehaviourButton(question, button);
        });
    }

    /**
     * Check if the question has CBM and, if so, extract the certainty options and add them to a new
     * "behaviourCertaintyOptions" property.
     * The value of the selected option is stored in question.behaviourCertaintySelected.
     * We don't remove them from HTML because the whole im-controls block will be removed afterwards.
     *
     * @param question Question to treat.
     * @returns Wether the certainty is found.
     */
    extractQbehaviourCBM(question: CoreQuestionQuestion): boolean {
        const element = CoreDomUtils.convertToElement(question.html);

        const labels = Array.from(element.querySelectorAll('.im-controls .certaintychoices label[for*="certainty"]'));
        question.behaviourCertaintyOptions = [];

        labels.forEach((label) => {
            // Search the radio button inside this certainty and add its data to the options array.
            const input = <HTMLInputElement> label.querySelector('input[type="radio"]');
            if (input) {
                question.behaviourCertaintyOptions?.push({
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    text: CoreText.cleanTags(label.innerHTML),
                    disabled: input.disabled,
                });

                if (input.checked) {
                    question.behaviourCertaintySelected = input.value;
                }
            }
        });

        // If we have a certainty value stored in local we'll use that one.
        if (question.localAnswers && question.localAnswers['-certainty'] !== undefined) {
            question.behaviourCertaintySelected = question.localAnswers['-certainty'];
        }

        return labels.length > 0;
    }

    /**
     * Check if the question has a redo button and, if so, add it to "behaviourButtons" property
     * and remove it from the HTML.
     *
     * @param question Question to treat.
     */
    extractQbehaviourRedoButton(question: CoreQuestionQuestion): void {
        // Create a fake div element so we can search using querySelector.
        const redoSelector = '[type="submit"][name*=redoslot], [type="submit"][name*=tryagain]';

        // Search redo button in feedback.
        if (!this.searchBehaviourButton(question, 'html', '.outcome ' + redoSelector)) {
            // Not found in question HTML.
            if (question.feedbackHtml) {
                // We extracted the feedback already, search it in there.
                if (this.searchBehaviourButton(question, 'feedbackHtml', redoSelector)) {
                    // Button found, stop.
                    return;
                }
            }

            // Button still not found. Now search in the info box if it exists.
            if (question.infoHtml) {
                this.searchBehaviourButton(question, 'infoHtml', redoSelector);
            }
        }
    }

    /**
     * Check if the question contains a "seen" input.
     * If so, add the name and value to a "behaviourSeenInput" property and remove the input.
     *
     * @param question Question to treat.
     * @returns Whether the seen input is found.
     */
    extractQbehaviourSeenInput(question: CoreQuestionQuestion): boolean {
        const element = CoreDomUtils.convertToElement(question.html);

        // Search the "seen" input.
        const seenInput = <HTMLInputElement> element.querySelector('input[type="hidden"][name*=seen]');
        if (!seenInput) {
            return false;
        }

        // Get the data and remove the input.
        question.behaviourSeenInput = {
            name: seenInput.name,
            value: seenInput.value,
        };
        seenInput.parentElement?.removeChild(seenInput);
        question.html = element.innerHTML;

        return true;
    }

    /**
     * Removes the comment from the question HTML code and adds it in a new "commentHtml" property.
     *
     * @param question Question.
     */
    extractQuestionComment(question: CoreQuestionQuestion): void {
        this.extractQuestionLastElementNotInContent(question, '.comment', 'commentHtml');
    }

    /**
     * Removes the feedback from the question HTML code and adds it in a new "feedbackHtml" property.
     *
     * @param question Question.
     */
    extractQuestionFeedback(question: CoreQuestionQuestion): void {
        this.extractQuestionLastElementNotInContent(question, '.outcome', 'feedbackHtml');
    }

    /**
     * Extracts the info box from a question and add it to an "infoHtml" property.
     *
     * @param question Question.
     * @param selector Selector to search the element.
     */
    extractQuestionInfoBox(question: CoreQuestionQuestion, selector: string): void {
        this.extractQuestionLastElementNotInContent(question, selector, 'infoHtml');
    }

    /**
     * Searches the last occurrence of a certain element and check it's not in the question contents.
     * If found, removes it from the question HTML and adds it to a new property inside question.
     *
     * @param question Question.
     * @param selector Selector to search the element.
     * @param attrName Name of the attribute to store the HTML in.
     */
    protected extractQuestionLastElementNotInContent(question: CoreQuestionQuestion, selector: string, attrName: string): void {
        const element = CoreDomUtils.convertToElement(question.html);
        const matches = <HTMLElement[]> Array.from(element.querySelectorAll(selector));

        // Get the last element and check it's not in the question contents.
        let last = matches.pop();
        while (last) {
            if (!last.closest('.formulation')) {
                // Not in question contents. Add it to a separate attribute and remove it from the HTML.
                question[attrName] = last.innerHTML;
                last.parentElement?.removeChild(last);
                question.html = element.innerHTML;

                return;
            }

            // It's inside the question content, treat next element.
            last = matches.pop();
        }
    }

    /**
     * Removes the scripts from a question's HTML and adds it in a new 'scriptsCode' property.
     * It will also search for init_question functions of the question type and add the object to an 'initObjects' property.
     *
     * @param question Question.
     * @param usageId Usage ID.
     */
    extractQuestionScripts(question: CoreQuestionQuestion, usageId?: number): void {
        question.scriptsCode = '';
        question.initObjects = undefined;
        question.amdArgs = undefined;

        // Search the scripts.
        const matches = question.html?.match(/<script[^>]*>[\s\S]*?<\/script>/mg);
        if (!matches) {
            // No scripts, stop.
            return;
        }

        matches.forEach((scriptCode) => {
            if (scriptCode.match(/<script[^>]+type="math\/tex"/m)) {
                // Don't remove math/tex scripts, they're needed to render the math expressions.
                return;
            }

            // Add the script to scriptsCode and remove it from html.
            question.scriptsCode += scriptCode;
            question.html = question.html.replace(scriptCode, '');

            // Search init_question functions for this type.
            const initMatches = scriptCode.match(new RegExp('M.qtype_' + question.type + '.init_question\\(.*?}\\);', 'mg'));
            if (initMatches) {
                let initMatch = initMatches.pop();

                if (initMatch) {
                    // Remove start and end of the match, we only want the object.
                    initMatch = initMatch.replace('M.qtype_' + question.type + '.init_question(', '');
                    initMatch = initMatch.substring(0, initMatch.length - 2);

                    // Try to convert it to an object and add it to the question.
                    question.initObjects = CoreText.parseJSON(initMatch, null);
                }
            }

            const amdRegExp = new RegExp('require\\(\\[["\']qtype_' + question.type + '/question["\']\\],[^f]*' +
                'function\\(amd\\)[^\\{]*\\{[^a]*amd\\.init\\((["\'](q|question-' + usageId + '-)' + question.slot +
                '["\'].*?)\\);', 'm');
            const amdMatch = scriptCode.match(amdRegExp);

            if (amdMatch) {
                // Try to convert the arguments to an array and add them to the question.
                question.amdArgs = CoreText.parseJSON('[' + amdMatch[1] + ']', null);
            }
        });
    }

    /**
     * Get the names of all the inputs inside an HTML code.
     * This function will return an object where the keys are the input names. The values will always be true.
     * This is in order to make this function compatible with other functions like CoreQuestionProvider.getBasicAnswers.
     *
     * @param html HTML code.
     * @returns Object where the keys are the names.
     */
    getAllInputNamesFromHtml(html: string): Record<string, boolean> {
        const element = CoreDomUtils.convertToElement('<form>' + html + '</form>');
        const form = <HTMLFormElement> element.children[0];
        const answers: Record<string, boolean> = {};

        // Search all input elements.
        Array.from(form.elements).forEach((element: HTMLInputElement) => {
            const name = element.name || '';

            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            answers[CoreQuestion.removeQuestionPrefix(name)] = true;
        });

        return answers;
    }

    /**
     * Retrieve the answers entered in a form.
     * We don't use ngModel because it doesn't detect changes done by JavaScript and some questions might do that.
     *
     * @param form Form.
     * @returns Object with the answers.
     */
    getAnswersFromForm(form: HTMLFormElement): CoreQuestionsAnswers {
        if (!form || !form.elements) {
            return {};
        }

        const answers: CoreQuestionsAnswers = {};
        const elements = Array.from(form.elements);

        elements.forEach((element: HTMLInputElement) => {
            const name = element.name || element.getAttribute('ng-reflect-name') || '';

            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Get the value.
            if (element.type == 'checkbox') {
                answers[name] = !!element.checked;
            } else if (element.type == 'radio') {
                if (element.checked) {
                    answers[name] = element.value;
                }
            } else {
                answers[name] = element.value;
            }
        });

        return answers;
    }

    /**
     * Given an HTML code with list of attachments, returns the list of attached files (filename and fileurl).
     * Please take into account that this function will treat all the anchors in the HTML, you should provide
     * an HTML containing only the attachments anchors.
     *
     * @param html HTML code to search in.
     * @returns Attachments.
     */
    getQuestionAttachmentsFromHtml(html: string): CoreWSFile[] {
        const element = CoreDomUtils.convertToElement(html);

        // Remove the filemanager (area to attach files to a question).
        CoreDomUtils.removeElement(element, 'div[id*=filemanager]');

        // Search the anchors.
        const anchors = Array.from(element.querySelectorAll('a'));
        const attachments: CoreWSFile[] = [];

        anchors.forEach((anchor) => {
            let content = anchor.innerHTML;

            // Check anchor is valid.
            if (anchor.href && content) {
                content = CoreText.cleanTags(content, { singleLine: true, trim: true });
                attachments.push({
                    filename: content,
                    fileurl: anchor.href,
                });
            }
        });

        return attachments;
    }

    /**
     * Get the sequence check from a question HTML.
     *
     * @param html Question's HTML.
     * @returns Object with the sequencecheck name and value.
     */
    getQuestionSequenceCheckFromHtml(html: string): { name: string; value: string } | undefined {
        if (!html) {
            return;
        }

        // Search the input holding the sequencecheck.
        const element = CoreDomUtils.convertToElement(html);
        const input = <HTMLInputElement> element.querySelector('input[name*=sequencecheck]');

        if (!input || input.name === undefined || input.value === undefined) {
            return;
        }

        return {
            name: input.name,
            value: input.value,
        };
    }

    /**
     * Get the CSS class for a question based on its state.
     *
     * @param name Question's state name.
     * @returns State class.
     */
    getQuestionStateClass(name: string): string {
        const state = CoreQuestion.getState(name);

        return state ? state.class : '';
    }

    /**
     * Return the files of a certain response file area.
     *
     * @param question Question.
     * @param areaName Name of the area, e.g. 'attachments'.
     * @returns List of files.
     */
    getResponseFileAreaFiles(question: CoreQuestionQuestion, areaName: string): CoreWSFile[] {
        if (!question.responsefileareas) {
            return [];
        }

        const area = question.responsefileareas.find((area) => area.area == areaName);

        return area?.files || [];
    }

    /**
     * Get files stored for a question.
     *
     * @param question Question.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    getStoredQuestionFiles(
        question: CoreQuestionQuestion,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<(FileEntry | DirectoryEntry)[]> {
        const questionComponentId = CoreQuestion.getQuestionComponentId(question, componentId);
        const folderPath = CoreQuestion.getQuestionFolder(question.type, component, questionComponentId, siteId);

        return CoreFile.getDirectoryContents(folderPath);
    }

    /**
     * Get the validation error message from a question HTML if it's there.
     *
     * @param html Question's HTML.
     * @returns Validation error message if present.
     */
    getValidationErrorFromHtml(html: string): string | undefined {
        const element = CoreDomUtils.convertToElement(html);

        return CoreDomUtils.getContentsOfElement(element, '.validationerror');
    }

    /**
     * Check if some HTML contains draft file URLs for the current site.
     *
     * @param html Question's HTML.
     * @returns Whether it contains draft files URLs.
     */
    hasDraftFileUrls(html: string): boolean {
        let url = CoreSites.getCurrentSite()?.getURL();
        if (!url) {
            return false;
        }

        if (url.slice(-1) != '/') {
            url = url += '/';
        }
        url += 'draftfile.php';

        return html.indexOf(url) != -1;
    }

    /**
     * Load local answers of a question.
     *
     * @param question Question.
     * @param component Component.
     * @param attemptId Attempt ID.
     * @returns Promise resolved when done.
     */
    async loadLocalAnswers(question: CoreQuestionQuestion, component: string, attemptId: number): Promise<void> {
        const answers = await CoreUtils.ignoreErrors(
            CoreQuestion.getQuestionAnswers(component, attemptId, question.slot),
        );

        if (answers) {
            question.localAnswers = CoreQuestion.convertAnswersArrayToObject(answers, true);
        } else {
            question.localAnswers = {};
        }
    }

    /**
     * For each input element found in the HTML, search if there's a local answer stored and
     * override the HTML's value with the local one.
     *
     * @param question Question.
     */
    loadLocalAnswersInHtml(question: CoreQuestionQuestion): void {
        const element = CoreDomUtils.convertToElement('<form>' + question.html + '</form>');
        const form = <HTMLFormElement> element.children[0];

        // Search all input elements.
        Array.from(form.elements).forEach((element: HTMLInputElement | HTMLButtonElement) => {
            let name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON' ||
                    !question.localAnswers) {
                return;
            }

            // Search if there's a local answer.
            name = CoreQuestion.removeQuestionPrefix(name);
            if (question.localAnswers[name] === undefined) {
                if (Object.keys(question.localAnswers).length && element.type == 'radio') {
                    // No answer stored, but there is a sequencecheck or similar. This means the user cleared his choice.
                    element.removeAttribute('checked');
                }

                return;
            }

            if (element.tagName == 'TEXTAREA') {
                // Just put the answer inside the textarea.
                element.innerHTML = question.localAnswers[name];
            } else if (element.tagName == 'SELECT') {
                // Search the selected option and select it.
                const selected = element.querySelector('option[value="' + question.localAnswers[name] + '"]');
                if (selected) {
                    selected.setAttribute('selected', 'selected');
                }
            } else if (element.type == 'radio') {
                // Check if this radio is selected.
                if (element.value == question.localAnswers[name]) {
                    element.setAttribute('checked', 'checked');
                } else {
                    element.removeAttribute('checked');
                }
            } else if (element.type == 'checkbox') {
                // Check if this checkbox is checked.
                if (CoreUtils.isTrueOrOne(question.localAnswers[name])) {
                    element.setAttribute('checked', 'checked');
                } else {
                    element.removeAttribute('checked');
                }
            } else {
                // Put the answer in the value.
                element.setAttribute('value', question.localAnswers[name]);
            }
        });

        // Update the question HTML.
        question.html = form.innerHTML;
    }

    /**
     * Prefetch the files in a question HTML.
     *
     * @param question Question.
     * @param component The component to link the files to. If not defined, question component.
     * @param componentId An ID to use in conjunction with the component. If not defined, question ID.
     * @param siteId Site ID. If not defined, current site.
     * @param usageId Usage ID. Required in Moodle 3.7+.
     * @returns Promise resolved when all the files have been downloaded.
     */
    async prefetchQuestionFiles(
        question: CoreQuestionQuestion,
        component?: string,
        componentId?: string | number,
        siteId?: string,
        usageId?: number,
    ): Promise<void> {
        if (!component) {
            component = CoreQuestionProvider.COMPONENT;
            componentId = question.questionnumber;
        }

        const files = CoreQuestionDelegate.getAdditionalDownloadableFiles(question, usageId) || [];

        files.push(...CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(question.html));

        const site = await CoreSites.getSite(siteId);

        const treated: Record<string, boolean> = {};

        await Promise.all(files.map(async (file) => {
            const timemodified = file.timemodified || 0;
            const fileUrl = CoreFileHelper.getFileUrl(file);

            if (treated[fileUrl]) {
                return;
            }
            treated[fileUrl] = true;

            if (!site.canDownloadFiles() && site.isSitePluginFileUrl(fileUrl)) {
                return;
            }

            if (CoreUrl.isThemeImageUrl(fileUrl) && fileUrl.indexOf('flagged') > -1) {
                // Ignore flag images.
                return;
            }

            await CoreFilepool.addToQueueByUrl(site.getId(), fileUrl, component, componentId, timemodified);
        }));
    }

    /**
     * Prepare and return the answers.
     *
     * @param questions The list of questions.
     * @param answers The input data.
     * @param offline True if data should be saved in offline.
     * @param component The component the question is related to.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with answers to send to server.
     */
    async prepareAnswers(
        questions: CoreQuestionQuestion[],
        answers: CoreQuestionsAnswers,
        offline: boolean,
        component: string,
        componentId: string | number,
        siteId?: string,
    ): Promise<CoreQuestionsAnswers> {
        await CoreUtils.allPromises(questions.map(async (question) => {
            await CoreQuestionDelegate.prepareAnswersForQuestion(
                question,
                answers,
                offline,
                component,
                componentId,
                siteId,
            );
        }));

        return answers;
    }

    /**
     * Replace Moodle's correct/incorrect classes with the Mobile ones.
     *
     * @param element DOM element.
     */
    replaceCorrectnessClasses(element: HTMLElement): void {
        CoreDomUtils.replaceClassesInElement(element, {
            correct: 'core-question-answer-correct',
            incorrect: 'core-question-answer-incorrect',
            partiallycorrect: 'core-question-answer-partiallycorrect',
        });
    }

    /**
     * Replace Moodle's feedback classes with the Mobile ones.
     *
     * @param element DOM element.
     */
    replaceFeedbackClasses(element: HTMLElement): void {
        CoreDomUtils.replaceClassesInElement(element, {
            outcome: 'core-question-feedback-container core-question-feedback-padding',
            specificfeedback: 'core-question-feedback-container core-question-feedback-inline',
        });
    }

    /**
     * Search a behaviour button in a certain question property containing HTML.
     *
     * @param question Question.
     * @param htmlProperty The name of the property containing the HTML to search.
     * @param selector The selector to find the button.
     * @returns Whether the button is found.
     */
    protected searchBehaviourButton(question: CoreQuestionQuestion, htmlProperty: string, selector: string): boolean {
        const element = CoreDomUtils.convertToElement(question[htmlProperty]);

        const button = element.querySelector<HTMLElement>(selector);
        if (!button) {
            return false;
        }

        // Add a behaviour button to the question's "behaviourButtons" property.
        this.addBehaviourButton(question, button);

        // Remove the button from the HTML.
        button.parentElement?.removeChild(button);

        // Update the question's html.
        question[htmlProperty] = element.innerHTML;

        return true;
    }

    /**
     * Convenience function to show a parsing error and abort.
     *
     * @param onAbort If supplied, will emit an event.
     * @param error Error to show.
     */
    showComponentError(onAbort: EventEmitter<void>, error?: string): void {
        // Prevent consecutive errors.
        const now = Date.now();
        if (now - this.lastErrorShown > 500) {
            this.lastErrorShown = now;
            CoreDomUtils.showErrorModalDefault(error || '', 'addon.mod_quiz.errorparsequestions', true);
        }

        onAbort?.emit();
    }

    /**
     * Treat correctness icons, replacing them with local icons and setting click events to show the feedback if needed.
     *
     * @param element DOM element.
     */
    treatCorrectnessIcons(element: HTMLElement): void {
        const icons = <HTMLElement[]> Array.from(element.querySelectorAll('img.icon, img.questioncorrectnessicon, i.icon'));
        icons.forEach((icon) => {
            let iconName: string | undefined;
            let color: string | undefined;

            if ('src' in icon) {
                if ((icon as HTMLImageElement).src.indexOf('correct') >= 0) {
                    iconName = 'check';
                    color = CoreIonicColorNames.SUCCESS;
                } else if ((icon as HTMLImageElement).src.indexOf('incorrect') >= 0 ) {
                    iconName = 'xmark';
                    color = CoreIonicColorNames.DANGER;
                }
            } else {
                if (icon.classList.contains('fa-check-square')) {
                    iconName = 'square-check';
                    color = CoreIonicColorNames.WARNING;
                } else if (icon.classList.contains('fa-check')) {
                    iconName = 'check';
                    color = CoreIonicColorNames.SUCCESS;
                } else if (icon.classList.contains('fa-xmark') || icon.classList.contains('fa-remove')) {
                    iconName = 'xmark';
                    color = CoreIonicColorNames.DANGER;
                }
            }

            if (!iconName) {
                return;
            }

            // Replace the icon with the font version.
            const newIcon: HTMLIonIconElement = document.createElement('ion-icon');

            newIcon.setAttribute('name', `fas-${iconName}`);
            newIcon.setAttribute('src', CoreIcons.getIconSrc('font-awesome', 'solid', iconName));
            newIcon.className = `core-correct-icon ion-color ion-color-${color} questioncorrectnessicon`;
            newIcon.title = icon.title;
            newIcon.setAttribute('aria-label', icon.title);
            icon.parentNode?.replaceChild(newIcon, icon);
        });

        // Treat legacy markup used before MDL-77856 (4.2).
        const spans = Array.from(element.querySelectorAll('.feedbackspan.accesshide'));
        spans.forEach((span) => {
            // Search if there's a hidden feedback for this element.
            const icon = <HTMLElement> span.previousSibling;
            if (!icon || !icon.classList.contains('icon') && !icon.classList.contains('questioncorrectnessicon')) {
                return;
            }

            icon.classList.add('questioncorrectnessicon');

            if (span.innerHTML) {
                // There's a hidden feedback. Mark the icon as tappable.
                // The click listener is only added if treatCorrectnessIconsClicks is called.
                icon.setAttribute('tappable', '');
            }
        });
    }

    /**
     * Add click listeners to all tappable correctness icons.
     *
     * @param element DOM element.
     * @param component The component to use when viewing the feedback.
     * @param componentId An ID to use in conjunction with the component.
     * @param contextLevel The context level.
     * @param contextInstanceId Instance ID related to the context.
     * @param courseId Course ID the text belongs to. It can be used to improve performance with filters.
     */
    treatCorrectnessIconsClicks(
        element: HTMLElement,
        component?: string,
        componentId?: number,
        contextLevel?: ContextLevel,
        contextInstanceId?: number,
        courseId?: number,
    ): void {
        const icons = <HTMLElement[]> Array.from(element.querySelectorAll('ion-icon.questioncorrectnessicon'));
        const title = Translate.instant('core.question.feedback');
        const getClickableFeedback = (icon: HTMLElement) => {
            const parentElement = icon.parentElement;
            const parentIsClickable = parentElement instanceof HTMLButtonElement || parentElement instanceof HTMLAnchorElement;

            if (parentElement && parentIsClickable && parentElement.dataset.toggle === 'popover') {
                return {
                    element: parentElement,
                    html: parentElement?.dataset.content,
                };
            }

            // Support legacy icons used before MDL-77856 (4.2).
            if (icon.hasAttribute('tappable')) {
                return {
                    element: icon,
                    html: parentElement?.querySelector('.feedbackspan.accesshide')?.innerHTML,
                };
            }

            return null;
        };

        icons.forEach(icon => {
            const target = getClickableFeedback(icon);

            if (!target || !target.html) {
                return;
            }

            // There's a hidden feedback, show it when the icon is clicked.
            target.element.dataset.disabledA11yClicks = 'true';
            target.element.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();

                CoreViewer.viewText(title, target.html ?? '', {
                    component: component,
                    componentId: componentId,
                    filter: true,
                    contextLevel: contextLevel,
                    instanceId: contextInstanceId,
                    courseId: courseId,
                });
            });
        });
    }

}

export const CoreQuestionHelper = makeSingleton(CoreQuestionHelperProvider);

/**
 * Question with calculated data.
 */
export type CoreQuestionQuestion = CoreQuestionQuestionParsed & {
    localAnswers?: Record<string, string>;
    commentHtml?: string;
    feedbackHtml?: string;
    infoHtml?: string;
    behaviourButtons?: CoreQuestionBehaviourButton[];
    behaviourCertaintyOptions?: CoreQuestionBehaviourCertaintyOption[];
    behaviourCertaintySelected?: string;
    behaviourSeenInput?: { name: string; value: string };
    scriptsCode?: string;
    initObjects?: Record<string, unknown> | null;
    amdArgs?: unknown[] | null;
};

/**
 * Question behaviour button.
 */
export type CoreQuestionBehaviourButton = {
    id: string;
    name: string;
    value: string;
    disabled: boolean;
};

/**
 * Question behaviour certainty option.
 */
export type CoreQuestionBehaviourCertaintyOption = CoreQuestionBehaviourButton & {
    text: string;
};
