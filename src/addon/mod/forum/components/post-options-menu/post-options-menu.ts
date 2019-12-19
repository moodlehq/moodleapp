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
import { CoreSitesProvider } from '@providers/sites';
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

    constructor(navParams: NavParams,
            protected viewCtrl: ViewController,
            protected domUtils: CoreDomUtilsProvider,
            protected forumProvider: AddonModForumProvider,
            protected sitesProvider: CoreSitesProvider) {
        this.post = navParams.get('post');
        this.forumId = navParams.get('forumId');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.forumId) {
            if (this.post.id) {
                const site: CoreSite = this.sitesProvider.getCurrentSite();
                this.url = site.createSiteUrl('/mod/forum/discuss.php', {d: this.post.discussion}, 'p' + this.post.id);

                this.forumProvider.getDiscussionPost(this.forumId, this.post.discussion, this.post.id, true).then((post) => {
                    this.canDelete = post.capabilities.delete && this.forumProvider.isDeletePostAvailable();
                    this.canEdit = post.capabilities.edit && this.forumProvider.isUpdatePostAvailable();
                    this.wordCount = post.wordcount;
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'Error getting discussion post.');
                }).finally(() => {
                    this.loaded = true;
                });
            } else {
                // Offline post, you can edit or discard the post.
                this.canEdit = true;
                this.canDelete = true;
                this.loaded = true;
            }
        } else {
            this.loaded = true;
        }
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
