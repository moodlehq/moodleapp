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

import { Component, OnInit, NgZone } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider, CoreSitesReadingStrategy } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { AddonModForumProvider } from '../../providers/forum';
import { CoreApp } from '@providers/app';
import { Network } from '@ionic-native/network';

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
    isOnline: boolean;
    offlinePost: boolean;

    protected cmId: number;
    protected onlineObserver: any;

    constructor(navParams: NavParams,
            network: Network,
            zone: NgZone,
            protected viewCtrl: ViewController,
            protected domUtils: CoreDomUtilsProvider,
            protected forumProvider: AddonModForumProvider,
            protected sitesProvider: CoreSitesProvider) {
        this.post = navParams.get('post');
        this.forumId = navParams.get('forumId');
        this.cmId = navParams.get('cmId');

        this.isOnline = CoreApp.instance.isOnline();
        this.onlineObserver = network.onchange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = CoreApp.instance.isOnline();
            });
        });
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (this.post.id > 0) {
            const site: CoreSite = this.sitesProvider.getCurrentSite();
            this.url = site.createSiteUrl('/mod/forum/discuss.php', {d: this.post.discussionid}, 'p' + this.post.id);
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
        if (!this.offlinePost) {
            this.viewCtrl.dismiss({action: 'delete'});
        } else {
            this.viewCtrl.dismiss({action: 'deleteoffline'});
        }
    }

    /**
     * Edit a post.
     */
    editPost(): void {
        if (!this.offlinePost) {
            this.viewCtrl.dismiss({action: 'edit'});
        } else {
            this.viewCtrl.dismiss({action: 'editoffline'});
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
