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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreApp } from '@services/app';
import { AddonModForum, AddonModForumPost } from '@addons/mod/forum/services/forum';
import { Network, NgZone, PopoverController } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * This component is meant to display a popover with the post options.
 */
@Component({
    selector: 'addon-forum-post-options-menu',
    templateUrl: 'post-options-menu.html',
    styleUrls: ['./post-options-menu.scss'],
})
export class AddonModForumPostOptionsMenuComponent implements OnInit, OnDestroy {

    @Input() post!: AddonModForumPost; // The post.
    @Input() cmId!: number;
    @Input() forumId!: number; // The forum Id.

    wordCount?: number | null; // Number of words when available.
    canEdit = false;
    canDelete = false;
    loaded = false;
    url?: string;
    isOnline!: boolean;
    offlinePost!: boolean;

    protected onlineObserver?: Subscription;

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        this.isOnline = CoreApp.isOnline();

        this.onlineObserver = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreApp.isOnline();
            });
        });

        if (this.post.id > 0) {
            const site = CoreSites.getCurrentSite()!;
            this.url = site.createSiteUrl('/mod/forum/discuss.php', { d: this.post.discussionid.toString() }, 'p' + this.post.id);
            this.offlinePost = false;
        } else {
            // Offline post, you can edit or discard the post.
            this.loaded = true;
            this.offlinePost = true;

            return;
        }

        if (typeof this.post.capabilities.delete == 'undefined') {
            if (this.forumId) {
                try {
                    this.post =
                        await AddonModForum.getDiscussionPost(this.forumId, this.post.discussionid, this.post.id, {
                            cmId: this.cmId,
                            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
                        });
                } catch (error) {
                    CoreDomUtils.showErrorModalDefault(error, 'Error getting discussion post.');
                }
            } else {
                this.loaded = true;

                return;
            }
        }

        this.canDelete = !!this.post.capabilities.delete && AddonModForum.isDeletePostAvailable();
        this.canEdit = !!this.post.capabilities.edit && AddonModForum.isUpdatePostAvailable();
        this.wordCount = (this.post.haswordcount && this.post.wordcount) || null;
        this.loaded = true;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver?.unsubscribe();
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
        if (!this.offlinePost) {
            PopoverController.dismiss({ action: 'delete' });
        } else {
            PopoverController.dismiss({ action: 'deleteoffline' });
        }
    }

    /**
     * Edit a post.
     */
    editPost(): void {
        if (!this.offlinePost) {
            PopoverController.dismiss({ action: 'edit' });
        } else {
            PopoverController.dismiss({ action: 'editoffline' });
        }
    }

}
