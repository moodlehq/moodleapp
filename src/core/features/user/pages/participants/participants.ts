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

import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';

import { CoreDomUtils } from '@services/utils/dom';
import { CoreNavigator } from '@services/navigator';
import { CorePageItemsListManager } from '@classes/page-items-list-manager';
import { CoreScreen } from '@services/screen';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreUser, CoreUserParticipant } from '@features/user/services/user';
import { CoreUtils } from '@services/utils/utils';

/**
 * Page that displays the list of course participants.
 */
@Component({
    selector: 'page-core-user-participants',
    templateUrl: 'participants.html',
})
export class CoreUserParticipantsPage implements AfterViewInit, OnDestroy {

    participants: CoreUserParticipantsManager;
    fetchMoreParticipantsFailed = false;

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    constructor(route: ActivatedRoute) {
        const courseId = parseInt(route.snapshot.queryParams.courseId);

        this.participants = new CoreUserParticipantsManager(CoreUserParticipantsPage, courseId);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchInitialParticipants();

        this.participants.watchSplitViewOutlet(this.splitView);
        this.participants.start();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.participants.destroy();
    }

    /**
     * Refresh participants.
     *
     * @param refresher Refresher.
     */
    async refreshParticipants(refresher: IonRefresher): Promise<void> {
        await CoreUtils.instance.ignoreErrors(CoreUser.instance.invalidateParticipantsList(this.participants.courseId));
        await CoreUtils.instance.ignoreErrors(this.fetchParticipants());

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
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading more participants');

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
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error loading participants');

            this.participants.setItems([]);
        }
    }

    /**
     * Update the list of participants.
     *
     * @param loadedParticipants Participants list to continue loading from.
     */
    private async fetchParticipants(loadedParticipants: CoreUserParticipant[] = []): Promise<void> {
        const { participants, canLoadMore } = await CoreUser.instance.getParticipants(
            this.participants.courseId,
            loadedParticipants.length,
        );

        this.participants.setItems(loadedParticipants.concat(participants), canLoadMore);
        this.fetchMoreParticipantsFailed = false;
    }

}

/**
 * Helper to manage the list of participants.
 */
class CoreUserParticipantsManager extends CorePageItemsListManager<CoreUserParticipant> {

    courseId: number;

    constructor(pageComponent: unknown, courseId: number) {
        super(pageComponent);

        this.courseId = courseId;
    }

    /**
     * @inheritdoc
     */
    async select(participant: CoreUserParticipant): Promise<void> {
        if (CoreScreen.instance.isMobile) {
            await CoreNavigator.instance.navigateToSitePath('/user/profile', { params: { userId: participant.id } });

            return;
        }

        return super.select(participant);
    }

    /**
     * @inheritdoc
     */
    protected getItemPath(participant: CoreUserParticipant): string {
        return participant.id.toString();
    }

    /**
     * @inheritdoc
     */
    protected getSelectedItemPath(route: ActivatedRouteSnapshot): string | null {
        return route.params.userId ?? null;
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void>  {
        await CoreUser.instance.logParticipantsView(this.courseId);
    }

}
