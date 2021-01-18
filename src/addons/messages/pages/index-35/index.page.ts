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

import { Component, OnDestroy } from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreTab } from '@components/tabs/tabs';
import { Params } from '@angular/router';
import { AddonMessagesProvider, AddonMessagesSplitViewLoadIndexEventData } from '../../services/messages';
import { CoreNavigator } from '@services/navigator';
// import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays the messages index page.
 */
@Component({
    selector: 'page-addon-messages-index',
    templateUrl: 'index.html',
})
export class AddonMessagesIndex35Page implements OnDestroy {

    // @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    tabs: CoreTab[] = [
        {
            id: 'discussions-35',
            class: '',
            title: 'addon.messages.messages',
            icon: 'fas-comments',
            enabled: true,
            page: 'main/messages/index/discussions',
        },
        {
            id: 'contacts-35',
            class: '',
            title: 'addon.messages.contacts',
            icon: 'fas-address-book',
            enabled: true,
            page: 'main/messages/index/contacts',
        },
    ];

    protected loadSplitViewObserver?: CoreEventObserver;
    protected siteId: string;

    constructor() {

        this.siteId = CoreSites.instance.getCurrentSiteId();

        // Update split view or navigate.
        this.loadSplitViewObserver = CoreEvents.on<AddonMessagesSplitViewLoadIndexEventData>(
            AddonMessagesProvider.SPLIT_VIEW_LOAD_INDEX_EVENT,
            (data) => {
                if (data.discussion /* @todo && (this.splitviewCtrl.isOn() || !data.onlyWithSplitView)*/) {
                    this.gotoDiscussion(data.discussion, data.message);
                }
            },

            this.siteId,
        );
    }

    /**
     * Navigate to a particular discussion.
     *
     * @param discussionUserId Discussion Id to load.
     * @param messageId Message to scroll after loading the discussion. Used when searching.
     */
    gotoDiscussion(discussionUserId: number, messageId?: number): void {
        const params: Params = {
            userId: discussionUserId,
        };

        if (messageId) {
            params.message = messageId;
        }

        // @todo
        // this.splitviewCtrl.push('discussion', { params });
        CoreNavigator.instance.navigateToSitePath('discussion', { params });
    }


    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.loadSplitViewObserver?.off();
    }

}
