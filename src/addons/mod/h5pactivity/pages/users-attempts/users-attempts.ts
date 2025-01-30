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
    AddonModH5PActivityUserAttempts,
} from '../../services/h5pactivity';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { AddonModH5PActivityGradeMethod } from '../../constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays all users that can attempt an H5P activity.
 */
@Component({
    selector: 'page-addon-mod-h5pactivity-users-attempts',
    templateUrl: 'users-attempts.html',
    styleUrl: 'users-attempts.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModH5PActivityUsersAttemptsPage implements OnInit {

    loaded = false;
    courseId!: number;
    cmId!: number;
    h5pActivity?: AddonModH5PActivityData;
    users: AddonModH5PActivityUserAttemptsFormatted[] = [];
    fetchMoreUsersFailed = false;
    canLoadMore = false;

    protected page = 0;
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            if (!this.h5pActivity) {
                return;
            }

            await CorePromiseUtils.ignoreErrors(AddonModH5PActivity.logViewReport(this.h5pActivity.id));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_h5pactivity_log_report_viewed',
                name: this.h5pActivity.name,
                data: { id: this.h5pActivity.id, category: 'h5pactivity' },
                url: `/mod/h5pactivity/report.php?a=${this.h5pActivity.id}`,
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
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.fetchData();
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
     * @param refresh Whether user is refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchData(refresh?: boolean): Promise<void> {
        try {
            this.h5pActivity = await AddonModH5PActivity.getH5PActivity(this.courseId, this.cmId);

            await Promise.all([
                this.fetchUsers(refresh),
            ]);

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading attempts.' });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Get users.
     *
     * @param refresh Whether user is refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchUsers(refresh?: boolean): Promise<void> {
        if (!this.h5pActivity) {
            return;
        }

        if (refresh) {
            this.page = 0;
        }

        const result = await AddonModH5PActivity.getUsersAttempts(this.h5pActivity.id, {
            cmId: this.cmId,
            page: this.page,
        });

        const formattedUsers = await this.formatUsers(this.h5pActivity, result.users);

        if (this.page === 0) {
            this.users = formattedUsers;
        } else {
            this.users = this.users.concat(formattedUsers);
        }

        this.canLoadMore = result.canLoadMore;
        this.page++;
    }

    /**
     * Format users data.
     *
     * @param h5pActivity Activity data.
     * @param users Users to format.
     * @returns Formatted users.
     */
    protected async formatUsers(
        h5pActivity: AddonModH5PActivityData,
        users: AddonModH5PActivityUserAttempts[],
    ): Promise<AddonModH5PActivityUserAttemptsFormatted[]> {
        return Promise.all(users.map(async (user: AddonModH5PActivityUserAttemptsFormatted) => {
            user.user = await CoreUser.getProfile(user.userid, this.courseId, true);

            // Calculate the score of the user.
            if (h5pActivity.grademethod === AddonModH5PActivityGradeMethod.GRADEMANUAL) {
                // No score.
            } else if (h5pActivity.grademethod === AddonModH5PActivityGradeMethod.GRADEAVERAGEATTEMPT) {
                if (user.attempts.length) {
                    // Calculate the average.
                    const sumScores = user.attempts.reduce((sumScores, attempt) =>
                        sumScores + attempt.rawscore * 100 / attempt.maxscore, 0);

                    user.score = Math.round(sumScores / user.attempts.length);
                }
            } else if (user.scored?.attempts[0]) {
                // Only a single attempt used to calculate the grade. Use it.
                user.score = Math.round(user.scored.attempts[0].rawscore * 100 / user.scored.attempts[0].maxscore);
            }

            return user;
        }));
    }

    /**
     * Load a new batch of users.
     *
     * @param complete Completion callback.
     */
    async fetchMoreUsers(complete: () => void): Promise<void> {
        try {
            await this.fetchUsers(false);
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading more users' });

            this.fetchMoreUsersFailed = true;
        }

        complete();
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
            promises.push(AddonModH5PActivity.invalidateAllUsersAttempts(this.h5pActivity.id));
        }

        await CorePromiseUtils.ignoreErrors(Promise.all(promises));

        await this.fetchData(true);
    }

    /**
     * Open the page to view a user attempts.
     *
     * @param user User to open.
     */
    openUser(user: AddonModH5PActivityUserAttemptsFormatted): void {
        if (!user.attempts.length) {
            return;
        }

        CoreNavigator.navigate(`../userattempts/${user.userid}`);
    }

}

/**
 * User attempts data with some calculated data.
 */
type AddonModH5PActivityUserAttemptsFormatted = AddonModH5PActivityUserAttempts & {
    user?: CoreUserProfile;
    score?: number;
};
