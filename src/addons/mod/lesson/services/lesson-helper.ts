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

import { Injectable } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreFormFields } from '@singletons/form';
import { CoreText } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { makeSingleton, Translate } from '@singletons';
import {
    AddonModLesson,
    AddonModLessonAttemptsOverviewsAttemptWSData,
    AddonModLessonGetAccessInformationWSResponse,
    AddonModLessonGetPageDataWSResponse,
    AddonModLessonLessonWSData,
} from './lesson';
import { CoreUtils } from '@singletons/utils';
import { AddonModLessonPageSubtype } from '../constants';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CoreError } from '@classes/errors/error';
import { CorePrompts } from '@services/overlays/prompts';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';

/**
 * Helper service that provides some features for quiz.
 */
@Injectable({ providedIn: 'root' })
export class AddonModLessonHelperProvider {

    constructor(
        protected formBuilder: FormBuilder,
    ) {}

    /**
     * Given the HTML of next activity link, format it to extract the href and the text.
     *
     * @param activityLink HTML of the activity link.
     * @returns Formatted data.
     */
    formatActivityLink(activityLink: string): AddonModLessonActivityLink {
        const element = convertTextToHTMLElement(activityLink);
        const anchor = element.querySelector('a');

        if (!anchor) {
            // Anchor not found, return the original HTML.
            return {
                formatted: false,
                label: activityLink,
                href: '',
            };
        }

        return {
            formatted: true,
            label: anchor.innerHTML,
            href: anchor.href,
        };
    }

    /**
     * Given the HTML of an answer from a content page, extract the data to render the answer.
     *
     * @param html Answer's HTML.
     * @returns Data to render the answer.
     */
    getContentPageAnswerDataFromHtml(html: string): {buttonText: string; content: string} {
        const data = {
            buttonText: '',
            content: '',
        };
        const element = convertTextToHTMLElement(html);

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
     * @param html Page's HTML.
     * @returns List of buttons.
     */
    getPageButtonsFromHtml(html: string): AddonModLessonPageButton[] {
        const buttons: AddonModLessonPageButton[] = [];
        const element = convertTextToHTMLElement(html);

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
            const buttonSelector = 'input[type="submit"], button[type="submit"]';
            const buttonEl = <HTMLInputElement | HTMLButtonElement> form.querySelector(buttonSelector);
            const inputs = Array.from(form.querySelectorAll('input'));

            if (!buttonEl || !inputs || !inputs.length) {
                // Button not found or no inputs, ignore it.
                return;
            }

            const button: AddonModLessonPageButton = {
                id: buttonEl.id,
                title: buttonEl.title || buttonEl.value,
                content: buttonEl.tagName == 'INPUT' ? buttonEl.value : buttonEl.innerHTML.trim(),
                data: {},
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
     * Given a page data, get the page contents.
     *
     * @param data Page data.
     * @returns Page contents.
     */
    getPageContentsFromPageData(data: AddonModLessonGetPageDataWSResponse): string {
        // Search the page contents inside the whole page HTML. Use data.pagecontent because it's filtered.
        const element = convertTextToHTMLElement(data.pagecontent || '');
        const contents = element.querySelector('.contents');

        if (contents) {
            return contents.innerHTML.trim();
        }

        // Cannot find contents element.
        if (AddonModLesson.isQuestionPage(data.page?.type || -1) ||
                data.page?.qtype == AddonModLessonPageSubtype.BRANCHTABLE) {
            // Return page.contents to prevent having duplicated elements (some elements like videos might not work).
            return data.page?.contents || '';
        } else {
            // It's an end of cluster, end of branch, etc. Return the whole pagecontent to match what's displayed in web.
            return data.pagecontent || '';
        }
    }

    /**
     * Get a question and all the data required to render it from the page data.
     *
     * @param questionForm The form group where to add the controls.
     * @param pageData Page data.
     * @returns Question data.
     */
    getQuestionFromPageData(questionForm: FormGroup, pageData: AddonModLessonGetPageDataWSResponse): AddonModLessonQuestion {
        const element = convertTextToHTMLElement(pageData.pagecontent || '');

        // Get the container of the question answers if it exists.
        const fieldContainer = <HTMLElement> element.querySelector('.fcontainer');

        // Get hidden inputs and add their data to the form group.
        const hiddenInputs = <HTMLInputElement[]> Array.from(element.querySelectorAll('input[type="hidden"]'));
        hiddenInputs.forEach((input) => {
            questionForm.addControl(input.name, this.formBuilder.control(input.value));
        });

        // Get the submit button and extract its value.
        const submitButton = <HTMLInputElement> element.querySelector('input[type="submit"]');
        const question: AddonModLessonQuestion = {
            template: '',
            submitLabel: submitButton ? submitButton.value : Translate.instant('addon.mod_lesson.submit'),
        };

        if (!fieldContainer) {
            // Element not found, return.
            return question;
        }

        switch (pageData.page?.qtype) {
            case AddonModLessonPageSubtype.TRUEFALSE:
            case AddonModLessonPageSubtype.MULTICHOICE:
                return this.getMultiChoiceQuestionData(questionForm, question, fieldContainer);

            case AddonModLessonPageSubtype.NUMERICAL:
            case AddonModLessonPageSubtype.SHORTANSWER:
                return this.getInputQuestionData(questionForm, question, fieldContainer, pageData.page.qtype);

            case AddonModLessonPageSubtype.ESSAY: {
                return this.getEssayQuestionData(questionForm, question, fieldContainer);
            }

            case AddonModLessonPageSubtype.MATCHING: {
                return this.getMatchingQuestionData(questionForm, question, fieldContainer);
            }
        }

        return question;
    }

    /**
     * Get a multichoice question data.
     *
     * @param questionForm The form group where to add the controls.
     * @param question Basic question data.
     * @param fieldContainer HTMLElement containing the data.
     * @returns Question data.
     */
    protected getMultiChoiceQuestionData(
        questionForm: FormGroup,
        question: AddonModLessonQuestion,
        fieldContainer: HTMLElement,
    ): AddonModLessonMultichoiceQuestion {
        const multiChoiceQuestion = <AddonModLessonMultichoiceQuestion> {
            ...question,
            template: 'multichoice',
            options: [],
            multi: false,
        };

        // Get all the inputs. Search radio first.
        let inputs = <HTMLInputElement[]> Array.from(fieldContainer.querySelectorAll('input[type="radio"]'));
        if (!inputs || !inputs.length) {
            // Radio buttons not found, it might be a multi answer. Search for checkbox.
            multiChoiceQuestion.multi = true;
            inputs = <HTMLInputElement[]> Array.from(fieldContainer.querySelectorAll('input[type="checkbox"]'));

            if (!inputs || !inputs.length) {
                // No checkbox found either. Stop.
                return multiChoiceQuestion;
            }
        }

        let controlAdded = false;
        inputs.forEach((input) => {
            const parent = input.parentElement;
            const option: AddonModLessonMultichoiceOption = {
                id: input.id,
                name: input.name,
                value: input.value,
                checked: !!input.checked,
                disabled: !!input.disabled,
                text: '',
            };

            if (option.checked || multiChoiceQuestion.multi) {
                // Add the control.
                if (multiChoiceQuestion.multi) {
                    questionForm.addControl(
                        option.name,
                        this.formBuilder.control({ value: option.checked, disabled: option.disabled }),
                    );
                } else {
                    questionForm.addControl(option.name, this.formBuilder.control(option.value));
                }
                controlAdded = true;
            }

            // Remove the input and use the rest of the parent contents as the label.
            input.remove();
            option.text = parent?.innerHTML.trim() || '';
            multiChoiceQuestion.options!.push(option);
        });

        if (!multiChoiceQuestion.multi) {
            multiChoiceQuestion.controlName = inputs[0].name;

            if (!controlAdded) {
                // No checked option for single choice, add the control with an empty value.
                questionForm.addControl(multiChoiceQuestion.controlName, this.formBuilder.control(''));
            }
        }

        return multiChoiceQuestion;
    }

    /**
     * Get an input question data.
     *
     * @param questionForm The form group where to add the controls.
     * @param question Basic question data.
     * @param fieldContainer HTMLElement containing the data.
     * @param questionType Type of the question.
     * @returns Question data.
     */
    protected getInputQuestionData(
        questionForm: FormGroup,
        question: AddonModLessonQuestion,
        fieldContainer: HTMLElement,
        questionType: number,
    ): AddonModLessonInputQuestion {

        const inputQuestion = <AddonModLessonInputQuestion> question;
        inputQuestion.template = 'shortanswer';

        // Get the input.
        const input = fieldContainer.querySelector<HTMLInputElement>('input[type="text"], input[type="number"]');
        if (!input) {
            return inputQuestion;
        }

        inputQuestion.input = {
            id: input.id,
            name: input.name,
            maxlength: input.maxLength,
            type: 'text', // Use text for numerical questions too to allow different decimal separators.
        };

        // Init the control.
        questionForm.addControl(input.name, this.formBuilder.control({
            value: questionType === AddonModLessonPageSubtype.NUMERICAL ? CoreUtils.formatFloat(input.value) : input.value,
            disabled: input.readOnly,
        }));

        return inputQuestion;
    }

    /**
     * Get an essay question data.
     *
     * @param questionForm The form group where to add the controls.
     * @param question Basic question data.
     * @param fieldContainer HTMLElement containing the data.
     * @returns Question data.
     */
    protected getEssayQuestionData(
        questionForm: FormGroup,
        question: AddonModLessonQuestion,
        fieldContainer: HTMLElement,
    ): AddonModLessonEssayQuestion {
        const essayQuestion = <AddonModLessonEssayQuestion> question;
        essayQuestion.template = 'essay';

        // Get the textarea.
        const textarea = fieldContainer.querySelector('textarea');

        if (!textarea) {
            // Textarea not found, probably review mode.
            const answerEl = fieldContainer.querySelector('.reviewessay');
            if (!answerEl) {
                // Answer not found, stop.
                return essayQuestion;
            }
            essayQuestion.useranswer = answerEl.innerHTML;

        } else {
            essayQuestion.textarea = {
                id: textarea.id,
                name: textarea.name || 'answer[text]',
            };

            // Init the control.
            essayQuestion.control = this.formBuilder.control('', { nonNullable: true });
            questionForm.addControl(essayQuestion.textarea.name, essayQuestion.control);
        }

        return essayQuestion;
    }

    /**
     * Get a matching question data.
     *
     * @param questionForm The form group where to add the controls.
     * @param question Basic question data.
     * @param fieldContainer HTMLElement containing the data.
     * @returns Question data.
     */
    protected getMatchingQuestionData(
        questionForm: FormGroup,
        question: AddonModLessonQuestion,
        fieldContainer: HTMLElement,
    ): AddonModLessonMatchingQuestion {

        const matchingQuestion = <AddonModLessonMatchingQuestion> {
            ...question,
            template: 'matching',
            rows: [],
        };

        const rows = Array.from(fieldContainer.querySelectorAll('.answeroption'));

        rows.forEach((row) => {
            const label = row.querySelector('label');
            const select = row.querySelector('select');
            const options = Array.from(row.querySelectorAll('option'));

            if (!label || !select || !options || !options.length) {
                return;
            }

            // Get the row's text (label).
            const rowData: AddonModLessonMatchingRow = {
                text: label.innerHTML.trim(),
                id: select.id,
                name: select.name,
                options: [],
            };

            // Treat each option.
            let controlAdded = false;
            options.forEach((option) => {
                if (option.value === undefined) {
                    // Option not valid, ignore it.
                    return;
                }

                const optionData: AddonModLessonMatchingRowOption = {
                    value: option.value,
                    label: option.innerHTML.trim(),
                    selected: option.selected,
                };

                if (optionData.selected) {
                    controlAdded = true;
                    questionForm.addControl(
                        rowData.name,
                        this.formBuilder.control({ value: optionData.value, disabled: !!select.disabled }),
                    );
                }

                rowData.options.push(optionData);
            });

            if (!controlAdded) {
                // No selected option, add the control with an empty value.
                questionForm.addControl(rowData.name, this.formBuilder.control({ value: '', disabled: !!select.disabled }));
            }

            matchingQuestion.rows.push(rowData);
        });

        return matchingQuestion;
    }

    /**
     * Given the HTML of an answer from a question page, extract the data to render the answer.
     *
     * @param html Answer's HTML.
     * @returns Object with the data to render the answer. If the answer doesn't require any parsing, return a string with the HTML.
     */
    getQuestionPageAnswerDataFromHtml(html: string): AddonModLessonAnswerData {
        const element = convertTextToHTMLElement(html);

        // Check if it has a checkbox.
        let input = element.querySelector<HTMLInputElement>('input[type="checkbox"][name*="answer"]');
        if (input) {
            // Truefalse or multichoice.
            const successBadge = element.querySelector<HTMLElement>('.badge.bg-success, .badge.badge-success');
            const data: AddonModLessonCheckboxAnswerData = {
                isCheckbox: true,
                checked: !!input.checked,
                name: input.name,
                highlight: !!element.querySelector('.highlight'),
                content: '',
                successBadge: successBadge?.innerText,
            };

            input.remove();
            successBadge?.remove();
            data.content = element.innerHTML.trim();

            return data;
        }

        // Check if it has an input text or number.
        input = element.querySelector<HTMLInputElement>('input[type="number"],input[type="text"]');
        if (input) {
            // Short answer or numeric.
            return {
                isText: true,
                value: input.value,
            };
        }

        // Check if it has a select.
        const select = element.querySelector('select');
        if (select?.options) {
            // Matching.
            const selectedOption = select.options[select.selectedIndex];
            const data: AddonModLessonSelectAnswerData = {
                isSelect: true,
                id: select.id,
                value: selectedOption ? selectedOption.value : '',
                content: '',
            };

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
     * @param retake Retake object.
     * @param includeDuration Whether to include the duration of the retake.
     * @returns Retake label.
     */
    getRetakeLabel(retake: AddonModLessonAttemptsOverviewsAttemptWSData, includeDuration?: boolean): string {
        const data = {
            retake: retake.try + 1,
            grade: '',
            timestart: '',
            duration: '',
        };
        const hasGrade = retake.grade != null;

        if (hasGrade || retake.end) {
            // Retake finished with or without grade (if the lesson only has content pages, it has no grade).
            if (hasGrade) {
                data.grade = Translate.instant('core.percentagenumber', { $a: retake.grade });
            }
            data.timestart = CoreTime.userDate(retake.timestart * 1000);
            if (includeDuration) {
                data.duration = CoreTime.formatTime(retake.timeend - retake.timestart);
            }
        } else {
            // The user has not completed the retake.
            data.grade = Translate.instant('addon.mod_lesson.notcompleted');
            if (retake.timestart) {
                data.timestart = CoreTime.userDate(retake.timestart * 1000);
            }
        }

        return Translate.instant('addon.mod_lesson.retakelabel' + (includeDuration ? 'full' : 'short'), data);
    }

    /**
     * Prepare the question data to be sent to server.
     *
     * @param question Question to prepare.
     * @param data Data to prepare.
     * @returns Data to send.
     */
    prepareQuestionData(question: AddonModLessonQuestion, data: CoreFormFields): CoreFormFields {
        if (question.template == 'essay') {
            const textarea = (<AddonModLessonEssayQuestion> question).textarea;

            // Add some HTML to the answer if needed.
            if (textarea) {
                data[textarea.name] = CoreText.formatHtmlLines(<string> data[textarea.name] || '');
            }
        } else if (question.template == 'multichoice' && (<AddonModLessonMultichoiceQuestion> question).multi) {
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
     * @param html Feedback's HTML.
     * @returns Feedback without the question text.
     */
    removeQuestionFromFeedback(html: string): string {
        const element = convertTextToHTMLElement(html);

        // Remove the question text.
        CoreDomUtils.removeElement(element, '.generalbox:not(.feedback):not(.correctanswer)');

        return element.innerHTML.trim();
    }

    /**
     * Get the lesson password if needed. If not stored, it can ask the user to enter it.
     *
     * @param lessonId Lesson ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async getLessonPassword(
        lessonId: number,
        options: AddonModLessonGetPasswordOptions = {},
    ): Promise<AddonModLessonGetPasswordResult> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Get access information to check if password is needed.
        const accessInfo = await AddonModLesson.getAccessInformation(lessonId, options);

        if (!accessInfo.preventaccessreasons.length) {
            // Password not needed.
            return { accessInfo };
        }

        const passwordNeeded = accessInfo.preventaccessreasons.length == 1 &&
            AddonModLesson.isPasswordProtected(accessInfo);

        if (!passwordNeeded) {
            // Lesson cannot be played, reject.
            throw new CoreError(accessInfo.preventaccessreasons[0].message);
        }

        // The lesson requires a password. Check if there is one in DB.
        let password = await CorePromiseUtils.ignoreErrors(AddonModLesson.getStoredPassword(lessonId));

        if (password) {
            try {
                return await this.validatePassword(lessonId, accessInfo, password, options);
            } catch {
                // Error validating it.
            }
        }

        // Ask for the password if allowed.
        if (!options.askPassword) {
            // Cannot ask for password, reject.
            throw new CoreError(accessInfo.preventaccessreasons[0].message);
        }

        // Create and show the modal.
        const response = await CorePrompts.promptPassword({
            title: 'addon.mod_lesson.enterpassword',
            placeholder: 'core.login.password',
            submit: 'addon.mod_lesson.continue',
        });
        password = response.password;

        return this.validatePassword(lessonId, accessInfo, password, options);
    }

    /**
     * Validate the password.
     *
     * @param lessonId Lesson ID.
     * @param accessInfo Lesson access info.
     * @param password Password to check.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    protected async validatePassword(
        lessonId: number,
        accessInfo: AddonModLessonGetAccessInformationWSResponse,
        password: string,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModLessonGetPasswordResult> {

        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        const lesson = await AddonModLesson.getLessonWithPassword(lessonId, {
            password,
            ...options, // Include all options.
        });

        // Password is ok, store it and return the data.
        await AddonModLesson.storePassword(lesson.id, password, options.siteId);

        return {
            password,
            lesson,
            accessInfo,
        };
    }

}
export const AddonModLessonHelper = makeSingleton(AddonModLessonHelperProvider);

/**
 * Page button data.
 */
export type AddonModLessonPageButton = {
    id: string;
    title: string;
    content: string;
    data: Record<string, string>;
};

/**
 * Generic question data.
 */
export type AddonModLessonQuestionBasicData = {
    template: string; // Name of the template to use.
    submitLabel: string; // Text to display in submit.
};

/**
 * Multichoice question data.
 */
export type AddonModLessonMultichoiceQuestion = AddonModLessonQuestionBasicData & {
    multi: boolean; // Whether it allows multiple answers.
    options: AddonModLessonMultichoiceOption[]; // Options for multichoice question.
    controlName?: string; // Name of the form control, for single choice.
};

/**
 * Short answer or numeric question data.
 */
export type AddonModLessonInputQuestion = AddonModLessonQuestionBasicData & {
    input?: AddonModLessonQuestionInput; // Text input for text/number questions.
};

/**
 * Essay question data.
 */
export type AddonModLessonEssayQuestion = AddonModLessonQuestionBasicData & {
    useranswer?: string; // User answer, for reviewing.
    textarea?: AddonModLessonTextareaData; // Data for the textarea.
    control?: FormControl<string>; // Form control.
};

/**
 * Matching question data.
 */
export type AddonModLessonMatchingQuestion = AddonModLessonQuestionBasicData & {
    rows: AddonModLessonMatchingRow[];
};

/**
 * Data for each option in a multichoice question.
 */
export type AddonModLessonMultichoiceOption = {
    id: string;
    name: string;
    value: string;
    checked: boolean;
    disabled: boolean;
    text: string;
};

/**
 * Input data for text/number questions.
 */
export type AddonModLessonQuestionInput = {
    id: string;
    name: string;
    maxlength: number;
    type: string;
};

/**
 * Textarea data for essay questions.
 */
export type AddonModLessonTextareaData = {
    id: string;
    name: string;
};

/**
 * Data for each row in a matching question.
 */
export type AddonModLessonMatchingRow = {
    id: string;
    name: string;
    text: string;
    options: AddonModLessonMatchingRowOption[];
};

/**
 * Data for each option in a row in a matching question.
 */
export type AddonModLessonMatchingRowOption = {
    value: string;
    label: string;
    selected: boolean;
};

/**
 * Checkbox answer.
 */
export type AddonModLessonCheckboxAnswerData = {
    isCheckbox: true;
    checked: boolean;
    name: string;
    highlight: boolean;
    content: string;
    successBadge?: string;
};

/**
 * Text answer.
 */
export type AddonModLessonTextAnswerData = {
    isText: true;
    value: string;
};

/**
 * Select answer.
 */
export type AddonModLessonSelectAnswerData = {
    isSelect: true;
    id: string;
    value: string;
    content: string;
};

/**
 * Any possible answer data.
 */
export type AddonModLessonAnswerData =
    AddonModLessonCheckboxAnswerData | AddonModLessonTextAnswerData | AddonModLessonSelectAnswerData | string;

/**
 * Any possible question data.
 */
export type AddonModLessonQuestion = AddonModLessonQuestionBasicData & Partial<AddonModLessonMultichoiceQuestion> &
Partial<AddonModLessonInputQuestion> & Partial<AddonModLessonEssayQuestion> & Partial<AddonModLessonMatchingQuestion>;

/**
 * Activity link data.
 */
export type AddonModLessonActivityLink = {
    formatted: boolean;
    label: string;
    href: string;
};

/**
 * Options to pass to get lesson password.
 */
export type AddonModLessonGetPasswordOptions = CoreCourseCommonModWSOptions & {
    askPassword?: boolean; // True if we should ask for password if needed, false otherwise.
};

/**
 * Result of getLessonPassword.
 */
export type AddonModLessonGetPasswordResult = {
    password?: string;
    lesson?: AddonModLessonLessonWSData;
    accessInfo: AddonModLessonGetAccessInformationWSResponse;
};
