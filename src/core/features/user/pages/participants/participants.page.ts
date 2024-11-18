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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreNavigator } from '@services/navigator';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUser, CoreUserParticipant, CoreUserData } from '@features/user/services/user';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreUserParticipantsSource } from '@features/user/classes/participants-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreKeyboard } from '@singletons/keyboard';

/**
 * Page that displays the list of course participants.
 */
@Component({
    selector: 'page-core-user-participants',
    templateUrl: 'participants.html',
})
export class CoreUserParticipantsPage implements OnInit, AfterViewInit, OnDestroy {

    courseId!: number;
    participants!: CoreUserParticipantsManager;
    searchQuery: string | null = null;
    searchInProgress = false;
    searchEnabled = false;
    fetchMoreParticipantsFailed = false;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.participants = new CoreUserParticipantsManager(
                CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreUserParticipantsSource, [this.courseId]),
                CoreUserParticipantsPage,
            );
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.searchEnabled = await CoreUser.canSearchParticipantsInSite();
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchInitialParticipants();
        await this.participants.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    async ionViewDidEnter(): Promise<void> {
        await this.participants.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.participants.destroy();
    }

    /**
     * Clear search.
     */
    async clearSearch(): Promise<void> {
        if (this.searchQuery === null) {
            // Nothing to clear.
            return;
        }

        const newSource = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(CoreUserParticipantsSource, [this.courseId]);

        this.searchQuery = null;
        this.searchInProgress = false;
        this.participants.setSource(newSource);

        await this.fetchInitialParticipants();
    }

    /**
     * Start a new search.
     *
     * @param query Text to search for.
     */
    async search(query: string): Promise<void> {
        CoreKeyboard.close();

        const newSource = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
            CoreUserParticipantsSource,
            [this.courseId, query],
        );

        this.searchInProgress = true;
        this.searchQuery = query;
        this.participants.setSource(newSource);

        await this.fetchInitialParticipants();

        this.searchInProgress = false;
    }

    /**
     * Refresh participants.
     *
     * @param refresher Refresher.
     */
    async refreshParticipants(refresher: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreUser.invalidateParticipantsList(this.courseId));
        await CorePromiseUtils.ignoreErrors(this.fetchParticipants(true));

        refresher?.complete();
    }

    /**
     * Load a new batch of participants.
     *
     * @param complete Completion callback.
     */
    async fetchMoreParticipants(complete: () => void): Promise<void> {
        try {
            await this.fetchParticipants(false);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading more participants');

            this.fetchMoreParticipantsFailed = true;
        }

        complete();
    }

    /**
     * Obtain the initial batch of participants.
     */
    private async fetchInitialParticipants(): Promise<void> {
        try {
            await this.fetchParticipants(true);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading participants');

            this.participants.reset();
        }
    }

    /**
     * Update the list of participants.
     *
     * @param reload Whether to reload the list or load the next page.
     */
    private async fetchParticipants(reload: boolean): Promise<void> {
        reload
            ? await this.participants.reload()
            : await this.participants.load();

        this.fetchMoreParticipantsFailed = false;
    }

}

/**
 * Helper to manage the list of participants.
 */
class CoreUserParticipantsManager extends CoreListItemsManager<CoreUserParticipant | CoreUserData, CoreUserParticipantsSource> {

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(CoreUser.logParticipantsView(this.getSource().COURSE_ID));

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
            ws: 'core_user_view_user_list',
            name: Translate.instant('core.user.participants'),
            data: { courseid: this.getSource().COURSE_ID, category: 'user' },
            url: `/user/index.php?id=${this.getSource().COURSE_ID}`,
        });
    }

}
