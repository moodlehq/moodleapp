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
import { NavController, ViewController } from 'ionic-angular';
import { AddonModFeedbackProvider } from './feedback';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreContentLinksHelperProvider } from '@core/contentlinks/providers/helper';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { TranslateService } from '@ngx-translate/core';

/**
 * Service that provides helper functions for feedbacks.
 */
@Injectable()
export class AddonModFeedbackHelperProvider {

    protected MODE_RESPONSETIME = 1;
    protected MODE_COURSE = 2;
    protected MODE_CATEGORY = 3;

    constructor(protected feedbackProvider: AddonModFeedbackProvider, protected userProvider: CoreUserProvider,
            protected textUtils: CoreTextUtilsProvider, protected translate: TranslateService,
            protected timeUtils: CoreTimeUtilsProvider, protected domUtils: CoreDomUtilsProvider,
            protected courseProvider: CoreCourseProvider, protected linkHelper: CoreContentLinksHelperProvider,
            protected sitesProvider: CoreSitesProvider, protected utils: CoreUtilsProvider) {
    }

    /**
     * Check if the page we are going to open is in the history and returns the view controller in the stack to go back.
     *
     * @param {string} pageName       Name of the page we want to navigate.
     * @param {number} instance       Activity instance Id. I.e FeedbackId.
     * @param {string} paramName      Param name where to find the instance number.
     * @param {string} prefix         Prefix to check if we are out of the activity context.
     * @param {NavController} navCtrl Nav Controller of the view.
     * @return {ViewController}   Returns view controller found or null.
     */
    protected getPageView(pageName: string, instance: number, paramName: string, prefix: string,
            navCtrl: NavController): ViewController {
        let historyInstance, params,
            view = navCtrl.getActive();

        while (!view.isFirst()) {
            if (!view.name.startsWith(prefix)) {
                break;
            }

            params = view.getNavParams();

            historyInstance = params.get(paramName) ? params.get(paramName) : params.get('module').instance;

            // Check we are not changing to another activity.
            if (!historyInstance || historyInstance != instance) {
                break;
            }

            // Page found.
            if (view.name == pageName) {
                return view;
            }

            view = navCtrl.getPrevious(view);
        }

        return null;
    }

    /**
     * Retrieves a list of students who didn't submit the feedback with extra info.
     *
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {number}    page            The page of records to return.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getNonRespondents(feedbackId: number, groupId: number, page: number): Promise<any> {
        return this.feedbackProvider.getNonRespondents(feedbackId, groupId, page).then((responses) => {
            return this.addImageProfileToAttempts(responses.users).then((users) => {
                responses.users = users;

                return responses;
            });
        });
    }

    /**
     * Get page items responses to be sent.
     *
     * @param   {any[]} items    Items where the values are.
     * @return  {any}            Responses object to be sent.
     */
    getPageItemsResponses(items: any[]): any {
        const responses = {};

        items.forEach((itemData) => {
            let answered = false;

            itemData.hasError = false;

            if (itemData.typ == 'captcha') {
                const value = itemData.value || '',
                    name = itemData.typ + '_' + itemData.id;

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
                let name, value;
                const nameTemp = itemData.typ + '_' + itemData.id;

                if (itemData.typ == 'multichoice' && itemData.subtype == 'c') {
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
                    if (itemData.typ == 'multichoice' && itemData.subtype != 'r') {
                        name = nameTemp + '[0]';
                    } else {
                        name = nameTemp;
                    }

                    if (itemData.typ == 'multichoice' || itemData.typ == 'multichoicerated') {
                        value = itemData.value || 0;
                    } else if (itemData.typ == 'numeric') {
                        value = itemData.value || itemData.value  == 0 ? itemData.value : '';

                        if (value != '') {
                            if ((itemData.rangefrom != '' && value < itemData.rangefrom) ||
                                    (itemData.rangeto != '' && value > itemData.rangeto)) {
                                itemData.hasError = true;
                            }
                        }
                    } else {
                        value = itemData.value || itemData.value  == 0 ? itemData.value : '';
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
     * @param   {number}    feedbackId      Feedback ID.
     * @param   {number}    groupId         Group id, 0 means that the function will determine the user group.
     * @param   {number}    page            The page of records to return.
     * @return  {Promise<any>}              Promise resolved when the info is retrieved.
     */
    getResponsesAnalysis(feedbackId: number, groupId: number, page: number): Promise<any> {
        return this.feedbackProvider.getResponsesAnalysis(feedbackId, groupId, page).then((responses) => {
            return this.addImageProfileToAttempts(responses.attempts).then((attempts) => {
                responses.attempts = attempts;

                return responses;
            });
        });
    }

    /**
     * Handle a show entries link.
     *
     * @param {NavController} navCtrl Nav controller to use to navigate. Can be undefined/null.
     * @param {any} params URL params.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    handleShowEntriesLink(navCtrl: NavController, params: any, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const modal = this.domUtils.showModalLoading(),
            moduleId = params.id;

        return this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
            let stateParams;

            if (typeof params.showcompleted == 'undefined') {
                // Param showcompleted not defined. Show entry list.
                stateParams = {
                    module: module,
                    courseId: module.course
                };

                return this.linkHelper.goInSite(navCtrl, 'AddonModFeedbackRespondentsPage', stateParams, siteId);
            }

            return this.feedbackProvider.getAttempt(module.instance, params.showcompleted, true, siteId).then((attempt) => {
                stateParams = {
                    moduleId: module.id,
                    attempt: attempt,
                    feedbackId: module.instance,
                    courseId: module.course
                };

                return this.linkHelper.goInSite(navCtrl, 'AddonModFeedbackAttemptPage', stateParams, siteId);
            });
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Add Image profile url field on attempts
     *
     * @param  {any}          attempts Attempts array to get profile from.
     * @return {Promise<any>}          Returns the same array with the profileimageurl added if found.
     */
    protected addImageProfileToAttempts(attempts: any): Promise<any> {
        const promises = attempts.map((attempt) => {
            return this.userProvider.getProfile(attempt.userid, attempt.courseid, true).then((user) => {
                attempt.profileimageurl = user.profileimageurl;
            }).catch(() => {
                // Error getting profile, resolve promise without adding any extra data.
            });
        });

        return Promise.all(promises).then(() => {
            return attempts;
        });
    }

    /**
     * Helper function to open a feature in the app.
     *
     * @param {string}        feature   Name of the feature to open.
     * @param {NavController} navCtrl   NavController.
     * @param {any}           module    Course module activity object.
     * @param {number}        courseId  Course Id.
     * @param {number}        [group=0] Course module activity object.
     * @return {Promise<void>}    Resolved when navigation animation is done.
     */
    openFeature(feature: string, navCtrl: NavController, module: any, courseId: number, group: number = 0): Promise<void> {
        const pageName = feature && feature != 'analysis' ? 'AddonModFeedback' + feature + 'Page' : 'AddonModFeedbackIndexPage',
            stateParams = {
                module: module,
                moduleId: module.id,
                courseId: courseId,
                feedbackId: module.instance,
                group: group
            };

        // Only check history if navigating through tabs.
        if (pageName == 'AddonModFeedbackIndexPage') {
            stateParams['tab'] = feature == 'analysis' ? 'analysis' : 'overview';
            const view = this.getPageView(pageName, module.instance, 'feedbackId', 'AddonModFeedback', navCtrl);

            if (view) {
                // Go back to the found page.
                return navCtrl.popTo(view);
            }
        }

        // Not found, open new state.
        return navCtrl.push(pageName, stateParams);
    }

    /**
     * Helper funtion for item type Label.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormLabel(item: any): any {
        item.template = 'label';
        item.name = '';
        item.presentation = this.textUtils.replacePluginfileUrls(item.presentation, item.itemfiles);

        return item;
    }

    /**
     * Helper funtion for item type Info.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormInfo(item: any): any {
        item.template = 'label';

        const type = parseInt(item.presentation, 10);

        if (type == this.MODE_COURSE || type == this.MODE_CATEGORY) {
            item.presentation = item.otherdata;
            item.value = typeof item.rawValue != 'undefined' ? item.rawValue : item.otherdata;
        } else if (type == this.MODE_RESPONSETIME) {
            item.value = '__CURRENT__TIMESTAMP__';
            const tempValue = typeof item.rawValue != 'undefined' ? item.rawValue * 1000 : new Date().getTime();
            item.presentation = this.timeUtils.userDate(tempValue);
        } else {
            // Errors on item, return false.
            return false;
        }

        return item;
    }

    /**
     * Helper funtion for item type Numeric.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormNumeric(item: any): any {
        item.template = 'numeric';

        const range = item.presentation.split(AddonModFeedbackProvider.LINE_SEP) || [];
        range[0] = range.length > 0 ? parseInt(range[0], 10) : undefined;
        range[1] = range.length > 1 ? parseInt(range[1], 10) : undefined;

        item.rangefrom = typeof range[0] == 'number' && !isNaN(range[0]) ? range[0] : '';
        item.rangeto = typeof range[1] == 'number' && !isNaN(range[1]) ? range[1] : '';
        item.value = typeof item.rawValue != 'undefined' ? parseFloat(item.rawValue) : '';
        item.postfix = this.getNumericBoundariesForDisplay(item.rangefrom, item.rangeto);

        return item;
    }

    /**
     * Helper funtion for item type Text field.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormTextfield(item: any): any {
        item.template = 'textfield';
        item.length = item.presentation.split(AddonModFeedbackProvider.LINE_SEP)[1] || 255;
        item.value = typeof item.rawValue != 'undefined' ? item.rawValue : '';

        return item;
    }

    /**
     * Helper funtion for item type Textarea.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormTextarea(item: any): any {
        item.template = 'textarea';
        item.value = typeof item.rawValue != 'undefined' ? item.rawValue : '';

        return item;
    }

    /**
     * Helper funtion for item type Multichoice.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormMultichoice(item: any): any {
        let parts = item.presentation.split(AddonModFeedbackProvider.MULTICHOICE_TYPE_SEP) || [];
        item.subtype = parts.length > 0 && parts[0] ? parts[0] : 'r';
        item.template = 'multichoice-' + item.subtype;

        item.presentation = parts.length > 1 ? parts[1] : '';
        if (item.subtype != 'd') {
            parts = item.presentation.split(AddonModFeedbackProvider.MULTICHOICE_ADJUST_SEP) || [];
            item.presentation = parts.length > 0 ? parts[0] : '';
            // Horizontal are not supported right now. item.horizontal = parts.length > 1 && !!parts[1];
        }

        item.choices = item.presentation.split(AddonModFeedbackProvider.LINE_SEP) || [];
        item.choices = item.choices.map((choice, index) => {
            const weightValue = choice.split(AddonModFeedbackProvider.MULTICHOICERATED_VALUE_SEP) || [''];
            choice = weightValue.length == 1 ? weightValue[0] : '(' + weightValue[0] + ') ' + weightValue[1];

            return {value: index + 1, label: choice};
        });

        if (item.subtype === 'r' && item.options.search(AddonModFeedbackProvider.MULTICHOICE_HIDENOSELECT) == -1) {
            item.choices.unshift({value: 0, label: this.translate.instant('addon.mod_feedback.not_selected')});
            item.value = typeof item.rawValue != 'undefined' ? parseInt(item.rawValue, 10) : 0;
        } else if (item.subtype === 'd') {
            item.choices.unshift({value: 0, label: ''});
            item.value = typeof item.rawValue != 'undefined' ? parseInt(item.rawValue, 10) : 0;
        } else if (item.subtype === 'c') {
            if (typeof item.rawValue == 'undefined') {
                item.value = '';
            } else {
                item.rawValue = '' + item.rawValue;
                const values = item.rawValue.split(AddonModFeedbackProvider.LINE_SEP);
                item.choices.forEach((choice) => {
                    for (const x in values) {
                        if (choice.value == values[x]) {
                            choice.checked = true;

                            return;
                        }
                    }
                });
            }
        } else {
            item.value = typeof item.rawValue != 'undefined' ? parseInt(item.rawValue, 10) : '';
        }

        return item;
    }

    /**
     * Helper funtion for item type Captcha.
     *
     * @param  {any} item Item to process.
     * @return {any}      Item processed to show form.
     */
    protected getItemFormCaptcha(item: any): any {
        const data = this.textUtils.parseJSON(item.otherdata);
        if (data && data.length > 3) {
            item.captcha = {
                recaptchapublickey: data[3]
            };
        }
        item.template = 'captcha';
        item.value = '';

        return item;
    }

    /**
     * Process and returns item to print form.
     *
     * @param {any}  item        Item to process.
     * @param {boolean} preview  Previewing options.
     * @return {any}             Item processed to show form.
     */
    getItemForm(item: any, preview: boolean): any {
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
                    return false;
                }
                break;
            case 'captcha':
                // Captcha is not supported right now. However label will be shown.
                return this.getItemFormCaptcha(item);
            default:
                return false;
        }

        return item;
    }

    /**
     * Returns human-readable boundaries (min - max).
     * Based on Moodle's get_boundaries_for_display.
     *
     * @param {number} rangeFrom Range from.
     * @param {number} rangeTo Range to.
     * @return {string} Human-readable boundaries.
     */
    protected getNumericBoundariesForDisplay(rangeFrom: number, rangeTo: number): string {
        const rangeFromSet = typeof rangeFrom == 'number',
            rangeToSet = typeof rangeTo == 'number';

        if (!rangeFromSet && rangeToSet) {
            return ' (' + this.translate.instant('addon.mod_feedback.maximal') + ': ' + this.utils.formatFloat(rangeTo) + ')';
        } else if (rangeFromSet && !rangeToSet) {
            return ' (' + this.translate.instant('addon.mod_feedback.minimal') + ': ' + this.utils.formatFloat(rangeFrom) + ')';
        } else if (!rangeFromSet && !rangeToSet) {
            return '';
        }

        return ' (' + this.utils.formatFloat(rangeFrom) + ' - ' + this.utils.formatFloat(rangeTo) + ')';
    }

}
