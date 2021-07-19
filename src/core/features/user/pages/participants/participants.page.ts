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
import { IonRefresher } from '@ionic/angular';

import { CoreApp } from '@services/app';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreNavigator } from '@services/navigator';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreScreen } from '@services/screen';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUser, CoreUserProvider, CoreUserParticipant, CoreUserData } from '@features/user/services/user';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page that displays the list of course participants.
 */
@Component({
    selector: 'page-core-user-participants',
    templateUrl: 'participants.html',
})
export class CoreUserParticipantsPage implements OnInit, AfterViewInit, OnDestroy {

    participants: CoreUserParticipantsManager;
    searchQuery: string | null = null;
    searchInProgress = false;
    searchEnabled = false;
    showSearchBox = false;
    fetchMoreParticipantsFailed = false;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor() {
        const courseId = CoreNavigator.getRouteNumberParam('courseId')!;

        this.participants = new CoreUserParticipantsManager(CoreUserParticipantsPage, courseId);
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

        this.participants.start(this.splitView);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.participants.destroy();
    }

    /**
     * Show or hide search box.
     */
    toggleSearch(): void {
        this.showSearchBox = !this.showSearchBox;

        if (this.showSearchBox) {
            // Make search bar visible.
            this.splitView.menuContent.scrollToTop();
        } else {
            this.clearSearch();
        }
    }

    /**
     * Clear search.
     */
    async clearSearch(): Promise<void> {
        if (this.searchQuery === null) {
            // Nothing to clear.
            return;
        }

        this.searchQuery = null;
        this.searchInProgress = false;
        this.participants.resetItems();

        await this.fetchInitialParticipants();
    }

    /**
     * Start a new search.
     *
     * @param query Text to search for.
     */
    async search(query: string): Promise<void> {
        CoreApp.closeKeyboard();

        this.searchInProgress = true;
        this.searchQuery = query;
        this.participants.resetItems();

        await this.fetchInitialParticipants();

        this.searchInProgress = false;
    }

    /**
     * Refresh participants.
     *
     * @param refresher Refresher.
     */
    async refreshParticipants(refresher: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreUser.invalidateParticipantsList(this.participants.courseId));
        await CoreUtils.ignoreErrors(this.fetchParticipants());

        refresher?.complete();
    }

    /**
     * Load a new batch of participants.
     *
     * @param complete Completion callback.
     */
    async fetchMoreParticipants(complete: () => void): Promise<void> {
        try {
            await this.fetchParticipants(this.participants.items);
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
            await this.fetchParticipants();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error loading participants');

            this.participants.setItems([]);
        }
    }

    /**
     * Update the list of participants.
     *
     * @param loadedParticipants Participants list to continue loading from.
     */
    private async fetchParticipants(loadedParticipants: CoreUserParticipant[] | CoreUserData[] = []): Promise<void> {
        if (this.searchQuery) {
            const { participants, canLoadMore } = await CoreUser.searchParticipants(
                this.participants.courseId,
                this.searchQuery,
                true,
                Math.ceil(loadedParticipants.length / CoreUserProvider.PARTICIPANTS_LIST_LIMIT),
                CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
            );

            this.participants.setItems((loadedParticipants as CoreUserData[]).concat(participants), canLoadMore);
        } else {
            const { participants, canLoadMore } = await CoreUser.getParticipants(
                this.participants.courseId,
                loadedParticipants.length,
            );

            this.participants.setItems((loadedParticipants as CoreUserParticipant[]).concat(participants), canLoadMore);
        }

        this.fetchMoreParticipantsFailed = false;
    }

}

/**
 * Helper to manage the list of participants.
 */
class CoreUserParticipantsManager extends CorePageItemsListManager<CoreUserParticipant | CoreUserData> {

    courseId: number;

    constructor(pageComponent: unknown, courseId: number) {
        super(pageComponent);

        this.courseId = courseId;
    }

    /**
     * @inheritdoc
     */
    async select(participant: CoreUserParticipant | CoreUserData): Promise<void> {
        if (CoreScreen.isMobile) {
            await CoreNavigator.navigateToSitePath(
                '/user/profile',
                { params: { userId: participant.id, courseId: this.courseId } },
            );

            return;
        }

        return super.select(participant);
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(participant: CoreUserParticipant | CoreUserData): string {
        return participant.id.toString();
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CoreUser.logParticipantsView(this.courseId);
    }

}
