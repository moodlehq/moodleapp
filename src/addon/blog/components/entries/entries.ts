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

import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonBlogProvider, AddonBlogPost } from '../../providers/blog';
import { CoreCommentsProvider } from '@core/comments/providers/comments';
import { CoreTagProvider } from '@core/tag/providers/tag';

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
    protected userPageLoaded = 0;
    protected canLoadMoreEntries = false;
    protected canLoadMoreUserEntries = true;
    protected siteHomeId: number;

    @ViewChild(Content) content: Content;

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    entries: AddonBlogPostFormatted[] = [];
    currentUserId: number;
    showMyEntriesToggle = false;
    onlyMyEntries = false;
    component = AddonBlogProvider.COMPONENT;
    commentsEnabled: boolean;
    tagsEnabled: boolean;
    contextLevel: string;
    contextInstanceId: number;

    constructor(protected blogProvider: AddonBlogProvider, protected domUtils: CoreDomUtilsProvider,
            protected userProvider: CoreUserProvider, sitesProvider: CoreSitesProvider, protected utils: CoreUtilsProvider,
            protected commentsProvider: CoreCommentsProvider, private tagProvider: CoreTagProvider) {
        this.currentUserId = sitesProvider.getCurrentSiteUserId();
        this.siteHomeId = sitesProvider.getCurrentSiteHomeId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (this.userId) {
            this.filter['userid'] = this.userId;
        }
        this.showMyEntriesToggle = !this.userId;

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

        // Calculate the context level.
        if (this.userId && !this.courseId && !this.cmId) {
            this.contextLevel = 'user';
            this.contextInstanceId = this.userId;
        } else if (this.courseId && this.courseId != this.siteHomeId) {
            this.contextLevel = 'course';
            this.contextInstanceId = this.courseId;
        } else {
            this.contextLevel = 'system';
            this.contextInstanceId = 0;
        }

        this.commentsEnabled = !this.commentsProvider.areCommentsDisabledInSite();
        this.tagsEnabled = this.tagProvider.areTagsAvailableInSite();

        this.fetchEntries().then(() => {
            this.blogProvider.logView(this.filter).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Fetch blog entries.
     *
     * @param refresh Empty events array first.
     * @return Promise with the entries.
     */
    private fetchEntries(refresh: boolean = false): Promise<any> {
        this.loadMoreError = false;

        if (refresh) {
            this.pageLoaded = 0;
            this.userPageLoaded = 0;
        }

        const loadPage = this.onlyMyEntries ? this.userPageLoaded : this.pageLoaded;

        return this.blogProvider.getEntries(this.filter, loadPage).then((result) => {
            const promises = result.entries.map((entry: AddonBlogPostFormatted) => {
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

                // Calculate the context. This code was inspired by calendar events, Moodle doesn't do this for blogs.
                if (entry.moduleid || entry.coursemoduleid) {
                    entry.contextLevel = 'module';
                    entry.contextInstanceId = entry.moduleid || entry.coursemoduleid;
                } else if (entry.courseid) {
                    entry.contextLevel = 'course';
                    entry.contextInstanceId = entry.courseid;
                } else {
                    entry.contextLevel = 'user';
                    entry.contextInstanceId = entry.userid;
                }

                return this.userProvider.getProfile(entry.userid, entry.courseid, true).then((user) => {
                    entry.user = user;
                }).catch(() => {
                    // Ignore errors.
                });
            });

            if (refresh) {
                this.entries = result.entries;
            } else {
                this.entries = this.utils.uniqueArray(this.entries.concat(result.entries), 'id').sort((a, b) => {
                    return b.created - a.created;
                });
            }

            if (this.onlyMyEntries) {
                const count = this.entries.filter((entry) => {
                    return entry.userid == this.currentUserId;
                }).length;
                this.canLoadMoreUserEntries = result.totalentries > count;
                this.canLoadMore = this.canLoadMoreUserEntries;
                this.userPageLoaded++;
            } else {
                this.canLoadMoreEntries = result.totalentries > this.entries.length;
                this.canLoadMore = this.canLoadMoreEntries;
                this.pageLoaded++;
            }

            return Promise.all(promises);
        }).catch((message) => {
            this.domUtils.showErrorModalDefault(message, 'addon.blog.errorloadentries', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Toggle between showing only my entries or not.
     *
     * @param enabled If true, filter my entries. False otherwise.
     */
    onlyMyEntriesToggleChanged(enabled: boolean): void {
        if (enabled) {
            const count = this.entries.filter((entry) => {
                return entry.userid == this.currentUserId;
            }).length;
            this.userPageLoaded = Math.floor(count / AddonBlogProvider.ENTRIES_PER_PAGE);
            this.filter['userid'] = this.currentUserId;

            if (count == 0 && this.canLoadMoreUserEntries) {
                // First time but no entry loaded. Try to load some.
                this.loadMore();
            }
        } else {
            delete this.filter['userid'];
        }

        this.canLoadMore = enabled ? this.canLoadMoreUserEntries : this.canLoadMoreEntries;
    }

    /**
     * Function to load more entries.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Resolved when done.
     */
    loadMore(infiniteComplete?: any): Promise<any> {
        return this.fetchEntries().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Refresh blog entries on PTR.
     *
     * @param refresher Refresher instance.
     */
    refresh(refresher?: any): void {
        const promises = this.entries.map((entry) => {
            return this.commentsProvider.invalidateCommentsData('user', entry.userid, this.component, entry.id, 'format_blog');
        });

        promises.push(this.blogProvider.invalidateEntries(this.filter));

        if (this.showMyEntriesToggle) {
            this.filter['userid'] = this.currentUserId;
            promises.push(this.blogProvider.invalidateEntries(this.filter));

            if (!this.onlyMyEntries) {
                delete this.filter['userid'];
            }

        }

        this.utils.allPromises(promises).finally(() => {
            this.fetchEntries(true).finally(() => {
                if (refresher) {
                    refresher.complete();
                }
            });
        });
    }
}

/**
 * Blog post with some calculated data.
 */
type AddonBlogPostFormatted = AddonBlogPost & {
    publishTranslated?: string; // Calculated in the app. Key of the string to translate the publish state of the post.
    user?: any; // Calculated in the app. Data of the user that wrote the post.
    contextLevel?: string; // Calculated in the app. The context level of the entry.
    contextInstanceId?: number; // Calculated in the app. The context instance id.
};
