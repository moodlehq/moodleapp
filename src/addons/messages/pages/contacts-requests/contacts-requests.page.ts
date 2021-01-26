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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonMessagesProvider,
    AddonMessagesConversationMember,
    AddonMessagesSplitViewLoadContactsEventData,
    AddonMessages,
    AddonMessagesMemberInfoChangedEventData,
} from '../../services/messages';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreNavigator } from '@services/navigator';
import { IonRefresher } from '@ionic/angular';
import { CoreScreen } from '@services/screen';

/**
 * Component that displays the list of contact requests.
 */
@Component({
    selector: 'addon-messages-contact-requests',
    templateUrl: 'contacts-requests.html',
    styleUrls: ['../../messages-common.scss'],
})
export class AddonMessagesContactsRequestsPage implements OnInit, OnDestroy {

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    requests: AddonMessagesConversationMember[] = [];
    selectedUserId?: number;

    protected memberInfoObserver: CoreEventObserver;

    constructor() {

        // Hide the "Would like to contact you" message when a contact request is confirmed.
        this.memberInfoObserver = CoreEvents.on<AddonMessagesMemberInfoChangedEventData>(
            AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT,
            (data) => {
                if (data.contactRequestConfirmed || data.contactRequestDeclined) {
                    const index = this.requests.findIndex((request) => request.id == data.userId);
                    if (index >= 0) {
                        this.requests.splice(index, 1);
                    }
                }
            },

            CoreSites.instance.getCurrentSiteId(),
        );
    }

    /**
     * Component loaded.
     */
    async ngOnInit(): Promise<void> {
        try {
            await this.fetchData();
            if (this.requests.length && CoreScreen.instance.isTablet) {
                this.selectUser(this.requests[0].id, true);
            }
        } finally {
            this.loaded = true;
        }
        // Workaround for infinite scrolling.
        // @todo this.content.resize();
    }

    /**
     * Fetch contact requests.
     *
     * @param refresh True if we are refreshing contact requests, false if we are loading more.
     * @return Promise resolved when done.
     */
    async fetchData(refresh: boolean = false): Promise<void> {
        this.loadMoreError = false;

        const limitFrom = refresh ? 0 : this.requests.length;

        if (limitFrom === 0) {
            // Always try to get latest data from server.
            await AddonMessages.instance.invalidateContactRequestsCache();
        }

        try {
            const result = await AddonMessages.instance.getContactRequests(limitFrom);
            this.requests = refresh ? result.requests : this.requests.concat(result.requests);
            this.canLoadMore = result.canLoadMore;
        } catch (error) {
            this.loadMoreError = true;
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        }
    }

    /**
     * Refresh contact requests.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    async refreshData(refresher?: CustomEvent<IonRefresher>): Promise<void> {
        // Refresh the number of contacts requests to update badges.
        AddonMessages.instance.refreshContactRequestsCount();

        // No need to invalidate contact requests, we always try to get the latest.
        await this.fetchData(true).finally(() => {
            refresher?.detail.complete();
        });
    }

    /**
     * Load more contact requests.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Resolved when done.
     */
    async loadMore(infiniteComplete?: () => void): Promise<void> {
        await this.fetchData().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Notify that a contact has been selected.
     *
     * @param userId User id.
     * @param onInit Whether the contact is selected on initial load.
     */
    selectUser(userId: number, onInit: boolean = false): void {
        this.selectedUserId = userId;

        const data: AddonMessagesSplitViewLoadContactsEventData = {
            userId,
            onInit,
        };

        CoreEvents.trigger(AddonMessagesProvider.SPLIT_VIEW_LOAD_CONTACTS_EVENT, data);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.memberInfoObserver?.off();
    }

}
