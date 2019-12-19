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

import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider, AddonMessagesConversationMember } from '../../providers/messages';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Component that displays the list of contact requests.
 */
@Component({
    selector: 'addon-messages-contact-requests',
    templateUrl: 'addon-messages-contact-requests.html',
})
export class AddonMessagesContactRequestsComponent implements OnInit, OnDestroy {
    @Output() onUserSelected = new EventEmitter<{userId: number, onInit?: boolean}>();
    @ViewChild(Content) content: Content;

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    requests: AddonMessagesConversationMember[] = [];
    selectedUserId: number;

    protected memberInfoObserver;

    constructor(private domUtils: CoreDomUtilsProvider, eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider,
            private messagesProvider: AddonMessagesProvider) {

        // Hide the "Would like to contact you" message when a contact request is confirmed.
        this.memberInfoObserver = eventsProvider.on(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, (data) => {
            if (data.contactRequestConfirmed || data.contactRequestDeclined) {
                const index = this.requests.findIndex((request) => request.id == data.userId);
                if (index >= 0) {
                    this.requests.splice(index, 1);
                }
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        this.fetchData().then(() => {
            if (this.requests.length) {
                this.selectUser(this.requests[0].id, true);
            }
        }).finally(() => {
            this.loaded = true;
        });

        // Workaround for infinite scrolling.
        this.content.resize();
    }

    /**
     * Fetch contact requests.
     *
     * @param refresh True if we are refreshing contact requests, false if we are loading more.
     * @return Promise resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        this.loadMoreError = false;

        const limitFrom = refresh ? 0 : this.requests.length;
        let promise;

        if (limitFrom === 0) {
            // Always try to get latest data from server.
            promise = this.messagesProvider.invalidateContactRequestsCache().catch(() => {
                // Shouldn't happen.
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            return this.messagesProvider.getContactRequests(limitFrom);
        }).then((result) => {
            this.requests = refresh ? result.requests : this.requests.concat(result.requests);
            this.canLoadMore = result.canLoadMore;
        }).catch((error) => {
            this.loadMoreError = true;
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        });
    }

    /**
     * Refresh contact requests.
     *
     * @param refresher Refresher.
     * @return Promise resolved when done.
     */
    refreshData(refresher?: any): Promise<any> {
        // Refresh the number of contacts requests to update badges.
        this.messagesProvider.refreshContactRequestsCount();

        // No need to invalidate contact requests, we always try to get the latest.
        return this.fetchData(true).finally(() => {
            refresher && refresher.complete();
        });
    }

    /**
     * Load more contact requests.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Resolved when done.
     */
    loadMore(infiniteComplete?: any): Promise<any> {
        return this.fetchData().finally(() => {
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
        this.onUserSelected.emit({userId, onInit});
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.memberInfoObserver && this.memberInfoObserver.off();
    }
}
