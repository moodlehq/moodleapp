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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseActivityPrefetchHandlerBase } from '@core/course/classes/activity-prefetch-handler';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModForumProvider } from './forum';

/**
 * Handler to prefetch forums.
 */
@Injectable()
export class AddonModForumPrefetchHandler extends CoreCourseActivityPrefetchHandlerBase {
    name = 'AddonModForum';
    modName = 'forum';
    component = AddonModForumProvider.COMPONENT;
    updatesNames = /^configuration$|^.*files$|^discussions$/;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            utils: CoreUtilsProvider,
            courseProvider: CoreCourseProvider,
            filepoolProvider: CoreFilepoolProvider,
            sitesProvider: CoreSitesProvider,
            domUtils: CoreDomUtilsProvider,
            private groupsProvider: CoreGroupsProvider,
            private userProvider: CoreUserProvider,
            private forumProvider: AddonModForumProvider) {

        super(translate, appProvider, utils, courseProvider, filepoolProvider, sitesProvider, domUtils);
    }

    /**
     * Get list of files. If not defined, we'll assume they're in module.contents.
     *
     * @param {any} module Module.
     * @param {Number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @return {Promise<any[]>} Promise resolved with the list of files.
     */
    getFiles(module: any, courseId: number, single?: boolean): Promise<any[]> {
        return this.forumProvider.getForum(courseId, module.id).then((forum) => {
            const files = this.getIntroFilesFromInstance(module, forum);

            // Get posts.
            return this.getPostsForPrefetch(forum.id).then((posts) => {
                // Add posts attachments and embedded files.
                return files.concat(this.getPostsFiles(posts));
            });
        }).catch(() => {
            // Forum not found, return empty list.
            return [];
        });
    }

    /**
     * Given a list of forum posts, return a list with all the files (attachments and embedded files).
     *
     * @param {any[]} posts Forum posts.
     * @return {any[]} Files.
     */
    protected getPostsFiles(posts: any[]): any[] {
        let files = [];

        posts.forEach((post) => {
            if (post.attachments && post.attachments.length) {
                files = files.concat(post.attachments);
            }
            if (post.message) {
                files = files.concat(this.domUtils.extractDownloadableFilesFromHtmlAsFakeFileObjects(post.message));
            }
        });

        return files;
    }

    /**
     * Get the posts to be prefetched.
     *
     * @param {number} forumId Forum ID
     * @return {Promise<any[]>} Promise resolved with array of posts.
     */
    protected getPostsForPrefetch(forumId: number): Promise<any[]> {
        // Get discussions in first 2 pages.
        return this.forumProvider.getDiscussionsInPages(forumId, false, 2).then((response) => {
            if (response.error) {
                return Promise.reject(null);
            }

            const promises = [];
            let posts = [];

            response.discussions.forEach((discussion) => {
                promises.push(this.forumProvider.getDiscussionPosts(discussion.discussion).then((ps) => {
                    posts = posts.concat(ps);
                }));
            });

            return Promise.all(promises).then(() => {
                return posts;
            });
        });
    }

    /**
     * Invalidate the prefetched content.
     *
     * @param {number} moduleId The module ID.
     * @param {number} courseId The course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<any> {
        return this.forumProvider.invalidateContent(moduleId, courseId);
    }

    /**
     * Prefetch a module.
     *
     * @param {any} module Module.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} [single] True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} [dirPath] Path of the directory where to store all the content files.
     * @return {Promise<any>} Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any> {
        return this.prefetchPackage(module, courseId, single, this.prefetchForum.bind(this));
    }

    /**
     * Prefetch a forum.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseId Course ID the module belongs to.
     * @param {boolean} single True if we're downloading a single module, false if we're downloading a whole section.
     * @param {string} siteId Site ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected prefetchForum(module: any, courseId: number, single: boolean, siteId: string): Promise<any> {
        // Get the forum data.
        return this.forumProvider.getForum(courseId, module.id).then((forum) => {
            // Prefetch the posts.
            return this.getPostsForPrefetch(forum.id).then((posts) => {
                const promises = [];

                // Prefetch user profiles.
                const userIds = posts.map((post) => post.userid).filter((userId) => !!userId);
                promises.push(this.userProvider.prefetchProfiles(userIds).catch(() => {
                    // Ignore failures.
                }));

                // Prefetch intro files, attachments and embedded files.
                const files = this.getIntroFilesFromInstance(module, forum).concat(this.getPostsFiles(posts));
                promises.push(this.filepoolProvider.addFilesToQueue(siteId, files, this.component, module.id));

                // Prefetch groups data.
                promises.push(this.prefetchGroupsInfo(forum, courseId, forum.cancreatediscussions));

                return Promise.all(promises);
            });
        });
    }

    /**
     * Prefetch groups info for a forum.
     *
     * @param {any} module The module object returned by WS.
     * @param {number} courseI Course ID the module belongs to.
     * @param {boolean} canCreateDiscussions Whether the user can create discussions in the forum.
     * @return {Promise<any>} Promise resolved when group data has been prefetched.
     */
    protected prefetchGroupsInfo(forum: any, courseId: number, canCreateDiscussions: boolean): any {
        // Check group mode.
        return this.groupsProvider.getActivityGroupMode(forum.cmid).then((mode) => {
            if (mode !== CoreGroupsProvider.SEPARATEGROUPS && mode !== CoreGroupsProvider.VISIBLEGROUPS) {
                // Activity doesn't use groups. Prefetch canAddDiscussionToAll to determine if user can pin/attach.
                return this.forumProvider.canAddDiscussionToAll(forum.id).catch(() => {
                        // Ignore errors.
                });
            }

            // Activity uses groups, prefetch allowed groups.
            return this.groupsProvider.getActivityAllowedGroups(forum.cmid).then((groups) => {
                if (mode === CoreGroupsProvider.SEPARATEGROUPS) {
                    // Groups are already filtered by WS. Prefetch canAddDiscussionToAll to determine if user can pin/attach.
                    return this.forumProvider.canAddDiscussionToAll(forum.id).catch(() => {
                        // Ignore errors.
                    });
                }

                if (canCreateDiscussions) {
                    // Prefetch data to check the visible groups when creating discussions.
                    return this.forumProvider.canAddDiscussionToAll(forum.id).catch(() => {
                        // The call failed, let's assume he can't.
                        return {
                            status: false
                        };
                    }).then((response) => {
                        if (response.status) {
                            // User can post to all groups, nothing else to prefetch.
                            return;
                        }

                        // The user can't post to all groups, let's check which groups he can post to.
                        const groupPromises = [];
                        groups.forEach((group) => {
                            groupPromises.push(this.forumProvider.canAddDiscussion(forum.id, group.id).catch(() => {
                                // Ignore errors.
                            }));
                        });

                        return Promise.all(groupPromises);
                    });
                }
            });
        }).catch((error) => {
            // Ignore errors if cannot create discussions.
            if (canCreateDiscussions) {
                return Promise.reject(error);
            }
        });
    }
}
