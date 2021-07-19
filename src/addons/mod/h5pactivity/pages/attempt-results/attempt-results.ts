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

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.attemptId = CoreNavigator.getRouteNumberParam('attemptId')!;

        try {
            await this.fetchData();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading attempt.');
        } finally {
            this.loaded = true;
        }
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
     * @return Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        this.h5pActivity = await AddonModH5PActivity.getH5PActivity(this.courseId, this.cmId);

        this.attempt = await AddonModH5PActivity.getAttemptResults(this.h5pActivity.id, this.attemptId, {
            cmId: this.cmId,
        });

        await this.fetchUserProfile();
    }

    /**
     * Get user profile.
     *
     * @return Promise resolved when done.
     */
    protected async fetchUserProfile(): Promise<void> {
        try {
            this.user = await CoreUser.getProfile(this.attempt!.userid, this.courseId, true);
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
