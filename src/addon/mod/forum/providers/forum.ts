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
import { TranslateService } from '@ngx-translate/core';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { AddonModForumOfflineProvider } from './offline';
import { CoreRatingInfo } from '@core/rating/providers/rating';

/**
 * Service that provides some features for forums.
 */
@Injectable()
export class AddonModForumProvider {
    static COMPONENT = 'mmaModForum';
    static DISCUSSIONS_PER_PAGE = 10; // Max of discussions per page.
    static NEW_DISCUSSION_EVENT = 'addon_mod_forum_new_discussion';
    static REPLY_DISCUSSION_EVENT = 'addon_mod_forum_reply_discussion';
    static VIEW_DISCUSSION_EVENT = 'addon_mod_forum_view_discussion';
    static CHANGE_DISCUSSION_EVENT = 'addon_mod_forum_change_discussion_status';
    static MARK_READ_EVENT = 'addon_mod_forum_mark_read';
    static LEAVING_POSTS_PAGE = 'addon_mod_forum_leaving_posts_page';

    static PREFERENCE_SORTORDER = 'forum_discussionlistsortorder';
    static SORTORDER_LASTPOST_DESC = 1;
    static SORTORDER_LASTPOST_ASC = 2;
    static SORTORDER_CREATED_DESC = 3;
    static SORTORDER_CREATED_ASC = 4;
    static SORTORDER_REPLIES_DESC = 5;
    static SORTORDER_REPLIES_ASC = 6;

    static ALL_PARTICIPANTS = -1;
    static ALL_GROUPS = -2;

    protected ROOT_CACHE_KEY = 'mmaModForum:';

    constructor(private appProvider: CoreAppProvider,
            private sitesProvider: CoreSitesProvider,
            private groupsProvider: CoreGroupsProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private userProvider: CoreUserProvider,
            private translate: TranslateService,
            private utils: CoreUtilsProvider,
            private forumOffline: AddonModForumOfflineProvider,
            private logHelper: CoreCourseLogHelperProvider) {}

    /**
     * Get cache key for can add discussion WS calls.
     *
     * @param forumId Forum ID.
     * @param groupId Group ID.
     * @return Cache key.
     */
    protected getCanAddDiscussionCacheKey(forumId: number, groupId: number): string {
        return this.getCommonCanAddDiscussionCacheKey(forumId) + groupId;
    }

    /**
     * Get common part of cache key for can add discussion WS calls.
     * TODO: Use getForumDataCacheKey as a prefix.
     *
     * @param forumId Forum ID.
     * @return Cache key.
     */
    protected getCommonCanAddDiscussionCacheKey(forumId: number): string {
        return this.ROOT_CACHE_KEY + 'canadddiscussion:' + forumId + ':';
    }

    /**
     * Get prefix cache key for all forum activity data WS calls.
     *
     * @param forumId Forum ID.
     * @return Cache key.
     */
    protected getForumDataPrefixCacheKey(forumId: number): string {
        return this.ROOT_CACHE_KEY + forumId;
    }

    /**
     * Get cache key for discussion post data WS calls.
     *
     * @param forumId Forum ID.
     * @param discussionId Discussion ID.
     * @param postId Course ID.
     * @return Cache key.
     */
    protected getDiscussionPostDataCacheKey(forumId: number, discussionId: number, postId: number): string {
        return this.getForumDiscussionDataCacheKey(forumId, discussionId) + ':post:' + postId;
    }

    /**
     * Get cache key for forum data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getForumDiscussionDataCacheKey(forumId: number, discussionId: number): string {
         return this.getForumDataPrefixCacheKey(forumId) + ':discussion:' + discussionId;
    }

    /**
     * Get cache key for forum data WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getForumDataCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'forum:' + courseId;
    }

    /**
     * Get cache key for forum access information WS calls.
     * TODO: Use getForumDataCacheKey as a prefix.
     *
     * @param forumId Forum ID.
     * @return Cache key.
     */
    protected getAccessInformationCacheKey(forumId: number): string {
        return this.ROOT_CACHE_KEY + 'accessInformation:' + forumId;
    }

    /**
     * Get cache key for forum discussion posts WS calls.
     * TODO: Use getForumDiscussionDataCacheKey instead.
     *
     * @param discussionId Discussion ID.
     * @return Cache key.
     */
    protected getDiscussionPostsCacheKey(discussionId: number): string {
        return this.ROOT_CACHE_KEY + 'discussion:' + discussionId;
    }

    /**
     * Get cache key for forum discussions list WS calls.
     *
     * @param forumId Forum ID.
     * @param sortOrder Sort order.
     * @return Cache key.
     */
    protected getDiscussionsListCacheKey(forumId: number, sortOrder: number): string {
        let key = this.ROOT_CACHE_KEY + 'discussions:' + forumId;

        if (sortOrder != AddonModForumProvider.SORTORDER_LASTPOST_DESC) {
            key += ':' + sortOrder;
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
     * @return Promise resolved when the discussion is created.
     */
    addNewDiscussionOnline(forumId: number, subject: string, message: string, options?: any, groupId?: number, siteId?: string)
            : Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {
                forumid: forumId,
                subject: subject,
                message: message,
                options: this.utils.objectToArrayOfObjects(options, 'name', 'value')
            };

            if (groupId) {
                params.groupid = groupId;
            }

            return site.write('mod_forum_add_discussion', params).then((response) => {
                // Other errors ocurring.
                if (!response || !response.discussionid) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                } else {
                    return response.discussionid;
                }
            });
        });
    }

    /**
     * Check if a user can post to a certain group.
     *
     * @param forumId Forum ID.
     * @param groupId Group ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object with the following properties:
     *         - status (boolean)
     *         - canpindiscussions (boolean)
     *         - cancreateattachment (boolean)
     */
    canAddDiscussion(forumId: number, groupId: number, siteId?: string): Promise<any> {
        const params = {
            forumid: forumId,
            groupid: groupId
        };
        const preSets = {
            cacheKey: this.getCanAddDiscussionCacheKey(forumId, groupId)
        };

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.read('mod_forum_can_add_discussion', params, preSets).then((result) => {
                if (result) {
                    if (typeof result.canpindiscussions == 'undefined') {
                        // WS doesn't support it yet, default it to false to prevent students from seing the option.
                        result.canpindiscussions = false;
                    }
                    if (typeof result.cancreateattachment == 'undefined') {
                        // WS doesn't support it yet, default it to true since usually the users will be able to create them.
                        result.cancreateattachment = true;
                    }

                    return result;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Check if a user can post to all groups.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object with the following properties:
     *         - status (boolean)
     *         - canpindiscussions (boolean)
     *         - cancreateattachment (boolean)
     */
    canAddDiscussionToAll(forumId: number, siteId?: string): Promise<any> {
        return this.canAddDiscussion(forumId, AddonModForumProvider.ALL_PARTICIPANTS, siteId);
    }

    /**
     * Delete a post.
     *
     * @param postId Post id.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.8
     */
    deletePost(postId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                postid: postId
            };

            return site.write('mod_forum_delete_post', params);
        });
    }

    /**
     * Extract the starting post of a discussion from a list of posts. The post is removed from the array passed as a parameter.
     *
     * @param posts Posts to search.
     * @return Starting post or undefined if not found.
     */
    extractStartingPost(posts: any[]): any {
        const index = posts.findIndex((post) => post.parent == 0);

        return index >= 0 ? posts.splice(index, 1).pop() : undefined;
    }

    /**
     * There was a bug adding new discussions to All Participants (see MDL-57962). Check if it's fixed.
     *
     * @return True if fixed, false otherwise.
     */
    isAllParticipantsFixed(): boolean {
        return this.sitesProvider.getCurrentSite() &&
                this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan(['3.1.5', '3.2.2']);
    }

    /**
     * Returns whether or not getDiscussionPost WS available or not.
     *
     * @return If WS is avalaible.
     * @since 3.8
     */
    isGetDiscussionPostAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_forum_get_discussion_post');
    }

    /**
     * Returns whether or not deletePost WS available or not.
     *
     * @return If WS is avalaible.
     * @since 3.8
     */
    isDeletePostAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_forum_delete_post');
    }

    /**
     * Returns whether or not updatePost WS available or not.
     *
     * @return If WS is avalaible.
     * @since 3.8
     */
    isUpdatePostAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('mod_forum_update_discussion_post');
    }

    /**
     * Format discussions, setting groupname if the discussion group is valid.
     *
     * @param cmId Forum cmid.
     * @param discussions List of discussions to format.
     * @return Promise resolved with the formatted discussions.
     */
    formatDiscussionsGroups(cmId: number, discussions: any[]): Promise<any[]> {
        discussions = this.utils.clone(discussions);

        return this.groupsProvider.getActivityAllowedGroups(cmId).then((result) => {
            const strAllParts = this.translate.instant('core.allparticipants');
            const strAllGroups = this.translate.instant('core.allgroups');

            // Turn groups into an object where each group is identified by id.
            const groups = {};
            result.groups.forEach((fg) => {
                groups[fg.id] = fg;
            });

            // Format discussions.
            discussions.forEach((disc) => {
                if (disc.groupid == AddonModForumProvider.ALL_PARTICIPANTS) {
                    disc.groupname = strAllParts;
                } else if (disc.groupid == AddonModForumProvider.ALL_GROUPS) {
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
        }).catch(() => {
            return discussions;
        });
    }

    /**
     * Get all course forums.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the forums are retrieved.
     */
    getCourseForums(courseId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseids: [courseId]
            };
            const preSets = {
                cacheKey: this.getForumDataCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            return site.read('mod_forum_get_forums_by_courses', params, preSets);
        });
    }

    /**
     * Get a particular discussion post.
     *
     * @param forumId Forum ID.
     * @param discussionId Discussion ID.
     * @param postId Post ID.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the post is retrieved.
     */
    getDiscussionPost(forumId: number, discussionId: number, postId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    postid: postId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getDiscussionPostDataCacheKey(forumId, discussionId, postId),
                    updateFrequency: CoreSite.FREQUENCY_USUALLY
                };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_forum_get_discussion_post', params, preSets).then((response) => {
                if (response.post) {
                    return response.post;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get a forum by course module ID.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the forum is retrieved.
     */
    getForum(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.getCourseForums(courseId, siteId).then((forums) => {
            const forum = forums.find((forum) => forum.cmid == cmId);
            if (forum) {
                return forum;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get a forum by forum ID.
     *
     * @param courseId Course ID.
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the forum is retrieved.
     */
    getForumById(courseId: number, forumId: number, siteId?: string): Promise<any> {
        return this.getCourseForums(courseId, siteId).then((forums) => {
            const forum = forums.find((forum) => forum.id == forumId);
            if (forum) {
                return forum;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get access information for a given forum.
     *
     * @param forumId Forum ID.
     * @param forceCache True to always get the value from cache. false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Object with access information.
     * @since 3.7
     */
    getAccessInformation(forumId: number, forceCache?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!site.wsAvailable('mod_forum_get_forum_access_information')) {
                // Access information not available for 3.6 or older sites.
                return Promise.resolve({});
            }

            const params = {
                forumid: forumId
            };
            const preSets = {
                cacheKey: this.getAccessInformationCacheKey(forumId),
                omitExpires: forceCache
            };

            return site.read('mod_forum_get_forum_access_information', params, preSets);
        });
    }

    /**
     * Get forum discussion posts.
     *
     * @param discussionId Discussion ID.
     * @param cmId Forum cmid.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with forum posts and rating info.
     */
    getDiscussionPosts(discussionId: number, cmId: number, siteId?: string): Promise<{posts: any[], ratinginfo?: CoreRatingInfo}> {
        const params = {
            discussionid: discussionId
        };
        const preSets = {
            cacheKey: this.getDiscussionPostsCacheKey(discussionId),
            component: AddonModForumProvider.COMPONENT,
            componentId: cmId
        };

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.read('mod_forum_get_forum_discussion_posts', params, preSets).then((response) => {
                if (response) {
                    this.storeUserData(response.posts);

                    return response;
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Sort forum discussion posts by an specified field.
     *
     * @param posts Discussion posts to be sorted in place.
     * @param direction Direction of the sorting (ASC / DESC).
     */
    sortDiscussionPosts(posts: any[], direction: string): void {
        // @todo: Check children when sorting.
        posts.sort((a, b) => {
            a = parseInt(a.created, 10);
            b = parseInt(b.created, 10);
            if (direction == 'ASC') {
                return a - b;
            } else {
                return b - a;
            }
        });
    }

    /**
     * Return whether discussion lists can be sorted.
     *
     * @param site Site. If not defined, current site.
     * @return True if discussion lists can be sorted.
     */
    isDiscussionListSortingAvailable(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site && site.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Return the list of available sort orders.
     *
     * @return List of sort orders.
     */
    getAvailableSortOrders(): {label: string, value: number}[] {
        const sortOrders = [
            {
                label: 'addon.mod_forum.discussionlistsortbylastpostdesc',
                value: AddonModForumProvider.SORTORDER_LASTPOST_DESC
            },
        ];

        if (this.isDiscussionListSortingAvailable()) {
            sortOrders.push(
                {
                    label: 'addon.mod_forum.discussionlistsortbylastpostasc',
                    value: AddonModForumProvider.SORTORDER_LASTPOST_ASC
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbycreateddesc',
                    value: AddonModForumProvider.SORTORDER_CREATED_DESC
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbycreatedasc',
                    value: AddonModForumProvider.SORTORDER_CREATED_ASC
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbyrepliesdesc',
                    value: AddonModForumProvider.SORTORDER_REPLIES_DESC
                },
                {
                    label: 'addon.mod_forum.discussionlistsortbyrepliesasc',
                    value: AddonModForumProvider.SORTORDER_REPLIES_ASC
                }
            );
        }

        return sortOrders;
    }

    /**
     * Get forum discussions.
     *
     * @param forumId Forum ID.
     * @param cmId Forum cmid
     * @param sortOrder Sort order.
     * @param page Page.
     * @param forceCache True to always get the value from cache. false otherwise.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object with:
     *         - discussions: List of discussions. Note that for every discussion in the list discussion.id is the main post ID but
     *         discussion ID is discussion.discussion.
     *         - canLoadMore: True if there may be more discussions to load.
     */
    getDiscussions(forumId: number, cmId: number, sortOrder?: number, page: number = 0,
            forceCache?: boolean, siteId?: string): Promise<any> {
        sortOrder = sortOrder || AddonModForumProvider.SORTORDER_LASTPOST_DESC;

        return this.sitesProvider.getSite(siteId).then((site) => {
            let method = 'mod_forum_get_forum_discussions_paginated';
            const params: any = {
                forumid: forumId,
                page: page,
                perpage: AddonModForumProvider.DISCUSSIONS_PER_PAGE
            };

            if (site.wsAvailable('mod_forum_get_forum_discussions')) {
                // Since Moodle 3.7.
                method = 'mod_forum_get_forum_discussions';
                params.sortorder = sortOrder;
            } else {
                if (sortOrder == AddonModForumProvider.SORTORDER_LASTPOST_DESC) {
                    params.sortby = 'timemodified';
                    params.sortdirection = 'DESC';
                } else {
                    // Sorting not supported with the old WS method.
                    return Promise.reject(null);
                }
            }
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getDiscussionsListCacheKey(forumId, sortOrder),
                component: AddonModForumProvider.COMPONENT,
                componentId: cmId
            };
            if (forceCache) {
                preSets.omitExpires = true;
            }

            return site.read(method, params, preSets).catch((error) => {
                // Try to get the data from cache stored with the old WS method.
                if (!this.appProvider.isOnline() && method == 'mod_forum_get_forum_discussion' &&
                        sortOrder == AddonModForumProvider.SORTORDER_LASTPOST_DESC) {

                    const params = {
                        forumid: forumId,
                        page: page,
                        perpage: AddonModForumProvider.DISCUSSIONS_PER_PAGE,
                        sortby: 'timemodified',
                        sortdirection: 'DESC'
                    };
                    const preSets: CoreSiteWSPreSets = {
                        cacheKey: this.getDiscussionsListCacheKey(forumId, sortOrder),
                        omitExpires: true
                    };

                    return site.read('mod_forum_get_forum_discussions_paginated', params, preSets);
                }

                return Promise.reject(error);
            }).then((response) => {
                if (response) {
                    this.storeUserData(response.discussions);

                    return Promise.resolve({
                        discussions: response.discussions,
                        canLoadMore: response.discussions.length >= AddonModForumProvider.DISCUSSIONS_PER_PAGE,
                    });
                } else {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Get forum discussions in several pages.
     * If a page fails, the discussions until that page will be returned along with a flag indicating an error occurred.
     *
     * @param forumId Forum ID.
     * @param cmId Forum cmid.
     * @param sortOrder Sort order.
     * @param forceCache True to always get the value from cache, false otherwise.
     * @param numPages Number of pages to get. If not defined, all pages.
     * @param startPage Page to start. If not defined, first page.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object with:
     *         - discussions: List of discussions.
     *         - error: True if an error occurred, false otherwise.
     */
    getDiscussionsInPages(forumId: number, cmId: number, sortOrder?: number, forceCache?: boolean,
            numPages?: number, startPage?: number, siteId?: string): Promise<any> {
        if (typeof numPages == 'undefined') {
            numPages = -1;
        }
        startPage = startPage || 0;

        const result = {
            discussions: [],
            error: false
        };

        if (!numPages) {
            return Promise.resolve(result);
        }

        const getPage = (page: number): Promise<any> => {
            // Get page discussions.
            return this.getDiscussions(forumId, cmId, sortOrder, page, forceCache, siteId).then((response) => {
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
            });
        };

        return getPage(startPage);
    }

    /**
     * Invalidates can add discussion WS calls.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateCanAddDiscussion(forumId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getCommonCanAddDiscussionCacheKey(forumId));
        });
    }

    /**
     * Invalidate the prefetched content except files.
     * To invalidate files, use AddonModForum#invalidateFiles.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID.
     * @return Promise resolved when data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        // Get the forum first, we need the forum ID.
        return this.getForum(courseId, moduleId).then((forum) => {
            const promises = [];

            promises.push(this.invalidateForumData(courseId));
            promises.push(this.invalidateDiscussionsList(forum.id));
            promises.push(this.invalidateCanAddDiscussion(forum.id));
            promises.push(this.invalidateAccessInformation(forum.id));

            this.getAvailableSortOrders().forEach((sortOrder) => {
                // We need to get the list of discussions to be able to invalidate their posts.
                promises.push(this.getDiscussionsInPages(forum.id, forum.cmid, sortOrder.value, true).then((response) => {
                    // Now invalidate the WS calls.
                    const promises = [];

                    response.discussions.forEach((discussion) => {
                        promises.push(this.invalidateDiscussionPosts(discussion.discussion, forum.id));
                    });

                    return this.utils.allPromises(promises);
                }));
            });

            if (this.isDiscussionListSortingAvailable()) {
                promises.push(this.userProvider.invalidateUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER));
            }

            return this.utils.allPromises(promises);
        });
    }

    /**
     * Invalidates access information.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAccessInformation(forumId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(forumId));
        });
    }

    /**
     * Invalidates forum discussion posts.
     *
     * @param discussionId Discussion ID.
     * @param forumId Forum ID. If not set, we can't invalidate individual post information.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDiscussionPosts(discussionId: number, forumId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [site.invalidateWsCacheForKey(this.getDiscussionPostsCacheKey(discussionId))];

            if (forumId) {
                promises.push(site.invalidateWsCacheForKeyStartingWith(this.getForumDiscussionDataCacheKey(forumId, discussionId)));
            }

            return this.utils.allPromises(promises);
        });
    }

    /**
     * Invalidates discussion list.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDiscussionsList(forumId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.utils.allPromises(this.getAvailableSortOrders().map((sortOrder) => {
                return site.invalidateWsCacheForKey(this.getDiscussionsListCacheKey(forumId, sortOrder.value));
            }));
        });
    }

    /**
     * Invalidate the prefetched files.
     *
     * @param moduleId The module ID.
     * @return Promise resolved when the files are invalidated.
     */
    invalidateFiles(moduleId: number): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        return this.filepoolProvider.invalidateFilesByComponent(siteId, AddonModForumProvider.COMPONENT, moduleId);
    }

    /**
     * Invalidates forum data.
     *
     * @param courseId Course ID.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateForumData(courseId: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getForumDataCacheKey(courseId));
    }

    /**
     * Report a forum as being viewed.
     *
     * @param id Module ID.
     * @param name Name of the forum.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            forumid: id
        };

        return this.logHelper.logSingle('mod_forum_view_forum', params, AddonModForumProvider.COMPONENT, id, name, 'forum', {},
                siteId);
    }

    /**
     * Report a forum discussion as being viewed.
     *
     * @param id Discussion ID.
     * @param forumId Forum ID.
     * @param name Name of the forum.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
     */
    logDiscussionView(id: number, forumId: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            discussionid: id
        };

        return this.logHelper.logSingle('mod_forum_view_forum_discussion', params, AddonModForumProvider.COMPONENT, forumId, name,
                'forum', params, siteId);
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
     * @return Promise resolved with post ID if sent online, resolved with false if stored offline.
     */
    replyPost(postId: number, discussionId: number, forumId: number, name: string, courseId: number, subject: string,
            message: string, options?: any, siteId?: string, allowOffline?: boolean): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<boolean> => {
            if (!forumId) {
                // Not enough data to store in offline, reject.
                return Promise.reject(this.translate.instant('core.networkerrormsg'));
            }

            return this.forumOffline.replyPost(postId, discussionId, forumId, name, courseId, subject, message, options, siteId)
                    .then(() => {
                return false;
            });
        };

        if (!this.appProvider.isOnline() && allowOffline) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If there's already a reply to be sent to the server, discard it first.
        return this.forumOffline.deleteReply(postId, siteId).then(() => {

            return this.replyPostOnline(postId, subject, message, options, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (allowOffline && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error or offline not supported, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Reply to a certain post. It will fail if offline or cannot connect.
     *
     * @param postId ID of the post being replied.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the created post id.
     */
    replyPostOnline(postId: number, subject: string, message: string, options?: any, siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                postid: postId,
                subject: subject,
                message: message,
                options: this.utils.objectToArrayOfObjects(options, 'name', 'value')
            };

            return site.write('mod_forum_add_discussion_post', params).then((response) => {
                if (!response || !response.postid) {
                    return Promise.reject(this.utils.createFakeWSError(''));
                } else {
                    return response.postid;
                }
            });
        });
    }

    /**
     * Lock or unlock a discussion.
     *
     * @param forumId Forum id.
     * @param discussionId DIscussion id.
     * @param locked True to lock, false to unlock.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.7
     */
    setLockState(forumId: number, discussionId: number, locked: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                forumid: forumId,
                discussionid: discussionId,
                targetstate: locked ? 0 : 1
            };

            return site.write('mod_forum_set_lock_state', params);
        });
    }

    /**
     * Returns whether the set pin state WS is available.
     *
     * @param site Site. If not defined, current site.
     * @return Whether it's available.
     * @since 3.7
     */
    isSetPinStateAvailableForSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return this.sitesProvider.wsAvailableInCurrentSite('mod_forum_set_pin_state');
    }

    /**
     * Pin or unpin a discussion.
     *
     * @param discussionId Discussion id.
     * @param locked True to pin, false to unpin.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.7
     */
    setPinState(discussionId: number, pinned: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                discussionid: discussionId,
                targetstate: pinned ? 1 : 0
            };

            return site.write('mod_forum_set_pin_state', params);
        });
    }

    /**
     * Star or unstar a discussion.
     *
     * @param discussionId Discussion id.
     * @param starred True to star, false to unstar.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     * @since 3.7
     */
    toggleFavouriteState(discussionId: number, starred: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                discussionid: discussionId,
                targetstate: starred ? 1 : 0
            };

            return site.write('mod_forum_toggle_favourite_state', params);
        });
    }

    /**
     * Store the users data from a discussions/posts list.
     *
     * @param list Array of posts or discussions.
     */
    protected storeUserData(list: any[]): void {
        const users = {};

        list.forEach((entry) => {
            const userId = parseInt(entry.userid);
            if (!isNaN(userId) && !users[userId]) {
                users[userId] = {
                    id: userId,
                    fullname: entry.userfullname,
                    profileimageurl: entry.userpictureurl
                };
            }
            const userModified = parseInt(entry.usermodified);
            if (!isNaN(userModified) && !users[userModified]) {
                users[userModified] = {
                    id: userModified,
                    fullname: entry.usermodifiedfullname,
                    profileimageurl: entry.usermodifiedpictureurl
                };
            }
        });

        this.userProvider.storeUsers(this.utils.objectToArray(users));
    }

    /**
     * Update a certain post.
     *
     * @param postId ID of the post being edited.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with success boolean when done.
     */
    updatePost(postId: number, subject: string, message: string, options?: any, siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                postid: postId,
                subject: subject,
                message: message,
                options: this.utils.objectToArrayOfObjects(options, 'name', 'value')
            };

            return site.write('mod_forum_update_discussion_post', params).then((response) => {
                return response && response.status;
            });
        });
    }
}
