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
    AddonMessages,
    AddonMessagesContactRequestCountEventData,
    AddonMessagesProvider,
    AddonMessagesSplitViewLoadContactsEventData,
} from '../../services/messages';
import { CoreTab } from '@components/tabs/tabs';
import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';

/**
 * Page that displays contacts and contact requests.
 */
@Component({
    selector: 'page-addon-messages-contacts',
    templateUrl: 'contacts.html',
})
export class AddonMessagesContactsPage implements OnInit, OnDestroy {

    protected contactsTab: CoreTab =         {
        id: 'contacts-confirmed',
        class: '',
        title: 'addon.messages.contacts',
        icon: 'fas-address-book',
        enabled: true,
        page: '/main/messages/contacts/confirmed',
    };

    protected requestsTab: CoreTab = {
        id: 'contact-requests',
        class: '',
        title: 'addon.messages.requests',
        icon: 'fas-user-plus',
        enabled: true,
        page: '/main/messages/contacts/requests',
        badge: '',
    };

    tabs: CoreTab[] = [];

    protected siteId: string;
    protected contactRequestsCountObserver: CoreEventObserver;
    protected splitViewObserver: CoreEventObserver;
    protected selectedUserId?: number; // User id of the conversation opened in the split view.

    constructor() {

        this.tabs = [this.contactsTab, this.requestsTab];

        this.siteId = CoreSites.instance.getCurrentSiteId();

        // Update the contact requests badge.
        this.contactRequestsCountObserver = CoreEvents.on<AddonMessagesContactRequestCountEventData>(
            AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT,
            (data) => {
                this.requestsTab.badge = data.count > 0 ? String(data.count) : '';
            },
            this.siteId,
        );

        // Update the contact requests badge.
        this.splitViewObserver = CoreEvents.on<AddonMessagesSplitViewLoadContactsEventData>(
            AddonMessagesProvider.SPLIT_VIEW_LOAD_CONTACTS_EVENT,
            (data) => {
                this.selectUser(data.userId, data.onInit);
            },
        );

    }

    /**
     * Page being initialized.
     */
    ngOnInit(): void {
        AddonMessages.instance.getContactRequestsCount(this.siteId); // Badge already updated by the observer.
    }

    /**
     * Navigate to the search page.
     */
    gotoSearch(): void {
        CoreNavigator.instance.navigateToSitePath('search');
    }

    /**
     * Set the selected user and open the conversation in the split view if needed.
     *
     * @param userId Id of the selected user, undefined to use the last selected user in the tab.
     * @param onInit Whether the contact was selected on initial load.
     */
    selectUser(userId: number, onInit = false): void {
        if (userId == this.selectedUserId && CoreScreen.instance.isTablet) {
            // No user conversation to open or it is already opened.
            return;
        }

        if (onInit && CoreScreen.instance.isMobile) {
            // Do not open a conversation by default when split view is not visible.
            return;
        }

        this.selectedUserId = userId;

        // @todo it does not seem to work load anything.
        let path = 'discussion';
        if (CoreScreen.instance.isMobile) {
            path = '../../' + path;
        } else {
            const splitViewLoaded = CoreNavigator.instance.isSplitViewOutletLoaded('**/messages/contacts/**/discussion');
            path = (splitViewLoaded ? '../' : '') + path;
        }

        CoreNavigator.instance.navigate(path, { params : { userId } });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.contactRequestsCountObserver?.off();
        this.splitViewObserver?.off();
    }

}
