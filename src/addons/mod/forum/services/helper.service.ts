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
import { CoreFileEntry, CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreUser } from '@features/user/services/user';
import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { makeSingleton, Translate } from '@singletons';
import {
    AddonModForum,
    AddonModForumAddDiscussionWSOptionsObject,
    AddonModForumData,
    AddonModForumDiscussion,
    AddonModForumPost,
    AddonModForumProvider,
} from './forum.service';
import { AddonModForumDiscussionOptions, AddonModForumOffline, AddonModForumOfflineReply } from './offline.service';

/**
 * Service that provides some features for forums.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumHelperProvider {

    /**
     * Add a new discussion.
     *
     * @param forumId Forum ID.
     * @param name Forum name.
     * @param courseId Course ID the forum belongs to.
     * @param subject New discussion's subject.
     * @param message New discussion's message.
     * @param attachments New discussion's attachments.
     * @param options Options (subscribe, pin, ...).
     * @param groupIds Groups this discussion belongs to.
     * @param timeCreated The time the discussion was created. Only used when editing discussion.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with ids of the created discussions or null if stored offline
     */
    async addNewDiscussion(
        forumId: number,
        name: string,
        courseId: number,
        subject: string,
        message: string,
        attachments?: CoreFileEntry[],
        options?: AddonModForumDiscussionOptions,
        groupIds?: number[],
        timeCreated?: number,
        siteId?: string,
    ): Promise<number[] | null> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();
        groupIds = (groupIds && groupIds.length > 0) ? groupIds : [0];

        let saveOffline = false;
        const attachmentsIds: number[] = [];
        let offlineAttachments: CoreFileUploaderStoreFilesResult;

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<void> => {
            // Multiple groups, the discussion is being posted to all groups.
            const groupId = groupIds!.length > 1 ? AddonModForumProvider.ALL_GROUPS : groupIds![0];

            if (offlineAttachments && options) {
                options.attachmentsid = offlineAttachments;
            }

            await AddonModForumOffline.instance.addNewDiscussion(
                forumId,
                name,
                courseId,
                subject,
                message,
                options,
                groupId,
                timeCreated,
                siteId,
            );
        };

        // First try to upload attachments, once per group.
        if (attachments && attachments.length > 0) {
            const promises = groupIds.map(
                () => this
                    .uploadOrStoreNewDiscussionFiles(forumId, timeCreated || 0, attachments, false)
                    .then(attach => attachmentsIds.push(attach)),
            );

            try {
                await Promise.all(promises);
            } catch (error) {
                // Cannot upload them in online, save them in offline.
                saveOffline = true;

                const attach = await this.uploadOrStoreNewDiscussionFiles(forumId, timeCreated || 0, attachments, true);

                offlineAttachments = attach;
            }
        }

        // If we are editing an offline discussion, discard previous first.
        if (timeCreated) {
            await AddonModForumOffline.instance.deleteNewDiscussion(forumId, timeCreated, siteId);
        }

        if (saveOffline || !CoreApp.instance.isOnline()) {
            await storeOffline();

            return null;
        }

        const errors: Error[] = [];
        const discussionIds: number[] = [];
        const promises = groupIds.map(async (groupId, index) => {
            const groupOptions = CoreUtils.instance.clone(options);

            if (groupOptions && attachmentsIds[index]) {
                groupOptions.attachmentsid = attachmentsIds[index];
            }

            try {
                const discussionId = await AddonModForum.instance.addNewDiscussionOnline(
                    forumId,
                    subject,
                    message,
                    groupOptions as unknown as AddonModForumAddDiscussionWSOptionsObject,
                    groupId,
                    siteId,
                );

                discussionIds.push(discussionId);
            } catch (error) {
                errors.push(error);
            }
        });

        await Promise.all(promises);

        if (errors.length == groupIds.length) {
            // All requests have failed.
            for (let i = 0; i < errors.length; i++) {
                if (CoreUtils.instance.isWebServiceError(errors[i]) || (attachments && attachments.length > 0)) {
                    // The WebService has thrown an error or offline not supported, reject.
                    throw errors[i];
                }
            }

            // Couldn't connect to server, store offline.
            await storeOffline();

            return null;
        }

        return discussionIds;
    }

    /**
     * Convert offline reply to online format in order to be compatible with them.
     *
     * @param offlineReply Offline version of the reply.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the object converted to Online.
     */
    convertOfflineReplyToOnline(offlineReply: AddonModForumOfflineReply, siteId?: string): Promise<AddonModForumPost> {
        const reply: AddonModForumPost = {
            id: -offlineReply.timecreated,
            discussionid: offlineReply.discussionid,
            parentid: offlineReply.postid,
            hasparent: !!offlineReply.postid,
            author: {
                id: offlineReply.userid,
            },
            timecreated: false,
            subject: offlineReply.subject,
            message: offlineReply.message,
            attachments: [],
            capabilities: {
                reply: false,
            },
            unread: false,
            isprivatereply: !!offlineReply.options?.private,
        };
        const promises: Promise<void>[] = [];

        // Treat attachments if any.
        if (offlineReply.options && offlineReply.options.attachmentsid) {
            const attachments = offlineReply.options.attachmentsid;

            reply.attachments = typeof attachments === 'object' && 'online' in attachments ? attachments.online : [];

            if (typeof attachments === 'object' && attachments.offline) {
                promises.push(
                    this
                        .getReplyStoredFiles(offlineReply.forumid, reply.parentid!, siteId, offlineReply.userid)
                        .then(files => {
                            reply.attachments = reply.attachments!.concat(files as unknown as []);

                            return;
                        }),
                );
            }
        }

        // Get user data.
        promises.push(
            CoreUtils.instance.ignoreErrors(
                CoreUser.instance
                    .getProfile(offlineReply.userid, offlineReply.courseid, true)
                    .then(user => {
                        reply.author.fullname = user.fullname;
                        reply.author.urls = { profileimage: user.profileimageurl };

                        return;
                    }),
            ),
        );

        return Promise.all(promises).then(() => {
            reply.attachment = reply.attachments!.length > 0 ? 1 : 0;

            return reply;
        });
    }

    /**
     * Delete stored attachment files for a new discussion.
     *
     * @param forumId Forum ID.
     * @param timecreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when deleted.
     */
    async deleteNewDiscussionStoredFiles(forumId: number, timecreated: number, siteId?: string): Promise<void> {
        const folderPath = await AddonModForumOffline.instance.getNewDiscussionFolder(forumId, timecreated, siteId);

        // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exist.
        await CoreUtils.instance.ignoreErrors(CoreFile.instance.removeDir(folderPath));
    }

    /**
     * Delete stored attachment files for a reply.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @return Promise resolved when deleted.
     */
    async deleteReplyStoredFiles(forumId: number, postId: number, siteId?: string, userId?: number): Promise<void> {
        const folderPath = await AddonModForumOffline.instance.getReplyFolder(forumId, postId, siteId, userId);

        // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exist.
        await CoreUtils.instance.ignoreErrors(CoreFile.instance.removeDir(folderPath));
    }

    /**
     * Returns the availability message of the given forum.
     *
     * @param forum Forum instance.
     * @return Message or null if the forum has no cut-off or due date.
     */
    getAvailabilityMessage(forum: AddonModForumData): string | null {
        if (this.isCutoffDateReached(forum)) {
            return Translate.instance.instant('addon.mod_forum.cutoffdatereached');
        }

        if (this.isDueDateReached(forum)) {
            const dueDate = CoreTimeUtils.instance.userDate(forum.duedate * 1000);

            return Translate.instance.instant('addon.mod_forum.thisforumisdue', { $a: dueDate });
        }

        if ((forum.duedate ?? 0) > 0) {
            const dueDate = CoreTimeUtils.instance.userDate(forum.duedate! * 1000);

            return Translate.instance.instant('addon.mod_forum.thisforumhasduedate', { $a: dueDate });
        }

        return null;
    }

    /**
     * Get a forum discussion by id.
     *
     * This function is inefficient because it needs to fetch all discussion pages in the worst case.
     *
     * @param forumId Forum ID.
     * @param cmId Forum cmid
     * @param discussionId Discussion ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the discussion data.
     */
    getDiscussionById(forumId: number, cmId: number, discussionId: number, siteId?: string): Promise<AddonModForumDiscussion> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        const findDiscussion = async (page: number): Promise<AddonModForumDiscussion> => {
            const response = await AddonModForum.instance.getDiscussions(forumId, {
                cmId,
                page,
                siteId,
            });

            if (response.discussions && response.discussions.length > 0) {
                // Note that discussion.id is the main post ID but discussion ID is discussion.discussion.
                const discussion = response.discussions.find((discussion) => discussion.discussion == discussionId);

                if (discussion) {
                    return discussion;
                }

                if (response.canLoadMore) {
                    return findDiscussion(page + 1);
                }
            }

            throw new Error('Discussion not found');
        };

        return findDiscussion(0);
    }

    /**
     * Get a list of stored attachment files for a new discussion. See AddonModForumHelper#storeNewDiscussionFiles.
     *
     * @param forumId Forum ID.
     * @param timecreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the files.
     */
    async getNewDiscussionStoredFiles(forumId: number, timecreated: number, siteId?: string): Promise<FileEntry[]> {
        const folderPath = await AddonModForumOffline.instance.getNewDiscussionFolder(forumId, timecreated, siteId);

        return CoreFileUploader.instance.getStoredFiles(folderPath);
    }

    /**
     * Get a list of stored attachment files for a reply. See AddonModForumHelper#storeReplyFiles.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @return Promise resolved with the files.
     */
    async getReplyStoredFiles(forumId: number, postId: number, siteId?: string, userId?: number): Promise<FileEntry[]> {
        const folderPath = await AddonModForumOffline.instance.getReplyFolder(forumId, postId, siteId, userId);

        return CoreFileUploader.instance.getStoredFiles(folderPath);
    }

    /**
     * Check if the data of a post/discussion has changed.
     *
     * @param post Current data.
     * @param original Original ata.
     * @return True if data has changed, false otherwise.
     */
    hasPostDataChanged(post: any, original?: any): boolean {
        if (!original || original.subject == null) {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        if (post.subject != original.subject || post.message != original.message) {
            return true;
        }

        if (post.isprivatereply != original.isprivatereply) {
            return true;
        }

        return CoreFileUploader.instance.areFileListDifferent(post.files, original.files);
    }

    /**
     * Is the cutoff date for the forum reached?
     *
     * @param forum Forum instance.
     */
    isCutoffDateReached(forum: AddonModForumData): boolean {
        const now = Date.now() / 1000;

        return !!forum.cutoffdate && forum.cutoffdate > 0 && forum.cutoffdate < now;
    }

    /**
     * Is the due date for the forum reached?
     *
     * @param forum Forum instance.
     */
    isDueDateReached(forum: AddonModForumData): forum is AddonModForumData & { duedate: number } {
        const now = Date.now() / 1000;
        const duedate = forum.duedate ?? 0;

        return duedate > 0 && duedate < now;
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param forumId Forum ID.
     * @param timecreated The time the discussion was created.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected otherwise.
     */
    async storeNewDiscussionFiles(
        forumId: number,
        timecreated: number,
        files: CoreFileEntry[],
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModForumOffline.instance.getNewDiscussionFolder(forumId, timecreated, siteId);

        return CoreFileUploader.instance.storeFilesToUpload(folderPath, files);
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @return Promise resolved if success, rejected otherwise.
     */
    async storeReplyFiles(forumId: number, postId: number, files: any[], siteId?: string, userId?: number): Promise<void> {
        // Get the folder where to store the files.
        const folderPath = await AddonModForumOffline.instance.getReplyFolder(forumId, postId, siteId, userId);

        await CoreFileUploader.instance.storeFilesToUpload(folderPath, files);
    }

    /**
     * Upload or store some files for a new discussion, depending if the user is offline or not.
     *
     * @param forumId Forum ID.
     * @param timecreated The time the discussion was created.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success.
     */
    uploadOrStoreNewDiscussionFiles(
        forumId: number,
        timecreated: number,
        files: CoreFileEntry[],
        offline: true,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult>;
    uploadOrStoreNewDiscussionFiles(
        forumId: number,
        timecreated: number,
        files: CoreFileEntry[],
        offline: false,
        siteId?: string,
    ): Promise<number>;
    uploadOrStoreNewDiscussionFiles(
        forumId: number,
        timecreated: number,
        files: CoreFileEntry[],
        offline: boolean,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult | number> {
        if (offline) {
            return this.storeNewDiscussionFiles(forumId, timecreated, files, siteId);
        } else {
            return CoreFileUploader.instance.uploadOrReuploadFiles(files, AddonModForumProvider.COMPONENT, forumId, siteId);
        }
    }

    /**
     * Upload or store some files for a reply, depending if the user is offline or not.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @return Promise resolved if success.
     */
    uploadOrStoreReplyFiles(
        forumId: number,
        postId: number,
        files: any[],
        offline: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<any> {
        if (offline) {
            return this.storeReplyFiles(forumId, postId, files, siteId, userId);
        } else {
            return CoreFileUploader.instance.uploadOrReuploadFiles(files, AddonModForumProvider.COMPONENT, forumId, siteId);
        }
    }

}

export class AddonModForumHelper extends makeSingleton(AddonModForumHelperProvider) {}
