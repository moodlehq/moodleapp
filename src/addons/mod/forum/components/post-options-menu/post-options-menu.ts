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
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { AddonModForum, AddonModForumPost } from '@addons/mod/forum/services/forum';
import { PopoverController } from '@singletons';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreNetworkError } from '@classes/errors/network-error';

/**
 * This component is meant to display a popover with the post options.
 */
@Component({
    selector: 'addon-forum-post-options-menu',
    templateUrl: 'post-options-menu.html',
    styleUrls: ['./post-options-menu.scss'],
})
export class AddonModForumPostOptionsMenuComponent implements OnInit {

    @Input({ required: true }) post!: AddonModForumPost; // The post.
    @Input({ required: true }) cmId!: number;
    @Input({ required: true }) forumId!: number; // The forum Id.

    canEdit = false;
    canDelete = false;
    loaded = false;
    url?: string;
    offlinePost = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.offlinePost = this.post.id < 0;
        if (this.offlinePost) {
            this.loaded = true;

            return;
        }

        if (this.post.capabilities.delete === undefined) {
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
                // Display the open in browser button to prevent having an empty menu.
                this.setOpenInBrowserUrl();

                return;
            }
        }

        this.canDelete = !!this.post.capabilities.delete && AddonModForum.isDeletePostAvailable();
        this.canEdit = !!this.post.capabilities.edit && AddonModForum.isUpdatePostAvailable();
        if (!this.canDelete && !this.canEdit) {
            // Display the open in browser button to prevent having an empty menu.
            this.setOpenInBrowserUrl();
        }

        this.loaded = true;
    }

    /**
     * Set the URL to open in browser.
     */
    protected setOpenInBrowserUrl(): void {
        const site = CoreSites.getRequiredCurrentSite();
        if (!site.shouldDisplayInformativeLinks()) {
            return;
        }

        this.url = site.createSiteUrl('/mod/forum/discuss.php', { d: this.post.discussionid.toString() }, 'p' + this.post.id);
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
            if (!CoreNetwork.isOnline()) {
                CoreDomUtils.showErrorModal(new CoreNetworkError());

                return;
            }

            PopoverController.dismiss({ action: 'delete' });
        } else {
            PopoverController.dismiss({ action: 'deleteoffline' });
        }
    }

    /**
     * Edit a post.
     */
    editPost(): void {
        if (!this.offlinePost && !CoreNetwork.isOnline()) {
            CoreDomUtils.showErrorModal(new CoreNetworkError());

            return;
        }

        PopoverController.dismiss({ action: 'edit' });
    }

}
