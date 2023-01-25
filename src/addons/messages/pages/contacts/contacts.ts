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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import {
    AddonMessages,
    AddonMessagesConversationMember,
    AddonMessagesProvider,
} from '../../services/messages';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreDomUtils } from '@services/utils/dom';
import { IonRefresher } from '@ionic/angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays contacts and contact requests.
 */
@Component({
    selector: 'page-addon-messages-contacts',
    templateUrl: 'contacts.html',
    styleUrls: [
        '../../messages-common.scss',
    ],
})
export class AddonMessagesContactsPage implements OnInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    selected: 'confirmed' | 'requests' = 'confirmed';
    requestsBadge = '';
    selectedUserId?: number; // User id of the conversation opened in the split view.

    confirmedLoaded = false;
    confirmedInitialising = false;
    confirmedCanLoadMore = false;
    confirmedLoadMoreError = false;
    confirmedContacts: AddonMessagesConversationMember[] = [];

    requestsLoaded = false;
    requestsInitialising = false;
    requestsCanLoadMore = false;
    requestsLoadMoreError = false;
    requests: AddonMessagesConversationMember[] = [];

    protected siteId: string;
    protected contactRequestsCountObserver: CoreEventObserver;
    protected memberInfoObserver: CoreEventObserver;

    constructor() {

        this.siteId = CoreSites.getCurrentSiteId();

        // Update the contact requests badge.
        this.contactRequestsCountObserver = CoreEvents.on(
            AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT,
            (data) => {
                this.requestsBadge = data.count > 0 ? String(data.count) : '';
            },
            this.siteId,
        );

        // Update block status of a user.
        this.memberInfoObserver = CoreEvents.on(
            AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT,
            (data) => {
                if (data.userBlocked || data.userUnblocked) {
                    const user = this.confirmedContacts.find((user) => user.id == data.userId);
                    if (user) {
                        user.isblocked = !!data.userBlocked;
                    }
                } else if (data.contactRemoved) {
                    const index = this.confirmedContacts.findIndex((contact) => contact.id == data.userId);
                    if (index >= 0) {
                        this.confirmedContacts.splice(index, 1);
                    }
                } else if (data.contactRequestConfirmed) {
                    this.confirmedFetchData(true);
                }

                if (data.contactRequestConfirmed || data.contactRequestDeclined) {
                    const index = this.requests.findIndex((request) => request.id == data.userId);
                    if (index >= 0) {
                        this.requests.splice(index, 1);
                    }
                }
            },
            CoreSites.getCurrentSiteId(),
        );

    }

    /**
     * Page being initialized.
     */
    async ngOnInit(): Promise<void> {
        AddonMessages.getContactRequestsCount(this.siteId); // Badge already updated by the observer.

        this.selected === 'confirmed'
            ? await this.initConfirmed()
            : await this.initRequests();
    }

    /**
     * Initialise confirmed contacts.
     */
    async initConfirmed(): Promise<void> {
        if (this.confirmedInitialising) {
            return;
        }

        try {
            this.confirmedInitialising = true;

            await this.confirmedFetchData();

            if (this.confirmedContacts.length && CoreScreen.isTablet) {
                this.selectUser(this.confirmedContacts[0].id, true);
            }
        } finally {
            this.confirmedInitialising = false;
            this.confirmedLoaded = true;
        }
    }

    /**
     * Initialise contact requests.
     */
    async initRequests(): Promise<void> {
        if (this.requestsInitialising) {
            return;
        }

        try {
            this.requestsInitialising = true;

            await this.requestsFetchData();

            if (this.requests.length && CoreScreen.isTablet) {
                this.selectUser(this.requests[0].id, true);
            }
        } finally {
            this.requestsInitialising = false;
            this.requestsLoaded = true;
        }
    }

    /**
     * Fetch contacts.
     *
     * @param refresh True if we are refreshing contacts, false if we are loading more.
     * @returns Promise resolved when done.
     */
    async confirmedFetchData(refresh: boolean = false): Promise<void> {
        this.confirmedLoadMoreError = false;

        const limitFrom = refresh ? 0 : this.confirmedContacts.length;

        if (limitFrom === 0) {
            // Always try to get latest data from server.
            await AddonMessages.invalidateUserContacts();
        }

        try {
            const result = await AddonMessages.getUserContacts(limitFrom);
            this.confirmedContacts = refresh ? result.contacts : this.confirmedContacts.concat(result.contacts);
            this.confirmedCanLoadMore = result.canLoadMore;
        } catch (error) {
            this.confirmedLoadMoreError = true;
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        }
    }

    /**
     * Fetch contact requests.
     *
     * @param refresh True if we are refreshing contact requests, false if we are loading more.
     * @returns Promise resolved when done.
     */
    async requestsFetchData(refresh: boolean = false): Promise<void> {
        this.requestsLoadMoreError = false;

        const limitFrom = refresh ? 0 : this.requests.length;

        if (limitFrom === 0) {
            // Always try to get latest data from server.
            await AddonMessages.invalidateContactRequestsCache();
        }

        try {
            const result = await AddonMessages.getContactRequests(limitFrom);
            this.requests = refresh ? result.requests : this.requests.concat(result.requests);
            this.requestsCanLoadMore = result.canLoadMore;
        } catch (error) {
            this.requestsLoadMoreError = true;
            CoreDomUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        }
    }

    /**
     * Refresh contacts or requests.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async refreshData(refresher?: IonRefresher): Promise<void> {
        try {
            if (this.selected == 'confirmed') {
                // No need to invalidate contacts, we always try to get the latest.
                await this.confirmedFetchData(true);
            } else {
                // Refresh the number of contacts requests to update badges.
                AddonMessages.refreshContactRequestsCount();

                // No need to invalidate contact requests, we always try to get the latest.
                await this.requestsFetchData(true);
            }
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Load more contacts or requests.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    async loadMore(infiniteComplete?: () => void): Promise<void> {
        try {
            if (this.selected == 'confirmed') {
                // No need to invalidate contacts, we always try to get the latest.
                await this.confirmedFetchData();
            } else {
                await this.requestsFetchData();
            }
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Navigate to the search page.
     */
    gotoSearch(): void {
        CoreNavigator.navigateToSitePath('search');
    }

    selectTab(selected: string): void {
        if (selected !== 'confirmed' && selected !== 'requests') {
            return;
        }

        this.selected = selected;

        if (this.selected == 'confirmed' && !this.confirmedLoaded) {
            this.initConfirmed();
        }

        if (this.selected == 'requests' && !this.requestsLoaded) {
            this.initRequests();
        }
    }

    /**
     * Set the selected user and open the conversation in the split view if needed.
     *
     * @param userId Id of the selected user, undefined to use the last selected user in the tab.
     * @param onInit Whether the contact was selected on initial load.
     */
    selectUser(userId: number, onInit = false): void {
        if (userId == this.selectedUserId && CoreScreen.isTablet) {
            // No user conversation to open or it is already opened.
            return;
        }

        if (onInit && CoreScreen.isMobile) {
            // Do not open a conversation by default when split view is not visible.
            return;
        }

        this.selectedUserId = userId;

        const path = CoreNavigator.getRelativePathToParent('/messages/contacts') + `discussion/user/${userId}`;
        CoreNavigator.navigate(path, {
            reset: CoreScreen.isTablet && !!this.splitView && !this.splitView.isNested,
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.contactRequestsCountObserver?.off();
    }

}
