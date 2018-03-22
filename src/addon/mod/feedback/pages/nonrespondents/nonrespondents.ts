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

import { Component } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { AddonModFeedbackProvider } from '../../providers/feedback';
import { AddonModFeedbackHelperProvider } from '../../providers/helper';
import { CoreGroupInfo, CoreGroupsProvider } from '@providers/groups';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Page that displays feedback non respondents.
 */
@IonicPage({ segment: 'addon-mod-feedback-nonrespondents' })
@Component({
    selector: 'page-addon-mod-feedback-nonrespondents',
    templateUrl: 'nonrespondents.html',
})
export class AddonModFeedbackNonRespondentsPage {

    protected moduleId: number;
    protected feedbackId: number;
    protected courseId: number;
    protected page = 0;

    selectedGroup: number;
    groupInfo: CoreGroupInfo = {
        groups: [],
        separateGroups: false,
        visibleGroups: false
    };

    users = [];
    total = 0;
    canLoadMore = false;

    feedbackLoaded = false;
    loadingMore = false;

    constructor(navParams: NavParams, protected feedbackProvider: AddonModFeedbackProvider,
            protected groupsProvider: CoreGroupsProvider, protected domUtils: CoreDomUtilsProvider,
            protected feedbackHelper: AddonModFeedbackHelperProvider, protected navCtrl: NavController) {
        const module = navParams.get('module');
        this.moduleId = module.id;
        this.feedbackId = module.instance;
        this.courseId = navParams.get('courseId');
        this.selectedGroup = navParams.get('group') || 0;
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        this.page = 0;
        this.total = 0;
        this.users = [];

        return this.groupsProvider.getActivityGroupInfo(this.moduleId).then((groupInfo) => {
            this.groupInfo = groupInfo;

            return this.loadGroupUsers(this.selectedGroup);
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);

            if (!refresh) {
                // Some call failed on first fetch, go back.
                this.navCtrl.pop();
            }

            return Promise.reject(null);
        });
    }

    /**
     * Load Group responses.
     *
     * @param  {number} [groupId]   If defined it will change group if not, it will load more users for the same group.
     * @return {Promise<any>}       Resolved with the attempts loaded.
     */
    protected loadGroupUsers(groupId?: number): Promise<any> {
        if (typeof groupId == 'undefined') {
            this.page++;
            this.loadingMore = true;
        } else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.total = 0;
            this.users = [];
            this.feedbackLoaded = false;
        }

        return this.feedbackHelper.getNonRespondents(this.feedbackId, this.selectedGroup, this.page).then((response) => {
            this.total = response.total;

            if (this.users.length < response.total) {
                this.users = this.users.concat(response.users);
            }

            this.canLoadMore = this.users.length < response.total;

            return response;
        }).finally(() => {
            this.loadingMore = false;
            this.feedbackLoaded = true;
        });
    }

    /**
     * Change selected group or load more users.
     *
     * @param {number} [groupId] Group ID selected. If not defined, it will load more users.
     */
    loadAttempts(groupId?: number): void {
        this.loadGroupUsers(groupId).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        });
    }

    /**
     * Refresh the attempts.
     *
     * @param {any} refresher Refresher.
     */
    refreshFeedback(refresher: any): void {
        if (this.feedbackLoaded) {
            const promises = [];

            promises.push(this.feedbackProvider.invalidateNonRespondentsData(this.feedbackId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.moduleId));

            Promise.all(promises).finally(() => {
                return this.fetchData(true);
            }).finally(() => {
                refresher.complete();
            });
        }
    }
}
