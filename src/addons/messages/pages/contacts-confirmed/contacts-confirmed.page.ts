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
    AddonMessages,
    AddonMessagesMemberInfoChangedEventData,
    AddonMessagesSplitViewLoadContactsEventData,
} from '../../services/messages';
import { CoreDomUtils } from '@services/utils/dom';
import { IonRefresher } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';

/**
 * Component that displays the list of confirmed contacts.
 */
@Component({
    selector: 'addon-messages-confirmed-contacts',
    templateUrl: 'contacts-confirmed.html',
})
export class AddonMessagesContactsConfirmedPage implements OnInit, OnDestroy {

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    contacts: AddonMessagesConversationMember[] = [];
    selectedUserId?: number;

    protected memberInfoObserver: CoreEventObserver;

    constructor() {
        // this.onUserSelected = new EventEmitter();

        // Update block status of a user.
        this.memberInfoObserver = CoreEvents.on<AddonMessagesMemberInfoChangedEventData>(
            AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT,
            (data) => {
                if (data.userBlocked || data.userUnblocked) {
                    const user = this.contacts.find((user) => user.id == data.userId);
                    if (user) {
                        user.isblocked = !!data.userBlocked;
                    }
                } else if (data.contactRemoved) {
                    const index = this.contacts.findIndex((contact) => contact.id == data.userId);
                    if (index >= 0) {
                        this.contacts.splice(index, 1);
                    }
                } else if (data.contactRequestConfirmed) {
                    this.refreshData();
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
            if (this.contacts.length) {
                this.selectUser(this.contacts[0].id, true);
            }
        } finally {
            this.loaded = true;
        }
        // Workaround for infinite scrolling.
        // @todo this.content.resize();
    }

    /**
     * Fetch contacts.
     *
     * @param refresh True if we are refreshing contacts, false if we are loading more.
     * @return Promise resolved when done.
     */
    async fetchData(refresh: boolean = false): Promise<void> {
        this.loadMoreError = false;

        const limitFrom = refresh ? 0 : this.contacts.length;

        if (limitFrom === 0) {
            // Always try to get latest data from server.
            await AddonMessages.instance.invalidateUserContacts();
        }

        try {
            const result = await AddonMessages.instance.getUserContacts(limitFrom);
            this.contacts = refresh ? result.contacts : this.contacts.concat(result.contacts);
            this.canLoadMore = result.canLoadMore;
        } catch (error) {
            this.loadMoreError = true;
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        }
    }

    /**
     * Refresh contacts.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    async refreshData(refresher?: CustomEvent<IonRefresher>): Promise<void> {
        // No need to invalidate contacts, we always try to get the latest.
        await this.fetchData(true).finally(() => {
            refresher?.detail.complete();
        });
    }

    /**
     * Load more contacts.
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

        // @todo: Check if split view is visible before
        CoreNavigator.instance.navigateToSitePath('discussion', { params : { userId } });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.memberInfoObserver?.off();
    }

}
