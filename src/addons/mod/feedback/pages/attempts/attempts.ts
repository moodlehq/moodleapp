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

import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { IonRefresher } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModFeedback,
    AddonModFeedbackWSAnonAttempt,
    AddonModFeedbackWSAttempt,
    AddonModFeedbackWSFeedback,
} from '../../services/feedback';
import { AddonModFeedbackHelper, AddonModFeedbackResponsesAnalysis } from '../../services/feedback-helper';

/**
 * Page that displays feedback attempts.
 */
@Component({
    selector: 'page-addon-mod-feedback-attempts',
    templateUrl: 'attempts.html',
})
export class AddonModFeedbackAttemptsPage implements AfterViewInit {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected cmId!: number;
    protected courseId!: number;
    protected page = 0;
    protected feedback?: AddonModFeedbackWSFeedback;

    attempts: AddonModFeedbackAttemptsManager;
    selectedGroup!: number;
    groupInfo?: CoreGroupInfo;
    loaded = false;
    loadingMore = false;

    constructor(
        route: ActivatedRoute,
    ) {
        this.attempts = new AddonModFeedbackAttemptsManager(
            route.component,
        );
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        await this.fetchData();

        this.attempts.start(this.splitView);
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param refresh Empty events array first.
     * @return Promise resolved when done.
     */
    async fetchData(refresh: boolean = false): Promise<void> {
        this.page = 0;
        this.attempts.resetItems();

        try {
            this.feedback = await AddonModFeedback.getFeedback(this.courseId, this.cmId);

            this.groupInfo = await CoreGroups.getActivityGroupInfo(this.cmId);

            this.selectedGroup = CoreGroups.validateGroupId(this.selectedGroup, this.groupInfo);

            await this.loadGroupAttempts(this.selectedGroup);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);

            if (!refresh) {
                // Some call failed on first fetch, go back.
                CoreNavigator.back();
            }
        }
    }

    /**
     * Load Group attempts.
     *
     * @param groupId If defined it will change group if not, it will load more attempts for the same group.
     * @return Resolved with the attempts loaded.
     */
    protected async loadGroupAttempts(groupId?: number): Promise<void> {
        if (groupId === undefined) {
            this.page++;
            this.loadingMore = true;
        } else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.attempts.resetItems();
        }

        try {
            const attempts = await AddonModFeedbackHelper.getResponsesAnalysis(this.feedback!.id, {
                groupId: this.selectedGroup,
                page: this.page,
                cmId: this.cmId,
            });

            this.attempts.setAttempts(attempts);
        } finally {
            this.loadingMore = false;
            this.loaded = true;
        }
    }

    /**
     * Change selected group or load more attempts.
     *
     * @param groupId Group ID selected. If not defined, it will load more attempts.
     */
    async loadAttempts(groupId?: number): Promise<void> {
        try {
            await this.loadGroupAttempts(groupId);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }
    }

    /**
     * Refresh the attempts.
     *
     * @param refresher Refresher.
     */
    async refreshFeedback(refresher: IonRefresher): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreGroups.invalidateActivityGroupInfo(this.cmId));
        if (this.feedback) {
            promises.push(AddonModFeedback.invalidateResponsesAnalysisData(this.feedback.id));
        }

        try {
            await CoreUtils.ignoreErrors(Promise.all(promises));

            await this.fetchData(true);
        } finally {
            refresher.complete();
        }
    }

}

/**
 * Type of items that can be held by the entries manager.
 */
type EntryItem = AddonModFeedbackWSAttempt | AddonModFeedbackWSAnonAttempt;

/**
 * Entries manager.
 */
class AddonModFeedbackAttemptsManager extends CorePageItemsListManager<EntryItem> {

    identifiable: AddonModFeedbackIdentifiableAttempts = {
        items: [],
        total: 0,
        canLoadMore: false,
    };

    anonymous: AddonModFeedbackAnonymousAttempts = {
        items: [],
        total: 0,
        canLoadMore: false,
    };

    constructor(pageComponent: unknown) {
        super(pageComponent);
    }

    /**
     * Update attempts.
     *
     * @param attempts Attempts.
     */
    setAttempts(attempts: AddonModFeedbackResponsesAnalysis): void {
        this.identifiable.total = attempts.totalattempts;
        this.anonymous.total = attempts.totalanonattempts;

        if (this.anonymous.items.length < attempts.totalanonattempts) {
            this.anonymous.items = this.anonymous.items.concat(attempts.anonattempts);
        }
        if (this.identifiable.items.length < attempts.totalattempts) {
            this.identifiable.items = this.identifiable.items.concat(attempts.attempts);
        }

        this.anonymous.canLoadMore = this.anonymous.items.length < attempts.totalanonattempts;
        this.identifiable.canLoadMore = this.identifiable.items.length < attempts.totalattempts;

        this.setItems((<EntryItem[]> this.identifiable.items).concat(this.anonymous.items));
    }

    /**
     * @inheritdoc
     */
    resetItems(): void {
        super.resetItems();
        this.identifiable.total = 0;
        this.identifiable.items = [];
        this.anonymous.total = 0;
        this.anonymous.items = [];
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(entry: EntryItem): string {
        return entry.id.toString();
    }

}

type AddonModFeedbackIdentifiableAttempts = {
    items: AddonModFeedbackWSAttempt[];
    total: number;
    canLoadMore: boolean;
};

type AddonModFeedbackAnonymousAttempts = {
    items: AddonModFeedbackWSAnonAttempt[];
    total: number;
    canLoadMore: boolean;
};
