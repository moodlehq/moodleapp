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

import { Component, OnInit } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { AddonModForumProvider } from '../../providers/forum';

/**
 * This component is meant to display a popover with the discussion options.
 */
@Component({
    selector: 'addon-forum-discussion-options-menu',
    templateUrl: 'addon-forum-discussion-options-menu.html'
})
export class AddonForumDiscussionOptionsMenuComponent implements OnInit {
    discussion: any; // The discussion.
    forumId: number; // The forum Id.
    cmId: number; // The component module Id.
    canPin = false;

    constructor(navParams: NavParams,
            protected viewCtrl: ViewController,
            protected forumProvider: AddonModForumProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider,
            protected sitesProvider: CoreSitesProvider) {
        this.discussion = navParams.get('discussion');
        this.forumId = navParams.get('forumId');
        this.cmId = navParams.get('cmId');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.forumProvider.isSetPinStateAvailableForSite()) {
            // Use the canAddDiscussion WS to check if the user can pin discussions.
            this.forumProvider.canAddDiscussionToAll(this.forumId).then((response) => {
                this.canPin = !!response.canpindiscussions;
            }).catch(() => {
                this.canPin = false;
            });
        } else {
            this.canPin = false;
        }
    }

    /**
     * Lock or unlock the discussion.
     *
     * @param locked True to lock the discussion, false to unlock.
     */
    setLockState(locked: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.setLockState(this.forumId, this.discussion.discussion, locked).then((response) => {
            this.viewCtrl.dismiss({action: 'lock', value: locked});

            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                locked: response.locked
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.lockupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
            this.viewCtrl.dismiss();
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Pin or unpin the discussion.
     *
     * @param pinned True to pin the discussion, false to unpin it.
     */
    setPinState(pinned: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.setPinState(this.discussion.discussion, pinned).then(() => {
            this.viewCtrl.dismiss({action: 'pin', value: pinned});

            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                pinned: pinned
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.pinupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
            this.viewCtrl.dismiss();
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Star or unstar the discussion.
     *
     * @param starred True to star the discussion, false to unstar it.
     */
    toggleFavouriteState(starred: boolean): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.forumProvider.toggleFavouriteState(this.discussion.discussion, starred).then(() => {
            this.viewCtrl.dismiss({action: 'star', value: starred});

            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                starred: starred
            };
            this.eventsProvider.trigger(AddonModForumProvider.CHANGE_DISCUSSION_EVENT, data, this.sitesProvider.getCurrentSiteId());

            this.domUtils.showToast('addon.mod_forum.favouriteupdated', true);
        }).catch((error) => {
            this.domUtils.showErrorModal(error);
            this.viewCtrl.dismiss();
        }).finally(() => {
            modal.dismiss();
        });
    }
}
