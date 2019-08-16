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

import { Input, Output, EventEmitter, Injector, ElementRef } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreQuestionHelperProvider } from '@core/question/providers/helper';

/**
 * Base class for components to render a question.
 */
export class CoreQuestionBaseComponent {
    @Input() question: any; // The question to render.
    @Input() component: string; // The component the question belongs to.
    @Input() componentId: number; // ID of the component the question belongs to.
    @Input() attemptId: number; // Attempt ID.
    @Input() offlineEnabled?: boolean | string; // Whether the question can be answered in offline.
    @Output() buttonClicked: EventEmitter<any>; // Should emit an event when a behaviour button is clicked.
    @Output() onAbort: EventEmitter<void>; // Should emit an event if the question should be aborted.

    protected logger;
    protected questionHelper: CoreQuestionHelperProvider;
    protected domUtils: CoreDomUtilsProvider;
    protected textUtils: CoreTextUtilsProvider;
    protected realElement: HTMLElement;

    constructor(logger: CoreLoggerProvider, logName: string, protected injector: Injector) {
        this.logger = logger.getInstance(logName);

        // Use an injector to get the providers to prevent having to modify all subclasses if a new provider is needed.
        this.questionHelper = injector.get(CoreQuestionHelperProvider);
        this.domUtils = injector.get(CoreDomUtilsProvider);
        this.textUtils = injector.get(CoreTextUtilsProvider);
        this.realElement = injector.get(ElementRef).nativeElement;
    }

    /**
     * Initialize a question component of type calculated or calculated simple.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initCalculatedComponent(): void | HTMLElement {
        // Treat the input text first.
        const questionEl = this.initInputTextComponent();
        if (questionEl) {

            // Check if the question has a select for units.
            const selectModel: any = {},
                select = <HTMLSelectElement> questionEl.querySelector('select[name*=unit]'),
                options = select && Array.from(select.querySelectorAll('option'));

            if (select && options && options.length) {

                selectModel.id = select.id;
                selectModel.name = select.name;
                selectModel.disabled = select.disabled;
                selectModel.options = [];

                // Treat each option.
                for (const i in options) {
                    const optionEl = options[i];

                    if (typeof optionEl.value == 'undefined') {
                        this.logger.warn('Aborting because couldn\'t find input.', this.question.name);

                        return this.questionHelper.showComponentError(this.onAbort);
                    }

                    const option = {
                        value: optionEl.value,
                        label: optionEl.innerHTML
                    };

                    if (optionEl.selected) {
                        selectModel.selected = option.value;
                    }

                    selectModel.options.push(option);
                }

                if (!selectModel.selected) {
                    // No selected option, select the first one.
                    selectModel.selected = selectModel.options[0].value;
                }

                // Get the accessibility label.
                const accessibilityLabel = questionEl.querySelector('label[for="' + select.id + '"]');
                selectModel.accessibilityLabel = accessibilityLabel && accessibilityLabel.innerHTML;

                this.question.select = selectModel;

                // Check which one should be displayed first: the select or the input.
                const input = questionEl.querySelector('input[type="text"][name*=answer]');
                this.question.selectFirst =
                        questionEl.innerHTML.indexOf(input.outerHTML) > questionEl.innerHTML.indexOf(select.outerHTML);

                return questionEl;
            }

            // Check if the question has radio buttons for units.
            const radios = <HTMLInputElement[]> Array.from(questionEl.querySelectorAll('input[type="radio"]'));
            if (!radios.length) {
                // No select and no radio buttons. The units need to be entered in the input text.
                return questionEl;
            }

            this.question.options = [];

            for (const i in radios) {
                const radioEl = radios[i],
                    option: any = {
                        id: radioEl.id,
                        name: radioEl.name,
                        value: radioEl.value,
                        checked: radioEl.checked,
                        disabled: radioEl.disabled
                    },
                    // Get the label with the question text.
                    label = <HTMLElement> questionEl.querySelector('label[for="' + option.id + '"]');

                this.question.optionsName = option.name;

                if (label) {
                    option.text = label.innerText;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        if (radioEl.checked) {
                            // If the option is checked we use the model to select the one.
                            this.question.unit = option.value;
                        }

                        this.question.options.push(option);
                        continue;
                    }
                }

                // Something went wrong when extracting the questions data. Abort.
                this.logger.warn('Aborting because of an error parsing options.', this.question.name, option.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }

            // Check which one should be displayed first: the options or the input.
            const input = questionEl.querySelector('input[type="text"][name*=answer]');
            this.question.optionsFirst =
                    questionEl.innerHTML.indexOf(input.outerHTML) > questionEl.innerHTML.indexOf(radios[0].outerHTML);
        }
    }

    /**
     * Initialize the component and the question text.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initComponent(): void | HTMLElement {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return this.questionHelper.showComponentError(this.onAbort);
        }

        this.realElement.classList.add('core-question-container');

        const element = this.domUtils.convertToElement(this.question.html);

        // Extract question text.
        this.question.text = this.domUtils.getContentsOfElement(element, '.qtext');
        if (typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        return element;
    }

    /**
     * Initialize a question component of type essay.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initEssayComponent(): void | HTMLElement {
        const questionEl = this.initComponent();

        if (questionEl) {
            // First search the textarea.
            const textarea = <HTMLTextAreaElement> questionEl.querySelector('textarea[name*=_answer]');
            this.question.allowsAttachments = !!questionEl.querySelector('div[id*=filemanager]');
            this.question.isMonospaced = !!questionEl.querySelector('.qtype_essay_monospaced');
            this.question.isPlainText = this.question.isMonospaced || !!questionEl.querySelector('.qtype_essay_plain');
            this.question.hasDraftFiles = this.questionHelper.hasDraftFileUrls(questionEl.innerHTML);

            if (!textarea) {
                // Textarea not found, we might be in review. Search the answer and the attachments.
                this.question.answer = this.domUtils.getContentsOfElement(questionEl, '.qtype_essay_response');
                this.question.attachments = this.questionHelper.getQuestionAttachmentsFromHtml(
                        this.domUtils.getContentsOfElement(questionEl, '.attachments'));
            } else {
                // Textarea found.
                const input = <HTMLInputElement> questionEl.querySelector('input[type="hidden"][name*=answerformat]'),
                    content = textarea.innerHTML;

                this.question.textarea = {
                    id: textarea.id,
                    name: textarea.name,
                    text: content ? this.textUtils.decodeHTML(content) : ''
                };

                if (input) {
                    this.question.formatInput = {
                        name: input.name,
                        value: input.value
                    };
                }
            }
        }
    }

    /**
     * Initialize a question component that uses the original question text with some basic treatment.
     *
     * @param {string} contentSelector The selector to find the question content (text).
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initOriginalTextComponent(contentSelector: string): void | HTMLElement {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return this.questionHelper.showComponentError(this.onAbort);
        }

        const element = this.domUtils.convertToElement(this.question.html);

        // Get question content.
        const content = <HTMLElement> element.querySelector(contentSelector);
        if (!content) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        // Remove sequencecheck and validation error.
        this.domUtils.removeElement(content, 'input[name*=sequencecheck]');
        this.domUtils.removeElement(content, '.validationerror');

        // Replace Moodle's correct/incorrect and feedback classes with our own.
        this.questionHelper.replaceCorrectnessClasses(element);
        this.questionHelper.replaceFeedbackClasses(element);

        // Treat the correct/incorrect icons.
        this.questionHelper.treatCorrectnessIcons(element);

        // Set the question text.
        this.question.text = content.innerHTML;
    }

    /**
     * Initialize a question component that has an input of type "text".
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initInputTextComponent(): void | HTMLElement {
        const questionEl = this.initComponent();
        if (questionEl) {
            // Get the input element.
            const input = <HTMLInputElement> questionEl.querySelector('input[type="text"][name*=answer]');
            if (!input) {
                this.logger.warn('Aborting because couldn\'t find input.', this.question.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }

            this.question.input = {
                id: input.id,
                name: input.name,
                value: input.value,
                readOnly: input.readOnly,
                isInline: !!this.domUtils.closest(input, '.qtext') // The answer can be inside the question text.
            };

            // Check if question is marked as correct.
            if (input.classList.contains('incorrect')) {
                this.question.input.correctClass = 'core-question-incorrect';
                this.question.input.correctIcon = 'fa-remove';
                this.question.input.correctIconColor = 'danger';
            } else if (input.classList.contains('correct')) {
                this.question.input.correctClass = 'core-question-correct';
                this.question.input.correctIcon = 'fa-check';
                this.question.input.correctIconColor = 'success';
            } else if (input.classList.contains('partiallycorrect')) {
                this.question.input.correctClass = 'core-question-partiallycorrect';
                this.question.input.correctIcon = 'fa-check-square';
                this.question.input.correctIconColor = 'warning';
            } else {
                this.question.input.correctClass = '';
                this.question.input.correctIcon = '';
                this.question.input.correctIconColor = '';
            }

            if (this.question.input.isInline) {
                // Handle correct/incorrect classes and icons.
                const content = <HTMLElement> questionEl.querySelector('.qtext');

                this.questionHelper.replaceCorrectnessClasses(content);
                this.questionHelper.treatCorrectnessIcons(content);

                this.question.text = content.innerHTML;
            }
        }

        return questionEl;
    }

    /**
     * Initialize a question component with a "match" behaviour.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initMatchComponent(): void | HTMLElement {
        const questionEl = this.initComponent();

        if (questionEl) {
            // Find rows.
            const rows = Array.from(questionEl.querySelectorAll('table.answer tr'));
            if (!rows || !rows.length) {
                this.logger.warn('Aborting because couldn\'t find any row.', this.question.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }

            this.question.rows = [];

            for (const i in rows) {
                const row = rows[i],
                    rowModel: any = {},
                    columns = Array.from(row.querySelectorAll('td'));

                if (!columns || columns.length < 2) {
                    this.logger.warn('Aborting because couldn\'t the right columns.', this.question.name);

                    return this.questionHelper.showComponentError(this.onAbort);
                }

                // Get the row's text. It should be in the first column.
                rowModel.text = columns[0].innerHTML;

                // Get the select and the options.
                const select = columns[1].querySelector('select'),
                    options = Array.from(columns[1].querySelectorAll('option'));

                if (!select || !options || !options.length) {
                    this.logger.warn('Aborting because couldn\'t find select or options.', this.question.name);

                    return this.questionHelper.showComponentError(this.onAbort);
                }

                rowModel.id = select.id;
                rowModel.name = select.name;
                rowModel.disabled = select.disabled;
                rowModel.selected = false;
                rowModel.options = [];

                // Check if answer is correct.
                if (columns[1].className.indexOf('incorrect') >= 0) {
                    rowModel.isCorrect = 0;
                } else if (columns[1].className.indexOf('correct') >= 0) {
                    rowModel.isCorrect = 1;
                }

                // Treat each option.
                for (const j in options) {
                    const optionEl = options[j];

                    if (typeof optionEl.value == 'undefined') {
                        this.logger.warn('Aborting because couldn\'t find the value of an option.', this.question.name);

                        return this.questionHelper.showComponentError(this.onAbort);
                    }

                    const option = {
                        value: optionEl.value,
                        label: optionEl.innerHTML,
                        selected: optionEl.selected
                    };

                    if (option.selected) {
                        rowModel.selected = option.value;
                    }

                    rowModel.options.push(option);
                }

                // Get the accessibility label.
                const accessibilityLabel = columns[1].querySelector('label.accesshide');
                rowModel.accessibilityLabel = accessibilityLabel && accessibilityLabel.innerHTML;

                this.question.rows.push(rowModel);
            }

            this.question.loaded = true;
        }

        return questionEl;
    }

    /**
     * Initialize a question component with a multiple choice (checkbox) or single choice (radio).
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initMultichoiceComponent(): void | HTMLElement {
        const questionEl = this.initComponent();

        if (questionEl) {

            // Get the prompt.
            this.question.prompt = this.domUtils.getContentsOfElement(questionEl, '.prompt');

            // Search radio buttons first (single choice).
            let options = <HTMLInputElement[]> Array.from(questionEl.querySelectorAll('input[type="radio"]'));
            if (!options || !options.length) {
                // Radio buttons not found, it should be a multi answer. Search for checkbox.
                this.question.multi = true;
                options = <HTMLInputElement[]> Array.from(questionEl.querySelectorAll('input[type="checkbox"]'));

                if (!options || !options.length) {
                    // No checkbox found either. Abort.
                    this.logger.warn('Aborting because of no radio and checkbox found.', this.question.name);

                    return this.questionHelper.showComponentError(this.onAbort);
                }
            }

            this.question.options = [];

            this.question.disabled = true;

            for (const i in options) {
                const element = options[i],
                    option: any = {
                        id: element.id,
                        name: element.name,
                        value: element.value,
                        checked: element.checked,
                        disabled: element.disabled
                    },
                    parent = element.parentElement;

                if (option.value == '-1') {
                    // It's the clear choice option, ignore it.
                    continue;
                }

                this.question.optionsName = option.name;

                this.question.disabled = this.question.disabled && element.disabled;

                // Get the label with the question text.
                const label = questionEl.querySelector('label[for="' + option.id + '"]');
                if (label) {
                    option.text = label.innerHTML;

                    // Check that we were able to successfully extract options required data.
                    if (typeof option.name != 'undefined' && typeof option.value != 'undefined' &&
                                typeof option.text != 'undefined') {

                        if (element.checked) {
                            // If the option is checked and it's a single choice we use the model to select the one.
                            if (!this.question.multi) {
                                this.question.singleChoiceModel = option.value;
                            }

                            if (parent) {
                                // Check if answer is correct.
                                if (parent && parent.className.indexOf('incorrect') >= 0) {
                                    option.isCorrect = 0;
                                } else if (parent && parent.className.indexOf('correct') >= 0) {
                                    option.isCorrect = 1;
                                }

                                // Search the feedback.
                                const feedback = parent.querySelector('.specificfeedback');
                                if (feedback) {
                                    option.feedback = feedback.innerHTML;
                                }
                            }
                        }

                        this.question.options.push(option);
                        continue;
                    }
                }

                // Something went wrong when extracting the questions data. Abort.
                this.logger.warn('Aborting because of an error parsing options.', this.question.name, option.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }
        }

        return questionEl;
    }
}
