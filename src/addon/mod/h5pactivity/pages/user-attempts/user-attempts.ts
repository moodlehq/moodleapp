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
import { CoreSites } from '@providers/sites';
import { CoreDomUtils } from '@providers/utils/dom';
import { CoreUser } from '@core/user/providers/user';
import {
    AddonModH5PActivity, AddonModH5PActivityData, AddonModH5PActivityUserAttempts
} from '../../providers/h5pactivity';

/**
 * Page that displays user attempts of a certain user.
 */
@IonicPage({ segment: 'addon-mod-h5pactivity-user-attempts' })
@Component({
    selector: 'page-addon-mod-h5pactivity-user-attempts',
    templateUrl: 'user-attempts.html',
})
export class AddonModH5PActivityUserAttemptsPage implements OnInit {
    loaded: boolean;
    courseId: number;
    h5pActivityId: number;
    h5pActivity: AddonModH5PActivityData;
    attemptsData: AddonModH5PActivityUserAttempts;
    user: any;
    isCurrentUser: boolean;

    protected userId: number;

    constructor(navParams: NavParams) {
        this.courseId = navParams.get('courseId');
        this.h5pActivityId = navParams.get('h5pActivityId');
        this.userId = navParams.get('userId') || CoreSites.instance.getCurrentSiteUserId();
        this.isCurrentUser = this.userId == CoreSites.instance.getCurrentSiteUserId();
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
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading attempts.');
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
        this.h5pActivity = await AddonModH5PActivity.instance.getH5PActivityById(this.courseId, this.h5pActivityId);

        await Promise.all([
            this.fetchAttempts(),
            this.fetchUserProfile(),
        ]);
    }

    /**
     * Get attempts.
     *
     * @return Promise resolved when done.
     */
    protected async fetchAttempts(): Promise<void> {
        this.attemptsData = await AddonModH5PActivity.instance.getUserAttempts(this.h5pActivityId, {
            cmId: this.h5pActivity.coursemodule,
            userId: this.userId,
        });
    }

    /**
     * Get user profile.
     *
     * @return Promise resolved when done.
     */
    protected async fetchUserProfile(): Promise<void> {
        try {
            this.user = await CoreUser.instance.getProfile(this.userId, this.courseId, true);
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
                AddonModH5PActivity.instance.invalidateUserAttempts(this.h5pActivityId, this.userId),
            ]);
        } catch (error) {
            // Ignore errors.
        }

        await this.fetchData();
    }
}
