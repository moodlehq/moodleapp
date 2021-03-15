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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModH5PActivity,
    AddonModH5PActivityAttempt,
    AddonModH5PActivityData,
    AddonModH5PActivityUserAttempts,
} from '../../services/h5pactivity';

/**
 * Page that displays user attempts of a certain user.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-user-attempts',
    templateUrl: 'user-attempts.html',
    styleUrls: ['user-attempts.scss'],
})
export class AddonModH5PActivityUserAttemptsPage implements OnInit {

    loaded = false;
    courseId!: number;
    cmId!: number;
    h5pActivity?: AddonModH5PActivityData;
    attemptsData?: AddonModH5PActivityUserAttempts;
    user?: CoreUserProfile;
    isCurrentUser = false;

    protected userId!: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.userId = CoreNavigator.getRouteNumberParam('userId') || CoreSites.getCurrentSiteUserId();
        this.isCurrentUser = this.userId == CoreSites.getCurrentSiteUserId();

        try {
            await this.fetchData();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading attempts.');
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
        this.attemptsData = await AddonModH5PActivity.getUserAttempts(this.h5pActivity!.id, {
            cmId: this.cmId,
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
            this.user = await CoreUser.getProfile(this.userId, this.courseId, true);
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
            promises.push(AddonModH5PActivity.invalidateUserAttempts(this.h5pActivity.id, this.userId));
        }

        await CoreUtils.ignoreErrors(Promise.all(promises));

        await this.fetchData();
    }

    /**
     * Open the page to view an attempt.
     *
     * @param attempt Attempt.
     */
    openAttempt(attempt: AddonModH5PActivityAttempt): void {
        CoreNavigator.navigate(`../../attemptresults/${attempt.id}`);
    }

}
