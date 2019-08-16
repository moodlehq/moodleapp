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

import { Component, OnDestroy, ViewChild } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from '../../providers/messages';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreTabsComponent } from '@components/tabs/tabs';

/**
 * Page that displays contacts and contact requests.
 */
@IonicPage({ segment: 'addon-messages-contacts' })
@Component({
    selector: 'page-addon-messages-contacts',
    templateUrl: 'contacts.html',
})
export class AddonMessagesContactsPage implements OnDestroy {

    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;
    @ViewChild(CoreTabsComponent) tabsComponent: CoreTabsComponent;

    contactRequestsCount = 0;

    protected loadSplitViewObserver: any;
    protected siteId: string;
    protected contactRequestsCountObserver: any;
    protected conversationUserId: number; // User id of the conversation opened in the split view.
    protected selectedUserId = {
        contacts: null, // User id of the selected user in the confirmed contacts tab.
        requests: null, // User id of the selected user in the contact requests tab.
    };

    constructor(eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider,
            private navCtrl: NavController, private messagesProvider: AddonMessagesProvider) {

        this.siteId = sitesProvider.getCurrentSiteId();

        // Update the contact requests badge.
        this.contactRequestsCountObserver = eventsProvider.on(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, (data) => {
            this.contactRequestsCount = data.count;
        }, this.siteId);
    }

    /**
     * Page being initialized.
     */
    ngOnInit(): void {
        this.messagesProvider.getContactRequestsCount(this.siteId); // Badge already updated by the observer.
    }

    /**
     * Navigate to the search page.
     */
    gotoSearch(): void {
        this.navCtrl.push('AddonMessagesSearchPage');
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        if (!this.splitviewCtrl.isOn()) {
            this.selectedUserId.contacts = null;
            this.selectedUserId.requests = null;
        }

        this.tabsComponent && this.tabsComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent && this.tabsComponent.ionViewDidLeave();
    }

    /**
     * Set the selected user and open the conversation in the split view if needed.
     *
     * @param {string} tab Active tab: "contacts" or "requests".
     * @param {number} [userId] Id of the selected user, undefined to use the last selected user in the tab.
     * @param {boolean} [onInit=false] Whether the contact was selected on initial load.
     */
    selectUser(tab: string, userId?: number, onInit: boolean = false): void {
        userId = userId || this.selectedUserId[tab];

        if (!userId || userId == this.conversationUserId && this.splitviewCtrl.isOn()) {
            // No user conversation to open or it is already opened.
            return;
        }

        if (onInit && !this.splitviewCtrl.isOn()) {
            // Do not open a conversation by default when split view is not visible.
            return;
        }

        this.conversationUserId = userId;
        this.selectedUserId[tab] = userId;
        this.splitviewCtrl.push('AddonMessagesDiscussionPage', { userId });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.contactRequestsCountObserver && this.contactRequestsCountObserver.off();
    }
}
