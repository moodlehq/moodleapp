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
import { CoreCourse } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import {
    AddonModFeedback,
    AddonModFeedbackGetNonRespondentsWSResponse,
    AddonModFeedbackGetResponsesAnalysisWSResponse,
    AddonModFeedbackGroupPaginatedOptions,
    AddonModFeedbackItem,
    AddonModFeedbackProvider,
    AddonModFeedbackResponseValue,
    AddonModFeedbackWSAttempt,
    AddonModFeedbackWSNonRespondent,
} from './feedback';
import { AddonModFeedbackModuleHandlerService } from './handlers/module';

const MODE_RESPONSETIME = 1;
const MODE_COURSE = 2;
const MODE_CATEGORY = 3;

/**
 * Service that provides helper functions for feedbacks.
 */
@Injectable({ providedIn: 'root' })
export class AddonModFeedbackHelperProvider {

    /**
     * Retrieves a list of students who didn't submit the feedback with extra info.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @return Promise resolved when the info is retrieved.
     */
    async getNonRespondents(
        feedbackId: number,
        options: AddonModFeedbackGroupPaginatedOptions = {},
    ): Promise<AddonModFeedbackGetNonRespondents> {
        const responses: AddonModFeedbackGetNonRespondents = await AddonModFeedback.getNonRespondents(feedbackId, options);

        responses.users = await this.addImageProfile(responses.users);

        return responses;
    }

    /**
     * Get page items responses to be sent.
     *
     * @param items Items where the values are.
     * @return Responses object to be sent.
     */
    getPageItemsResponses(items: AddonModFeedbackFormItem[]): Record<string, AddonModFeedbackResponseValue> {
        const responses: Record<string, AddonModFeedbackResponseValue> = {};

        items.forEach((itemData) => {
            let answered = false;
            itemData.hasError = false;

            if (itemData.typ == 'captcha') {
                const value = itemData.value || '';
                const name = itemData.typ + '_' + itemData.id;

                answered = !!value;
                responses[name] = 1;
                responses['g-recaptcha-response'] = value;
                responses['recaptcha_element'] = 'dummyvalue';

                if (itemData.required && !answered) {
                    // Check if it has any value.
                    itemData.isEmpty = true;
                } else {
                    itemData.isEmpty = false;
                }
            } else if (itemData.hasvalue) {
                let name: string;
                let value: AddonModFeedbackResponseValue;
                const nameTemp = itemData.typ + '_' + itemData.id;

                if (this.isMultiChoiceItem(itemData) && itemData.subtype == 'c') {
                    name = nameTemp + '[0]';
                    responses[name] = 0;
                    itemData.choices.forEach((choice, index) => {
                        name = nameTemp + '[' + (index + 1) + ']';
                        value = choice.checked ? choice.value : 0;
                        if (!answered && value) {
                            answered = true;
                        }
                        responses[name] = value;
                    });
                } else {
                    if (this.isMultiChoiceItem(itemData) && itemData.subtype != 'r') {
                        name = nameTemp + '[0]';
                    } else {
                        name = nameTemp;
                    }

                    if (itemData.typ == 'multichoice' || itemData.typ == 'multichoicerated') {
                        value = itemData.value || 0;
                    } else if (this.isNumericItem(itemData)) {
                        value = itemData.value || itemData.value == 0 ? itemData.value : '';

                        if (value != '') {
                            if ((itemData.rangefrom != '' && value < itemData.rangefrom) ||
                                    (itemData.rangeto != '' && value > itemData.rangeto)) {
                                itemData.hasError = true;
                            }
                        }
                    } else {
                        value = itemData.value || itemData.value == 0 ? itemData.value : '';
                    }

                    answered = !!value;
                    responses[name] = value;
                }

                if (itemData.required && !answered) {
                    // Check if it has any value.
                    itemData.isEmpty = true;
                } else {
                    itemData.isEmpty = false;
                }
            }
        });

        return responses;
    }

    /**
     * Returns the feedback user responses with extra info.
     *
     * @param feedbackId Feedback ID.
     * @param options Other options.
     * @return Promise resolved when the info is retrieved.
     */
    async getResponsesAnalysis(
        feedbackId: number,
        options: AddonModFeedbackGroupPaginatedOptions = {},
    ): Promise<AddonModFeedbackResponsesAnalysis> {
        const responses: AddonModFeedbackResponsesAnalysis = await AddonModFeedback.getResponsesAnalysis(feedbackId, options);

        responses.attempts = await this.addImageProfile(responses.attempts);

        return responses;
    }

    /**
     * Handle a show entries link.
     *
     * @param params URL params.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async handleShowEntriesLink(params: Record<string, string>, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const modal = await CoreDomUtils.showModalLoading();

        try {
            const module = await CoreCourse.getModuleBasicInfo(Number(params.id), siteId);

            if (typeof params.showcompleted == 'undefined') {
                // Param showcompleted not defined. Show entry list.
                await CoreNavigator.navigateToSitePath(
                    AddonModFeedbackModuleHandlerService.PAGE_NAME + `/${module.course}/${module.id}/respondents`,
                    { siteId },
                );

                return;
            }

            const attempt = await AddonModFeedback.getAttempt(module.instance, Number(params.showcompleted), {
                cmId: module.id,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                siteId,
            });

            await CoreNavigator.navigateToSitePath(
                AddonModFeedbackModuleHandlerService.PAGE_NAME + `/${module.course}/${module.id}/attempt/${attempt.id}`,
                {
                    params: {
                        feedbackId: module.instance,
                        attempt: attempt,
                    },
                    siteId,
                },
            );
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error opening link.');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Add Image profile url field on some entries.
     *
     * @param entries Entries array to get profile from.
     * @return Returns the same array with the profileimageurl added if found.
     */
    protected async addImageProfile(entries: AddonModFeedbackWSAttempt[]): Promise<AddonModFeedbackAttempt[]>;
    protected async addImageProfile(entries: AddonModFeedbackWSNonRespondent[]): Promise<AddonModFeedbackNonRespondent[]>;
    protected async addImageProfile(
        entries: (AddonModFeedbackWSAttempt | AddonModFeedbackWSNonRespondent)[],
    ): Promise<(AddonModFeedbackAttempt | AddonModFeedbackNonRespondent)[]> {
        return await Promise.all(entries.map(async (entry: AddonModFeedbackAttempt | AddonModFeedbackNonRespondent) => {
            try {
                const user = await CoreUser.getProfile(entry.userid, entry.courseid, true);

                entry.profileimageurl = user.profileimageurl;
            } catch {
                // Error getting profile, resolve promise without adding any extra data.
            }

            return entry;
        }));
    }

    /**
     * Helper funtion for item type Label.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormLabel(item: AddonModFeedbackItem): AddonModFeedbackFormBasicItem {
        item.name = '';
        item.presentation = CoreTextUtils.replacePluginfileUrls(item.presentation, item.itemfiles);

        return Object.assign(item, {
            templateName: 'label',
            value: '',
            hasTextInput: false,
        });
    }

    /**
     * Helper funtion for item type Info.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormInfo(item: AddonModFeedbackItem): AddonModFeedbackFormBasicItem | undefined {
        const formItem: AddonModFeedbackFormBasicItem = Object.assign(item, {
            templateName: 'label',
            value: '',
            hasTextInput: false,
        });

        const type = parseInt(formItem.presentation, 10);

        if (type == MODE_COURSE || type == MODE_CATEGORY) {
            formItem.presentation = formItem.otherdata;
            formItem.value = typeof formItem.rawValue != 'undefined' ? formItem.rawValue : formItem.otherdata;
        } else if (type == MODE_RESPONSETIME) {
            formItem.value = '__CURRENT__TIMESTAMP__';

            const rawValue = Number(formItem.rawValue);
            const tempValue = isNaN(rawValue) ? Date.now() : rawValue * 1000;
            formItem.presentation = CoreTimeUtils.userDate(tempValue);
        } else {
            // Errors on item, return false.
            return undefined;
        }

        return formItem;
    }

    /**
     * Helper funtion for item type Numeric.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormNumeric(item: AddonModFeedbackItem): AddonModFeedbackNumericItem {

        const range = item.presentation.split(AddonModFeedbackProvider.LINE_SEP) || [];
        const rangeFrom = range.length > 0 ? parseInt(range[0], 10) : undefined;
        const rangeTo = range.length > 1 ? parseInt(range[1], 10) : undefined;

        const formItem: AddonModFeedbackNumericItem = Object.assign(item, {
            templateName: 'numeric',
            value: typeof item.rawValue != 'undefined' ? Number(item.rawValue) : '',
            rangefrom: typeof rangeFrom == 'number' && !isNaN(rangeFrom) ? range[0] : '',
            rangeto: typeof rangeTo == 'number' && !isNaN(rangeTo) ? rangeTo : '',
            hasTextInput: true,
        });
        formItem.postfix = this.getNumericBoundariesForDisplay(formItem.rangefrom, formItem.rangeto);

        return formItem;
    }

    /**
     * Helper funtion for item type Text field.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormTextfield(item: AddonModFeedbackItem): AddonModFeedbackTextItem {
        return Object.assign(item, {
            templateName: 'textfield',
            length: Number(item.presentation.split(AddonModFeedbackProvider.LINE_SEP)[1]) || 255,
            value: typeof item.rawValue != 'undefined' ? item.rawValue : '',
            hasTextInput: true,
        });
    }

    /**
     * Helper funtion for item type Textarea.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormTextarea(item: AddonModFeedbackItem): AddonModFeedbackFormBasicItem {
        return Object.assign(item, {
            templateName: 'textarea',
            value: typeof item.rawValue != 'undefined' ? item.rawValue : '',
            hasTextInput: true,
        });
    }

    /**
     * Helper funtion for item type Multichoice.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormMultichoice(item: AddonModFeedbackItem): AddonModFeedbackMultichoiceItem {

        let parts = item.presentation.split(AddonModFeedbackProvider.MULTICHOICE_TYPE_SEP) || [];
        const subType = parts.length > 0 && parts[0] ? parts[0] : 'r';

        const formItem: AddonModFeedbackMultichoiceItem = Object.assign(item, {
            templateName: 'multichoice-' + subType,
            subtype: subType,
            value: '',
            choices: [],
            hasTextInput: false,
        });

        formItem.presentation = parts.length > 1 ? parts[1] : '';
        if (formItem.subtype != 'd') {
            parts = formItem.presentation.split(AddonModFeedbackProvider.MULTICHOICE_ADJUST_SEP) || [];
            formItem.presentation = parts.length > 0 ? parts[0] : '';
            // Horizontal are not supported right now. item.horizontal = parts.length > 1 && !!parts[1];
        }

        const choices = formItem.presentation.split(AddonModFeedbackProvider.LINE_SEP) || [];
        formItem.choices = choices.map((choice, index) => {
            const weightValue = choice.split(AddonModFeedbackProvider.MULTICHOICERATED_VALUE_SEP) || [''];
            choice = weightValue.length == 1 ? weightValue[0] : '(' + weightValue[0] + ') ' + weightValue[1];

            return { value: index + 1, label: choice };
        });

        if (formItem.subtype === 'r' && formItem.options.search(AddonModFeedbackProvider.MULTICHOICE_HIDENOSELECT) == -1) {
            formItem.choices.unshift({ value: 0, label: Translate.instant('addon.mod_feedback.not_selected') });
            formItem.value = typeof formItem.rawValue != 'undefined' ? Number(formItem.rawValue) : 0;
        } else if (formItem.subtype === 'd') {
            formItem.choices.unshift({ value: 0, label: '' });
            formItem.value = typeof formItem.rawValue != 'undefined' ? Number(formItem.rawValue) : 0;
        } else if (formItem.subtype === 'c') {
            if (typeof formItem.rawValue != 'undefined') {
                formItem.rawValue = String(formItem.rawValue);
                const values = formItem.rawValue.split(AddonModFeedbackProvider.LINE_SEP);
                formItem.choices.forEach((choice) => {
                    for (const x in values) {
                        if (choice.value == Number(values[x])) {
                            choice.checked = true;

                            return;
                        }
                    }
                });
            }
        } else {
            formItem.value = typeof formItem.rawValue != 'undefined' ? Number(formItem.rawValue) : '';
        }

        return formItem;
    }

    /**
     * Helper funtion for item type Captcha.
     *
     * @param item Item to process.
     * @return Item processed to show form.
     */
    protected getItemFormCaptcha(item: AddonModFeedbackItem): AddonModFeedbackCaptchaItem {
        const formItem: AddonModFeedbackCaptchaItem = Object.assign(item, {
            templateName: 'captcha',
            value: '',
            hasTextInput: false,
        });

        const data = <string[]> CoreTextUtils.parseJSON(item.otherdata);
        if (data && data.length > 3) {
            formItem.captcha = {
                recaptchapublickey: data[3],
            };
        }

        return formItem;
    }

    /**
     * Process and returns item to print form.
     *
     * @param item Item to process.
     * @param preview Previewing options.
     * @return Item processed to show form.
     */
    getItemForm(item: AddonModFeedbackItem, preview: boolean): AddonModFeedbackFormItem | undefined {
        switch (item.typ) {
            case 'label':
                return this.getItemFormLabel(item);
            case 'info':
                return this.getItemFormInfo(item);
            case 'numeric':
                return this.getItemFormNumeric(item);
            case 'textfield':
                return this.getItemFormTextfield(item);
            case 'textarea':
                return this.getItemFormTextarea(item);
            case 'multichoice':
                return this.getItemFormMultichoice(item);
            case 'multichoicerated':
                return this.getItemFormMultichoice(item);
            case 'pagebreak':
                if (!preview) {
                    // Pagebreaks are only used on preview.
                    return undefined;
                }
                break;
            case 'captcha':
                // Captcha is not supported right now. However label will be shown.
                return this.getItemFormCaptcha(item);
            default:
                return undefined;
        }
    }

    /**
     * Returns human-readable boundaries (min - max).
     * Based on Moodle's get_boundaries_for_display.
     *
     * @param rangeFrom Range from.
     * @param rangeTo Range to.
     * @return Human-readable boundaries.
     */
    protected getNumericBoundariesForDisplay(rangeFrom: number | string, rangeTo: number | string): string {
        const rangeFromSet = typeof rangeFrom == 'number';
        const rangeToSet = typeof rangeTo == 'number';

        if (!rangeFromSet && rangeToSet) {
            return ' (' + Translate.instant('addon.mod_feedback.maximal') + ': ' + CoreUtils.formatFloat(rangeTo) + ')';
        } else if (rangeFromSet && !rangeToSet) {
            return ' (' + Translate.instant('addon.mod_feedback.minimal') + ': ' + CoreUtils.formatFloat(rangeFrom) + ')';
        } else if (!rangeFromSet && !rangeToSet) {
            return '';
        }

        return ' (' + CoreUtils.formatFloat(rangeFrom) + ' - ' + CoreUtils.formatFloat(rangeTo) + ')';
    }

    /**
     * Check if a form item is multichoice.
     *
     * @param item Item.
     * @return Whether item is multichoice.
     */
    protected isMultiChoiceItem(item: AddonModFeedbackFormItem): item is AddonModFeedbackMultichoiceItem {
        return item.typ == 'multichoice';
    }

    /**
     * Check if a form item is numeric.
     *
     * @param item Item.
     * @return Whether item is numeric.
     */
    protected isNumericItem(item: AddonModFeedbackFormItem): item is AddonModFeedbackNumericItem {
        return item.typ == 'numeric';
    }

}

export const AddonModFeedbackHelper = makeSingleton(AddonModFeedbackHelperProvider);

/**
 * Attempt with some calculated data.
 */
export type AddonModFeedbackAttempt = AddonModFeedbackWSAttempt & {
    profileimageurl?: string;
};

/**
 * Non respondent with some calculated data.
 */
export type AddonModFeedbackNonRespondent = AddonModFeedbackWSNonRespondent & {
    profileimageurl?: string;
};

/**
 * Non respondents with some calculated data.
 */
export type AddonModFeedbackResponsesAnalysis = Omit<AddonModFeedbackGetResponsesAnalysisWSResponse, 'attempts'> & {
    attempts: AddonModFeedbackAttempt[];
};

/**
 * Non respondents with some calculated data.
 */
export type AddonModFeedbackGetNonRespondents = Omit<AddonModFeedbackGetNonRespondentsWSResponse, 'users'> & {
    users: AddonModFeedbackNonRespondent[];
};

/**
 * Item with form data.
 */
export type AddonModFeedbackFormItem =
    AddonModFeedbackFormBasicItem | AddonModFeedbackNumericItem | AddonModFeedbackTextItem | AddonModFeedbackMultichoiceItem |
    AddonModFeedbackCaptchaItem;

/**
 * Common calculated data for all form items.
 */
export type AddonModFeedbackFormBasicItem = AddonModFeedbackItem & {
    templateName: string;
    value: AddonModFeedbackResponseValue;
    hasTextInput: boolean;
    isEmpty?: boolean;
    hasError?: boolean;
};

/**
 * Numeric item.
 */
export type AddonModFeedbackNumericItem = AddonModFeedbackFormBasicItem & {
    rangefrom: number | string;
    rangeto: number | string;
    postfix?: string;
};

/**
 * Text item.
 */
export type AddonModFeedbackTextItem = AddonModFeedbackFormBasicItem & {
    length: number;
};

/**
 * Multichoice item.
 */
export type AddonModFeedbackMultichoiceItem = AddonModFeedbackFormBasicItem & {
    subtype: string;
    choices: { value: number; label: string; checked?: boolean }[];
};

/**
 * Captcha item.
 */
export type AddonModFeedbackCaptchaItem = AddonModFeedbackFormBasicItem & {
    captcha?: {
        recaptchapublickey: string;
    };
};
