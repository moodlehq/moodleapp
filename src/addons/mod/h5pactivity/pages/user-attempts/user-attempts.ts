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
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import {
    AddonModH5PActivity,
    AddonModH5PActivityAttempt,
    AddonModH5PActivityData,
    AddonModH5PActivityUserAttempts,
} from '../../services/h5pactivity';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays user attempts of a certain user.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-user-attempts',
    templateUrl: 'user-attempts.html',
    styleUrl: 'user-attempts.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModH5PActivityUserAttemptsPage implements OnInit {

    loaded = false;
    courseId!: number;
    cmId!: number;
    h5pActivity?: AddonModH5PActivityData;
    attemptsData?: AddonModH5PActivityUserAttempts;
    user?: CoreUserProfile;
    isCurrentUser = false;

    protected userId!: number;
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            if (!this.h5pActivity) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(AddonModH5PActivity.logViewReport(
                this.h5pActivity.id,
                { userId: this.userId },
            ));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_h5pactivity_log_report_viewed',
                name: this.h5pActivity.name,
                data: { id: this.h5pActivity.id, userid: this.userId, category: 'h5pactivity' },
                url: `/mod/h5pactivity/report.php?a=${this.h5pActivity.id}&userid=${this.userId}`,
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
            this.userId = CoreNavigator.getRouteNumberParam('userId') || CoreSites.getCurrentSiteUserId();
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.isCurrentUser = this.userId == CoreSites.getCurrentSiteUserId();

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

            await Promise.all([
                this.fetchAttempts(),
                this.fetchUserProfile(),
            ]);

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading attempts.' });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Get attempts.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchAttempts(): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        this.attemptsData = await AddonModH5PActivity.getUserAttempts(this.h5pActivity.id, {
            cmId: this.cmId,
            userId: this.userId,
        });
    }

    /**
     * Get user profile.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchUserProfile(): Promise<void> {
        try {
            this.user = await CoreUser.getProfile(this.userId, this.courseId, true);
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
            promises.push(AddonModH5PActivity.invalidateUserAttempts(this.h5pActivity.id, this.userId));
        }

        await CorePromiseUtils.ignoreErrors(Promise.all(promises));

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
