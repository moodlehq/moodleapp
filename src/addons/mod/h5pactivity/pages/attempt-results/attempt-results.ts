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
import { IonRefresher } from '@ionic/angular';

import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModH5PActivity,
    AddonModH5PActivityProvider,
    AddonModH5PActivityData,
    AddonModH5PActivityAttemptResults,
} from '../../services/h5pactivity';

/**
 * Page that displays results of an attempt.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-attempt-results',
    templateUrl: 'attempt-results.html',
    styleUrls: ['attempt-results.scss'],
})
export class AddonModH5PActivityAttemptResultsPage implements OnInit {

    loaded = false;
    h5pActivity?: AddonModH5PActivityData;
    attempt?: AddonModH5PActivityAttemptResults;
    user?: CoreUserProfile;
    component = AddonModH5PActivityProvider.COMPONENT;
    courseId!: number;
    cmId!: number;

    protected attemptId!: number;
    protected fetchSuccess = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.attemptId = CoreNavigator.getRequiredRouteNumberParam('attemptId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        await this.fetchData();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher: IonRefresher): void {
        this.refreshData().finally(() => {
            refresher.complete();
        });
    }

    /**
     * Get quiz data and attempt data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        try {
            this.h5pActivity = await AddonModH5PActivity.getH5PActivity(this.courseId, this.cmId);

            this.attempt = await AddonModH5PActivity.getAttemptResults(this.h5pActivity.id, this.attemptId, {
                cmId: this.cmId,
            });

            await this.fetchUserProfile();

            if (!this.fetchSuccess) {
                this.fetchSuccess = true;
                CoreUtils.ignoreErrors(AddonModH5PActivity.logViewReport(
                    this.h5pActivity.id,
                    this.h5pActivity.name,
                    { attemptId: this.attemptId },
                ));
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading attempt.');
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Get user profile.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchUserProfile(): Promise<void> {
        if (!this.attempt) {
            return;
        }

        try {
            this.user = await CoreUser.getProfile(this.attempt.userid, this.courseId, true);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Refresh the data.
     *
     * @returns Promise resolved when done.
     */
    protected async refreshData(): Promise<void> {
        const promises = [
            AddonModH5PActivity.invalidateActivityData(this.courseId),
        ];

        if (this.h5pActivity) {
            promises.push(AddonModH5PActivity.invalidateAttemptResults(this.h5pActivity.id, this.attemptId));
        }

        await CoreUtils.ignoreErrors(Promise.all(promises));

        await this.fetchData();
    }

}
