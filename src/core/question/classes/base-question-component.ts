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

import { Input, EventEmitter } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
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
    @Input() buttonClicked: EventEmitter<any>; // Should emit an event when a behaviour button is clicked.
    @Input() onAbort: EventEmitter<void>; // Should emit an event if the question should be aborted.

    protected logger;

    constructor(logger: CoreLoggerProvider, logName: string, protected questionHelper: CoreQuestionHelperProvider,
            protected domUtils: CoreDomUtilsProvider) {
        this.logger = logger.getInstance(logName);
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

        const div = document.createElement('div');
        div.innerHTML = this.question.html;

        // Extract question text.
        this.question.text = this.domUtils.getContentsOfElement(div, '.qtext');
        if (typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        return div;
    }

    /**
     * Initialize a question component that has an input of type "text".
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initInputTextComponent(): void | HTMLElement {
        const questionDiv = this.initComponent();
        if (questionDiv) {
            // Get the input element.
            const input = <HTMLInputElement> questionDiv.querySelector('input[type="text"][name*=answer]');
            if (!input) {
                this.logger.warn('Aborting because couldn\'t find input.', this.question.name);

                return this.questionHelper.showComponentError(this.onAbort);
            }

            this.question.input = {
                id: input.id,
                name: input.name,
                value: input.value,
                readOnly: input.readOnly
            };

            // Check if question is marked as correct.
            if (input.className.indexOf('incorrect') >= 0) {
                this.question.input.isCorrect = 0;
            } else if (input.className.indexOf('correct') >= 0) {
                this.question.input.isCorrect = 1;
            }
        }

        return questionDiv;
    }

    /**
     * Initialize a question component with a "match" behaviour.
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initMatchComponent(): void | HTMLElement {
        const questionDiv = this.initComponent();

        if (questionDiv) {
            // Find rows.
            const rows = Array.from(questionDiv.querySelectorAll('tr'));
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
                        rowModel.selected = option;
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

        return questionDiv;
    }

    /**
     * Initialize a question component with a multiple choice (checkbox) or single choice (radio).
     *
     * @return {void|HTMLElement} Element containing the question HTML, void if the data is not valid.
     */
    initMultichoiceComponent(): void | HTMLElement {
        const questionDiv = this.initComponent();

        if (questionDiv) {
            // Create the model for radio buttons.
            this.question.singleChoiceModel = {};

            // Get the prompt.
            this.question.prompt = this.domUtils.getContentsOfElement(questionDiv, '.prompt');

            // Search radio buttons first (single choice).
            let options = <HTMLInputElement[]> Array.from(questionDiv.querySelectorAll('input[type="radio"]'));
            if (!options || !options.length) {
                // Radio buttons not found, it should be a multi answer. Search for checkbox.
                this.question.multi = true;
                options = <HTMLInputElement[]> Array.from(questionDiv.querySelectorAll('input[type="checkbox"]'));

                if (!options || !options.length) {
                    // No checkbox found either. Abort.
                    this.logger.warn('Aborting because of no radio and checkbox found.', this.question.name);

                    return this.questionHelper.showComponentError(this.onAbort);
                }
            }

            this.question.options = [];

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

                this.question.optionsName = option.name;

                // Get the label with the question text.
                const label = questionDiv.querySelector('label[for="' + option.id + '"]');
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

        return questionDiv;
    }
}
