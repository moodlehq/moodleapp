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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreUser } from '@core/user/providers/user';
import {
    AddonModH5PActivity, AddonModH5PActivityProvider, AddonModH5PActivityData, AddonModH5PActivityAttemptResults
} from '../../providers/h5pactivity';

/**
 * Page that displays results of an attempt.
 */
@IonicPage({ segment: 'addon-mod-h5pactivity-attempt-results' })
@Component({
    selector: 'page-addon-mod-h5pactivity-attempt-results',
    templateUrl: 'attempt-results.html',
})
export class AddonModH5PActivityAttemptResultsPage implements OnInit {
    loaded: boolean;
    h5pActivity: AddonModH5PActivityData;
    attempt: AddonModH5PActivityAttemptResults;
    user: any;
    component = AddonModH5PActivityProvider.COMPONENT;

    protected courseId: number;
    protected h5pActivityId: number;
    protected attemptId: number;

    constructor(navParams: NavParams) {
        this.courseId = navParams.get('courseId');
        this.h5pActivityId = navParams.get('h5pActivityId');
        this.attemptId = navParams.get('attemptId');
    }

    /**
     * Component being initialized.
     *
     * @return Promise resolved when done.
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.fetchData();
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading attempt.');
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher: any): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get quiz data and attempt data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        await Promise.all([
            this.fetchActivity(),
            this.fetchAttempt(),
        ]);

        await this.fetchUserProfile();
    }

    /**
     * Get activity data.
     *
     * @return Promise resolved when done.
     */
    protected async fetchActivity(): Promise<void> {
        this.h5pActivity = await AddonModH5PActivity.instance.getH5PActivityById(this.courseId, this.h5pActivityId);
    }

    /**
     * Get attempts.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAttempt(): Promise<void> {
        this.attempt = await AddonModH5PActivity.instance.getAttemptResults(this.h5pActivityId, this.attemptId);
    }

    /**
     * Get user profile.
     *
     * @return Promise resolved when done.
     */
    protected async fetchUserProfile(): Promise<void> {
        try {
            this.user = await CoreUser.instance.getProfile(this.attempt.userid, this.courseId, true);
        } catch (error) {
            // Ignore errors.
        }
    }

    /**
     * Refresh the data.
     *
     * @return Promise resolved when done.
     */
    protected async refreshData(): Promise<void> {

        try {
            await Promise.all([
                AddonModH5PActivity.instance.invalidateActivityData(this.courseId),
                AddonModH5PActivity.instance.invalidateAttemptResults(this.h5pActivityId, this.attemptId),
            ]);
        } catch (error) {
            // Ignore errors.
        }

        await this.fetchData();
    }
}
