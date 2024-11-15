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
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonModForum,
    AddonModForumCanAddDiscussion,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumSortOrder,
} from '../services/forum';
import { AddonModForumOffline, AddonModForumOfflineDiscussion } from '../services/forum-offline';
import { ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE, AddonModForumType } from '../constants';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';

export class AddonModForumDiscussionsSource extends CoreRoutedItemsManagerSource<AddonModForumDiscussionItem> {

    static readonly NEW_DISCUSSION: AddonModForumNewDiscussionForm = { newDiscussion: true };

    readonly DISCUSSIONS_PATH_PREFIX: string;
    readonly COURSE_ID: number;
    readonly CM_ID: number;

    forum?: AddonModForumData;
    trackPosts = false;
    usesGroups = false;
    supportsChangeGroup = false;
    selectedSortOrder: AddonModForumSortOrder | null = null;
    groupId = 0;
    groupInfo?: CoreGroupInfo;
    allPartsPermissions?: AddonModForumCanAddDiscussion;
    canAddDiscussionToGroup = true;
    errorLoadingDiscussions = false;

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
     * @returns Whether the item is a new discussion form.
     */
    isNewDiscussionForm(discussion: AddonModForumDiscussionItem): discussion is AddonModForumNewDiscussionForm {
        return 'newDiscussion' in discussion;
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @returns Whether the item is an online discussion.
     */
    isOfflineDiscussion(discussion: AddonModForumDiscussionItem): discussion is AddonModForumOfflineDiscussion {
        return !this.isNewDiscussionForm(discussion) && !this.isOnlineDiscussion(discussion);
    }

    /**
     * Type guard to infer AddonModForumDiscussion objects.
     *
     * @param discussion Item to check.
     * @returns Whether the item is an online discussion.
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
        const params: Params = {
            courseId: this.COURSE_ID,
            cmId: this.CM_ID,
            forumId: this.forum?.id,
        };

        if (this.isOnlineDiscussion(discussion)) {
            params.discussion = discussion;
            params.trackPosts = this.trackPosts;
        } else if (this.isNewDiscussionForm(discussion)) {
            params.groupId = this.usesGroups ? this.groupId : undefined;
        }

        return params;
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
        return ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE;
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
     * Load group info.
     */
    async loadGroupInfo(forumId: number): Promise<void> {
        [this.groupInfo, this.allPartsPermissions] = await Promise.all([
            CoreGroups.getActivityGroupInfo(this.CM_ID, false),
            CorePromiseUtils.ignoreErrors(AddonModForum.canAddDiscussionToAll(forumId, { cmId: this.CM_ID })),
        ]);

        this.supportsChangeGroup = AddonModForum.isGetDiscussionPostsAvailable();
        this.usesGroups = !!(this.groupInfo.separateGroups || this.groupInfo.visibleGroups);
        this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);

        await this.loadSelectedGroupData();
    }

    /**
     * Load some specific data for current group.
     */
    async loadSelectedGroupData(): Promise<void> {
        if (!this.usesGroups) {
            this.canAddDiscussionToGroup = true;
        } else if (this.groupId === 0) {
            this.canAddDiscussionToGroup = !this.allPartsPermissions || this.allPartsPermissions.status;
        } else if (this.forum) {
            const addDiscussionData = await AddonModForum.canAddDiscussion(this.forum.id, this.groupId, { cmId: this.CM_ID });

            this.canAddDiscussionToGroup = addDiscussionData.status;
        } else {
            // Shouldn't happen, assume the user can.
            this.canAddDiscussionToGroup = true;
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

        // If the user has already posted in a Each user posts a single discussion forum, don't allow to post again.
        // This check is only needed in offline mode.
        if (this.canAddDiscussionToGroup && this.forum?.type === AddonModForumType.EACHUSER) {
            const userId = CoreSites.getCurrentSiteUserId();

            this.canAddDiscussionToGroup = !discussions.some((discussion) =>
                this.isOfflineDiscussion(discussion) || !this.isNewDiscussionForm(discussion) && discussion.userid === userId);
        }

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

        let discussions: AddonModForumDiscussion[] = [];
        let canLoadMore = false;
        try {
            const response = await AddonModForum.getDiscussions(this.forum.id, {
                cmId: this.forum.cmid,
                sortOrder: this.selectedSortOrder.value,
                page,
                groupId: this.groupId,
            });

            discussions = response.discussions;
            canLoadMore = response.canLoadMore;
            this.errorLoadingDiscussions = false;
        } catch (error) {
            if (page > 0 || CoreUtils.isWebServiceError(error)) {
                throw error;
            }

            // Error loading first discussions, use an empty list.
            this.errorLoadingDiscussions = true;
        }

        if (this.usesGroups) {
            discussions = await AddonModForum.formatDiscussionsGroups(this.forum.cmid, discussions);
        }

        // Hide author for first post and type single.
        if (this.forum.type === AddonModForumType.SINGLE) {
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

        return { discussions, canLoadMore };
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

            if (discussion.parent === 0 || forum.type === AddonModForumType.SINGLE) {
                // Do not show author for first post and type single.
                return;
            }

            try {
                const user = await CoreUser.getProfile(discussion.userid, this.COURSE_ID, true);

                discussion.userfullname = user.fullname;
                discussion.userpictureurl = user.profileimageurl;
            } catch {
                // Ignore errors.
            }
        });

        await Promise.all(promises);

        // Sort discussion by time (newer first).
        offlineDiscussions.sort((a, b) => b.timecreated - a.timecreated);

        return offlineDiscussions;
    }

    /**
     * Invalidate cache data.
     */
    async invalidateCache(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModForum.invalidateForumData(this.COURSE_ID));

        if (this.forum) {
            promises.push(AddonModForum.invalidateDiscussionsList(this.forum.id));
            promises.push(AddonModForum.invalidateCanAddDiscussion(this.forum.id));
            promises.push(CoreGroups.invalidateActivityGroupInfo(this.forum.cmid));
        }

        await Promise.all(promises);
    }

    /**
     * Invalidate list cache data.
     */
    async invalidateList(): Promise<void> {
        if (this.forum) {
            await AddonModForum.invalidateDiscussionsList(this.forum.id);
        }
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
