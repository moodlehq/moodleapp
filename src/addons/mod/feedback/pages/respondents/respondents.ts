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
 * Page that displays feedback respondents.
 */
@Component({
    selector: 'page-addon-mod-feedback-respondents',
    templateUrl: 'respondents.html',
})
export class AddonModFeedbackRespondentsPage implements AfterViewInit {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected cmId!: number;
    protected courseId!: number;
    protected page = 0;
    protected feedback?: AddonModFeedbackWSFeedback;

    responses: AddonModFeedbackResponsesManager;
    selectedGroup!: number;
    groupInfo?: CoreGroupInfo;
    loaded = false;
    loadingMore = false;

    constructor(
        route: ActivatedRoute,
    ) {
        this.responses = new AddonModFeedbackResponsesManager(
            route.component,
        );
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.cmId = CoreNavigator.getRouteNumberParam('cmId')!;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId')!;
        this.selectedGroup = CoreNavigator.getRouteNumberParam('group') || 0;

        await this.fetchData();

        this.responses.start(this.splitView);
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param refresh Empty events array first.
     * @return Promise resolved when done.
     */
    async fetchData(refresh: boolean = false): Promise<void> {
        this.page = 0;
        this.responses.resetItems();

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
        if (typeof groupId == 'undefined') {
            this.page++;
            this.loadingMore = true;
        } else {
            this.selectedGroup = groupId;
            this.page = 0;
            this.responses.resetItems();
        }

        try {
            const responses = await AddonModFeedbackHelper.getResponsesAnalysis(this.feedback!.id, {
                groupId: this.selectedGroup,
                page: this.page,
                cmId: this.cmId,
            });

            this.responses.setResponses(responses);
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
class AddonModFeedbackResponsesManager extends CorePageItemsListManager<EntryItem> {

    responses: AddonModFeedbackResponses = {
        attempts: [],
        total: 0,
        canLoadMore: false,
    };

    anonResponses: AddonModFeedbackAnonResponses = {
        attempts: [],
        total: 0,
        canLoadMore: false,
    };

    constructor(pageComponent: unknown) {
        super(pageComponent);
    }

    /**
     * Update responses.
     *
     * @param responses Responses.
     */
    setResponses(responses: AddonModFeedbackResponsesAnalysis): void {
        this.responses.total = responses.totalattempts;
        this.anonResponses.total = responses.totalanonattempts;

        if (this.anonResponses.attempts.length < responses.totalanonattempts) {
            this.anonResponses.attempts = this.anonResponses.attempts.concat(responses.anonattempts);
        }
        if (this.responses.attempts.length < responses.totalattempts) {
            this.responses.attempts = this.responses.attempts.concat(responses.attempts);
        }

        this.anonResponses.canLoadMore = this.anonResponses.attempts.length < responses.totalanonattempts;
        this.responses.canLoadMore = this.responses.attempts.length < responses.totalattempts;

        this.setItems((<EntryItem[]> this.responses.attempts).concat(this.anonResponses.attempts));
    }

    /**
     * @inheritdoc
     */
    resetItems(): void {
        super.resetItems();
        this.responses.total = 0;
        this.responses.attempts = [];
        this.anonResponses.total = 0;
        this.anonResponses.attempts = [];
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(entry: EntryItem): string {
        return `attempt/${entry.id}`;
    }

}

type AddonModFeedbackResponses = {
    attempts: AddonModFeedbackWSAttempt[];
    total: number;
    canLoadMore: boolean;
};

type AddonModFeedbackAnonResponses = {
    attempts: AddonModFeedbackWSAnonAttempt[];
    total: number;
    canLoadMore: boolean;
};
