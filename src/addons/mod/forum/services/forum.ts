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

import { Injectable } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreRatingInfo } from '@features/rating/services/rating';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreUser } from '@features/user/services/user';
import { CoreNetwork } from '@services/network';
import { CoreFileEntry } from '@services/file-helper';
import { CoreGroups } from '@services/groups';
import { CoreSitesCommonWSOptions, CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import {
    CoreStatusWithWarningsWSResponse,
    CoreWSExternalFile,
    CoreWSExternalWarning,
    CoreWSFile,
    CoreWSStoredFile,
} from '@services/ws';
import { makeSingleton, Translate } from '@singletons';
import { AddonModForumOffline, AddonModForumOfflineDiscussion, AddonModForumReplyOptions } from './forum-offline';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import {
    ADDON_MOD_FORUM_ALL_GROUPS,
    ADDON_MOD_FORUM_ALL_PARTICIPANTS,
    ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_COMPONENT,
    ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE,
    ADDON_MOD_FORUM_MARK_READ_EVENT,
    ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT,
    ADDON_MOD_FORUM_PREFERENCE_SORTORDER,
    ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT,
    AddonModForumSortorder,
    AddonModForumType,
} from '../constants';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT]: AddonModForumNewDiscussionData;
        [ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT]: AddonModForumReplyDiscussionData;
        [ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT]: AddonModForumChangeDiscussionData;
        [ADDON_MOD_FORUM_MARK_READ_EVENT]: AddonModForumMarkReadData;
    }

}

/**
 * Service that provides some features for forums.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaModForum:';

    /**
     * Get cache key for can add discussion WS calls.
     *
     * @param forumId Forum ID.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getCanAddDiscussionCacheKey(forumId: number, groupId: number): string {
        return this.getCommonCanAddDiscussionCacheKey(forumId) + groupId;
    }

    /**
     * Get common part of cache key for can add discussion WS calls.
     * TODO: Use getForumDataCacheKey as a prefix.
     *
     * @param forumId Forum ID.
     * @returns Cache key.
     */
    protected getCommonCanAddDiscussionCacheKey(forumId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + 'canadddiscussion:' + forumId + ':';
    }

    /**
     * Get prefix cache key for all forum activity data WS calls.
     *
     * @param forumId Forum ID.
     * @returns Cache key.
     */
    protected getForumDataPrefixCacheKey(forumId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + forumId;
    }

    /**
     * Get cache key for discussion post data WS calls.
     *
     * @param forumId Forum ID.
     * @param discussionId Discussion ID.
     * @param postId Course ID.
     * @returns Cache key.
     */
    protected getDiscussionPostDataCacheKey(forumId: number, discussionId: number, postId: number): string {
        return this.getForumDiscussionDataCacheKey(forumId, discussionId) + ':post:' + postId;
    }

    /**
     * Get cache key for forum data WS calls.
     *
     * @param forumId Forum ID.
     * @param discussionId Discussion ID.
     * @returns Cache key.
     */
    protected getForumDiscussionDataCacheKey(forumId: number, discussionId: number): string {
        return this.getForumDataPrefixCacheKey(forumId) + ':discussion:' + discussionId;
    }

    /**
     * Get cache key for forum data WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getForumDataCacheKey(courseId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + 'forum:' + courseId;
    }

    /**
     * Get cache key for forum access information WS calls.
     * TODO: Use getForumDataCacheKey as a prefix.
     *
     * @param forumId Forum ID.
     * @returns Cache key.
     */
    protected getAccessInformationCacheKey(forumId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + 'accessInformation:' + forumId;
    }

    /**
     * Get cache key for forum discussion posts WS calls.
     * TODO: Use getForumDiscussionDataCacheKey instead.
     *
     * @param discussionId Discussion ID.
     * @returns Cache key.
     */
    protected getDiscussionPostsCacheKey(discussionId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + 'discussion:' + discussionId;
    }

    /**
     * Get common cache key for forum discussions list WS calls.
     *
     * @param forumId Forum ID.
     * @returns Cache key.
     */
    protected getDiscussionsListCommonCacheKey(forumId: number): string {
        return AddonModForumProvider.ROOT_CACHE_KEY + 'discussions:' + forumId;
    }

    /**
     * Get cache key for forum discussions list WS calls.
     *
     * @param forumId Forum ID.
     * @param sortOrder Sort order.
     * @param groupId Group ID.
     * @returns Cache key.
     */
    protected getDiscussionsListCacheKey(forumId: number, sortOrder: number, groupId?: number): string {
        let key = this.getDiscussionsListCommonCacheKey(forumId);

        if (sortOrder !== AddonModForumSortorder.LASTPOST_DESC) {
            key += ':' + sortOrder;
        }
        if (groupId) {
            key += `:group${groupId}`;
        }

        return key;
    }

    /**
     * Add a new discussion. It will fail if offline or cannot connect.
     *
     * @param forumId Forum ID.
     * @param subject New discussion's subject.
     * @param message New discussion's message.
     * @param options Options (subscribe, pin, ...).
     * @param groupId Group this discussion belongs to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the discussion is created.
     */
    async addNewDiscussionOnline(
        forumId: number,
        subject: string,
        message: string,
        options?: AddonModForumAddDiscussionWSOptionsObject,
        groupId?: number,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumAddDiscussionWSParams = {
            forumid: forumId,
            subject: subject,
            message: message,

            // eslint-disable-next-line max-len
            options: CoreUtils.objectToArrayOfObjects<AddonModForumAddDiscussionWSOptionsArray[0], AddonModForumAddDiscussionWSOptionsObject>(
                options || {},
                'name',
                'value',
            ),
        };

        if (groupId) {
            params.groupid = groupId;
        }

        const response = await site.write<AddonModForumAddDiscussionWSResponse>('mod_forum_add_discussion', params);

        // Other errors ocurring.
        return response.discussionid;
    }

    /**
     * Check if a user can post to a certain group.
     *
     * @param forumId Forum ID.
     * @param groupId Group ID.
     * @param options Other options.
     * @returns Promise resolved with an object with the following properties:
     *         - status (boolean)
     *         - canpindiscussions (boolean)
     *         - cancreateattachment (boolean)
     */
    async canAddDiscussion(
        forumId: number,
        groupId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModForumCanAddDiscussion> {
        const params: AddonModForumCanAddDiscussionWSParams = {
            forumid: forumId,
            groupid: groupId,
        };
        const preSets = {
            cacheKey: this.getCanAddDiscussionCacheKey(forumId, groupId),
            component: ADDON_MOD_FORUM_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const site = await CoreSites.getSite(options.siteId);
        const result = await site.read<AddonModForumCanAddDiscussionWSResponse>('mod_forum_can_add_discussion', params, preSets);

        if (!result) {
            throw new Error('Invalid response calling mod_forum_can_add_discussion');
        }

        if (result.canpindiscussions === undefined) {
            // WS doesn't support it yet, default it to false to prevent students from seeing the option.
            result.canpindiscussions = false;
        }
        if (result.cancreateattachment === undefined) {
            // WS doesn't support it yet, default it to true since usually the users will be able to create them.
            result.cancreateattachment = true;
        }

        return result;
    }

    /**
     * Check if a user can post to all groups.
     *
     * @param forumId Forum ID.
     * @param options Other options.
     * @returns Promise resolved with an object with the following properties:
     *         - status (boolean)
     *         - canpindiscussions (boolean)
     *         - cancreateattachment (boolean)
     */
    canAddDiscussionToAll(forumId: number, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModForumCanAddDiscussion> {
        return this.canAddDiscussion(forumId, ADDON_MOD_FORUM_ALL_PARTICIPANTS, options);
    }

    /**
     * Delete a post.
     *
     * @param postId Post id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @since 3.8
     */
    async deletePost(postId: number, siteId?: string): Promise<AddonModForumDeletePostWSResponse> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumDeletePostWSParams = {
            postid: postId,
        };

        return site.write<AddonModForumDeletePostWSResponse>('mod_forum_delete_post', params);
    }

    /**
     * Extract the starting post of a discussion from a list of posts. The post is removed from the array passed as a parameter.
     *
     * @param posts Posts to search.
     * @returns Starting post or undefined if not found.
     */
    extractStartingPost(posts: AddonModForumPost[]): AddonModForumPost | undefined {
        const index = posts.findIndex((post) => !post.parentid);

        return index >= 0 ? posts.splice(index, 1).pop() : undefined;
    }

    /**
     * Returns whether or not getDiscussionPost WS available or not.
     *
     * @returns If WS is available.
     * @since 3.8
     */
    isGetDiscussionPostAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_get_discussion_post');
    }

    /**
     * Returns whether or not getDiscussionPost WS available or not.
     *
     * @param site Site. If not defined, current site.
     * @returns If WS is available.
     * @since 3.7
     */
    isGetDiscussionPostsAvailable(site?: CoreSite): boolean {
        return site
            ? site.wsAvailable('mod_forum_get_discussion_posts')
            : CoreSites.wsAvailableInCurrentSite('mod_forum_get_discussion_posts');
    }

    /**
     * Returns whether or not deletePost WS available or not.
     *
     * @returns If WS is available.
     * @since 3.8
     */
    isDeletePostAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_delete_post');
    }

    /**
     * Returns whether or not updatePost WS available or not.
     *
     * @returns If WS is available.
     * @since 3.8
     */
    isUpdatePostAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_update_discussion_post');
    }

    /**
     * Format discussions, setting groupname if the discussion group is valid.
     *
     * @param cmId Forum cmid.
     * @param discussions List of discussions to format.
     * @returns Promise resolved with the formatted discussions.
     */
    formatDiscussionsGroups(cmId: number, discussions: AddonModForumDiscussion[]): Promise<AddonModForumDiscussion[]>;
    formatDiscussionsGroups(cmId: number, discussions: AddonModForumOfflineDiscussion[]): Promise<AddonModForumOfflineDiscussion[]>;
    formatDiscussionsGroups(
        cmId: number,
        discussions: AddonModForumDiscussion[] | AddonModForumOfflineDiscussion[],
    ): Promise<AddonModForumDiscussion[] | AddonModForumOfflineDiscussion[]> {
        discussions = CoreUtils.clone(discussions);

        return CoreGroups.getActivityAllowedGroups(cmId).then((result) => {
            const strAllParts = Translate.instant('core.allparticipants');
            const strAllGroups = Translate.instant('core.allgroups');

            // Turn groups into an object where each group is identified by id.
            const groups = {};
            result.groups.forEach((fg) => {
                groups[fg.id] = fg;
            });

            // Format discussions.
            discussions.forEach((disc) => {
                if (disc.groupid == ADDON_MOD_FORUM_ALL_PARTICIPANTS) {
                    disc.groupname = strAllParts;
                } else if (disc.groupid == ADDON_MOD_FORUM_ALL_GROUPS) {
                    // Offline discussions only.
                    disc.groupname = strAllGroups;
                } else {
                    const group = groups[disc.groupid];
                    if (group) {
                        disc.groupname = group.name;
                    }
                }
            });

            return discussions;
        }).catch(() => discussions);
    }

    /**
     * Get all course forums.
     *
     * @param courseId Course ID.
     * @param options Other options.
     * @returns Promise resolved when the forums are retrieved.
     */
    async getCourseForums(
        courseId: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModForumGetForumsByCoursesWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        // Check if viewing as mentee
        const { CoreUserParentModuleHelper } = await import('@features/user/services/parent-module-helper');
        const parentWS = await CoreUserParentModuleHelper.getParentViewingWS(
            'mod_forum_get_forums_by_courses',
            { courseids: [courseId] },
            'local_aspireparent_get_mentee_forums',
            site.getId()
        );

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getForumDataCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: ADDON_MOD_FORUM_COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
        };

        return site.read(parentWS.wsName, parentWS.params, preSets);
    }

    /**
     * Get a particular discussion post.
     *
     * @param forumId Forum ID.
     * @param discussionId Discussion ID.
     * @param postId Post ID.
     * @param options Other options.
     * @returns Promise resolved when the post is retrieved.
     */
    async getDiscussionPost(
        forumId: number,
        discussionId: number,
        postId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModForumPost> {
        const site = await CoreSites.getSite(options.siteId);
        const params: AddonModForumGetDiscussionPostWSParams = {
            postid: postId,
        };
        const preSets = {
            cacheKey: this.getDiscussionPostDataCacheKey(forumId, discussionId, postId),
            updateFrequency: CoreSite.FREQUENCY_USUALLY,
            component: ADDON_MOD_FORUM_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModForumGetDiscussionPostWSResponse>(
            'mod_forum_get_discussion_post',
            params,
            preSets,
        );

        if (!response.post) {
            throw new Error('Post not found');
        }

        return this.translateWSPost(response.post);
    }

    /**
     * Get a forum by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the forum is retrieved.
     */
    async getForum(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModForumData> {
        const forums = await this.getCourseForums(courseId, options);
        const forum = forums.find(forum => forum.cmid === cmId);

        if (!forum) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        return forum;
    }

    /**
     * Get a forum by forum ID.
     *
     * @param courseId Course ID.
     * @param forumId Forum ID.
     * @param options Other options.
     * @returns Promise resolved when the forum is retrieved.
     */
    async getForumById(courseId: number, forumId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModForumData> {
        const forums = await this.getCourseForums(courseId, options);
        const forum = forums.find(forum => forum.id === forumId);

        if (!forum) {
            throw new Error(`Forum with id ${forumId} not found`);
        }

        return forum;
    }

    /**
     * Get access information for a given forum.
     *
     * @param forumId Forum ID.
     * @param options Other options.
     * @returns Object with access information.
     * @since 3.7
     */
    async getAccessInformation(
        forumId: number,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModForumAccessInformation> {
        const site = await CoreSites.getSite(options.siteId);

        // Check if parent viewing scenario
        const { CoreUserParent } = await import('@features/user/services/parent');
        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
        
        if (selectedMenteeId && selectedMenteeId !== site.getUserId()) {
            // Parent viewing - return basic access info to avoid permission errors
            console.log('[AddonModForum] Parent viewing detected, returning default access info');
            return {
                canaddinstance: false,
                canviewdiscussion: true,
                canviewhiddentimedposts: false,
                canstartdiscussion: false,
                canreplypost: false,
                canaddnews: false,
                canreplynews: false,
                canviewrating: true,
                canviewanyrating: false,
                canviewallratings: false,
                canrate: false,
                canpostprivatereply: false,
                canreadprivatereplies: false,
                cancreateattachment: false,
                candeleteownpost: false,
                candeleteanypost: false,
                cansplitdiscussions: false,
                canmovediscussions: false,
                canpindiscussions: false,
                caneditanypost: false,
                canviewqandawithoutposting: false,
                canviewsubscribers: false,
                canmanagesubscriptions: false,
                canpostwithoutthrottling: false,
                canexportdiscussion: false,
                canexportforum: false,
                canexportpost: false,
                canexportownpost: false,
                canaddquestion: false,
            };
        }

        if (!site.wsAvailable('mod_forum_get_forum_access_information')) {
            // Access information not available for 3.6 or older sites.
            return {};
        }

        const params: AddonModForumGetForumAccessInformationWSParams = {
            forumid: forumId,
        };
        const preSets = {
            cacheKey: this.getAccessInformationCacheKey(forumId),
            component: ADDON_MOD_FORUM_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read<AddonModForumGetForumAccessInformationWSResponse>(
            'mod_forum_get_forum_access_information',
            params,
            preSets,
        );
    }

    /**
     * Get forum discussion posts.
     *
     * @param discussionId Discussion ID.
     * @param options Other options.
     * @returns Promise resolved with forum posts and rating info.
     */
    async getDiscussionPosts(discussionId: number, options: CoreCourseCommonModWSOptions = {}): Promise<{
        posts: AddonModForumPost[];
        courseid?: number;
        forumid?: number;
        ratinginfo?: CoreRatingInfo;
    }> {
        // Convenience function to translate legacy data to new format.
        const translateLegacyPostsFormat = (posts: AddonModForumLegacyPost[]): AddonModForumPost[] => posts.map((post) => {
            const newPost: AddonModForumPost = {
                id: post.id,
                discussionid: post.discussion,
                parentid: post.parent,
                hasparent: !!post.parent,
                author: {
                    id: post.userid,
                    fullname: post.userfullname,
                    urls: { profileimage: post.userpictureurl },
                },
                timecreated: post.created,
                subject: post.subject,
                message: post.message,
                attachments: post.attachments,
                capabilities: {
                    reply: !!post.canreply,
                },

                unread: !post.postread,
                isprivatereply: !!post.isprivatereply,
                tags: post.tags,
            };

            if ('groupname' in post && typeof post['groupname'] === 'string') {
                newPost.author['groups'] = [{ name: post['groupname'] }];
            }

            return newPost;
        });

        // For some reason, the new WS doesn't use the tags exporter so it returns a different format than other WebServices.
        // Convert the new format to the exporter one so it's the same as in other WebServices.
        const translateTagsFormatToLegacy = (posts: AddonModForumWSPost[]): AddonModForumPost[] => {
            posts.forEach(post => this.translateWSPost(post));

            return posts as unknown as AddonModForumPost[];
        };

        const params: AddonModForumGetDiscussionPostsWSParams | AddonModForumGetForumDiscussionPostsWSParams = {
            discussionid: discussionId,
        };
        const preSets = {
            cacheKey: this.getDiscussionPostsCacheKey(discussionId),
            component: ADDON_MOD_FORUM_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const site = await CoreSites.getSite(options.siteId);

        const isGetDiscussionPostsAvailable = this.isGetDiscussionPostsAvailable(site);
        if (isGetDiscussionPostsAvailable && site.isVersionGreaterEqualThan('4.0')) {
            (params as AddonModForumGetDiscussionPostsWSParams).includeinlineattachments = true;
        }

        const response = isGetDiscussionPostsAvailable
            ? await site.read<AddonModForumGetDiscussionPostsWSResponse>('mod_forum_get_discussion_posts', params, preSets)
            : await site.read<AddonModForumGetForumDiscussionPostsWSResponse>(
                'mod_forum_get_forum_discussion_posts',
                params,
                preSets,
            );

        if (!response) {
            throw new Error('Could not get forum posts');
        }

        const posts = isGetDiscussionPostsAvailable
            ? translateTagsFormatToLegacy((response as AddonModForumGetDiscussionPostsWSResponse).posts)
            : translateLegacyPostsFormat((response as AddonModForumGetForumDiscussionPostsWSResponse).posts);

        this.storeUserData(posts);

        return {
            ...response,
            posts,
        };
    }

    /**
     * Sort forum discussion posts by an specified field.
     *
     * @param posts Discussion posts to be sorted in place.
     * @param direction Direction of the sorting (ASC / DESC).
     */
    sortDiscussionPosts(posts: AddonModForumPost[], direction: string): void {
        // @todo Check children when sorting.
        posts.sort((a, b) => {
            const timeCreatedA = Number(a.timecreated) || 0;
            const timeCreatedB = Number(b.timecreated) || 0;
            if (timeCreatedA == 0 || timeCreatedB == 0) {
            // Leave 0 at the end.
                return timeCreatedB - timeCreatedA;
            }

            if (direction == 'ASC') {
                return timeCreatedA - timeCreatedB;
            } else {
                return timeCreatedB - timeCreatedA;
            }
        });
    }

    /**
     * Return whether discussion lists can be sorted.
     *
     * @param site Site. If not defined, current site.
     * @returns True if discussion lists can be sorted.
     */
    isDiscussionListSortingAvailable(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Return the list of available sort orders.
     *
     * @returns List of sort orders.
     */
    getAvailableSortOrders(): AddonModForumSortOrder[] {
        const sortOrders = [
            {
                label: 'addon.mod_forum.discussionlistsortbylastpostdesc',
                value: AddonModForumSortorder.LASTPOST_DESC,
            },
        ];

        if (this.isDiscussionListSortingAvailable()) {
            sortOrders.push(
                {
                    label: 'addon.mod_forum.discussionlistsortbylastpostasc',
                    value: AddonModForumSortorder.LASTPOST_ASC,
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbycreateddesc',
                    value: AddonModForumSortorder.CREATED_DESC,
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbycreatedasc',
                    value: AddonModForumSortorder.CREATED_ASC,
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbyrepliesdesc',
                    value: AddonModForumSortorder.REPLIES_DESC,
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbyrepliesasc',
                    value: AddonModForumSortorder.REPLIES_ASC,
                },
            );
        }

        return sortOrders;
    }

    /**
     * Get sort order selected by the user.
     *
     * @returns Promise resolved with sort order.
     */
    async getSelectedSortOrder(): Promise<AddonModForumSortOrder> {
        const sortOrders = this.getAvailableSortOrders();
        let sortOrderValue: number | null = null;

        if (this.isDiscussionListSortingAvailable()) {
            const preferenceValue = await CoreUtils.ignoreErrors(
                CoreUser.getUserPreference(ADDON_MOD_FORUM_PREFERENCE_SORTORDER),
            );

            sortOrderValue = preferenceValue ? parseInt(preferenceValue, 10) : null;
        }

        return sortOrders.find(sortOrder => sortOrder.value === sortOrderValue) || sortOrders[0];
    }

    /**
     * Get forum discussions.
     *
     * @param forumId Forum ID.
     * @param options Other options.
     * @returns Promise resolved with an object with:
     *         - discussions: List of discussions. Note that for every discussion in the list discussion.id is the main post ID but
     *         discussion ID is discussion.discussion.
     *         - canLoadMore: True if there may be more discussions to load.
     */
    async getDiscussions(
        forumId: number,
        options: AddonModForumGetDiscussionsOptions = {},
    ): Promise<{ discussions: AddonModForumDiscussion[]; canLoadMore: boolean }> {
        options.sortOrder = options.sortOrder || AddonModForumSortorder.LASTPOST_DESC;
        options.page = options.page || 0;

        const site = await CoreSites.getSite(options.siteId);
        
        // Check if parent viewing scenario
        const { CoreUserParent } = await import('@features/user/services/parent');
        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
        
        if (selectedMenteeId && selectedMenteeId !== site.getUserId()) {
            // Parent viewing - return empty discussions to avoid permission errors
            console.log('[AddonModForum] Parent viewing detected, returning empty discussions');
            return {
                discussions: [],
                canLoadMore: false,
            };
        }
        let method = 'mod_forum_get_forum_discussions_paginated';
        const params: AddonModForumGetForumDiscussionsPaginatedWSParams | AddonModForumGetForumDiscussionsWSParams = {
            forumid: forumId,
            page: options.page,
            perpage: ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE,
        };

        if (site.wsAvailable('mod_forum_get_forum_discussions')) {
            // Since Moodle 3.7.
            method = 'mod_forum_get_forum_discussions';
            (params as AddonModForumGetForumDiscussionsWSParams).sortorder = options.sortOrder;
            (params as AddonModForumGetForumDiscussionsWSParams).groupid = options.groupId;
        } else {
            if (options.sortOrder !== AddonModForumSortorder.LASTPOST_DESC) {
                throw new Error('Sorting not supported with the old WS method.');
            }

            (params as AddonModForumGetForumDiscussionsPaginatedWSParams).sortby = 'timemodified';
            (params as AddonModForumGetForumDiscussionsPaginatedWSParams).sortdirection = 'DESC';
        }

        const preSets = {
            cacheKey: this.getDiscussionsListCacheKey(forumId, options.sortOrder),
            component: ADDON_MOD_FORUM_COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        let response: AddonModForumGetForumDiscussionsPaginatedWSResponse | AddonModForumGetForumDiscussionsWSResponse;
        try {
            // eslint-disable-next-line max-len
            response = await site.read<AddonModForumGetForumDiscussionsPaginatedWSResponse | AddonModForumGetForumDiscussionsWSResponse>(
                method,
                params,
                preSets,
            );
        } catch (error) {
            // Try to get the data from cache stored with the old WS method.
            if (
                CoreNetwork.isOnline() ||
                method !== 'mod_forum_get_forum_discussions' ||
                options.sortOrder !== AddonModForumSortorder.LASTPOST_DESC
            ) {
                throw error;
            }

            const params: AddonModForumGetForumDiscussionsPaginatedWSParams = {
                forumid: forumId,
                page: options.page,
                perpage: ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE,
                sortby: 'timemodified',
                sortdirection: 'DESC',
            };
            Object.assign(preSets, CoreSites.getReadingStrategyPreSets(CoreSitesReadingStrategy.PREFER_CACHE));

            response = await site.read<AddonModForumGetForumDiscussionsPaginatedWSResponse>(
                'mod_forum_get_forum_discussions_paginated',
                params,
                preSets,
            );
        }

        if (!response) {
            throw new Error('Could not get discussions');
        }

        this.storeUserData(response.discussions);

        return {
            discussions: response.discussions,
            canLoadMore: response.discussions.length >= ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE,
        };
    }

    /**
     * Get forum discussions in several pages.
     * If a page fails, the discussions until that page will be returned along with a flag indicating an error occurred.
     *
     * @param forumId Forum ID.
     * @param options Get discussion in pages options.
     * @returns Promise resolved with an object with:
     *         - discussions: List of discussions.
     *         - error: True if an error occurred, false otherwise.
     */
    async getDiscussionsInPages(
        forumId: number,
        options: AddonModForumGetDiscussionsInPagesOptions = {},
    ): Promise<{ discussions: AddonModForumDiscussion[]; error: boolean }> {
        const result = {
            discussions: [] as AddonModForumDiscussion[],
            error: false,
        };
        let numPages = options.numPages === undefined ? -1 : options.numPages;

        if (!numPages) {
            return result;
        }

        const getPage = (page: number): Promise<{ discussions: AddonModForumDiscussion[]; error: boolean }> =>
            // Get page discussions.
            this.getDiscussions(forumId, {
                ...options,
                page,
            }).then((response) => {
                result.discussions = result.discussions.concat(response.discussions);
                numPages--;

                if (response.canLoadMore && numPages !== 0) {
                    return getPage(page + 1); // Get next page.
                } else {
                    return result;
                }
            }).catch(() => {
                // Error getting a page.
                result.error = true;

                return result;
            })
        ;

        return getPage(options.page ?? 0);
    }

    /**
     * Invalidates can add discussion WS calls.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCanAddDiscussion(forumId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getCommonCanAddDiscussionCacheKey(forumId));
    }

    /**
     * Invalidate the prefetched content except files.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateContent(moduleId: number, courseId: number): Promise<void> {
        // Get the forum first, we need the forum ID.
        const forum = await this.getForum(courseId, moduleId);
        const promises: Promise<void>[] = [];

        promises.push(this.invalidateForumData(courseId));
        promises.push(this.invalidateDiscussionsList(forum.id));
        promises.push(this.invalidateCanAddDiscussion(forum.id));
        promises.push(this.invalidateAccessInformation(forum.id));

        this.getAvailableSortOrders().forEach((sortOrder) => {
            // We need to get the list of discussions to be able to invalidate their posts.
            promises.push(
                this
                    .getDiscussionsInPages(forum.id, {
                        cmId: forum.cmid,
                        sortOrder: sortOrder.value,
                        readingStrategy: CoreSitesReadingStrategy.ONLY_CACHE,
                    })
                    .then((response) => {
                        // Now invalidate the WS calls.
                        const promises: Promise<void>[] = [];

                        response.discussions.forEach((discussion) => {
                            promises.push(this.invalidateDiscussionPosts(discussion.discussion, forum.id));
                        });

                        return CoreUtils.allPromises(promises);
                    }),
            );
        });

        if (this.isDiscussionListSortingAvailable()) {
            promises.push(CoreUser.invalidateUserPreference(ADDON_MOD_FORUM_PREFERENCE_SORTORDER));
        }

        return CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates access information.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAccessInformation(forumId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(forumId));
    }

    /**
     * Invalidates forum discussion posts.
     *
     * @param discussionId Discussion ID.
     * @param forumId Forum ID. If not set, we can't invalidate individual post information.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDiscussionPosts(discussionId: number, forumId?: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const promises = [site.invalidateWsCacheForKey(this.getDiscussionPostsCacheKey(discussionId))];

        if (forumId) {
            promises.push(site.invalidateWsCacheForKeyStartingWith(this.getForumDiscussionDataCacheKey(forumId, discussionId)));
        }

        await CoreUtils.allPromises(promises);
    }

    /**
     * Invalidates discussion list.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateDiscussionsList(forumId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getDiscussionsListCommonCacheKey(forumId));
    }

    /**
     * Invalidates forum data.
     *
     * @param courseId Course ID.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateForumData(courseId: number): Promise<void> {
        const site = CoreSites.getCurrentSite();

        await site?.invalidateWsCacheForKey(this.getForumDataCacheKey(courseId));
    }

    /**
     * Report a forum as being viewed.
     *
     * @param id Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logView(id: number, siteId?: string): Promise<void> {
        const params = {
            forumid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_forum_view_forum',
            params,
            ADDON_MOD_FORUM_COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Report a forum discussion as being viewed.
     *
     * @param id Discussion ID.
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    logDiscussionView(id: number, forumId: number, siteId?: string): Promise<void> {
        const params = {
            discussionid: id,
        };

        return CoreCourseLogHelper.log(
            'mod_forum_view_forum_discussion',
            params,
            ADDON_MOD_FORUM_COMPONENT,
            forumId,
            siteId,
        );
    }

    /**
     * Reply to a certain post.
     *
     * @param postId ID of the post being replied.
     * @param discussionId ID of the discussion the user is replying to.
     * @param forumId ID of the forum the user is replying to.
     * @param name Forum name.
     * @param courseId Course ID the forum belongs to.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @param allowOffline True if it can be stored in offline, false otherwise.
     * @returns Promise resolved with a boolean indicating if the test was sent online or not.
     */
    async replyPost(
        postId: number,
        discussionId: number,
        forumId: number,
        name: string,
        courseId: number,
        subject: string,
        message: string,
        options?: AddonModForumReplyOptions,
        siteId?: string,
        allowOffline?: boolean,
    ): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<boolean> => {
            if (!forumId) {
                // Not enough data to store in offline, reject.
                throw new Error(Translate.instant('core.networkerrormsg'));
            }

            await AddonModForumOffline.replyPost(
                postId,
                discussionId,
                forumId,
                name,
                courseId,
                subject,
                message,
                options,
                siteId,
            );

            return false;
        };

        if (!CoreNetwork.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a reply to be sent to the server, discard it first.
        try {
            await AddonModForumOffline.deleteReply(postId, siteId);
            await this.replyPostOnline(
                postId,
                subject,
                message,
                options as unknown as AddonModForumAddDiscussionPostWSOptionsObject,
                siteId,
            );

            return true;
        } catch (error) {
            if (allowOffline && !CoreUtils.isWebServiceError(error)) {
                // Couldn't connect to server, store in offline.
                return storeOffline();
            } else {
                // The WebService has thrown an error or offline not supported, reject.
                throw error;
            }
        }
    }

    /**
     * Reply to a certain post. It will fail if offline or cannot connect.
     *
     * @param postId ID of the post being replied.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the created post id.
     */
    async replyPostOnline(
        postId: number,
        subject: string,
        message: string,
        options?: AddonModForumAddDiscussionPostWSOptionsObject,
        siteId?: string,
    ): Promise<number> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumAddDiscussionPostWSParams = {
            postid: postId,
            subject: subject,
            message: message,

            options: CoreUtils.objectToArrayOfObjects<
            AddonModForumAddDiscussionPostWSOptionsArray[0],
            AddonModForumAddDiscussionPostWSOptionsObject
            >(
                options || {},
                'name',
                'value',
            ),
        };

        const response = await site.write<AddonModForumAddDiscussionPostWSResponse>('mod_forum_add_discussion_post', params);

        if (!response || !response.postid) {
            throw new Error('Post id missing from response');
        }

        return response.postid;
    }

    /**
     * Lock or unlock a discussion.
     *
     * @param forumId Forum id.
     * @param discussionId DIscussion id.
     * @param locked True to lock, false to unlock.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @since 3.7
     */
    async setLockState(
        forumId: number,
        discussionId: number,
        locked: boolean,
        siteId?: string,
    ): Promise<AddonModForumSetLockStateWSResponse> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumSetLockStateWSParams = {
            forumid: forumId,
            discussionid: discussionId,
            targetstate: locked ? 0 : 1,
        };

        return site.write<AddonModForumSetLockStateWSResponse>('mod_forum_set_lock_state', params);
    }

    /**
     * Returns whether the set pin state WS is available.
     *
     * @returns Whether it's available.
     * @since 3.7
     */
    isSetPinStateAvailableForSite(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_set_pin_state');
    }

    /**
     * Pin or unpin a discussion.
     *
     * @param discussionId Discussion id.
     * @param pinned True to pin, false to unpin.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @since 3.7
     */
    async setPinState(discussionId: number, pinned: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumSetPinStateWSParams = {
            discussionid: discussionId,
            targetstate: pinned ? 1 : 0,
        };

        await site.write<AddonModForumSetPinStateWSResponse>('mod_forum_set_pin_state', params);
    }

    /**
     * Star or unstar a discussion.
     *
     * @param discussionId Discussion id.
     * @param starred True to star, false to unstar.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @since 3.7
     */
    async toggleFavouriteState(discussionId: number, starred: boolean, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumToggleFavouriteStateWSParams = {
            discussionid: discussionId,
            targetstate: starred,
        };

        await site.write<AddonModForumToggleFavouriteStateWSResponse>('mod_forum_toggle_favourite_state', params);
    }

    /**
     * Store the users data from a discussions/posts list.
     *
     * @param list Array of posts or discussions.
     */
    protected storeUserData(list: AddonModForumPost[] | AddonModForumDiscussion[]): void {
        const users = {};

        list.forEach((entry: AddonModForumPost | AddonModForumDiscussion) => {
            if ('author' in entry) {
                const authorId = Number(entry.author.id);
                if (!isNaN(authorId) && !users[authorId]) {
                    users[authorId] = {
                        id: entry.author.id,
                        fullname: entry.author.fullname,
                        profileimageurl: entry.author.urls?.profileimage,
                    };
                }
            }
            const userId = parseInt(entry['userid']);
            if ('userid' in entry && !isNaN(userId) && !users[userId]) {
                users[userId] = {
                    id: userId,
                    fullname: entry.userfullname,
                    profileimageurl: entry.userpictureurl,
                };
            }
            const userModified = parseInt(entry['usermodified']);
            if ('usermodified' in entry && !isNaN(userModified) && !users[userModified]) {
                users[userModified] = {
                    id: userModified,
                    fullname: entry.usermodifiedfullname,
                    profileimageurl: entry.usermodifiedpictureurl,
                };
            }
        });

        CoreUser.storeUsers(CoreUtils.objectToArray(users));
    }

    /**
     * Prepare post for edition.
     *
     * @param postId Post ID.
     * @param area Area to prepare.
     * @param options Other options.
     * @returns Data of prepared area.
     */
    async preparePostForEdition(
        postId: number,
        area: 'attachment'|'post',
        options: AddonModForumPreparePostOptions = {},
    ): Promise<AddonModForumPrepareDraftAreaForPostWSResponse> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModForumPrepareDraftAreaForPostWSParams = {
            postid: postId,
            area: area,
        };
        if (options.filesToKeep?.length) {
            params.filestokeep = options.filesToKeep.map(file => ({
                filename: file.filename ?? '',
                filepath: file.filepath ?? '',
            }));
        }

        return await site.write('mod_forum_prepare_draft_area_for_post', params);
    }

    /**
     * Update a certain post.
     *
     * @param postId ID of the post being edited.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with success boolean when done.
     */
    async updatePost(
        postId: number,
        subject: string,
        message: string,
        options?: AddonModForumUpdateDiscussionPostWSOptionsObject,
        siteId?: string,
    ): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        const params: AddonModForumUpdateDiscussionPostWSParams = {
            postid: postId,
            subject: subject,
            message: message,

            options: CoreUtils.objectToArrayOfObjects<
            AddonModForumUpdateDiscussionPostWSOptionsArray[0],
            AddonModForumUpdateDiscussionPostWSOptionsObject
            >(
                options || {},
                'name',
                'value',
            ),
        };

        const response = await site.write<AddonModForumUpdateDiscussionPostWSResponse>('mod_forum_update_discussion_post', params);

        return response && response.status;
    }

    /**
     * For some reason, the new WS doesn't use the tags exporter so it returns a different format than other WebServices.
     * Convert the new format to the exporter one so it's the same as in other WebServices.
     *
     * @param post Post returned by the new WS.
     * @returns Post using the same format as other WebServices.
     */
    protected translateWSPost(post: AddonModForumWSPost): AddonModForumPost {
        (post as unknown as AddonModForumPost).tags = (post.tags || []).map((tag) => {
            const viewUrl = (tag.urls && tag.urls.view) || '';
            const params = CoreUrl.extractUrlParams(viewUrl);

            return {
                id: tag.tagid,
                taginstanceid: tag.id,
                flag: tag.flag ? 1 : 0,
                isstandard: tag.isstandard,
                rawname: tag.displayname,
                name: tag.displayname,
                tagcollid: params.tc ? Number(params.tc) : undefined,
                taginstancecontextid: params.from ? Number(params.from) : undefined,
            };
        });

        return post as unknown as AddonModForumPost;
    }

}

export const AddonModForum = makeSingleton(AddonModForumProvider);

/**
 * Params of mod_forum_get_forums_by_courses WS.
 */
type AddonModForumGetForumsByCoursesWSParams = {
    courseids?: number[]; // Array of Course IDs.
};

/**
 * General forum activity data.
 */
export type AddonModForumData = {
    id: number; // Forum id.
    course: number; // Course id.
    type: AddonModForumType; // The forum type.
    name: string; // Forum name.
    intro: string; // The forum intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[];
    duedate?: number; // Duedate for the user.
    cutoffdate?: number; // Cutoffdate for the user.
    assessed: number; // Aggregate type.
    assesstimestart: number; // Assess start time.
    assesstimefinish: number; // Assess finish time.
    scale: number; // Scale.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    grade_forum: number; // Whole forum grade.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    grade_forum_notify: number; // Whether to send notifications to students upon grading by default.
    maxbytes: number; // Maximum attachment size.
    maxattachments: number; // Maximum number of attachments.
    forcesubscribe: number; // Force users to subscribe.
    trackingtype: number; // Subscription mode.
    rsstype: number; // RSS feed for this activity.
    rssarticles: number; // Number of RSS recent articles.
    timemodified: number; // Time modified.
    warnafter: number; // Post threshold for warning.
    blockafter: number; // Post threshold for blocking.
    blockperiod: number; // Time period for blocking.
    completiondiscussions: number; // Student must create discussions.
    completionreplies: number; // Student must post replies.
    completionposts: number; // Student must post discussions or replies.
    cmid: number; // Course module id.
    numdiscussions?: number; // Number of discussions in the forum.
    cancreatediscussions?: boolean; // If the user can create discussions.
    lockdiscussionafter?: number; // After what period a discussion is locked.
    istracked?: boolean; // If the user is tracking the forum.
    unreadpostscount?: number; // The number of unread posts for tracked forums.
};

/**
 * Data returned by mod_forum_get_forums_by_courses WS.
 */
type AddonModForumGetForumsByCoursesWSResponse = AddonModForumData[];

/**
 * Forum discussion.
 */
export type AddonModForumDiscussion = {
    id: number; // Post id.
    name: string; // Discussion name.
    groupid: number; // Group id.
    groupname?: string; // Group name (not returned by WS).
    timemodified: number; // Time modified.
    usermodified: number; // The id of the user who last modified.
    timestart: number; // Time discussion can start.
    timeend: number; // Time discussion ends.
    discussion: number; // Discussion id.
    parent: number; // Parent id.
    userid: number; // User who started the discussion id.
    created: number; // Creation time.
    modified: number; // Time modified.
    mailed: number; // Mailed?.
    subject: string; // The post subject.
    message: string; // The post message.
    messageformat: number; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    messagetrust: number; // Can we trust?.
    messageinlinefiles?: CoreWSExternalFile[];
    attachment: string; // Has attachments?.
    attachments?: CoreWSExternalFile[];
    totalscore: number; // The post message total score.
    mailnow: number; // Mail now?.
    userfullname: string | boolean; // Post author full name.
    usermodifiedfullname: string; // Post modifier full name.
    userpictureurl?: string; // Post author picture.
    usermodifiedpictureurl: string; // Post modifier picture.
    numreplies: number; // The number of replies in the discussion.
    numunread: number; // The number of unread discussions.
    pinned: boolean; // Is the discussion pinned.
    locked: boolean; // Is the discussion locked.
    starred?: boolean; // Is the discussion starred.
    canreply: boolean; // Can the user reply to the discussion.
    canlock: boolean; // Can the user lock the discussion.
    canfavourite?: boolean; // Can the user star the discussion.
};

/**
 * Forum post data returned by web services.
 */
export type AddonModForumPost = {
    id: number; // Id.
    subject: string; // Subject.
    replysubject?: string; // Replysubject.
    message: string; // Message.
    author: {
        id?: number; // Id.
        fullname?: string; // Fullname.
        urls?: {
            profileimage?: string; // The URL for the use profile image.
        };
        groups?: { // Groups.
            name: string; // Name.
        }[];
    };
    discussionid: number; // Discussionid.
    hasparent: boolean; // Hasparent.
    parentid?: number; // Parentid.
    timecreated: number | false; // Timecreated.
    unread?: boolean; // Unread.
    isprivatereply: boolean; // Isprivatereply.
    capabilities: {
        reply: boolean; // Whether the user can reply to the post.
        view?: boolean; // Whether the user can view the post.
        edit?: boolean; // Whether the user can edit the post.
        delete?: boolean; // Whether the user can delete the post.
        split?: boolean; // Whether the user can split the post.
        selfenrol?: boolean; // Whether the user can self enrol into the course.
        export?: boolean; // Whether the user can export the post.
        controlreadstatus?: boolean; // Whether the user can control the read status of the post.
        canreplyprivately?: boolean; // Whether the user can post a private reply.
    };
    attachment?: 0 | 1;
    attachments?: CoreFileEntry[];
    messageinlinefiles?: CoreWSExternalFile[];
    haswordcount?: boolean; // Haswordcount.
    wordcount?: number; // Wordcount.
    tags?: { // Tags.
        id: number; // Tag id.
        name: string; // Tag name.
        rawname: string; // The raw, unnormalised name for the tag as entered by users.
        // isstandard: boolean; // Whether this tag is standard.
        tagcollid?: number; // Tag collection id.
        taginstanceid: number; // Tag instance id.
        taginstancecontextid?: number; // Context the tag instance belongs to.
        // itemid: number; // Id of the record tagged.
        // ordering: number; // Tag ordering.
        flag: number; // Whether the tag is flagged as inappropriate.
    }[];
};

/**
 * Legacy forum post data.
 */
export type AddonModForumLegacyPost = {
    id: number; // Post id.
    discussion: number; // Discussion id.
    parent: number; // Parent id.
    userid: number; // User id.
    created: number; // Creation time.
    modified: number; // Time modified.
    mailed: number; // Mailed?.
    subject: string; // The post subject.
    message: string; // The post message.
    messageformat: number; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    messagetrust: number; // Can we trust?.
    messageinlinefiles?: CoreWSExternalFile[];
    attachment: string; // Has attachments?.
    attachments?: CoreWSExternalFile[];
    totalscore: number; // The post message total score.
    mailnow: number; // Mail now?.
    children: number[];
    canreply: boolean; // The user can reply to posts?.
    postread: boolean; // The post was read.
    userfullname: string; // Post author full name.
    userpictureurl?: string; // Post author picture.
    deleted: boolean; // This post has been removed.
    isprivatereply: boolean; // The post is a private reply.
    tags?: CoreTagItem[]; // Tags.
};

/**
 * Options to pass to get discussions.
 */
export type AddonModForumGetDiscussionsOptions = CoreCourseCommonModWSOptions & {
    sortOrder?: number; // Sort order.
    page?: number; // Page. Defaults to 0.
    groupId?: number; // Group ID.
};

/**
 * Options to pass to get discussions in pages.
 */
export type AddonModForumGetDiscussionsInPagesOptions = AddonModForumGetDiscussionsOptions & {
    numPages?: number; // Number of pages to get. If not defined, all pages.
};

/**
 * Forum access information.
 */
export type AddonModForumAccessInformation = {
    canaddinstance?: boolean; // Whether the user has the capability mod/forum:addinstance allowed.
    canviewdiscussion?: boolean; // Whether the user has the capability mod/forum:viewdiscussion allowed.
    canviewhiddentimedposts?: boolean; // Whether the user has the capability mod/forum:viewhiddentimedposts allowed.
    canstartdiscussion?: boolean; // Whether the user has the capability mod/forum:startdiscussion allowed.
    canreplypost?: boolean; // Whether the user has the capability mod/forum:replypost allowed.
    canaddnews?: boolean; // Whether the user has the capability mod/forum:addnews allowed.
    canreplynews?: boolean; // Whether the user has the capability mod/forum:replynews allowed.
    canviewrating?: boolean; // Whether the user has the capability mod/forum:viewrating allowed.
    canviewanyrating?: boolean; // Whether the user has the capability mod/forum:viewanyrating allowed.
    canviewallratings?: boolean; // Whether the user has the capability mod/forum:viewallratings allowed.
    canrate?: boolean; // Whether the user has the capability mod/forum:rate allowed.
    canpostprivatereply?: boolean; // Whether the user has the capability mod/forum:postprivatereply allowed.
    canreadprivatereplies?: boolean; // Whether the user has the capability mod/forum:readprivatereplies allowed.
    cancreateattachment?: boolean; // Whether the user has the capability mod/forum:createattachment allowed.
    candeleteownpost?: boolean; // Whether the user has the capability mod/forum:deleteownpost allowed.
    candeleteanypost?: boolean; // Whether the user has the capability mod/forum:deleteanypost allowed.
    cansplitdiscussions?: boolean; // Whether the user has the capability mod/forum:splitdiscussions allowed.
    canmovediscussions?: boolean; // Whether the user has the capability mod/forum:movediscussions allowed.
    canpindiscussions?: boolean; // Whether the user has the capability mod/forum:pindiscussions allowed.
    caneditanypost?: boolean; // Whether the user has the capability mod/forum:editanypost allowed.
    canviewqandawithoutposting?: boolean; // Whether the user has the capability mod/forum:viewqandawithoutposting allowed.
    canviewsubscribers?: boolean; // Whether the user has the capability mod/forum:viewsubscribers allowed.
    canmanagesubscriptions?: boolean; // Whether the user has the capability mod/forum:managesubscriptions allowed.
    canpostwithoutthrottling?: boolean; // Whether the user has the capability mod/forum:postwithoutthrottling allowed.
    canexportdiscussion?: boolean; // Whether the user has the capability mod/forum:exportdiscussion allowed.
    canexportforum?: boolean; // Whether the user has the capability mod/forum:exportforum allowed.
    canexportpost?: boolean; // Whether the user has the capability mod/forum:exportpost allowed.
    canexportownpost?: boolean; // Whether the user has the capability mod/forum:exportownpost allowed.
    canaddquestion?: boolean; // Whether the user has the capability mod/forum:addquestion allowed.
    canallowforcesubscribe?: boolean; // Whether the user has the capability mod/forum:allowforcesubscribe allowed.
    cancanposttomygroups?: boolean; // Whether the user has the capability mod/forum:canposttomygroups allowed.
    cancanoverridediscussionlock?: boolean; // Whether the user has the capability mod/forum:canoverridediscussionlock allowed.
    cancanoverridecutoff?: boolean; // Whether the user has the capability mod/forum:canoverridecutoff allowed.
    cancantogglefavourite?: boolean; // Whether the user has the capability mod/forum:cantogglefavourite allowed.
    cangrade?: boolean; // Whether the user has the capability mod/forum:grade allowed.
};

/**
 * Post creation or edition data.
 */
export type AddonModForumPostFormData = {
    id: number;
    subject: string | null; // Null means original data is not set.
    message: string | null; // Null means empty or just white space.
    files: CoreFileEntry[];
    replyingTo?: number;
    isEditing?: boolean;
    isprivatereply?: boolean;
};

/**
 * Can add discussion info.
 */
export type AddonModForumCanAddDiscussion = {
    status: boolean; // True if the user can add discussions, false otherwise.
    canpindiscussions?: boolean; // True if the user can pin discussions, false otherwise.
    cancreateattachment?: boolean; // True if the user can add attachments, false otherwise.
};

/**
 * Sorting order.
 */
export type AddonModForumSortOrder = {
    label: string;
    value: number;
};

/**
 * Forum post data returned by web services.
 */
export type AddonModForumWSPost = {
    id: number; // Id.
    subject: string; // Subject.
    replysubject: string; // Replysubject.
    message: string; // Message.
    messageformat: number; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    author: {
        id?: number; // Id.
        fullname?: string; // Fullname.
        isdeleted?: boolean; // Isdeleted.
        groups?: { // Groups.
            id: number; // Id.
            name: string; // Name.
            urls: {
                image?: string; // Image.
            };
        }[];
        urls: {
            profile?: string; // The URL for the use profile page.
            profileimage?: string; // The URL for the use profile image.
        };
    };
    discussionid: number; // Discussionid.
    hasparent: boolean; // Hasparent.
    parentid?: number; // Parentid.
    timecreated: number; // Timecreated.
    unread?: boolean; // Unread.
    isdeleted: boolean; // Isdeleted.
    isprivatereply: boolean; // Isprivatereply.
    haswordcount: boolean; // Haswordcount.
    wordcount?: number; // Wordcount.
    charcount?: number; // Charcount.
    capabilities: {
        view: boolean; // Whether the user can view the post.
        edit: boolean; // Whether the user can edit the post.
        delete: boolean; // Whether the user can delete the post.
        split: boolean; // Whether the user can split the post.
        reply: boolean; // Whether the user can reply to the post.
        selfenrol: boolean; // Whether the user can self enrol into the course.
        export: boolean; // Whether the user can export the post.
        controlreadstatus: boolean; // Whether the user can control the read status of the post.
        canreplyprivately: boolean; // Whether the user can post a private reply.
    };
    urls?: {
        view?: string; // The URL used to view the post.
        viewisolated?: string; // The URL used to view the post in isolation.
        viewparent?: string; // The URL used to view the parent of the post.
        edit?: string; // The URL used to edit the post.
        delete?: string; // The URL used to delete the post.

        // The URL used to split the discussion with the selected post being the first post in the new discussion.
        split?: string;

        reply?: string; // The URL used to reply to the post.
        export?: string; // The URL used to export the post.
        markasread?: string; // The URL used to mark the post as read.
        markasunread?: string; // The URL used to mark the post as unread.
        discuss?: string; // Discuss.
    };
    attachments: CoreWSStoredFile[]; // Attachments.
    tags?: { // Tags.
        id: number; // The ID of the Tag.
        tagid: number; // The tagid.
        isstandard: boolean; // Whether this is a standard tag.
        displayname: string; // The display name of the tag.
        flag: boolean; // Wehther this tag is flagged.
        urls: {
            view: string; // The URL to view the tag.
        };
    }[];
    html?: {
        rating?: string; // The HTML source to rate the post.
        taglist?: string; // The HTML source to view the list of tags.
        authorsubheading?: string; // The HTML source to view the author details.
    };
};

/**
 * Params of mod_forum_get_forum_discussions WS.
 */
export type AddonModForumGetForumDiscussionsWSParams = {
    forumid: number; // Forum instance id.
    sortorder?: number; // Sort by this element: numreplies, , created or timemodified.
    page?: number; // Current page.
    perpage?: number; // Items per page.
    groupid?: number; // Group id.
};

/**
 * Data returned by mod_forum_get_forum_discussions WS.
 */
export type AddonModForumGetForumDiscussionsWSResponse = {
    discussions: AddonModForumDiscussion[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_forum_get_forum_discussions_paginated WS.
 */
export type AddonModForumGetForumDiscussionsPaginatedWSParams = {
    forumid: number; // Forum instance id.
    sortby?: string; // Sort by this element: id, timemodified, timestart or timeend.
    sortdirection?: string; // Sort direction: ASC or DESC.
    page?: number; // Current page.
    perpage?: number; // Items per page.
};

/**
 * Data returned by mod_forum_get_forum_discussions_paginated WS.
 */
export type AddonModForumGetForumDiscussionsPaginatedWSResponse = {
    discussions: AddonModForumDiscussion[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Array options of mod_forum_add_discussion WS.
 */
export type AddonModForumAddDiscussionWSOptionsArray = {
    // Option name.
    name: 'discussionsubscribe' | 'discussionpinned' | 'inlineattachmentsid' | 'attachmentsid';

    // Option value.
    // This param is validated in the external function, expected values are:
    // discussionsubscribe (bool) - subscribe to the discussion?, default to true
    // discussionpinned    (bool) - is the discussion pinned, default to false
    // inlineattachmentsid (int)  - the draft file area id for inline attachments
    // attachmentsid       (int)  - the draft file area id for attachments.
    value: string;
}[];

/**
 * Object options of mod_forum_add_discussion WS.
 */
export type AddonModForumAddDiscussionWSOptionsObject = {
    discussionsubscribe?: string;
    discussionpinned?: string;
    inlineattachmentsid?: string;
    attachmentsid?: string;
};

/**
 * Array options of mod_forum_add_discussion_post WS.
 */
export type AddonModForumAddDiscussionPostWSOptionsArray = {
    // Option name.
    name: 'discussionsubscribe' | 'private' | 'inlineattachmentsid' | 'attachmentsid' | 'topreferredformat';

    // Option value.
    // This param is validated in the external function, expected values are:
    // discussionsubscribe (bool) - subscribe to the discussion?, default to true
    // private             (bool) - make this reply private to the author of the parent post, default to false.
    // inlineattachmentsid (int)  - the draft file area id for inline attachments
    // attachmentsid       (int)  - the draft file area id for attachments
    // topreferredformat   (bool) - convert the message & messageformat to FORMAT_HTML, defaults to false.
    value: string;
}[];

/**
 * Object options of mod_forum_add_discussion_post WS.
 */
export type AddonModForumAddDiscussionPostWSOptionsObject = {
    discussionsubscribe?: boolean;
    private?: boolean;
    inlineattachmentsid?: number;
    attachmentsid?: number;
    topreferredformat?: boolean;
};

/**
 * Array options of mod_forum_update_discussion_post WS.
 */
export type AddonModForumUpdateDiscussionPostWSOptionsArray = {
    // Option name.
    name: 'pinned' | 'discussionsubscribe' | 'inlineattachmentsid' | 'attachmentsid';

    // Option value.
    // This param is validated in the external function, expected values are:
    // pinned              (bool) - (only for discussions) whether to pin this discussion or not
    // discussionsubscribe (bool) - whether to subscribe to the post or not
    // inlineattachmentsid (int)  - the draft file area id for inline attachments in the text
    // attachmentsid       (int)  - the draft file area id for attachments.
    value: string; // The value of the option.
}[];

/**
 * Object options of mod_forum_update_discussion_post WS.
 */
export type AddonModForumUpdateDiscussionPostWSOptionsObject = {
    pinned?: boolean;
    discussionsubscribe?: boolean;
    inlineattachmentsid?: number;
    attachmentsid?: number;
};

/**
 * Params of mod_forum_add_discussion WS.
 */
export type AddonModForumAddDiscussionWSParams = {
    forumid: number; // Forum instance ID.
    subject: string; // New Discussion subject.
    message: string; // New Discussion message (only html format allowed).
    groupid?: number; // The group, default to 0.
    options?: AddonModForumAddDiscussionWSOptionsArray;
};

/**
 * Data returned by mod_forum_add_discussion WS.
 */
export type AddonModForumAddDiscussionWSResponse = {
    discussionid: number; // New Discussion ID.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_forum_add_discussion_post WS.
 */
export type AddonModForumAddDiscussionPostWSParams = {
    postid: number; // The post id we are going to reply to (can be the initial discussion post).
    subject: string; // New post subject.
    message: string; // New post message (html assumed if messageformat is not provided).
    options?: AddonModForumAddDiscussionPostWSOptionsArray;
    messageformat?: number; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
};

/**
 * Data returned by mod_forum_add_discussion_post WS.
 */
export type AddonModForumAddDiscussionPostWSResponse = {
    postid: number; // New post id.
    warnings?: CoreWSExternalWarning[];
    post: AddonModForumWSPost;
    messages?: { // List of warnings.
        type: string; // The classification to be used in the client side.
        message: string; // Untranslated english message to explain the warning.
    }[];
};

/**
 * Params of mod_forum_get_forum_access_information WS.
 */
export type AddonModForumGetForumAccessInformationWSParams = {
    forumid: number; // Forum instance id.
};

/**
 * Data returned by mod_forum_get_forum_access_information WS.
 */
export type AddonModForumGetForumAccessInformationWSResponse = {
    warnings?: CoreWSExternalWarning[];
} & AddonModForumAccessInformation;

/**
 * Params of mod_forum_can_add_discussion WS.
 */
export type AddonModForumCanAddDiscussionWSParams = {
    forumid: number; // Forum instance ID.
    groupid?: number; // The group to check, default to active group (Use -1 to check if the user can post in all the groups).
};

/**
 * Data returned by mod_forum_can_add_discussion WS.
 */
export type AddonModForumCanAddDiscussionWSResponse = {
    warnings?: CoreWSExternalWarning[];
} & AddonModForumCanAddDiscussion;

/**
 * Params of mod_forum_delete_post WS.
 */
export type AddonModForumDeletePostWSParams = {
    postid: number; // Post to be deleted. It can be a discussion topic post.
};

/**
 * Data returned by mod_forum_delete_post WS.
 */
export type AddonModForumDeletePostWSResponse = CoreStatusWithWarningsWSResponse;

/**
 * Params of mod_forum_get_discussion_post WS.
 */
export type AddonModForumGetDiscussionPostWSParams = {
    postid: number; // Post to fetch.
};

/**
 * Data returned by mod_forum_get_discussion_post WS.
 */
export type AddonModForumGetDiscussionPostWSResponse = {
    post: AddonModForumWSPost;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_forum_get_discussion_posts WS.
 */
export type AddonModForumGetDiscussionPostsWSParams = {
    discussionid: number; // The ID of the discussion from which to fetch posts.
    sortby?: string; // Sort by this element: id, created or modified.
    sortdirection?: string; // Sort direction: ASC or DESC.
    includeinlineattachments?: boolean; // @since 4.0. Whether inline attachments should be included or not.
};

/**
 * Data returned by mod_forum_get_discussion_posts WS.
 */
export type AddonModForumGetDiscussionPostsWSResponse = {
    posts: AddonModForumWSPost[];
    forumid: number; // The forum id.
    courseid: number; // The forum course id.
    ratinginfo?: CoreRatingInfo; // Rating information.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_forum_get_forum_discussion_posts WS.
 */
export type AddonModForumGetForumDiscussionPostsWSParams = {
    discussionid: number; // Discussion ID.
    sortby?: string; // Sort by this element: id, created or modified.
    sortdirection?: string; // Sort direction: ASC or DESC.
};

/**
 * Data returned by mod_forum_get_forum_discussion_posts WS.
 */
export type AddonModForumGetForumDiscussionPostsWSResponse = {
    posts: AddonModForumLegacyPost[];
    ratinginfo?: CoreRatingInfo; // Rating information.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_forum_set_lock_state WS.
 */
export type AddonModForumSetLockStateWSParams = {
    forumid: number; // Forum that the discussion is in.
    discussionid: number; // The discussion to lock / unlock.
    targetstate: number; // The timestamp for the lock state.
};

/**
 * Data returned by mod_forum_set_lock_state WS.
 */
export type AddonModForumSetLockStateWSResponse = {
    id: number; // The discussion we are locking.
    locked: boolean; // The locked state of the discussion.
    times: {
        locked: number; // The locked time of the discussion.
    };
};

/**
 * Params of mod_forum_set_pin_state WS.
 */
export type AddonModForumSetPinStateWSParams = {
    discussionid: number; // The discussion to pin or unpin.
    targetstate: number; // The target state.
};

/**
 * Data returned by mod_forum_set_pin_state WS.
 */
export type AddonModForumSetPinStateWSResponse = {
    id: number; // Id.
    forumid: number; // Forumid.
    pinned: boolean; // Pinned.
    locked: boolean; // Locked.
    istimelocked: boolean; // Istimelocked.
    name: string; // Name.
    firstpostid: number; // Firstpostid.
    group?: {
        name: string; // Name.
        urls: {
            picture?: string; // Picture.
            userlist?: string; // Userlist.
        };
    };
    times: {
        modified: number; // Modified.
        start: number; // Start.
        end: number; // End.
        locked: number; // Locked.
    };
    userstate: {
        subscribed: boolean; // Subscribed.
        favourited: boolean; // Favourited.
    };
    capabilities: {
        subscribe: boolean; // Subscribe.
        move: boolean; // Move.
        pin: boolean; // Pin.
        post: boolean; // Post.
        manage: boolean; // Manage.
        favourite: boolean; // Favourite.
    };
    urls: {
        view: string; // View.
        viewlatest?: string; // Viewlatest.
        viewfirstunread?: string; // Viewfirstunread.
        markasread: string; // Markasread.
        subscribe: string; // Subscribe.
        pin?: string; // Pin.
    };
    timed: {
        istimed?: boolean; // Istimed.
        visible?: boolean; // Visible.
    };
};

/**
 * Params of mod_forum_toggle_favourite_state WS.
 */
export type AddonModForumToggleFavouriteStateWSParams = {
    discussionid: number; // The discussion to subscribe or unsubscribe.
    targetstate: boolean; // The target state.
};

/**
 * Data returned by mod_forum_toggle_favourite_state WS.
 */
export type AddonModForumToggleFavouriteStateWSResponse = {
    id: number; // Id.
    forumid: number; // Forumid.
    pinned: boolean; // Pinned.
    locked: boolean; // Locked.
    istimelocked: boolean; // Istimelocked.
    name: string; // Name.
    firstpostid: number; // Firstpostid.
    group?: {
        name: string; // Name.
        urls: {
            picture?: string; // Picture.
            userlist?: string; // Userlist.
        };
    };
    times: {
        modified: number; // Modified.
        start: number; // Start.
        end: number; // End.
        locked: number; // Locked.
    };
    userstate: {
        subscribed: boolean; // Subscribed.
        favourited: boolean; // Favourited.
    };
    capabilities: {
        subscribe: boolean; // Subscribe.
        move: boolean; // Move.
        pin: boolean; // Pin.
        post: boolean; // Post.
        manage: boolean; // Manage.
        favourite: boolean; // Favourite.
    };
    urls: {
        view: string; // View.
        viewlatest?: string; // Viewlatest.
        viewfirstunread?: string; // Viewfirstunread.
        markasread: string; // Markasread.
        subscribe: string; // Subscribe.
        pin?: string; // Pin.
    };
    timed: {
        istimed?: boolean; // Istimed.
        visible?: boolean; // Visible.
    };
};

/**
 * Params of mod_forum_update_discussion_post WS.
 */
export type AddonModForumUpdateDiscussionPostWSParams = {
    postid: number; // Post to be updated. It can be a discussion topic post.
    subject?: string; // Updated post subject.
    message?: string; // Updated post message (HTML assumed if messageformat is not provided).
    messageformat?: number; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    options?: AddonModForumUpdateDiscussionPostWSOptionsArray; // Configuration options for the post.
};

/**
 * Data returned by mod_forum_update_discussion_post WS.
 */
export type AddonModForumUpdateDiscussionPostWSResponse = CoreStatusWithWarningsWSResponse;

/**
 * Params of mod_forum_prepare_draft_area_for_post WS.
 */
type AddonModForumPrepareDraftAreaForPostWSParams = {
    postid: number; // Post to prepare the draft area for.
    area: string; // Area to prepare: attachment or post.
    draftitemid?: number; // The draft item id to use. 0 to generate one.
    filestokeep?: AddonModForumFileToKeep[]; // Only keep these files in the draft file area. Empty for keeping all.
};

/**
 * Data to pass to mod_forum_prepare_draft_area_for_post to keep a file in the area.
 */
type AddonModForumFileToKeep = {
    filename: string; // File name.
    filepath: string; // File path.
};

/**
 * Data returned by mod_forum_prepare_draft_area_for_post WS.
 */
export type AddonModForumPrepareDraftAreaForPostWSResponse = {
    draftitemid: number; // Draft item id for the file area.
    files?: CoreWSExternalFile[];
    areaoptions: { // Draft file area options.
        name: string; // Name of option.
        value: string; // Value of option.
    }[];
    messagetext: string; // Message text with URLs rewritten.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Options to pass to preparePostForEdition.
 */
export type AddonModForumPreparePostOptions = {
    filesToKeep?: CoreWSFile[]; // Only keep these files in the draft file area. Undefined or empty array for keeping all.
    siteId?: string;
};

/**
 * Data passed to NEW_DISCUSSION_EVENT event.
 */
export type AddonModForumNewDiscussionData = {
    forumId: number;
    cmId: number;
    discussionIds?: number[] | null;
    discTimecreated?: number;
    groupId?: number; // The discussion group if it's created in a certain group, ALL_PARTICIPANTS for all participants.
};

/**
 * Data passed to REPLY_DISCUSSION_EVENT event.
 */
export type AddonModForumReplyDiscussionData = {
    forumId: number;
    discussionId: number;
    cmId: number;
};

/**
 * Data passed to CHANGE_DISCUSSION_EVENT event.
 */
export type AddonModForumChangeDiscussionData = {
    forumId: number;
    discussionId: number;
    cmId: number;
    deleted?: boolean;
    post?: AddonModForumPost;
    locked?: boolean;
    pinned?: boolean;
    starred?: boolean;
};

/**
 * Data passed to MARK_READ_EVENT event.
 */
export type AddonModForumMarkReadData = {
    courseId: number;
    moduleId: number;
};

/**
 * Tracking options.
 */
export const enum AddonModForumTracking {
    OFF = 0,
    OPTIONAL = 1,
    FORCED = 2,
}
