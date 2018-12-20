// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnInit } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { AddonMessagesProvider } from '../../providers/messages';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Page that displays the list of conversations, including group conversations.
 */
@IonicPage({ segment: 'addon-messages-conversation-info' })
@Component({
    selector: 'page-addon-messages-conversation-info',
    templateUrl: 'conversation-info.html',
})
export class AddonMessagesConversationInfoPage implements OnInit {

    loaded = false;
    conversation: any;
    members = [];
    canLoadMore = false;
    loadMoreError = false;

    protected conversationId: number;

    constructor(private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider, navParams: NavParams,
            protected viewCtrl: ViewController) {
        this.conversationId = navParams.get('conversationId');
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
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        // Get the conversation data first.
        return this.messagesProvider.getConversation(this.conversationId, false, true, 0, 0).then((conversation) => {
            this.conversation = conversation;

            // Now get the members.
            return this.fetchMembers();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting members.');
        });
    }

    /**
     * Get conversation members.
     *
     * @param {boolean} [loadingMore} Whether we are loading more data or just the first ones.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchMembers(loadingMore?: boolean): Promise<any> {
        this.loadMoreError = false;

        const limitFrom = loadingMore ? this.members.length : 0;

        return this.messagesProvider.getConversationMembers(this.conversationId, limitFrom).then((data) => {
            if (loadingMore) {
                this.members = this.members.concat(data.members);
            } else {
                this.members = data.members;
            }

            this.canLoadMore = data.canLoadMore;
        });
    }

    /**
     * Function to load more members.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
     */
    loadMoreMembers(infiniteComplete?: any): Promise<any> {
        return this.fetchMembers(true).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting members.');
            this.loadMoreError = true;
        }).finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(refresher?: any): Promise<any> {
        const promises = [];

        promises.push(this.messagesProvider.invalidateConversation(this.conversationId));
        promises.push(this.messagesProvider.invalidateConversationMembers(this.conversationId));

        return Promise.all(promises).then(() => {
            return this.fetchData().finally(() => {
                refresher && refresher.complete();
            });
        });
    }

    /**
     * Close modal.
     *
     * @param {number} [userId] User conversation to load.
     */
    closeModal(userId?: number): void {
        this.viewCtrl.dismiss(userId);
    }
}
