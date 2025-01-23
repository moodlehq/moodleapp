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
import { CoreSites } from '@services/sites';
import {
    AddonMessagesGetContactsWSResponse,
    AddonMessagesSearchContactsContact,
    AddonMessagesGetContactsContact,
    AddonMessages,
} from '../../services/messages';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { ActivatedRoute } from '@angular/router';
import { Translate } from '@singletons';
import { CoreScreen } from '@services/screen';
import { CoreNavigator } from '@services/navigator';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreKeyboard } from '@singletons/keyboard';
import { ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT } from '@addons/messages/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSearchComponentsModule } from '@features/search/components/components.module';

/**
 * Page that displays the list of contacts.
 */
@Component({
    selector: 'addon-messages-contacts',
    templateUrl: 'contacts.html',
    styleUrl: '../../messages-common.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreSearchComponentsModule,
    ],
})
export default class AddonMessagesContacts35Page implements OnInit, OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitView!: CoreSplitViewComponent;

    protected searchingMessages: string;
    protected loadingMessages: string;
    protected siteId: string;
    protected noSearchTypes = ['online', 'offline', 'blocked', 'strangers'];
    protected memberInfoObserver: CoreEventObserver;

    loaded = false;
    discussionUserId?: number;
    contactTypes = ['online', 'offline', 'blocked', 'strangers'];
    searchType = 'search';
    loadingMessage = '';
    hasContacts = false;
    contacts: AddonMessagesGetContactsFormatted = {
        online: [],
        offline: [],
        strangers: [],
        search: [],
    };

    searchString = '';

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.siteId = CoreSites.getCurrentSiteId();
        this.searchingMessages = Translate.instant('core.searching');
        this.loadingMessages = Translate.instant('core.loading');
        this.loadingMessage = this.loadingMessages;

        // Refresh the list when a contact request is confirmed.
        this.memberInfoObserver = CoreEvents.on(
            ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT,
            (data) => {
                if (data.contactRequestConfirmed) {
                    this.refreshData();
                }
            },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * Component loaded.
     */
    async ngOnInit(): Promise<void> {
        const discussionUserId = CoreNavigator.getRouteNumberParam('discussionUserId') ||
            CoreNavigator.getRouteNumberParam('userId') || undefined;

        if (this.loaded && this.discussionUserId == discussionUserId) {
            return;
        }

        this.discussionUserId = discussionUserId;

        if (this.discussionUserId) {
            // There is a discussion to load, open the discussion in a new state.
            this.gotoDiscussion(this.discussionUserId);
        }

        try {
            await this.fetchData();
            if (!this.discussionUserId && this.hasContacts && CoreScreen.isTablet) {
                let contact: AddonMessagesGetContactsContact | undefined;
                for (const x in this.contacts) {
                    if (this.contacts[x].length > 0) {
                        contact = this.contacts[x][0];
                        break;
                    }
                }

                if (contact) {
                    // Take first and load it.
                    this.gotoDiscussion(contact.id);
                }
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async refreshData(refresher?: HTMLIonRefresherElement): Promise<void> {
        try {
            if (this.searchString) {
                // User has searched, update the search.
                await this.performSearch(this.searchString);
            } else {
                // Update contacts.
                await AddonMessages.invalidateAllContactsCache();
                await this.fetchData();
            }
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Fetch contacts.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        this.loadingMessage = this.loadingMessages;

        try {
            const contacts = await AddonMessages.getAllContacts();
            for (const x in contacts) {
                if (contacts[x].length > 0) {
                    this.contacts[x] = this.sortUsers(contacts[x]);
                } else {
                    this.contacts[x] = [];
                }
            }

            this.clearSearch();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.messages.errorwhileretrievingcontacts') });
        }
    }

    /**
     * Sort user list by fullname
     *
     * @param list List to sort.
     * @returns Sorted list.
     */
    protected sortUsers(list: AddonMessagesSearchContactsContact[]): AddonMessagesSearchContactsContact[] {
        return list.sort((a, b) => {
            const compareA = a.fullname.toLowerCase();
            const compareB = b.fullname.toLowerCase();

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
     * @param query Text to search for.
     * @returns Resolved when done.
     */
    async search(query: string): Promise<void> {
        CoreKeyboard.close();

        this.loaded = false;
        this.loadingMessage = this.searchingMessages;

        try {
            await this.performSearch(query);
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Perform the search of users.
     *
     * @param query Text to search for.
     * @returns Resolved when done.
     */
    protected async performSearch(query: string): Promise<void> {
        try {
            const result = await AddonMessages.searchContacts(query);
            this.hasContacts = result.length > 0;
            this.searchString = query;
            this.contactTypes = ['search'];

            this.contacts.search = this.sortUsers(result);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.messages.errorwhileretrievingcontacts') });
        }
    }

    /**
     * Navigate to a particular discussion.
     *
     * @param discussionUserId Discussion Id to load.
     */
    gotoDiscussion(discussionUserId: number): void {
        this.discussionUserId = discussionUserId;

        const path = CoreNavigator.getRelativePathToParent('/messages/contacts-35') + `discussion/user/${discussionUserId}`;

        // @todo Check why this is failing on ngInit.
        CoreNavigator.navigate(path, {
            reset: CoreScreen.isTablet && !!this.splitView && !this.splitView.isNested,
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.memberInfoObserver?.off();
    }

}

/**
 * Contacts with some calculated data.
 */
export type AddonMessagesGetContactsFormatted = AddonMessagesGetContactsWSResponse & {
    search?: AddonMessagesSearchContactsContact[]; // Calculated in the app. Result of searching users.
};
