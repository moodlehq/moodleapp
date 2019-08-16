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

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { AddonModLessonProvider } from './lesson';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable()
export class AddonModLessonHelperProvider {

    constructor(private domUtils: CoreDomUtilsProvider, private fb: FormBuilder, private translate: TranslateService,
            private textUtils: CoreTextUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            private lessonProvider: AddonModLessonProvider) { }

    /**
     * Given the HTML of next activity link, format it to extract the href and the text.
     *
     * @param {string} activityLink HTML of the activity link.
     * @return {{formatted: boolean, label: string, href: string}} Formatted data.
     */
    formatActivityLink(activityLink: string): {formatted: boolean, label: string, href: string} {
        const element = this.domUtils.convertToElement(activityLink),
            anchor = element.querySelector('a');

        if (!anchor) {
            // Anchor not found, return the original HTML.
            return {
                formatted: false,
                label: activityLink,
                href: ''
            };
        }

        return {
            formatted: true,
            label: anchor.innerHTML,
            href: anchor.href
        };
    }

    /**
     * Given the HTML of an answer from a content page, extract the data to render the answer.
     *
     * @param  {String} html Answer's HTML.
     * @return {{buttonText: string, content: string}} Data to render the answer.
     */
    getContentPageAnswerDataFromHtml(html: string): {buttonText: string, content: string} {
        const data = {
                buttonText: '',
                content: ''
            },
            element = this.domUtils.convertToElement(html);

        // Search the input button.
        const button = <HTMLInputElement> element.querySelector('input[type="button"]');

        if (button) {
            // Extract the button content and remove it from the HTML.
            data.buttonText = button.value;
            button.remove();
        }

        data.content = element.innerHTML.trim();

        return data;
    }

    /**
     * Get the buttons to change pages.
     *
     * @param {string} html Page's HTML.
     * @return {any[]} List of buttons.
     */
    getPageButtonsFromHtml(html: string): any[] {
        const buttons = [],
            element = this.domUtils.convertToElement(html);

        // Get the container of the buttons if it exists.
        let buttonsContainer = element.querySelector('.branchbuttoncontainer');

        if (!buttonsContainer) {
            // Button container not found, might be a legacy lesson (from 1.9).
            if (!element.querySelector('form input[type="submit"]')) {
                // No buttons found.
                return buttons;
            }
            buttonsContainer = element;
        }

        const forms = Array.from(buttonsContainer.querySelectorAll('form'));
        forms.forEach((form) => {
            const buttonSelector = 'input[type="submit"], button[type="submit"]',
                buttonEl = <HTMLInputElement | HTMLButtonElement> form.querySelector(buttonSelector),
                inputs = Array.from(form.querySelectorAll('input'));

            if (!buttonEl || !inputs || !inputs.length) {
                // Button not found or no inputs, ignore it.
                return;
            }

            const button = {
                id: buttonEl.id,
                title: buttonEl.title || buttonEl.value,
                content: buttonEl.tagName == 'INPUT' ? buttonEl.value : buttonEl.innerHTML.trim(),
                data: {}
            };

            inputs.forEach((input) => {
                if (input.type != 'submit') {
                    button.data[input.name] = input.value;
                }
            });

            buttons.push(button);
        });

        return buttons;
    }

    /**
     * Given a page data (result of getPageData), get the page contents.
     *
     * @param {any} data Page data.
     * @return {string} Page contents.
     */
    getPageContentsFromPageData(data: any): string {
        // Search the page contents inside the whole page HTML. Use data.pagecontent because it's filtered.
        const element = this.domUtils.convertToElement(data.pagecontent),
            contents = element.querySelector('.contents');

        if (contents) {
            return contents.innerHTML.trim();
        }

        // Cannot find contents element.
        if (this.lessonProvider.isQuestionPage(data.page.type) ||
                data.page.qtype == AddonModLessonProvider.LESSON_PAGE_BRANCHTABLE) {
            // Return page.contents to prevent having duplicated elements (some elements like videos might not work).
            return data.page.contents;
        } else {
            // It's an end of cluster, end of branch, etc. Return the whole pagecontent to match what's displayed in web.
            return data.pagecontent;
        }
    }

    /**
     * Get a question and all the data required to render it from the page data (result of AddonModLessonProvider.getPageData).
     *
     * @param {FormGroup} questionForm The form group where to add the controls.
     * @param {any} pageData Page data (result of $mmaModLesson#getPageData).
     * @return {any} Question data.
     */
    getQuestionFromPageData(questionForm: FormGroup, pageData: any): any {
        const question: any = {},
            element = this.domUtils.convertToElement(pageData.pagecontent);

        // Get the container of the question answers if it exists.
        const fieldContainer = element.querySelector('.fcontainer');

        // Get hidden inputs and add their data to the form group.
        const hiddenInputs = <HTMLInputElement[]> Array.from(element.querySelectorAll('input[type="hidden"]'));
        hiddenInputs.forEach((input) => {
            questionForm.addControl(input.name, this.fb.control(input.value));
        });

        // Get the submit button and extract its value.
        const submitButton = <HTMLInputElement> element.querySelector('input[type="submit"]');
        question.submitLabel = submitButton ? submitButton.value : this.translate.instant('addon.mod_lesson.submit');

        if (!fieldContainer) {
            // Element not found, return.
            return question;
        }

        let type;

        switch (pageData.page.qtype) {
            case AddonModLessonProvider.LESSON_PAGE_TRUEFALSE:
            case AddonModLessonProvider.LESSON_PAGE_MULTICHOICE:
                question.template = 'multichoice';
                question.options = [];

                // Get all the inputs. Search radio first.
                let inputs = <HTMLInputElement[]> Array.from(fieldContainer.querySelectorAll('input[type="radio"]'));
                if (!inputs || !inputs.length) {
                    // Radio buttons not found, it might be a multi answer. Search for checkbox.
                    question.multi = true;
                    inputs = <HTMLInputElement[]> Array.from(fieldContainer.querySelectorAll('input[type="checkbox"]'));

                    if (!inputs || !inputs.length) {
                        // No checkbox found either. Stop.
                        return question;
                    }
                }

                let controlAdded = false;
                inputs.forEach((input) => {
                    const option: any = {
                            id: input.id,
                            name: input.name,
                            value: input.value,
                            checked: !!input.checked,
                            disabled: !!input.disabled
                        },
                        parent = input.parentElement;

                    if (option.checked || question.multi) {
                        // Add the control.
                        const value = question.multi ? {value: option.checked, disabled: option.disabled} : option.value;
                        questionForm.addControl(option.name, this.fb.control(value));
                        controlAdded = true;
                    }

                    // Remove the input and use the rest of the parent contents as the label.
                    input.remove();
                    option.text = parent.innerHTML.trim();

                    question.options.push(option);
                });

                if (!question.multi) {
                    question.controlName = inputs[0].name; // All option have the same name in single choice.

                    if (!controlAdded) {
                        // No checked option for single choice, add the control with an empty value.
                        questionForm.addControl(question.controlName, this.fb.control(''));
                    }
                }

                break;

            case AddonModLessonProvider.LESSON_PAGE_NUMERICAL:
                type = 'number';
            case AddonModLessonProvider.LESSON_PAGE_SHORTANSWER:
                question.template = 'shortanswer';

                // Get the input.
                const input = <HTMLInputElement> fieldContainer.querySelector('input[type="text"], input[type="number"]');
                if (!input) {
                    return question;
                }

                question.input = {
                    id: input.id,
                    name: input.name,
                    maxlength: input.maxLength,
                    type: type || 'text'
                };

                // Init the control.
                questionForm.addControl(input.name, this.fb.control({value: input.value, disabled: input.readOnly}));
                break;

            case AddonModLessonProvider.LESSON_PAGE_ESSAY:
                question.template = 'essay';

                // Get the textarea.
                const textarea = fieldContainer.querySelector('textarea');

                if (!textarea) {
                    // Textarea not found, probably review mode.
                    const answerEl = fieldContainer.querySelector('.reviewessay');
                    if (!answerEl) {
                        // Answer not found, stop.
                        return question;
                    }
                    question.useranswer = answerEl.innerHTML;

                } else {
                    question.textarea = {
                        id: textarea.id,
                        name: textarea.name || 'answer[text]'
                    };

                    // Init the control.
                    question.control = this.fb.control('');
                    questionForm.addControl(question.textarea.name, question.control);
                }

                break;

            case AddonModLessonProvider.LESSON_PAGE_MATCHING:
                question.template = 'matching';

                const rows = Array.from(fieldContainer.querySelectorAll('.answeroption'));
                question.rows = [];

                rows.forEach((row) => {
                    const label = row.querySelector('label'),
                        select = row.querySelector('select'),
                        options = Array.from(row.querySelectorAll('option')),
                        rowData: any = {};

                    if (!label || !select || !options || !options.length) {
                        return;
                    }

                    // Get the row's text (label).
                    rowData.text = label.innerHTML.trim();
                    rowData.id = select.id;
                    rowData.name = select.name;
                    rowData.options = [];

                    // Treat each option.
                    let controlAdded = false;
                    options.forEach((option) => {
                        if (typeof option.value == 'undefined') {
                            // Option not valid, ignore it.
                            return;
                        }

                        const opt = {
                            value: option.value,
                            label: option.innerHTML.trim(),
                            selected: option.selected
                        };

                        if (opt.selected) {
                            controlAdded = true;
                            questionForm.addControl(rowData.name, this.fb.control({value: opt.value, disabled: !!select.disabled}));
                        }

                        rowData.options.push(opt);
                    });

                    if (!controlAdded) {
                        // No selected option, add the control with an empty value.
                        questionForm.addControl(rowData.name, this.fb.control({value: '', disabled: !!select.disabled}));
                    }

                    question.rows.push(rowData);
                });
                break;
            default:
                // Nothing to do.
        }

        return question;
    }

    /**
     * Given the HTML of an answer from a question page, extract the data to render the answer.
     *
     * @param {string} html Answer's HTML.
     * @return {any} Object with the data to render the answer. If the answer doesn't require any parsing, return a string with
     *               the HTML.
     */
    getQuestionPageAnswerDataFromHtml(html: string): any {
        const data: any = {},
            element = this.domUtils.convertToElement(html);

        // Check if it has a checkbox.
        let input = <HTMLInputElement> element.querySelector('input[type="checkbox"][name*="answer"]');

        if (input) {
            // Truefalse or multichoice.
            data.isCheckbox = true;
            data.checked = !!input.checked;
            data.name = input.name;
            data.highlight = !!element.querySelector('.highlight');

            input.remove();
            data.content = element.innerHTML.trim();

            return data;
        }

        // Check if it has an input text or number.
        input = <HTMLInputElement> element.querySelector('input[type="number"],input[type="text"]');
        if (input) {
            // Short answer or numeric.
            data.isText = true;
            data.value = input.value;

            return data;
        }

        // Check if it has a select.
        const select = <HTMLSelectElement> element.querySelector('select');
        if (select && select.options) {
            // Matching.
            const selectedOption = select.options[select.selectedIndex];
            data.isSelect = true;
            data.id = select.id;
            if (selectedOption) {
                data.value = selectedOption.value;
            } else {
                data.value = '';
            }

            select.remove();
            data.content = element.innerHTML.trim();

            return data;
        }

        // The answer doesn't need any parsing, return the HTML as it is.
        return html;
    }

    /**
     * Get a label to identify a retake (lesson attempt).
     *
     * @param {any} retake Retake object.
     * @param {boolean} [includeDuration] Whether to include the duration of the retake.
     * @return {string} Retake label.
     */
    getRetakeLabel(retake: any, includeDuration?: boolean): string {
        const data = {
                retake: retake.try + 1,
                grade: '',
                timestart: '',
                duration: ''
            },
            hasGrade = retake.grade != null;

        if (hasGrade || retake.end) {
            // Retake finished with or without grade (if the lesson only has content pages, it has no grade).
            if (hasGrade) {
                data.grade = this.translate.instant('core.percentagenumber', {$a: retake.grade});
            }
            data.timestart = this.timeUtils.userDate(retake.timestart * 1000);
            if (includeDuration) {
                data.duration = this.timeUtils.formatTime(retake.timeend - retake.timestart);
            }
        } else {
            // The user has not completed the retake.
            data.grade = this.translate.instant('addon.mod_lesson.notcompleted');
            if (retake.timestart) {
                data.timestart = this.timeUtils.userDate(retake.timestart * 1000);
            }
        }

        return this.translate.instant('addon.mod_lesson.retakelabel' + (includeDuration ? 'full' : 'short'), data);
    }

    /**
     * Prepare the question data to be sent to server.
     *
     * @param {any} question Question to prepare.
     * @param {any} data Data to prepare.
     * @return {any} Data to send.
     */
    prepareQuestionData(question: any, data: any): any {
        if (question.template == 'essay' && question.textarea) {
            // Add some HTML to the answer if needed.
            data[question.textarea.name] = this.textUtils.formatHtmlLines(data[question.textarea.name]);
        } else if (question.template == 'multichoice' && question.multi) {
            // Only send the options with value set to true.
            for (const name in data) {
                if (name.match(/answer\[\d+\]/) && data[name] == false) {
                    delete data[name];
                }
            }
        }

        return data;
    }

    /**
     * Given the feedback of a process page in HTML, remove the question text.
     *
     * @param {string} html Feedback's HTML.
     * @return {string} Feedback without the question text.
     */
    removeQuestionFromFeedback(html: string): string {
        const element = this.domUtils.convertToElement(html);

        // Remove the question text.
        this.domUtils.removeElement(element, '.generalbox:not(.feedback):not(.correctanswer)');

        return element.innerHTML.trim();
    }
}
