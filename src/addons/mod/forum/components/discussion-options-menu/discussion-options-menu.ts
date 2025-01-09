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
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { PopoverController } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { AddonModForum, AddonModForumDiscussion } from '../../services/forum';
import { ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT } from '../../constants';
import { CoreToasts } from '@services/overlays/toasts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreLoadings } from '@services/overlays/loadings';

/**
 * This component is meant to display a popover with the discussion options.
 */
@Component({
    selector: 'addon-forum-discussion-options-menu',
    templateUrl: 'discussion-options-menu.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModForumDiscussionOptionsMenuComponent implements OnInit {

    @Input({ required: true }) discussion!: AddonModForumDiscussion; // The discussion.
    @Input({ required: true }) forumId!: number; // The forum Id.
    @Input({ required: true }) cmId!: number; // The component module Id.

    canPin = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!AddonModForum.isSetPinStateAvailableForSite()) {
            this.canPin = false;

            return;
        }

        // Use the canAddDiscussion WS to check if the user can pin discussions.
        try {
            const response = await AddonModForum.canAddDiscussionToAll(this.forumId, { cmId: this.cmId });

            this.canPin = !!response.canpindiscussions;
        } catch (error) {
            this.canPin = false;
        }
    }

    /**
     * Lock or unlock the discussion.
     *
     * @param locked True to lock the discussion, false to unlock.
     */
    async setLockState(locked: boolean): Promise<void> {
        const modal = await CoreLoadings.show('core.sending', true);

        try {
            const response = await AddonModForum.setLockState(this.forumId, this.discussion.discussion, locked);
            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                locked: response.locked,
            };

            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());
            PopoverController.dismiss({ action: 'lock', value: locked });
            CoreToasts.show({
                message: 'addon.mod_forum.lockupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            PopoverController.dismiss();
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Pin or unpin the discussion.
     *
     * @param pinned True to pin the discussion, false to unpin it.
     */
    async setPinState(pinned: boolean): Promise<void> {
        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModForum.setPinState(this.discussion.discussion, pinned);

            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                pinned: pinned,
            };

            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());
            PopoverController.dismiss({ action: 'pin', value: pinned });
            CoreToasts.show({
                message: 'addon.mod_forum.pinupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            PopoverController.dismiss();
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Star or unstar the discussion.
     *
     * @param starred True to star the discussion, false to unstar it.
     */
    async toggleFavouriteState(starred: boolean): Promise<void> {
        const modal = await CoreLoadings.show('core.sending', true);

        try {
            await AddonModForum.toggleFavouriteState(this.discussion.discussion, starred);

            const data = {
                forumId: this.forumId,
                discussionId: this.discussion.discussion,
                cmId: this.cmId,
                starred: starred,
            };

            CoreEvents.trigger(ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT, data, CoreSites.getCurrentSiteId());
            PopoverController.dismiss({ action: 'star', value: starred });
            CoreToasts.show({
                message: 'addon.mod_forum.favouriteupdated',
                translateMessage: true,
            });
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            PopoverController.dismiss();
        } finally {
            modal.dismiss();
        }
    }

}
