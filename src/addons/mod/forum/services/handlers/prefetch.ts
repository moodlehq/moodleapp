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
import { CoreCourseActivityPrefetchHandlerBase } from '@features/course/classes/activity-prefetch-handler';
import { AddonModForum, AddonModForumData, AddonModForumPost } from '../forum';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreFilepool } from '@services/filepool';
import { CoreWSFile } from '@services/ws';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { CoreGroups, CoreGroupsProvider } from '@services/groups';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { AddonModForumSync, AddonModForumSyncResult } from '../forum-sync';
import { makeSingleton } from '@singletons';
import { CoreCourses } from '@features/courses/services/courses';
import { ADDON_MOD_FORUM_COMPONENT_LEGACY } from '../../constants';

/**
 * Handler to prefetch forums.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModForum';
    modName = 'forum';
    component = ADDON_MOD_FORUM_COMPONENT_LEGACY;
    updatesNames = /^configuration$|^.*files$|^discussions$/;

    /**
     * @inheritdoc
     */
    async getFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<CoreWSFile[]> {
        try {
            const forum = await AddonModForum.getForum(courseId, module.id);

            let files = this.getIntroFilesFromInstance(module, forum);

            // Get posts.
            const posts = await this.getPostsForPrefetch(forum, { cmId: module.id });

            // Add posts attachments and embedded files.
            files = files.concat(this.getPostsFiles(posts));

            return files;
        } catch (error) {
            // Forum not found, return empty list.
            return [];
        }
    }

    /**
     * Given a list of forum posts, return a list with all the files (attachments and embedded files).
     *
     * @param posts Forum posts.
     * @returns Files.
     */
    protected getPostsFiles(posts: AddonModForumPost[]): CoreWSFile[] {
        let files: CoreWSFile[] = [];

        posts.forEach((post) => {
            if (post.attachments && post.attachments.length) {
                files = files.concat(post.attachments as CoreWSFile[]);
            }

            if (post.messageinlinefiles) {
                files = files.concat(post.messageinlinefiles);
            } else if (post.message) {
                files = files.concat(CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(post.message));
            }
        });

        return files;
    }

    /**
     * Get the posts to be prefetched.
     *
     * @param forum Forum instance.
     * @param options Other options.
     * @returns Promise resolved with array of posts.
     */
    protected async getPostsForPrefetch(
        forum: AddonModForumData,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModForumPost[]> {
        // Only prefetch selected sort order.
        const sortOrder = await AddonModForum.getSelectedSortOrder();

        const groupsIds = await this.getGroupsIdsToPrefetch(forum);

        const results = await Promise.all(groupsIds.map(async (groupId) => {
            // Get discussions in first 2 pages.
            const discussionsOptions = {
                sortOrder: sortOrder.value,
                groupId: groupId,
                numPages: 2,
                ...options, // Include all options.
            };

            const response = await AddonModForum.getDiscussionsInPages(forum.id, discussionsOptions);

            if (response.error) {
                throw new Error('Failed getting discussions');
            }

            return Promise.all(
                response.discussions.map((discussion) => AddonModForum.getDiscussionPosts(discussion.discussion, options)),
            );
        }));

        const posts: AddonModForumPost[] = [];
        const postIds: Record<number, boolean> = {}; // To make the array unique.

        results.forEach((groupResults) => {
            groupResults.forEach((groupDiscussion) => {
                groupDiscussion.posts.forEach((post) => {
                    if (!postIds[post.id]) {
                        postIds[post.id] = true;
                        posts.push(post);
                    }
                });
            });
        });

        return posts;
    }

    /**
     * Get the group IDs to prefetch in a forum.
     * Prefetch all participants if the user can view them. Otherwise, prefetch the groups the user can view.
     *
     * @param forum Forum instance.
     * @returns Promise resolved with array of group IDs.
     */
    protected async getGroupsIdsToPrefetch(forum: AddonModForumData): Promise<number[]> {
        const groupInfo = await CoreGroups.getActivityGroupInfo(forum.cmid);

        const supportsChangeGroup = AddonModForum.isGetDiscussionPostsAvailable();
        const usesGroups = !!(groupInfo.separateGroups || groupInfo.visibleGroups);

        if (!usesGroups) {
            return [0];
        }

        const allPartsGroup = groupInfo.groups.find(group => group.id === 0);
        if (allPartsGroup) {
            return [0]; // Prefetch all participants.
        }

        if (!supportsChangeGroup) {
            // Cannot change group, prefetch only the default group.
            return [groupInfo.defaultGroupId];
        }

        return groupInfo.groups.map(group => group.id) ?? [0];
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void> {
        return AddonModForum.invalidateContent(moduleId, courseId);
    }

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when invalidated.
     */
    async invalidateModule(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        // Invalidate forum data to recalculate unread message count badge.
        const promises: Promise<unknown>[] = [];

        promises.push(AddonModForum.invalidateForumData(courseId));
        promises.push(CoreCourse.invalidateModule(module.id));

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<void> {
        return this.prefetchPackage(module, courseId, (siteId) => this.prefetchForum(module, courseId, !!single, siteId));
    }

    /**
     * Prefetch a forum.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @returns Promise resolved when done.
     */
    protected async prefetchForum(
        module: CoreCourseAnyModuleData,
        courseId: number,
        single: boolean,
        siteId: string,
    ): Promise<void> {
        const commonOptions = {
            readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            siteId,
        };
        const modOptions = {
            cmId: module.id,
            ...commonOptions, // Include all common options.
        };

        // Get the forum data.
        const forum = await AddonModForum.getForum(courseId, module.id, commonOptions);
        const promises: Promise<unknown>[] = [];

        // Prefetch the posts.
        promises.push(this.getPostsForPrefetch(forum, modOptions).then((posts) => {
            const promises: Promise<unknown>[] = [];

            const files = this.getIntroFilesFromInstance(module, forum).concat(this.getPostsFiles(posts));
            promises.push(CoreFilepool.addFilesToQueue(siteId, files, this.component, module.id));

            // Prefetch groups data.
            promises.push(this.prefetchGroupsInfo(forum, courseId, !!forum.cancreatediscussions, siteId));

            // Prefetch avatars.
            promises.push(CoreUser.prefetchUserAvatars(posts, 'userpictureurl', siteId));

            return Promise.all(promises);
        }));

        // Prefetch access information.
        promises.push(AddonModForum.getAccessInformation(forum.id, modOptions));

        // Get course data, needed to determine upload max size if it's configured to be course limit.
        promises.push(CorePromiseUtils.ignoreErrors(CoreCourses.getCourseByField('id', courseId, siteId)));

        await Promise.all(promises);
    }

    /**
     * Prefetch groups info for a forum.
     *
     * @param forum The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param canCreateDiscussions Whether the user can create discussions in the forum.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when group data has been prefetched.
     */
    protected async prefetchGroupsInfo(
        forum: AddonModForumData,
        courseId: number,
        canCreateDiscussions: boolean,
        siteId?: string,
    ): Promise<void> {
        const options = {
            cmId: forum.cmid,
            siteId,
        };

        // Check group mode.
        try {
            const mode = await CoreGroups.getActivityGroupMode(forum.cmid, siteId);

            if (mode !== CoreGroupsProvider.SEPARATEGROUPS && mode !== CoreGroupsProvider.VISIBLEGROUPS) {
                // Activity doesn't use groups. Prefetch canAddDiscussionToAll to determine if user can pin/attach.
                await CorePromiseUtils.ignoreErrors(AddonModForum.canAddDiscussionToAll(forum.id, options));

                return;
            }

            // Activity uses groups, prefetch allowed groups.
            const result = await CoreGroups.getActivityAllowedGroups(forum.cmid, undefined, siteId);
            await Promise.all(
                result.groups.map(
                    async (group) => CorePromiseUtils.ignoreErrors(
                        AddonModForum.canAddDiscussion(forum.id, group.id, options),
                    ),
                ).concat(
                    CorePromiseUtils.ignoreErrors(AddonModForum.canAddDiscussionToAll(forum.id, options)),
                ),
            );
        } catch (error) {
            // Ignore errors if cannot create discussions.
            if (canCreateDiscussions) {
                throw error;
            }
        }
    }

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async sync(
        module: CoreCourseAnyModuleData,
        courseId: number,
        siteId?: string,
    ): Promise<AddonModForumSyncResult> {
        const promises: Promise<AddonModForumSyncResult>[] = [];

        promises.push(AddonModForumSync.syncForumDiscussions(module.instance, undefined, siteId));
        promises.push(AddonModForumSync.syncForumReplies(module.instance, undefined, siteId));
        promises.push(AddonModForumSync.syncRatings(module.id, undefined, true, siteId));

        const results = await Promise.all(promises);

        return results.reduce(
            (a, b) => ({
                updated: a.updated || b.updated,
                warnings: (a.warnings || []).concat(b.warnings || []),
            }),
            {
                updated: false,
                warnings: [],
            },
        );
    }

}

export const AddonModForumPrefetchHandler = makeSingleton(AddonModForumPrefetchHandlerService);
