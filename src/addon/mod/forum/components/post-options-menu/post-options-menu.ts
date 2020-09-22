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
import { CoreSitesProvider, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { AddonModForumProvider } from '../../providers/forum';

/**
 * This component is meant to display a popover with the post options.
 */
@Component({
    selector: 'addon-forum-post-options-menu',
    templateUrl: 'addon-forum-post-options-menu.html'
})
export class AddonForumPostOptionsMenuComponent implements OnInit {
    post: any; // The post.
    forumId: number; // The forum Id.
    wordCount: number; // Number of words when available.
    canEdit = false;
    canDelete = false;
    loaded = false;
    url: string;

    protected cmId: number;

    constructor(navParams: NavParams,
            protected viewCtrl: ViewController,
            protected domUtils: CoreDomUtilsProvider,
            protected forumProvider: AddonModForumProvider,
            protected sitesProvider: CoreSitesProvider) {
        this.post = navParams.get('post');
        this.forumId = navParams.get('forumId');
        this.cmId = navParams.get('cmId');
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (this.post.id) {
            const site: CoreSite = this.sitesProvider.getCurrentSite();
            this.url = site.createSiteUrl('/mod/forum/discuss.php', {d: this.post.discussionid}, 'p' + this.post.id);
        } else {
            // Offline post, you can edit or discard the post.
            this.canEdit = true;
            this.canDelete = true;
            this.loaded = true;

            return;
        }

        if (typeof this.post.capabilities.delete == 'undefined') {
            if (this.forumId) {
                try {
                    this.post =
                        await this.forumProvider.getDiscussionPost(this.forumId, this.post.discussionid, this.post.id, {
                            cmId: this.cmId,
                            readingStrategy: CoreSitesReadingStrategy.OnlyNetwork,
                        });
                } catch (error) {
                    this.domUtils.showErrorModalDefault(error, 'Error getting discussion post.');
                }
            } else {
                this.loaded = true;

                return;
            }
        }

        this.canDelete = this.post.capabilities.delete && this.forumProvider.isDeletePostAvailable();
        this.canEdit = this.post.capabilities.edit && this.forumProvider.isUpdatePostAvailable();
        this.wordCount = this.post.haswordcount && this.post.wordcount;
        this.loaded = true;
    }

    /**
     * Close the popover.
     */
    dismiss(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Delete a post.
     */
    deletePost(): void {
        if (this.post.id) {
            this.viewCtrl.dismiss({action: 'delete'});
        } else {
            this.viewCtrl.dismiss({action: 'deleteoffline'});
        }
    }

    /**
     * Edit a post.
     */
    editPost(): void {
        if (this.post.id) {
            this.viewCtrl.dismiss({action: 'edit'});
        } else {
            this.viewCtrl.dismiss({action: 'editoffline'});
        }
    }
}
