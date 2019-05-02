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

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonBlogProvider } from '../../providers/blog';
import { CoreCommentsProvider } from '@core/comments/providers/comments';

/**
 * Component that displays the blog entries.
 */
@Component({
    selector: 'addon-blog-entries',
    templateUrl: 'addon-blog-entries.html',
})
export class AddonBlogEntriesComponent implements OnInit {
    @Input() userId?: number;
    @Input() courseId?: number;
    @Input() cmId?: number;
    @Input() entryId?: number;
    @Input() groupId?: number;
    @Input() tagId?: number;

    protected filter = {};
    protected pageLoaded = 0;

    @ViewChild(Content) content: Content;

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    entries = [];
    currentUserId: number;
    showMyIssuesToggle = false;
    onlyMyEntries = false;
    component = AddonBlogProvider.COMPONENT;
    commentsEnabled: boolean;

    constructor(protected blogProvider: AddonBlogProvider, protected domUtils: CoreDomUtilsProvider,
            protected userProvider: CoreUserProvider, sitesProvider: CoreSitesProvider,
            protected commentsProvider: CoreCommentsProvider) {
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.userId) {
            this.filter['userid'] = this.userId;
        }

        if (this.courseId) {
            this.filter['courseid'] = this.courseId;
        }

        if (this.cmId) {
            this.filter['cmid'] = this.cmId;
        }

        if (this.entryId) {
            this.filter['entryid'] = this.entryId;
        }

        if (this.groupId) {
            this.filter['groupid'] = this.groupId;
        }

        if (this.tagId) {
            this.filter['tagid'] = this.tagId;
        }

        this.commentsEnabled = !this.commentsProvider.areCommentsDisabledInSite();

        this.fetchEntries().then(() => {
            this.blogProvider.logView(this.filter).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Fetch blog entries.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>}         Promise with the entries.
     */
    private fetchEntries(refresh: boolean = false): Promise<any> {
        this.loadMoreError = false;

        if (refresh) {
            this.pageLoaded = 0;
        }

        return this.blogProvider.getEntries(this.filter, this.pageLoaded).then((result) => {
            const promises = result.entries.map((entry) => {
                switch (entry.publishstate) {
                    case 'draft':
                        entry.publishTranslated = 'publishtonoone';
                        break;
                    case 'site':
                        entry.publishTranslated = 'publishtosite';
                        break;
                    case 'public':
                        entry.publishTranslated = 'publishtoworld';
                        break;
                    default:
                        entry.publishTranslated = 'privacy:unknown';
                        break;
                }

                return this.userProvider.getProfile(entry.userid, entry.courseid, true).then((user) => {
                    entry.user = user;
                }).catch(() => {
                    // Ignore errors.
                });
            });

            if (refresh) {
                this.showMyIssuesToggle = false;
                this.entries = result.entries;
            } else {
                this.entries = this.entries.concat(result.entries);
            }

            this.canLoadMore = result.totalentries > this.entries.length;
            this.pageLoaded++;

            this.showMyIssuesToggle = !this.userId;

            return Promise.all(promises);
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.blog.errorloadentries', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Function to load more entries.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
     */
    loadMore(infiniteComplete?: any): Promise<any> {
        return this.fetchEntries().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Refresh blog entries on PTR.
     *
     * @param {any}     refresher  Refresher instance.
     */
    refresh(refresher?: any): void {
        this.blogProvider.invalidateEntries(this.filter).finally(() => {
            this.fetchEntries(true).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }

}
