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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import { CoreUser } from '@features/user/services/user';
import {
    AddonModForum,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumProvider,
    AddonModForumSortOrder,
} from '../services/forum';
import { AddonModForumOffline, AddonModForumOfflineDiscussion } from '../services/forum-offline';

export class AddonModForumDiscussionsSource extends CoreRoutedItemsManagerSource<AddonModForumDiscussionItem> {

    static readonly NEW_DISCUSSION: AddonModForumNewDiscussionForm = { newDiscussion: true };

    readonly DISCUSSIONS_PATH_PREFIX: string;
    readonly COURSE_ID: number;
    readonly CM_ID: number;

    forum?: AddonModForumData;
    trackPosts = false;
    usesGroups = false;
    selectedSortOrder: AddonModForumSortOrder | null = null;

    constructor(courseId: number, cmId: number, discussionsPathPrefix: string) {
        super();

        this.DISCUSSIONS_PATH_PREFIX = discussionsPathPrefix;
        this.COURSE_ID = courseId;
        this.CM_ID = cmId;
    }

    /**
     * Type guard to infer NewDiscussionForm objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is a new discussion form.
     */
    isNewDiscussionForm(discussion: AddonModForumDiscussionItem): discussion is AddonModForumNewDiscussionForm {
        return 'newDiscussion' in discussion;
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is an online discussion.
     */
    isOfflineDiscussion(discussion: AddonModForumDiscussionItem): discussion is AddonModForumOfflineDiscussion {
        return !this.isNewDiscussionForm(discussion) && !this.isOnlineDiscussion(discussion);
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @return Whether the item is an online discussion.
     */
    isOnlineDiscussion(discussion: AddonModForumDiscussionItem): discussion is AddonModForumDiscussion {
        return 'id' in discussion;
    }

    /**
     * @inheritdoc
     */
    getItemPath(discussion: AddonModForumDiscussionItem): string {
        if (this.isOnlineDiscussion(discussion)) {
            return this.DISCUSSIONS_PATH_PREFIX + discussion.discussion;
        }

        if (this.isOfflineDiscussion(discussion)) {
            return `${this.DISCUSSIONS_PATH_PREFIX}new/${discussion.timecreated}`;
        }

        return `${this.DISCUSSIONS_PATH_PREFIX}new/0`;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(discussion: AddonModForumDiscussionItem): Params {
        return {
            courseId: this.COURSE_ID,
            cmId: this.CM_ID,
            forumId: this.forum?.id,
            ...(this.isOnlineDiscussion(discussion) ? { discussion, trackPosts: this.trackPosts } : {}),
        };
    }

    /**
     * @inheritdoc
     */
    getPagesLoaded(): number {
        if (this.items === null) {
            return 0;
        }

        const onlineEntries = this.items.filter(item => this.isOnlineDiscussion(item));

        return Math.ceil(onlineEntries.length / this.getPageLength());
    }

    /**
     * @inheritdoc
     */
    getPageLength(): number {
        return AddonModForumProvider.DISCUSSIONS_PER_PAGE;
    }

    /**
     * Load forum.
     */
    async loadForum(): Promise<void> {
        this.forum = await AddonModForum.getForum(this.COURSE_ID, this.CM_ID);

        if (this.forum.istracked !== undefined) {
            this.trackPosts = this.forum.istracked;
        }
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: AddonModForumDiscussionItem[]; hasMoreItems: boolean }> {
        const discussions: AddonModForumDiscussionItem[] = [];

        if (page === 0) {
            const offlineDiscussions = await this.loadOfflineDiscussions();

            discussions.push(AddonModForumDiscussionsSource.NEW_DISCUSSION);
            discussions.push(...offlineDiscussions);
        }

        const { discussions: onlineDiscussions, canLoadMore } = await this.loadOnlineDiscussions(page);

        discussions.push(...onlineDiscussions);

        return {
            items: discussions,
            hasMoreItems: canLoadMore,
        };
    }

    /**
     * Load online discussions for the given page.
     *
     * @param page Page.
     * @returns Online discussions info.
     */
    private async loadOnlineDiscussions(page: number): Promise<{
        discussions: AddonModForumDiscussionItem[];
        canLoadMore: boolean;
    }> {
        if (!this.forum || !this.selectedSortOrder) {
            throw new Error('Can\'t load discussions without a forum or selected sort order');
        }

        const response = await AddonModForum.getDiscussions(this.forum.id, {
            cmId: this.forum.cmid,
            sortOrder: this.selectedSortOrder.value,
            page,
        });
        let discussions = response.discussions;

        if (this.usesGroups) {
            discussions = await AddonModForum.formatDiscussionsGroups(this.forum.cmid, discussions);
        }

        // Hide author for first post and type single.
        if (this.forum.type === 'single') {
            for (const discussion of discussions) {
                if (discussion.userfullname && discussion.parent === 0) {
                    discussion.userfullname = false;
                    break;
                }
            }
        }

        // If any discussion has unread posts, the whole forum is being tracked.
        if (this.forum.istracked === undefined && !this.trackPosts) {
            for (const discussion of discussions) {
                if (discussion.numunread > 0) {
                    this.trackPosts = true;
                    break;
                }
            }
        }

        return { discussions, canLoadMore: response.canLoadMore };
    }

    /**
     * Load offline discussions.
     *
     * @returns Offline discussions.
     */
    private async loadOfflineDiscussions(): Promise<AddonModForumOfflineDiscussion[]> {
        if (!this.forum) {
            throw new Error('Can\'t load discussions without a forum');
        }

        const forum = this.forum;
        let offlineDiscussions = await AddonModForumOffline.getNewDiscussions(forum.id);

        if (offlineDiscussions.length === 0) {
            return [];
        }

        if (this.usesGroups) {
            offlineDiscussions = await AddonModForum.formatDiscussionsGroups(forum.cmid, offlineDiscussions);
        }

        // Fill user data for Offline discussions (should be already cached).
        const promises = offlineDiscussions.map(async (offlineDiscussion) => {
            const discussion = offlineDiscussion as unknown as AddonModForumDiscussion;

            if (discussion.parent === 0 || forum.type === 'single') {
                // Do not show author for first post and type single.
                return;
            }

            try {
                const user = await CoreUser.getProfile(discussion.userid, this.COURSE_ID, true);

                discussion.userfullname = user.fullname;
                discussion.userpictureurl = user.profileimageurl;
            } catch (error) {
                // Ignore errors.
            }
        });

        await Promise.all(promises);

        // Sort discussion by time (newer first).
        offlineDiscussions.sort((a, b) => b.timecreated - a.timecreated);

        return offlineDiscussions;
    }

}

/**
 * Type to select the new discussion form.
 */
export type AddonModForumNewDiscussionForm = { newDiscussion: true };

/**
 * Type of items that can be held by the discussions manager.
 */
export type AddonModForumDiscussionItem = AddonModForumDiscussion | AddonModForumOfflineDiscussion | AddonModForumNewDiscussionForm;
