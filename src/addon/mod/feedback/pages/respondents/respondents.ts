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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { AddonModFeedbackProvider } from '../../providers/feedback';
import { AddonModFeedbackHelperProvider } from '../../providers/helper';
import { CoreGroupInfo, CoreGroupsProvider } from '@providers/groups';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays feedback respondents.
 */
@IonicPage({ segment: 'addon-mod-feedback-respondents' })
@Component({
    selector: 'page-addon-mod-feedback-respondents',
    templateUrl: 'respondents.html',
})
export class AddonModFeedbackRespondentsPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

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

    responses = {
        attempts: [],
        total: 0,
        canLoadMore: false
    };
    anonResponses = {
        attempts: [],
        total: 0,
        canLoadMore: false
    };
    feedbackLoaded = false;
    loadingMore = false;
    attemptId: number;

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
        this.fetchData().then(() => {
            if (this.splitviewCtrl.isOn()) {
                if (this.responses.attempts.length > 0) {
                    // Take first and load it.
                    this.gotoAttempt(this.responses.attempts[0]);
                } else if (this.anonResponses.attempts.length > 0) {
                    // Take first and load it.
                    this.gotoAttempt(this.anonResponses.attempts[0]);
                }
            }
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param refresh Empty events array first.
     * @return Promise resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        this.page = 0;
        this.responses.total = 0;
        this.responses.attempts = [];
        this.anonResponses.total = 0;
        this.anonResponses.attempts = [];

        return this.groupsProvider.getActivityGroupInfo(this.moduleId).then((groupInfo) => {
            this.groupInfo = groupInfo;
            this.selectedGroup = this.groupsProvider.validateGroupId(this.selectedGroup, groupInfo);

            return this.loadGroupAttempts(this.selectedGroup);
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
     * Load Group attempts.
     *
     * @param groupId If defined it will change group if not, it will load more attempts for the same group.
     * @return Resolved with the attempts loaded.
     */
    protected loadGroupAttempts(groupId?: number): Promise<any> {
        if (typeof groupId == 'undefined') {
            this.page++;
            this.loadingMore = true;
        } else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.responses.total = 0;
            this.responses.attempts = [];
            this.anonResponses.total = 0;
            this.anonResponses.attempts = [];
            this.feedbackLoaded = false;
        }

        return this.feedbackHelper.getResponsesAnalysis(this.feedbackId, this.selectedGroup, this.page).then((responses) => {
            this.responses.total = responses.totalattempts;
            this.anonResponses.total = responses.totalanonattempts;

            if (this.anonResponses.attempts.length < responses.totalanonattempts) {
                this.anonResponses.attempts = this.anonResponses.attempts.concat(responses.anonattempts);
            }
            if (this.responses.attempts.length < responses.totalattempts) {
                this.responses.attempts = this.responses.attempts.concat(responses.attempts);
            }

            this.anonResponses.canLoadMore = this.anonResponses.attempts.length < responses.totalanonattempts;
            this.responses.canLoadMore = this.responses.attempts.length < responses.totalattempts;

            return responses;
        }).finally(() => {
            this.loadingMore = false;
            this.feedbackLoaded = true;
        });
    }

    /**
     * Navigate to a particular attempt.
     *
     * @param attempt Attempt object to load.
     */
    gotoAttempt(attempt: any): void {
        this.attemptId = attempt.id;
        this.splitviewCtrl.push('AddonModFeedbackAttemptPage', {
            attemptId: attempt.id,
            attempt: attempt,
            feedbackId: this.feedbackId,
            moduleId: this.moduleId,
            courseId: this.courseId
        });
    }

    /**
     * Change selected group or load more attempts.
     *
     * @param groupId Group ID selected. If not defined, it will load more attempts.
     */
    loadAttempts(groupId?: number): void {
        this.loadGroupAttempts(groupId).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'core.course.errorgetmodule', true);
        });
    }

    /**
     * Refresh the attempts.
     *
     * @param refresher Refresher.
     */
    refreshFeedback(refresher: any): void {
        if (this.feedbackLoaded) {
            const promises = [];

            promises.push(this.feedbackProvider.invalidateResponsesAnalysisData(this.feedbackId));
            promises.push(this.groupsProvider.invalidateActivityGroupInfo(this.moduleId));

            Promise.all(promises).finally(() => {
                return this.fetchData(true);
            }).finally(() => {
                refresher.complete();
            });
        }
    }
}
