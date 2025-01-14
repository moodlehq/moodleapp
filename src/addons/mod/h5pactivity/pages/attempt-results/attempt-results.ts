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

import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import {
    AddonModH5PActivity,
    AddonModH5PActivityData,
    AddonModH5PActivityAttemptResults,
} from '../../services/h5pactivity';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_H5PACTIVITY_COMPONENT } from '../../constants';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that displays results of an attempt.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-attempt-results',
    templateUrl: 'attempt-results.html',
    styleUrl: 'attempt-results.scss',
})
export class AddonModH5PActivityAttemptResultsPage implements OnInit {

    loaded = false;
    h5pActivity?: AddonModH5PActivityData;
    attempt?: AddonModH5PActivityAttemptResults;
    user?: CoreUserProfile;
    component = ADDON_MOD_H5PACTIVITY_COMPONENT;
    courseId!: number;
    cmId!: number;

    protected attemptId!: number;
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            if (!this.h5pActivity) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(AddonModH5PActivity.logViewReport(
                this.h5pActivity.id,
                { attemptId: this.attemptId },
            ));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_h5pactivity_log_report_viewed',
                name: this.h5pActivity.name,
                data: { id: this.h5pActivity.id, attemptid: this.attemptId, category: 'h5pactivity' },
                url: `/mod/h5pactivity/report.php?a=${this.h5pActivity.id}&attemptid=${this.attemptId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.attemptId = CoreNavigator.getRequiredRouteNumberParam('attemptId');
        } catch (error) {
            CoreAlerts.showError(error);
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
    doRefresh(refresher: HTMLIonRefresherElement): void {
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

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading attempt.' });
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

        await CorePromiseUtils.ignoreErrors(Promise.all(promises));

        await this.fetchData();
    }

}
