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

import { Input, Output, EventEmitter, Component, ElementRef, OnInit, inject } from '@angular/core';
import { CoreFileHelper } from '@services/file-helper';

import { CoreSites } from '@services/sites';
import { CoreDom } from '@singletons/dom';
import { CoreText } from '@singletons/text';
import { CoreUrl } from '@singletons/url';
import { CoreWSFile } from '@services/ws';
import { CoreIonicColorNames } from '@singletons/colors';
import { CoreLogger } from '@singletons/logger';
import { CoreQuestionBehaviourButton, CoreQuestionHelper, CoreQuestionQuestion } from '../services/question-helper';
import { ContextLevel } from '@/core/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CorePromisedValue } from '@classes/promised-value';
import { AsyncDirective } from '@classes/async-directive';

/**
 * Base class for components to render a question.
 */
@Component({
    template: '',
})
export class CoreQuestionBaseComponent<T extends AddonModQuizQuestion = AddonModQuizQuestion> implements OnInit, AsyncDirective {

    @Input() question?: T; // The question to render.
    @Input() component?: string; // The component the question belongs to.
    @Input() componentId?: number; // ID of the component the question belongs to.
    @Input() attemptId?: number; // Attempt ID.
    @Input({ transform: toBoolean }) offlineEnabled = false; // Whether the question can be answered in offline.
    @Input() contextLevel?: ContextLevel; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // The course the question belongs to (if any).
    @Input({ transform: toBoolean }) review = false; // Whether the user is in review mode.
    @Input() preferredBehaviour?: string; // Preferred behaviour.
    @Output() buttonClicked = new EventEmitter<CoreQuestionBehaviourButton>(); // Will emit when a behaviour button is clicked.
    @Output() onAbort = new EventEmitter<void>(); // Should emit an event if the question should be aborted.

    correctIcon = '';
    incorrectIcon = '';
    partialCorrectIcon = '';

    protected logger: CoreLogger;
    protected hostElement: HTMLElement= inject(ElementRef).nativeElement;
    protected onReadyPromise = new CorePromisedValue<void>();

    constructor() {
        this.logger = CoreLogger.getInstance(this.constructor.name);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.correctIcon = CoreQuestionHelper.getCorrectIcon().fullName;
        this.incorrectIcon = CoreQuestionHelper.getIncorrectIcon().fullName;
        this.partialCorrectIcon = CoreQuestionHelper.getPartiallyCorrectIcon().fullName;

        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        this.init();
    }

    /**
     * Initialize the question component, override it if needed.
     */
    init(): void {
        this.initComponent();
        this.onReadyPromise.resolve();
    }

    /**
     * Initialize the component and the question text.
     *
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initComponent(): void | HTMLElement {
        if (!this.question) {
            return;
        }

        this.hostElement.classList.add('core-question-container');

        const questionElement = convertTextToHTMLElement(this.question.html);

        // Extract question text.
        this.question.text = CoreDom.getContentsOfElement(questionElement, '.qtext');
        if (this.question.text === undefined) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        return questionElement;
    }

    /**
     * Initialize a question component of type calculated or calculated simple.
     *
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initCalculatedComponent(): void | HTMLElement {
        // Treat the input text first.
        const questionEl = this.initInputTextComponent();
        if (!questionEl) {
            return;
        }

        // Check if the question has a select for units.
        if (this.treatCalculatedSelectUnits(questionEl)) {
            return questionEl;
        }

        // Check if the question has radio buttons for units.
        if (this.treatCalculatedRadioUnits(questionEl)) {
            return questionEl;
        }

        return questionEl;
    }

    /**
     * Treat a calculated question units in case they use radio buttons.
     *
     * @param questionEl Question HTML element.
     * @returns True if question has units using radio buttons.
     */
    protected treatCalculatedRadioUnits(questionEl: HTMLElement): boolean {
        // Check if the question has radio buttons for units.
        const radios = Array.from(questionEl.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        if (!radios.length || !this.question) {
            return false;
        }

        const question: AddonModQuizNumericalQuestion = this.question;
        question.options = [];

        for (const i in radios) {
            const radioEl = radios[i];
            const option: AddonModQuizQuestionRadioOption = {
                id: radioEl.id,
                class: '',
                name: radioEl.name,
                value: radioEl.value,
                checked: radioEl.checked,
                disabled: radioEl.disabled,
            };
            // Get the label with the question text.
            const label = questionEl.querySelector<HTMLLabelElement>(`label[for="${option.id}"]`);

            question.optionsName = option.name;

            if (!label || option.name === undefined || option.value === undefined) {
                // Something went wrong when extracting the questions data. Abort.
                this.logger.warn('Aborting because of an error parsing options.', question.slot, option.name);
                CoreQuestionHelper.showComponentError(this.onAbort);

                return true;
            }

            option.text = label.innerText;
            if (radioEl.checked) {
                // If the option is checked we use the model to select the one.
                question.unit = option.value;
            }

            question.options.push(option);
        }

        // Check which one should be displayed first: the options or the input.
        if (question.parsedSettings && question.parsedSettings.unitsleft !== null) {
            question.optionsFirst = question.parsedSettings.unitsleft == '1';
        } else {
            const input = questionEl.querySelector<HTMLInputElement>('input[type="text"][name*=answer]');
            question.optionsFirst =
                    questionEl.innerHTML.indexOf(input?.outerHTML || '') > questionEl.innerHTML.indexOf(radios[0].outerHTML);
        }

        return true;
    }

    /**
     * Treat a calculated question units in case they use a select.
     *
     * @param questionEl Question HTML element.
     * @returns True if question has units using a select.
     */
    protected treatCalculatedSelectUnits(questionEl: HTMLElement): boolean {
        // Check if the question has a select for units.
        const select = questionEl.querySelector<HTMLSelectElement>('select[name*=unit]');
        const options = select && Array.from(select.querySelectorAll('option'));

        if (!select || !options?.length || !this.question) {
            return false;
        }

        const question: AddonModQuizNumericalQuestion = this.question;
        const selectModel: AddonModQuizQuestionSelect = {
            id: select.id,
            name: select.name,
            disabled: select.disabled,
            options: [],
        };

        // Treat each option.
        for (const i in options) {
            const optionEl = options[i];

            if (optionEl.value === undefined) {
                this.logger.warn('Aborting because couldn\'t find input.', this.question?.slot);
                CoreQuestionHelper.showComponentError(this.onAbort);

                return true;
            }

            const option: AddonModQuizQuestionSelectOption = {
                value: optionEl.value,
                label: optionEl.innerHTML,
                selected: optionEl.selected,
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
        const accessibilityLabel = questionEl.querySelector<HTMLLabelElement>(`label[for="${select.id}"]`);
        selectModel.accessibilityLabel = accessibilityLabel?.innerHTML;

        question.select = selectModel;

        // Check which one should be displayed first: the select or the input.
        if (question.parsedSettings && question.parsedSettings.unitsleft !== null) {
            question.selectFirst = question.parsedSettings.unitsleft == '1';
        } else {
            const input = questionEl.querySelector<HTMLInputElement>('input[type="text"][name*=answer]');
            question.selectFirst =
                    questionEl.innerHTML.indexOf(input?.outerHTML || '') > questionEl.innerHTML.indexOf(select.outerHTML);
        }

        return true;
    }

    /**
     * Initialize a question component of type essay.
     *
     * @param review Whether we're in review mode.
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initEssayComponent(review?: boolean): void | HTMLElement {
        const questionEl = this.initComponent();
        if (!questionEl || !this.question) {
            return;
        }

        const question: AddonModQuizEssayQuestion = this.question;
        const answerDraftIdInput = questionEl.querySelector<HTMLInputElement>('input[name*="_answer:itemid"]');

        if (question.parsedSettings) {
            question.allowsAttachments = question.parsedSettings.attachments != '0';
            question.allowsAnswerFiles = question.parsedSettings.responseformat == 'editorfilepicker';
            question.isMonospaced = question.parsedSettings.responseformat == 'monospaced';
            question.isPlainText = question.isMonospaced || question.parsedSettings.responseformat == 'plain';
            question.hasInlineText = question.parsedSettings.responseformat != 'noinline';
        } else {
            question.allowsAttachments = !!questionEl.querySelector('div[id*=filemanager]');
            question.allowsAnswerFiles = !!answerDraftIdInput;
            question.isMonospaced = !!questionEl.querySelector('.qtype_essay_monospaced');
            question.isPlainText = question.isMonospaced || !!questionEl.querySelector('.qtype_essay_plain');
        }

        if (review) {
            // Search the answer and the attachments.
            question.answer = CoreDom.getContentsOfElement(questionEl, '.qtype_essay_response');
            question.wordCountInfo = questionEl.querySelector('.answer > p')?.innerHTML;

            if (question.parsedSettings) {
                question.attachments = Array.from(
                    CoreQuestionHelper.getResponseFileAreaFiles(question, 'attachments'),
                );
            } else {
                question.attachments = CoreQuestionHelper.getQuestionAttachmentsFromHtml(
                    CoreDom.getContentsOfElement(questionEl, '.attachments') || '',
                );
            }

            // Treat plagiarism.
            this.handleEssayPlagiarism(questionEl);

            return questionEl;
        }

        const textarea = questionEl.querySelector<HTMLTextAreaElement>('textarea[name*=_answer]');
        question.hasDraftFiles = question.allowsAnswerFiles && CoreQuestionHelper.hasDraftFileUrls(questionEl.innerHTML);

        if (!textarea && (question.hasInlineText || !question.allowsAttachments)) {
            // Textarea not found, we might be in review. Search the answer and the attachments.
            question.answer = CoreDom.getContentsOfElement(questionEl, '.qtype_essay_response');
            question.attachments = CoreQuestionHelper.getQuestionAttachmentsFromHtml(
                CoreDom.getContentsOfElement(questionEl, '.attachments') || '',
            );

            return questionEl;
        }

        if (textarea) {
            const input = questionEl.querySelector<HTMLInputElement>('input[type="hidden"][name*=answerformat]');
            let content = CoreText.decodeHTML(textarea.innerHTML || '');

            if (question.hasDraftFiles && question.responsefileareas) {
                content = CoreFileHelper.replaceDraftfileUrls(
                    CoreSites.getRequiredCurrentSite().getURL(),
                    content,
                    CoreQuestionHelper.getResponseFileAreaFiles(question, 'answer'),
                ).text;
            }

            question.textarea = {
                id: textarea.id,
                name: textarea.name,
                text: content,
            };

            if (input) {
                question.formatInput = {
                    name: input.name,
                    value: input.value,
                };
            }
        }

        if (answerDraftIdInput) {
            question.answerDraftIdInput = {
                name: answerDraftIdInput.name,
                value: Number(answerDraftIdInput.value),
            };
        }

        if (question.allowsAttachments) {
            const attachmentsInput = questionEl.querySelector<HTMLInputElement>('.attachments input[name*=_attachments]');
            const objectElement = questionEl.querySelector<HTMLObjectElement>('.attachments object');
            const fileManagerUrl = objectElement && objectElement.data;

            if (attachmentsInput) {
                question.attachmentsDraftIdInput = {
                    name: attachmentsInput.name,
                    value: Number(attachmentsInput.value),
                };
            }

            if (question.parsedSettings) {
                question.attachmentsMaxFiles = Number(question.parsedSettings.attachments);
                question.attachmentsAcceptedTypes = (<string[] | undefined> question.parsedSettings.filetypeslist)?.join(',');
            }

            if (fileManagerUrl) {
                const params = CoreUrl.extractUrlParams(fileManagerUrl);
                const maxBytes = Number(params.maxbytes);
                const areaMaxBytes = Number(params.areamaxbytes);

                question.attachmentsMaxBytes = maxBytes === -1 || areaMaxBytes === -1 ?
                    Math.max(maxBytes, areaMaxBytes) : Math.min(maxBytes, areaMaxBytes);
            }
        }

        return questionEl;
    }

    /**
     * Handle plagiarism in an essay question.
     *
     * @param questionEl Element with the question html.
     */
    protected handleEssayPlagiarism(questionEl: HTMLElement): void {
        if (!this.question) {
            return;
        }

        const question: AddonModQuizEssayQuestion = this.question;
        const answerPlagiarism = questionEl.querySelector<HTMLSpanElement>('.answer .core_plagiarism_links');
        if (answerPlagiarism) {
            question.answerPlagiarism = answerPlagiarism.innerHTML;
        }

        const attachments = question.attachments;
        if (!attachments?.length) {
            return;
        }

        const attachmentsPlagiarisms = Array.from(
            questionEl.querySelectorAll<HTMLSpanElement>('.attachments .core_plagiarism_links'),
        );
        const questionAttachmentsPlagiarisms: string[] = [];

        attachmentsPlagiarisms.forEach((plagiarism) => {
            // Search the URL of the attachment it affects.
            const attachmentUrl = plagiarism.parentElement?.querySelector('a')?.href;
            if (!attachmentUrl) {
                return;
            }

            const position = attachments.findIndex((file) => CoreFileHelper.getFileUrl(file) === attachmentUrl);
            if (position >= 0) {
                questionAttachmentsPlagiarisms[position] = plagiarism.innerHTML;
            }
        });

        question.attachmentsPlagiarisms = questionAttachmentsPlagiarisms;
    }

    /**
     * Initialize a question component that uses the original question text with some basic treatment.
     *
     * @param contentSelector The selector to find the question content (text).
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initOriginalTextComponent(contentSelector: string): void | HTMLElement {
        if (!this.question) {
            return;
        }

        const element = convertTextToHTMLElement(this.question.html);

        // Get question content.
        const content = element.querySelector<HTMLElement>(contentSelector);
        if (!content) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        // Remove sequencecheck and validation error.
        CoreDom.removeElement(content, 'input[name*=sequencecheck]');
        CoreDom.removeElement(content, '.validationerror');

        // Replace Moodle's correct/incorrect and feedback classes with our own.
        CoreQuestionHelper.replaceCorrectnessClasses(element);
        CoreQuestionHelper.replaceFeedbackClasses(element);

        // Treat the correct/incorrect icons.
        CoreQuestionHelper.treatCorrectnessIcons(element);

        // Set the question text.
        this.question.text = content.innerHTML;

        return element;
    }

    /**
     * Initialize a question component that has an input of type "text".
     *
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initInputTextComponent(): void | HTMLElement {
        const questionEl = this.initComponent();
        if (!questionEl || !this.question) {
            return;
        }

        // Get the input element.
        const question: AddonModQuizTextQuestion = this.question;
        const input = questionEl.querySelector<HTMLInputElement>('input[type="text"][name*=answer]');
        if (!input) {
            this.logger.warn('Aborting because couldn\'t find input.', this.question.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        question.input = {
            id: input.id,
            name: input.name,
            value: input.value,
            readOnly: input.readOnly,
            isInline: !!input.closest('.qtext'), // The answer can be inside the question text.
        };

        // Check if question is marked as correct.
        if (input.classList.contains('incorrect')) {
            question.input.correctClass = 'core-question-incorrect';
            question.input.correctIcon = this.incorrectIcon;
            question.input.correctIconColor = CoreIonicColorNames.DANGER;
            question.input.correctIconLabel = 'core.question.incorrect';
        } else if (input.classList.contains('correct')) {
            question.input.correctClass = 'core-question-correct';
            question.input.correctIcon = this.correctIcon;
            question.input.correctIconColor = CoreIonicColorNames.SUCCESS;
            question.input.correctIconLabel = 'core.question.correct';
        } else if (input.classList.contains('partiallycorrect')) {
            question.input.correctClass = 'core-question-partiallycorrect';
            question.input.correctIcon = this.partialCorrectIcon;
            question.input.correctIconColor = CoreIonicColorNames.WARNING;
            question.input.correctIconLabel = 'core.question.partiallycorrect';
        } else {
            question.input.correctClass = '';
            question.input.correctIcon = '';
            question.input.correctIconColor = '';
            question.input.correctIconLabel = '';
        }

        if (question.input.isInline) {
            // Handle correct/incorrect classes and icons.
            const content = questionEl.querySelector<HTMLElement>('.qtext');
            if (content) {
                CoreQuestionHelper.replaceCorrectnessClasses(content);
                CoreQuestionHelper.treatCorrectnessIcons(content);

                question.text = content.innerHTML;
            }
        }

        return questionEl;
    }

    /**
     * Initialize a question component with a "match" behaviour.
     *
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initMatchComponent(): void | HTMLElement {
        const questionEl = this.initComponent();
        if (!questionEl || !this.question) {
            return;
        }

        // Find rows.
        const question: AddonModQuizMatchQuestion = this.question;
        const rows = Array.from(questionEl.querySelectorAll<HTMLTableRowElement>('table.answer tr'));
        if (!rows || !rows.length) {
            this.logger.warn('Aborting because couldn\'t find any row.', question.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        question.rows = [];

        for (const i in rows) {
            const row = rows[i];
            const columns = Array.from(row.querySelectorAll<HTMLTableCellElement>('td'));

            if (!columns || columns.length < 2) {
                this.logger.warn('Aborting because couldn\'t the right columns.', question.slot);

                return CoreQuestionHelper.showComponentError(this.onAbort);
            }

            // Get the select and the options.
            const select = columns[1].querySelector<HTMLSelectElement>('select');
            const options = Array.from(columns[1].querySelectorAll<HTMLOptionElement>('option'));

            if (!select || !options || !options.length) {
                this.logger.warn('Aborting because couldn\'t find select or options.', question.slot);

                return CoreQuestionHelper.showComponentError(this.onAbort);
            }

            const rowModel: AddonModQuizQuestionMatchSelect = {
                id: select.id.replace(/:/g, '\\:'),
                name: select.name,
                disabled: select.disabled,
                options: [],
                text: columns[0].innerHTML, // Row's text should be in the first column.
            };

            // Check if answer is correct.
            if (columns[1].className.indexOf('partiallycorrect') >= 0) {
                rowModel.correctClass = 'partiallycorrect';
                rowModel.correctColor = CoreIonicColorNames.WARNING;
            } else if (columns[1].className.indexOf('incorrect') >= 0) {
                rowModel.correctClass = 'incorrect';
                rowModel.correctColor = CoreIonicColorNames.DANGER;
            } else if (columns[1].className.indexOf('correct') >= 0) {
                rowModel.correctClass = 'correct';
                rowModel.correctColor = CoreIonicColorNames.SUCCESS;
            }

            // Treat each option.
            for (const j in options) {
                const optionEl = options[j];

                if (optionEl.value === undefined) {
                    this.logger.warn('Aborting because couldn\'t find the value of an option.', question.slot);

                    return CoreQuestionHelper.showComponentError(this.onAbort);
                }

                const option: AddonModQuizQuestionSelectOption = {
                    value: optionEl.value,
                    label: CoreText.decodeHTML(optionEl.innerHTML),
                    selected: optionEl.selected,
                };

                if (option.selected) {
                    rowModel.selected = option.value;
                }

                rowModel.options.push(option);
            }

            // Get the accessibility label.
            const accessibilityLabel = columns[1].querySelector<HTMLLabelElement>('label.accesshide');
            rowModel.accessibilityLabel = accessibilityLabel?.innerHTML;

            question.rows.push(rowModel);
        }

        question.loaded = true;

        return questionEl;
    }

    /**
     * Initialize a question component with a multiple choice (checkbox) or single choice (radio).
     *
     * @returns Element containing the question HTML, void if the data is not valid.
     */
    initMultichoiceComponent(): void | HTMLElement {
        const questionEl = this.initComponent();
        if (!questionEl || !this.question) {
            return;
        }

        // Get the prompt.
        const question: AddonModQuizMultichoiceQuestion = this.question;
        question.prompt = CoreDom.getContentsOfElement(questionEl, '.prompt');

        // Search radio buttons first (single choice).
        let options = Array.from(questionEl.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
        if (!options || !options.length) {
            // Radio buttons not found, it should be a multi answer. Search for checkbox.
            question.multi = true;
            options = Array.from(questionEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));

            if (!options || !options.length) {
                // No checkbox found either. Abort.
                this.logger.warn('Aborting because of no radio and checkbox found.', question.slot);

                return CoreQuestionHelper.showComponentError(this.onAbort);
            }
        }

        question.options = [];
        question.disabled = true;

        for (const i in options) {
            const element = options[i];
            const option: AddonModQuizQuestionRadioOption = {
                id: element.id,
                class: '',
                name: element.name,
                value: element.value,
                checked: element.checked,
                disabled: element.disabled,
            };
            const parent = element.parentElement;

            if (option.value == '-1') {
                // It's the clear choice option, ignore it.
                continue;
            }

            question.optionsName = option.name;
            question.disabled = question.disabled && element.disabled;

            // Get the label with the question text. Try the new format first.
            const labelId = element.getAttribute('aria-labelledby');
            let label = labelId ? questionEl.querySelector(`#${labelId.replace(/:/g, '\\:')}`) : undefined;
            if (!label) {
                // Not found, use the old format.
                label = questionEl.querySelector(`label[for="${option.id}"]`);
            }
            option.class = label?.className || option.class;

            // Check that we were able to successfully extract options required data.
            if (!label || option.name === undefined || option.value === undefined) {
                // Something went wrong when extracting the questions data. Abort.
                this.logger.warn('Aborting because of an error parsing options.', question.slot, option.name);

                return CoreQuestionHelper.showComponentError(this.onAbort);
            }

            option.text = label.innerHTML;

            if (element.checked) {
                // If the option is checked and it's a single choice we use the model to select the one.
                if (!question.multi) {
                    question.singleChoiceModel = option.value;
                }

                if (parent) {
                    // Check if answer is correct.
                    if (parent.className.indexOf('partiallycorrect') >= 0) {
                        option.correctClass = 'partiallycorrect';
                        option.correctColor = CoreIonicColorNames.WARNING;
                    } else if (parent.className.indexOf('incorrect') >= 0) {
                        option.correctClass = 'incorrect';
                        option.correctColor = CoreIonicColorNames.DANGER;
                    } else if (parent.className.indexOf('correct') >= 0) {
                        option.correctClass = 'correct';
                        option.correctColor = CoreIonicColorNames.SUCCESS;
                    }

                    // Search the feedback.
                    const feedback = parent.querySelector('.specificfeedback');
                    if (feedback) {
                        option.feedback = feedback.innerHTML;
                    }
                }
            }

            question.options.push(option);
        }

        return questionEl;
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return this.onReadyPromise;
    }

}

/**
 * Any possible types of question.
 */
export type AddonModQuizQuestion = AddonModQuizNumericalQuestion | AddonModQuizEssayQuestion | AddonModQuizTextQuestion |
AddonModQuizMatchQuestion | AddonModQuizMultichoiceQuestion;

/**
 * Basic data for question.
 */
export type AddonModQuizQuestionBasicData = CoreQuestionQuestion & {
    text?: string;
};

/**
 * Data for calculated question.
 */
export type AddonModQuizNumericalQuestion = AddonModQuizTextQuestion & {
    select?: AddonModQuizQuestionSelect; // Select data if units use a select.
    selectFirst?: boolean; // Whether the select is first or after the input.
    options?: AddonModQuizQuestionRadioOption[]; // Options if units use radio buttons.
    optionsName?: string; // Options name (for radio buttons).
    unit?: string; // Option selected (for radio buttons).
    optionsFirst?: boolean; // Whether the radio buttons are first or after the input.
};

/**
 * Data for a select.
 */
export type AddonModQuizQuestionSelect = {
    id: string;
    name: string;
    disabled: boolean;
    options: AddonModQuizQuestionSelectOption[];
    selected?: string;
    accessibilityLabel?: string;
};

/**
 * Data for each option in a select.
 */
export type AddonModQuizQuestionSelectOption = {
    value: string;
    label: string;
    selected: boolean;
};

/**
 * Data for radio button.
 */
export type AddonModQuizQuestionRadioOption = {
    id: string;
    name: string;
    class: string;
    value: string;
    disabled: boolean;
    checked: boolean;
    text?: string;
    correctClass?: 'correct' | 'incorrect' | 'partiallycorrect';
    correctColor?: CoreIonicColorNames;
    feedback?: string;
};

/**
 * Data for essay question.
 */
export type AddonModQuizEssayQuestion = AddonModQuizQuestionBasicData & {
    allowsAttachments?: boolean; // Whether the question allows attachments.
    allowsAnswerFiles?: boolean; // Whether the question allows adding files in the answer.
    isMonospaced?: boolean; // Whether the answer is monospaced.
    isPlainText?: boolean; // Whether the answer is plain text.
    hasInlineText?: boolean; // // Whether the answer has inline text
    answer?: string; // Question answer text.
    attachments?: CoreWSFile[]; // Question answer attachments.
    hasDraftFiles?: boolean; // Whether the question has draft files.
    textarea?: AddonModQuizQuestionTextarea; // Textarea data.
    formatInput?: { name: string; value: string }; // Format input data.
    answerDraftIdInput?: { name: string; value: number }; // Answer draft id input data.
    attachmentsDraftIdInput?: { name: string; value: number }; // Attachments draft id input data.
    attachmentsMaxFiles?: number; // Max number of attachments.
    attachmentsAcceptedTypes?: string; // Attachments accepted file types.
    attachmentsMaxBytes?: number; // Max bytes for attachments.
    answerPlagiarism?: string; // Plagiarism HTML for the answer.
    attachmentsPlagiarisms?: string[]; // Plagiarism HTML for each attachment.
    wordCountInfo?: string; // Info about word count.
};

/**
 * Data for textarea.
 */
export type AddonModQuizQuestionTextarea = {
    id: string;
    name: string;
    text: string;
};

/**
 * Data for text question.
 */
export type AddonModQuizTextQuestion = AddonModQuizQuestionBasicData & {
    input?: AddonModQuizQuestionTextInput;
};

/**
 * Data for text input.
 */
export type AddonModQuizQuestionTextInput = {
    id: string;
    name: string;
    value: string;
    readOnly: boolean;
    isInline: boolean;
    correctClass?: string;
    correctIcon?: string;
    correctIconColor?: string;
    correctIconLabel?: string;
};

/**
 * Data for match question.
 */
export type AddonModQuizMatchQuestion = AddonModQuizQuestionBasicData & {
    loaded?: boolean; // Whether the question is loaded.
    rows?: AddonModQuizQuestionMatchSelect[]; // Data for each row.
};

/**
 * Each select data for match questions.
 */
export type AddonModQuizQuestionMatchSelect = AddonModQuizQuestionSelect & {
    text: string;
    correctClass?: 'correct' | 'incorrect' | 'partiallycorrect';
    correctColor?: CoreIonicColorNames;
};

/**
 * Data for multichoice question.
 */
export type AddonModQuizMultichoiceQuestion = AddonModQuizQuestionBasicData & {
    prompt?: string; // Question prompt.
    multi?: boolean; // Whether the question allows more than one selected answer.
    options?: AddonModQuizQuestionRadioOption[]; // List of options.
    disabled?: boolean; // Whether the question is disabled.
    optionsName?: string; // Name to use for the options in single choice.
    singleChoiceModel?: string; // Model for single choice.
};
