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
import { NavController } from 'ionic-angular';
import { AddonModFeedbackProvider } from './feedback';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Service that provides helper functions for feedbacks.
 */
@Injectable()
export class AddonModFeedbackHelperProvider {

      constructor(protected feedbackProvider: AddonModFeedbackProvider, protected userProvider: CoreUserProvider) {
    }

    /**
     * Check if the page we are going to open is in the history and returns the number of pages in the stack to go back.
     *
     * @param {string} pageName   Name of the page we want to navigate.
     * @param {number} instance   Activity instance Id. I.e FeedbackId.
     * @param {string} paramName  Param name where to find the instance number.
     * @param {string} prefix     Prefix to check if we are out of the activity context.
     * @return {number}   Returns the number of times the history needs to go back to find the specified page.
     */
    protected getActivityHistoryBackCounter(pageName: string, instance: number, paramName: string, prefix: string,
            navCtrl: NavController): number {
        let historyInstance, params,
            backTimes = 0,
            view = navCtrl.getActive();

        while (!view.isFirst()) {
            if (!view.name.startsWith(prefix)) {
                break;
            }

            params = view.getNavParams();

            historyInstance = params.get(paramName) ? params.get(paramName) : params.get('module').instance;

            // Check we are not changing to another activity.
            if (historyInstance && historyInstance == instance) {
                backTimes++;
            } else {
                break;
            }

            // Page found.
            if (view.name == pageName) {
                return view.index;
            }

            view = navCtrl.getPrevious(view);
        }

        return 0;
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
        const pageName = feature && feature != 'analysis' ? 'AddonModFeedback' + feature + 'Page' : 'AddonModFeedbackIndexPage';
        let backTimes = 0;

        const stateParams = {
            module: module,
            moduleId: module.id,
            courseId: courseId,
            feedbackId: module.instance,
            group: group
        };

        // Only check history if navigating through tabs.
        if (pageName == 'AddonModFeedbackIndexPage') {
            stateParams['tab'] = feature == 'analysis' ? 'analysis' : 'overview';
            backTimes = this.getActivityHistoryBackCounter(pageName, module.instance, 'feedbackId', 'AddonModFeedback', navCtrl);
        }

        if (backTimes > 0) {
            // Go back X times until the the page we want to reach.
            return navCtrl.remove(navCtrl.getActive().index, backTimes);
        }

        // Not found, open new state.
        return navCtrl.push(pageName, stateParams);
    }

}
