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

import { Injectable, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionProvider } from './question';
import { CoreQuestionDelegate } from './delegate';

/**
 * Service with some common functions to handle questions.
 */
@Injectable()
export class CoreQuestionHelperProvider {
    protected lastErrorShown = 0;

    constructor(private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider,
        private questionProvider: CoreQuestionProvider, private sitesProvider: CoreSitesProvider,
        private translate: TranslateService, private urlUtils: CoreUrlUtilsProvider, private utils: CoreUtilsProvider,
        private filepoolProvider: CoreFilepoolProvider, private questionDelegate: CoreQuestionDelegate) { }

    /**
     * Add a behaviour button to the question's "behaviourButtons" property.
     *
     * @param {any} question Question.
     * @param {HTMLInputElement} button Behaviour button (DOM element).
     */
    protected addBehaviourButton(question: any, button: HTMLInputElement): void {
        if (!button || !question) {
            return;
        }

        if (!question.behaviourButtons) {
            question.behaviourButtons = [];
        }

        // Extract the data we want.
        question.behaviourButtons.push({
            id: button.id,
            name: button.name,
            value: button.value,
            disabled: button.disabled
        });
    }

    /**
     * Extract question behaviour submit buttons from the question's HTML and add them to "behaviourButtons" property.
     * The buttons aren't deleted from the content because all the im-controls block will be removed afterwards.
     *
     * @param {any} question Question to treat.
     * @param {string} [selector] Selector to search the buttons. By default, '.im-controls input[type="submit"]'.
     */
    extractQbehaviourButtons(question: any, selector?: string): void {
        if (this.questionDelegate.getPreventSubmitMessage(question)) {
            // The question is not fully supported, don't extract the buttons.
            return;
        }

        selector = selector || '.im-controls input[type="submit"]';

        const element = this.domUtils.convertToElement(question.html);

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
     * @param {any} question Question to treat.
     * @return {boolean} Wether the certainty is found.
     */
    extractQbehaviourCBM(question: any): boolean {
        const element = this.domUtils.convertToElement(question.html);

        const labels = Array.from(element.querySelectorAll('.im-controls .certaintychoices label[for*="certainty"]'));
        question.behaviourCertaintyOptions = [];

        labels.forEach((label) => {
            // Search the radio button inside this certainty and add its data to the options array.
            const input = <HTMLInputElement> label.querySelector('input[type="radio"]');
            if (input) {
                question.behaviourCertaintyOptions.push({
                    id: input.id,
                    name: input.name,
                    value: input.value,
                    text: this.textUtils.cleanTags(label.innerHTML),
                    disabled: input.disabled
                });

                if (input.checked) {
                    question.behaviourCertaintySelected = input.value;
                }
            }
        });

        // If we have a certainty value stored in local we'll use that one.
        if (question.localAnswers && typeof question.localAnswers['-certainty'] != 'undefined') {
            question.behaviourCertaintySelected = question.localAnswers['-certainty'];
        }

        return labels.length > 0;
    }

    /**
     * Check if the question has a redo button and, if so, add it to "behaviourButtons" property
     * and remove it from the HTML.
     *
     * @param {any} question Question to treat.
     */
    extractQbehaviourRedoButton(question: any): void {
        // Create a fake div element so we can search using querySelector.
        const redoSelector = 'input[type="submit"][name*=redoslot], input[type="submit"][name*=tryagain]';

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
     * @param {any} question Question to treat.
     * @return {boolean} Whether the seen input is found.
     */
    extractQbehaviourSeenInput(question: any): boolean {
        const element = this.domUtils.convertToElement(question.html);

        // Search the "seen" input.
        const seenInput = <HTMLInputElement> element.querySelector('input[type="hidden"][name*=seen]');
        if (seenInput) {
            // Get the data and remove the input.
            question.behaviourSeenInput = {
                name: seenInput.name,
                value: seenInput.value
            };
            seenInput.parentElement.removeChild(seenInput);
            question.html = element.innerHTML;

            return true;
        }

        return false;
    }

    /**
     * Removes the comment from the question HTML code and adds it in a new "commentHtml" property.
     *
     * @param {any} question Question.
     */
    extractQuestionComment(question: any): void {
        this.extractQuestionLastElementNotInContent(question, '.comment', 'commentHtml');
    }

    /**
     * Removes the feedback from the question HTML code and adds it in a new "feedbackHtml" property.
     *
     * @param {any} question Question.
     */
    extractQuestionFeedback(question: any): void {
        this.extractQuestionLastElementNotInContent(question, '.outcome', 'feedbackHtml');
    }

    /**
     * Extracts the info box from a question and add it to an "infoHtml" property.
     *
     * @param {any} question Question.
     * @param {string} selector Selector to search the element.
     */
    extractQuestionInfoBox(question: any, selector: string): void {
        this.extractQuestionLastElementNotInContent(question, selector, 'infoHtml');
    }

    /**
     * Searches the last occurrence of a certain element and check it's not in the question contents.
     * If found, removes it from the question HTML and adds it to a new property inside question.
     *
     * @param {any} question Question.
     * @param {string} selector Selector to search the element.
     * @param {string} attrName Name of the attribute to store the HTML in.
     */
    protected extractQuestionLastElementNotInContent(question: any, selector: string, attrName: string): void {
        const element = this.domUtils.convertToElement(question.html);

        const matches = <HTMLElement[]> Array.from(element.querySelectorAll(selector));

        // Get the last element and check it's not in the question contents.
        let last = matches.pop();
        while (last) {
            if (!this.domUtils.closest(last, '.formulation')) {
                // Not in question contents. Add it to a separate attribute and remove it from the HTML.
                question[attrName] = last.innerHTML;
                last.parentElement.removeChild(last);
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
     * @param {any} question Question.
     * @param {number} usageId Usage ID.
     */
    extractQuestionScripts(question: any, usageId: number): void {
        question.scriptsCode = '';
        question.initObjects = null;
        question.amdArgs = null;

        if (question.html) {
            // Search the scripts.
            const matches = question.html.match(/<script[^>]*>[\s\S]*?<\/script>/mg);
            if (!matches) {
                // No scripts, stop.
                return;
            }

            matches.forEach((match: string) => {
                // Add the script to scriptsCode and remove it from html.
                question.scriptsCode += match;
                question.html = question.html.replace(match, '');

                // Search init_question functions for this type.
                const initMatches = match.match(new RegExp('M\.qtype_' + question.type + '\.init_question\\(.*?}\\);', 'mg'));
                if (initMatches) {
                    let initMatch = initMatches.pop();

                    // Remove start and end of the match, we only want the object.
                    initMatch = initMatch.replace('M.qtype_' + question.type + '.init_question(', '');
                    initMatch = initMatch.substr(0, initMatch.length - 2);

                    // Try to convert it to an object and add it to the question.
                    question.initObjects = this.textUtils.parseJSON(initMatch, null);
                }

                const amdRegExp = new RegExp('require\\(\\["qtype_' + question.type + '/question"\\], ' +
                    'function\\(amd\\) \\{ amd\.init\\(("(q|question-' + usageId + '-)' + question.slot +
                    '".*?)\\); \\}\\);;', 'm');
                const amdMatch = match.match(amdRegExp);
                if (amdMatch) {
                    // Try to convert the arguments to an array and add them to the question.
                    question.amdArgs = this.textUtils.parseJSON('[' + amdMatch[1] + ']', null);
                }
            });
        }
    }

    /**
     * Get the names of all the inputs inside an HTML code.
     * This function will return an object where the keys are the input names. The values will always be true.
     * This is in order to make this function compatible with other functions like CoreQuestionProvider.getBasicAnswers.
     *
     * @param {string} html HTML code.
     * @return {any} Object where the keys are the names.
     */
    getAllInputNamesFromHtml(html: string): any {
        const element = this.domUtils.convertToElement('<form>' + html + '</form>'),
            form = <HTMLFormElement> element.children[0],
            answers = {};

        // Search all input elements.
        Array.from(form.elements).forEach((element: HTMLInputElement) => {
            const name = element.name || '';

            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            answers[this.questionProvider.removeQuestionPrefix(name)] = true;
        });

        return answers;
    }

    /**
     * Retrieve the answers entered in a form.
     * We don't use ngModel because it doesn't detect changes done by JavaScript and some questions might do that.
     *
     * @param {HTMLFormElement} form Form.
     * @return {any} Object with the answers.
     */
    getAnswersFromForm(form: HTMLFormElement): any {
        if (!form || !form.elements) {
            return {};
        }

        const answers = {},
            elements = Array.from(form.elements);

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
     * @param  {String} html HTML code to search in.
     * @return {Object[]}    Attachments.
     */
    getQuestionAttachmentsFromHtml(html: string): any[] {
        const element = this.domUtils.convertToElement(html);

        // Remove the filemanager (area to attach files to a question).
        this.domUtils.removeElement(element, 'div[id*=filemanager]');

        // Search the anchors.
        const anchors = Array.from(element.querySelectorAll('a')),
            attachments = [];

        anchors.forEach((anchor) => {
            let content = anchor.innerHTML;

            // Check anchor is valid.
            if (anchor.href && content) {
                content = this.textUtils.cleanTags(content, true).trim();
                attachments.push({
                    filename: content,
                    fileurl: anchor.href
                });
            }
        });

        return attachments;
    }

    /**
     * Get the sequence check from a question HTML.
     *
     * @param {string} html Question's HTML.
     * @return {{name: string, value: string}} Object with the sequencecheck name and value.
     */
    getQuestionSequenceCheckFromHtml(html: string): {name: string, value: string} {
        if (html) {
            const element = this.domUtils.convertToElement(html);

            // Search the input holding the sequencecheck.
            const input = <HTMLInputElement> element.querySelector('input[name*=sequencecheck]');
            if (input && typeof input.name != 'undefined' && typeof input.value != 'undefined') {
                return {
                    name: input.name,
                    value: input.value
                };
            }
        }
    }

    /**
     * Get the CSS class for a question based on its state.
     *
     * @param {string} name Question's state name.
     * @return {string} State class.
     */
    getQuestionStateClass(name: string): string {
        const state = this.questionProvider.getState(name);

        return state ? state.class : '';
    }

    /**
     * Get the validation error message from a question HTML if it's there.
     *
     * @param {string} html Question's HTML.
     * @return {string} Validation error message if present.
     */
    getValidationErrorFromHtml(html: string): string {
        const element = this.domUtils.convertToElement(html);

        return this.domUtils.getContentsOfElement(element, '.validationerror');
    }

    /**
     * Check if some HTML contains draft file URLs for the current site.
     *
     * @param {string} html Question's HTML.
     * @return {boolean} Whether it contains draft files URLs.
     */
    hasDraftFileUrls(html: string): boolean {
        let url = this.sitesProvider.getCurrentSite().getURL();
        if (url.slice(-1) != '/') {
            url = url += '/';
        }
        url += 'draftfile.php';

        return html.indexOf(url) != -1;
    }

    /**
     * For each input element found in the HTML, search if there's a local answer stored and
     * override the HTML's value with the local one.
     *
     * @param {any} question Question.
     */
    loadLocalAnswersInHtml(question: any): void {
        const element = this.domUtils.convertToElement('<form>' + question.html + '</form>'),
            form = <HTMLFormElement> element.children[0];

        // Search all input elements.
        Array.from(form.elements).forEach((element: HTMLInputElement | HTMLButtonElement) => {
            let name = element.name || '';
            // Ignore flag and submit inputs.
            if (!name || name.match(/_:flagged$/) || element.type == 'submit' || element.tagName == 'BUTTON') {
                return;
            }

            // Search if there's a local answer.
            name = this.questionProvider.removeQuestionPrefix(name);
            if (question.localAnswers && typeof question.localAnswers[name] != 'undefined') {

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
                    if (this.utils.isTrueOrOne(question.localAnswers[name])) {
                        element.setAttribute('checked', 'checked');
                    } else {
                        element.removeAttribute('checked');
                    }
                } else {
                    // Put the answer in the value.
                    element.setAttribute('value', question.localAnswers[name]);
                }
            }
        });

        // Update the question HTML.
        question.html = form.innerHTML;
    }

    /**
     * Prefetch the files in a question HTML.
     *
     * @param {any} question Question.
     * @param {string} [component] The component to link the files to. If not defined, question component.
     * @param {string|number} [componentId] An ID to use in conjunction with the component. If not defined, question ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [usageId] Usage ID. Required in Moodle 3.7+.
     * @return {Promise<any>} Promise resolved when all the files have been downloaded.
     */
    prefetchQuestionFiles(question: any, component?: string, componentId?: string | number, siteId?: string, usageId?: number)
            : Promise<any> {
        const urls = this.domUtils.extractDownloadableFilesFromHtml(question.html);

        if (!component) {
            component = CoreQuestionProvider.COMPONENT;
            componentId = question.id;
        }

        urls.push(...this.questionDelegate.getAdditionalDownloadableFiles(question, usageId));

        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];

            urls.forEach((url) => {
                if (!site.canDownloadFiles() && this.urlUtils.isPluginFileUrl(url)) {
                    return;
                }

                if (url.indexOf('theme/image.php') > -1 && url.indexOf('flagged') > -1) {
                    // Ignore flag images.
                    return;
                }

                promises.push(this.filepoolProvider.addToQueueByUrl(siteId, url, component, componentId));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Prepare and return the answers.
     *
     * @param {any[]} questions The list of questions.
     * @param {any} answers The input data.
     * @param {boolean} offline True if data should be saved in offline.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with answers to send to server.
     */
    prepareAnswers(questions: any[], answers: any, offline?: boolean, siteId?: string): Promise<any> {
        const promises = [];

        questions = questions || [];
        questions.forEach((question) => {
            promises.push(this.questionDelegate.prepareAnswersForQuestion(question, answers, offline, siteId));
        });

        return this.utils.allPromises(promises).then(() => {
            return answers;
        });
    }

    /**
     * Replace Moodle's correct/incorrect classes with the Mobile ones.
     *
     * @param {HTMLElement} element DOM element.
     */
    replaceCorrectnessClasses(element: HTMLElement): void {
        this.domUtils.replaceClassesInElement(element, {
            correct: 'core-question-answer-correct',
            incorrect: 'core-question-answer-incorrect'
        });
    }

    /**
     * Replace Moodle's feedback classes with the Mobile ones.
     *
     * @param {HTMLElement} element DOM element.
     */
    replaceFeedbackClasses(element: HTMLElement): void {
        this.domUtils.replaceClassesInElement(element, {
            outcome: 'core-question-feedback-container core-question-feedback-padding',
            specificfeedback: 'core-question-feedback-container core-question-feedback-inline'
        });
    }

    /**
     * Search a behaviour button in a certain question property containing HTML.
     *
     * @param {any} question Question.
     * @param {string} htmlProperty The name of the property containing the HTML to search.
     * @param {string} selector The selector to find the button.
     * @return {boolean} Whether the button is found.
     */
    protected searchBehaviourButton(question: any, htmlProperty: string, selector: string): boolean {
        const element = this.domUtils.convertToElement(question[htmlProperty]);

        const button = <HTMLInputElement> element.querySelector(selector);
        if (button) {
            // Add a behaviour button to the question's "behaviourButtons" property.
            this.addBehaviourButton(question, button);

            // Remove the button from the HTML.
            button.parentElement.removeChild(button);

            // Update the question's html.
            question[htmlProperty] = element.innerHTML;

            return true;
        }

        return false;
    }

    /**
     * Convenience function to show a parsing error and abort.
     *
     * @param {EventEmitter<void>} [onAbort] If supplied, will emit an event.
     * @param {string} [error] Error to show.
     */
    showComponentError(onAbort: EventEmitter<void>, error?: string): void {
        // Prevent consecutive errors.
        const now = Date.now();
        if (now - this.lastErrorShown > 500) {
            this.lastErrorShown = now;
            this.domUtils.showErrorModalDefault(error, 'addon.mod_quiz.errorparsequestions', true);
        }

        onAbort && onAbort.emit();
    }

    /**
     * Treat correctness icons, replacing them with local icons and setting click events to show the feedback if needed.
     *
     * @param {HTMLElement} element DOM element.
     */
    treatCorrectnessIcons(element: HTMLElement): void {

        const icons = <HTMLImageElement[]> Array.from(element.querySelectorAll('img.icon, img.questioncorrectnessicon'));
        icons.forEach((icon) => {
            // Replace the icon with the font version.
            if (icon.src) {
                const newIcon: any = document.createElement('i');

                if (icon.src.indexOf('incorrect') > -1) {
                    newIcon.className = 'icon fa fa-remove text-danger fa-fw questioncorrectnessicon';
                } else if (icon.src.indexOf('correct') > -1) {
                    newIcon.className = 'icon fa fa-check text-success fa-fw questioncorrectnessicon';
                } else {
                    return;
                }

                newIcon.title = icon.title;
                newIcon.ariaLabel = icon.title;
                icon.parentNode.replaceChild(newIcon, icon);
            }
        });

        const spans = Array.from(element.querySelectorAll('.feedbackspan.accesshide'));
        spans.forEach((span) => {
            // Search if there's a hidden feedback for this element.
            const icon = <HTMLElement> span.previousSibling;
            if (!icon) {
                return;
            }

            if (!icon.classList.contains('icon') && !icon.classList.contains('questioncorrectnessicon')) {
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
     * @param {HTMLElement} element DOM element.
     * @param {string} [component] The component to use when viewing the feedback.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     */
    treatCorrectnessIconsClicks(element: HTMLElement, component?: string, componentId?: number): void {
        const icons = <HTMLElement[]> Array.from(element.querySelectorAll('i.icon.questioncorrectnessicon[tappable]')),
            title = this.translate.instant('core.question.feedback');

        icons.forEach((icon) => {
            // Search the feedback for the icon.
            const span = <HTMLElement> icon.parentElement.querySelector('.feedbackspan.accesshide');

            if (span) {
                // There's a hidden feedback, show it when the icon is clicked.
                icon.addEventListener('click', (event) => {
                    this.textUtils.expandText(title, span.innerHTML, component, componentId);
                });
            }
        });
    }
}
