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

import { Component, Input, OnInit } from '@angular/core';
import {
    AddonMessagesConversationFormatted,
    AddonMessagesConversationMember,
    AddonMessages,
} from '../../services/messages';
import { CoreDomUtils } from '@services/utils/dom';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@singletons';

/**
 * Component that displays the list of conversations, including group conversations.
 */
@Component({
    selector: 'page-addon-messages-conversation-info',
    templateUrl: 'conversation-info.html',
})
export class AddonMessagesConversationInfoComponent implements OnInit {

    @Input() conversationId = 0;

    loaded = false;
    conversation?: AddonMessagesConversationFormatted;
    members: AddonMessagesConversationMember[] = [];
    canLoadMore = false;
    loadMoreError = false;

    constructor(
        protected route: ActivatedRoute,
    ) {
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        this.fetchData().finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetch the required data.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        // Get the conversation data first.
        try {
            const conversation = await AddonMessages.getConversation(this.conversationId, false, true, 0, 0);
            this.conversation = conversation;

            // Now get the members.
            await this.fetchMembers();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting members.');
        }
    }

    /**
     * Get conversation members.
     *
     * @param loadingMore Whether we are loading more data or just the first ones.
     * @returns Promise resolved when done.
     */
    protected async fetchMembers(loadingMore?: boolean): Promise<void> {
        this.loadMoreError = false;

        const limitFrom = loadingMore ? this.members.length : 0;

        const data = await AddonMessages.getConversationMembers(this.conversationId, limitFrom);
        if (loadingMore) {
            this.members = this.members.concat(data.members);
        } else {
            this.members = data.members;
        }

        this.canLoadMore = data.canLoadMore;
    }

    /**
     * Function to load more members.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    async loadMoreMembers(infiniteComplete?: () => void): Promise<void> {
        try {
            await this.fetchMembers(true);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting members.');
            this.loadMoreError = true;
        } finally {
            infiniteComplete && infiniteComplete();
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async refreshData(refresher?: HTMLIonRefresherElement): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonMessages.invalidateConversation(this.conversationId));
        promises.push(AddonMessages.invalidateConversationMembers(this.conversationId));

        await Promise.all(promises);

        await this.fetchData().finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Close modal.
     *
     * @param userId User conversation to load.
     */
    closeModal(userId?: number): void {
        ModalController.dismiss(userId);
    }

}
