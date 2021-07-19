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
import { AddonModForum, AddonModForumData, AddonModForumPost, AddonModForumProvider } from '../forum';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreFilepool } from '@services/filepool';
import { CoreWSFile } from '@services/ws';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreUser } from '@features/user/services/user';
import { CoreGroups, CoreGroupsProvider } from '@services/groups';
import { CoreUtils } from '@services/utils/utils';
import { AddonModForumSync } from '../forum-sync';
import { makeSingleton } from '@singletons';

/**
 * Handler to prefetch forums.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumPrefetchHandlerService extends CoreCourseActivityPrefetchHandlerBase {

    name = 'AddonModForum';
    modName = 'forum';
    component = AddonModForumProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^discussions$/;

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the list of files.
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
     * @return Files.
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
     * @return Promise resolved with array of posts.
     */
    protected getPostsForPrefetch(
        forum: AddonModForumData,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModForumPost[]> {
        const promises = AddonModForum.getAvailableSortOrders().map((sortOrder) => {
            // Get discussions in first 2 pages.
            const discussionsOptions = {
                sortOrder: sortOrder.value,
                numPages: 2,
                ...options, // Include all options.
            };

            return AddonModForum.getDiscussionsInPages(forum.id, discussionsOptions).then((response) => {
                if (response.error) {
                    throw new Error('Failed getting discussions');
                }

                const promises: Promise<{ posts: AddonModForumPost[] }>[] = [];

                response.discussions.forEach((discussion) => {
                    promises.push(AddonModForum.getDiscussionPosts(discussion.discussion, options));
                });

                return Promise.all(promises);
            });
        });

        return Promise.all(promises).then((results) => {
            // Each order has returned its own list of posts. Merge all the lists, preventing duplicates.
            const posts: AddonModForumPost[] = [];
            const postIds = {}; // To make the array unique.

            results.forEach((orderResults) => {
                orderResults.forEach((orderResult) => {
                    orderResult.posts.forEach((post) => {
                        if (!postIds[post.id]) {
                            postIds[post.id] = true;
                            posts.push(post);
                        }
                    });
                });
            });

            return posts;
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID the module belongs to.
     * @return Promise resolved when the data is invalidated.
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
     * @return Promise resolved when invalidated.
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
        return this.prefetchPackage(module, courseId, this.prefetchForum.bind(this, module, courseId, single));
    }

    /**
     * Prefetch a forum.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param siteId Site ID.
     * @return Promise resolved when done.
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

        // Prefetch sort order preference.
        if (AddonModForum.isDiscussionListSortingAvailable()) {
            promises.push(CoreUser.getUserPreference(AddonModForumProvider.PREFERENCE_SORTORDER, siteId));
        }

        await Promise.all(promises);
    }

    /**
     * Prefetch groups info for a forum.
     *
     * @param module The module object returned by WS.
     * @param courseI Course ID the module belongs to.
     * @param canCreateDiscussions Whether the user can create discussions in the forum.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when group data has been prefetched.
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
                await CoreUtils.ignoreErrors(AddonModForum.canAddDiscussionToAll(forum.id, options));

                return;
            }

            // Activity uses groups, prefetch allowed groups.
            const result = await CoreGroups.getActivityAllowedGroups(forum.cmid, undefined, siteId);
            if (mode === CoreGroupsProvider.SEPARATEGROUPS) {
                // Groups are already filtered by WS. Prefetch canAddDiscussionToAll to determine if user can pin/attach.
                await CoreUtils.ignoreErrors(AddonModForum.canAddDiscussionToAll(forum.id, options));

                return;
            }

            if (canCreateDiscussions) {
                // Prefetch data to check the visible groups when creating discussions.
                const response = await CoreUtils.ignoreErrors(
                    AddonModForum.canAddDiscussionToAll(forum.id, options),
                    { status: false },
                );

                if (response.status) {
                    // User can post to all groups, nothing else to prefetch.
                    return;
                }

                // The user can't post to all groups, let's check which groups he can post to.
                await Promise.all(
                    result.groups.map(
                        async (group) => CoreUtils.ignoreErrors(
                            AddonModForum.canAddDiscussion(forum.id, group.id, options),
                        ),
                    ),
                );
            }
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
     * @return Promise resolved when done.
     */
    async sync(
        module: CoreCourseAnyModuleData,
        courseId: number,
        siteId?: string,
    ): Promise<AddonModForumSyncResult> {
        const promises: Promise<AddonModForumSyncResult>[] = [];

        promises.push(AddonModForumSync.syncForumDiscussions(module.instance!, undefined, siteId));
        promises.push(AddonModForumSync.syncForumReplies(module.instance!, undefined, siteId));
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

/**
 * Data returned by a forum sync.
 */
export type AddonModForumSyncResult = {
    warnings: string[]; // List of warnings.
    updated: boolean; // Whether some data was sent to the server or offline data was updated.
};
