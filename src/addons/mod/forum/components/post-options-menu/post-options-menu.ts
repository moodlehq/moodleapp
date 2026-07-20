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

import { Component, computed, effect, input, linkedSignal, signal, untracked } from '@angular/core';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { AddonModForum, AddonModForumPost } from '@addons/mod/forum/services/forum';
import { PopoverController } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreAlerts } from '@services/overlays/alerts';
import { AddonModForumHelper } from '../../services/forum-helper';

/**
 * This component is meant to display a popover with the post options.
 */
@Component({
    selector: 'addon-forum-post-options-menu',
    templateUrl: 'post-options-menu.html',
    styleUrl: 'post-options-menu.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModForumPostOptionsMenuComponent {

    readonly post = input.required<AddonModForumPost>(); // The post.
    readonly cmId = input.required<number>();
    readonly forumId = input.required<number>(); // The forum Id.

    protected readonly postCalculated = linkedSignal(() => this.post());
    readonly canEdit = computed(() => this.isOfflinePost() || AddonModForumHelper.canUpdatePost(this.postCalculated()));

    readonly canDelete = computed(() => this.isOfflinePost() || AddonModForumHelper.canDeletePost(this.postCalculated()));
    readonly editDeleteDisabled = computed(() => this.unknownCapabilities() || (!this.isOfflinePost() && !this.isOnline()));

    readonly canMarkAsRead = computed(() =>
        !this.isOfflinePost() && AddonModForumHelper.canSetReadState(this.postCalculated()));

    readonly markAsReadDisabled = computed(() => this.unknownCapabilities() || !this.isOnline());

    readonly loaded = signal(false);

    readonly isOfflinePost = computed(() => this.postCalculated().id < 0);
    protected readonly isOnline = CoreNetwork.onlineSignal;

    protected readonly unknownCapabilities = computed(() => {
        if (this.isOfflinePost()) {
            return false;
        }

        const post = this.postCalculated();

        return post.capabilities.delete === undefined;
    });

    /**
     * @inheritdoc
     */
    constructor() {
        effect(async () => {
            const unknownCapabilities = this.unknownCapabilities();
            const isOnline = this.isOnline();

            if (!unknownCapabilities) {
                this.loaded.set(true);

                return;
            }

            // Only check this one because the others are always available if this one is.
            const wsAvailable = AddonModForum.isDeletePostAvailable();
            if (!wsAvailable) {
                // If the WS is not available, we cannot do anything.
                this.loaded.set(true);

                return;
            }

            const forumId = this.forumId();
            if (forumId && isOnline) {
                this.loaded.set(false);

                await untracked(async () => {
                    let post = this.postCalculated();

                    try {
                        post =
                            await AddonModForum.getDiscussionPost(forumId, post.discussionid, post.id, {
                                cmId: this.cmId(),
                                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                            });
                        this.postCalculated.set(post);
                    } catch (error) {
                        CoreAlerts.showError(error, { default: 'Error getting discussion post.' });
                    }
                });
            }

            this.loaded.set(true);
        });
    }

    /**
     * Close the popover.
     */
    dismiss(): void {
        PopoverController.dismiss();
    }

    /**
     * Delete a post.
     */
    deletePost(): void {
        if (!this.isOfflinePost()) {
            PopoverController.dismiss({ action: AddonModForumPostOptionsMenuAction.DELETE });
        } else {
            PopoverController.dismiss({ action: AddonModForumPostOptionsMenuAction.DELETE_OFFLINE });
        }
    }

    /**
     * Edit a post.
     */
    editPost(): void {
        PopoverController.dismiss({ action: AddonModForumPostOptionsMenuAction.EDIT });
    }

    /**
     * Toggle the read state of a post.
     */
    toggleReadState(): void {
        PopoverController.dismiss({
            action: this.postCalculated().unread
                ? AddonModForumPostOptionsMenuAction.MARKREAD
                : AddonModForumPostOptionsMenuAction.MARKUNREAD,
        });
    }

}

export enum AddonModForumPostOptionsMenuAction {
    DELETE = 'delete',
    DELETE_OFFLINE = 'deleteoffline',
    EDIT = 'edit',
    MARKREAD = 'markread',
    MARKUNREAD = 'markunread',
};
