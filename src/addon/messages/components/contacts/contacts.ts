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

import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';

/**
 * Component that displays the list of contacts.
 */
@Component({
    selector: 'addon-messages-contacts',
    templateUrl: 'addon-messages-contacts.html',
})
export class AddonMessagesContactsComponent {

    protected currentUserId: number;
    protected searchingMessages: string;
    protected loadingMessages: string;
    protected siteId: string;
    protected noSearchTypes = ['online', 'offline', 'blocked', 'strangers'];

    loaded = false;
    discussionUserId: number;
    contactTypes = this.noSearchTypes;
    searchType = 'search';
    loadingMessage = '';
    hasContacts = false;
    contacts = {
        search: []
    };
    searchString = '';

    protected memberInfoObserver;

    constructor(sitesProvider: CoreSitesProvider, translate: TranslateService, private appProvider: CoreAppProvider,
            private messagesProvider: AddonMessagesProvider, private domUtils: CoreDomUtilsProvider, navParams: NavParams,
            private eventsProvider: CoreEventsProvider) {

        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.siteId = sitesProvider.getCurrentSiteId();
        this.searchingMessages = translate.instant('core.searching');
        this.loadingMessages = translate.instant('core.loading');
        this.loadingMessage = this.loadingMessages;

        this.discussionUserId = navParams.get('discussionUserId') || false;

        // Refresh the list when a contact request is confirmed.
        this.memberInfoObserver = eventsProvider.on(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, (data) => {
            if (data.contactRequestConfirmed) {
                this.refreshData();
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        if (this.discussionUserId) {
            // There is a discussion to load, open the discussion in a new state.
            this.gotoDiscussion(this.discussionUserId);
        }

        this.fetchData().then(() => {
            if (!this.discussionUserId && this.hasContacts) {
                let contact;
                for (const x in this.contacts) {
                    if (this.contacts[x].length > 0) {
                        contact = this.contacts[x][0];
                        break;
                    }
                }

                if (contact) {
                    // Take first and load it.
                    this.gotoDiscussion(contact.id, true);
                }
            }
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(refresher?: any): Promise<any> {
        let promise;

        if (this.searchString) {
            // User has searched, update the search.
            promise = this.performSearch(this.searchString);
        } else {
            // Update contacts.
            promise = this.messagesProvider.invalidateAllContactsCache(this.currentUserId).then(() => {
                return this.fetchData();
            });
        }

        return promise.finally(() => {
            refresher.complete();
        });
    }

    /**
     * Fetch contacts.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(): Promise<any> {
        this.loadingMessage = this.loadingMessages;

        return this.messagesProvider.getAllContacts().then((contacts) => {
            for (const x in contacts) {
                if (contacts[x].length > 0) {
                    this.contacts[x] = this.sortUsers(contacts[x]);
                } else {
                    this.contacts[x] = [];
                }
            }

            this.clearSearch();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        });
    }

    /**
     * Sort user list by fullname
     * @param  {any[]} list List to sort.
     * @return {any[]}      Sorted list.
     */
    protected sortUsers(list: any[]): any[] {
        return list.sort((a, b) => {
            const compareA = a.fullname.toLowerCase(),
                compareB = b.fullname.toLowerCase();

            return compareA.localeCompare(compareB);
        });
    }

    /**
     * Clear search and show all contacts again.
     */
    clearSearch(): void {
        this.searchString = ''; // Reset searched string.
        this.contactTypes = this.noSearchTypes;

        this.hasContacts = false;
        for (const x in this.contacts) {
            if (this.contacts[x].length > 0) {
                this.hasContacts = true;

                return;
            }
        }
    }

    /**
     * Search users from the UI.
     *
     * @param  {string}       query Text to search for.
     * @return {Promise<any>}       Resolved when done.
     */
    search(query: string): Promise<any> {
        this.appProvider.closeKeyboard();

        this.loaded = false;
        this.loadingMessage = this.searchingMessages;

        return this.performSearch(query).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Perform the search of users.
     *
     * @param  {string}       query Text to search for.
     * @return {Promise<any>}       Resolved when done.
     */
    protected performSearch(query: string): Promise<any> {
        return this.messagesProvider.searchContacts(query).then((result) => {
            this.hasContacts = result.length > 0;
            this.searchString = query;
            this.contactTypes = ['search'];

            this.contacts['search'] = this.sortUsers(result);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.messages.errorwhileretrievingcontacts', true);
        });
    }

    /**
     * Navigate to a particular discussion.
     *
     * @param {number} discussionUserId Discussion Id to load.
     * @param {boolean} [onlyWithSplitView=false]  Only go to Discussion if split view is on.
     */
    gotoDiscussion(discussionUserId: number, onlyWithSplitView: boolean = false): void {
        this.discussionUserId = discussionUserId;

        const params = {
            discussion: discussionUserId,
            onlyWithSplitView: onlyWithSplitView
        };
        this.eventsProvider.trigger(AddonMessagesProvider.SPLIT_VIEW_LOAD_EVENT, params, this.siteId);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.memberInfoObserver && this.memberInfoObserver.off();
    }
}
