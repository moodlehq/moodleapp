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
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@static/promise-utils';
import { AddonModFeedback, AddonModFeedbackWSFeedback } from '../../services/feedback';
import { AddonModFeedbackHelper, AddonModFeedbackNonRespondent } from '../../services/feedback-helper';
import { CoreTime } from '@static/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays feedback non respondents.
 */
@Component({
    selector: 'page-addon-mod-feedback-nonrespondents',
    templateUrl: 'nonrespondents.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModFeedbackNonRespondentsPage implements OnInit {

    protected cmId!: number;
    protected feedback?: AddonModFeedbackWSFeedback;
    protected page = 0;
    protected logView: () => void;

    courseId!: number;
    selectedGroup!: number;
    groupInfo?: CoreGroupInfo;
    users: AddonModFeedbackNonRespondent[] = [];
    total = 0;
    canLoadMore = false;
    loaded = false;
    loadMoreError = false;

    constructor() {
        this.logView = CoreTime.once(() => {
            if (!this.feedback) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_feedback_get_non_respondents',
                name: this.feedback.name,
                data: { feedbackid: this.feedback.id, category: 'feedback' },
                url: `/mod/feedback/show_nonrespondents.php?id=${this.cmId}&courseid=${this.courseId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param refresh Empty events array first.
     * @returns Promise resolved when done.
     */
    protected async fetchData(refresh = false): Promise<void> {
        this.page = 0;
        this.total = 0;
        this.users = [];

        try {
            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.cmId);

            this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, this.groupInfo);

            await this.loadGroupUsers(this.selectedGroup);

            this.logView();
        } catch (message) {
            CoreAlerts.showError(message, { default: Translate.instant('core.course.errorgetmodule') });

            if (!refresh) {
                // Some call failed on first fetch, go back.
                CoreNavigator.back();
            }
        }
    }

    /**
     * Load Group responses.
     *
     * @param groupId If defined it will change group if not, it will load more users for the same group.
     * @returns Promise resolved when done.
     */
    protected async loadGroupUsers(groupId?: number): Promise<void> {
        this.loadMoreError = false;

        if (groupId === undefined) {
            this.page++;
        } else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.total = 0;
            this.users = [];
            this.loaded = false;
        }

        try {
            const response = await AddonModFeedbackHelper.getNonRespondents(this.feedback!.id, {
                groupId: this.selectedGroup,
                page: this.page,
                cmId: this.cmId,
            });

            this.total = response.total;
            if (this.users.length < response.total) {
                this.users = this.users.concat(response.users);
            }

            this.canLoadMore = this.users.length < response.total;
        } catch (error) {
            this.loadMoreError = true;

            throw error;
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Change selected group or load more users.
     *
     * @param groupId Group ID selected. If not defined, it will load more users.
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     */
    async loadAttempts(groupId?: number, infiniteComplete?: () => void): Promise<void> {
        try {
            await this.loadGroupUsers(groupId);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Refresh the attempts.
     *
     * @param refresher Refresher.
     */
    async refreshFeedback(refresher: HTMLIonRefresherElement): Promise<void> {
        try {
            const promises: Promise<void>[] = [];

            promises.push(CoreGroups.invalidateActivityGroupInfo(this.cmId));
            if (this.feedback) {
                promises.push(AddonModFeedback.invalidateNonRespondentsData(this.feedback.id));
            }

            await CorePromiseUtils.ignoreErrors(Promise.all(promises));

            await this.fetchData(true);
        } finally {
            refresher.complete();
        }
    }

}
