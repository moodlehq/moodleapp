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
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonModForumProvider } from './forum';
import { AddonModForumOfflineProvider } from './offline';

/**
 * Service that provides some features for forums.
 */
@Injectable()
export class AddonModForumHelperProvider {
    constructor(private translate: TranslateService,
            private fileProvider: CoreFileProvider,
            private sitesProvider: CoreSitesProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private timeUtils: CoreTimeUtilsProvider,
            private userProvider: CoreUserProvider,
            private appProvider: CoreAppProvider,
            private utils: CoreUtilsProvider,
            private forumProvider: AddonModForumProvider,
            private forumOffline: AddonModForumOfflineProvider) {}

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
    addNewDiscussion(forumId: number, name: string, courseId: number, subject: string, message: string, attachments?: any[],
            options?: any, groupIds?: number[], timeCreated?: number, siteId?: string): Promise<number[]> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();
        groupIds = groupIds && groupIds.length > 0 ? groupIds : [0];

        let saveOffline = false;
        const attachmentsIds = [];
        let offlineAttachments: any;

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<number[]> => {
            // Multiple groups, the discussion is being posted to all groups.
            const groupId = groupIds.length > 1 ? AddonModForumProvider.ALL_GROUPS : groupIds[0];

            if (offlineAttachments) {
                options.attachmentsid = offlineAttachments;
            }

            return this.forumOffline.addNewDiscussion(forumId, name, courseId, subject, message, options,
                    groupId, timeCreated, siteId).then(() => {
                return null;
            });
        };

        // First try to upload attachments, once per group.
        let promise;
        if (attachments && attachments.length > 0) {
            const promises = groupIds.map(() => {
                return this.uploadOrStoreNewDiscussionFiles(forumId, timeCreated, attachments, false).then((attach) => {
                    attachmentsIds.push(attach);
                });
            });

            promise = Promise.all(promises).catch(() => {
                // Cannot upload them in online, save them in offline.
                saveOffline = true;

                return this.uploadOrStoreNewDiscussionFiles(forumId, timeCreated, attachments, true).then((attach) => {
                    offlineAttachments = attach;
                });
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // If we are editing an offline discussion, discard previous first.
            let discardPromise;
            if (timeCreated) {
                discardPromise = this.forumOffline.deleteNewDiscussion(forumId, timeCreated, siteId);
            } else {
                discardPromise = Promise.resolve();
            }

            return discardPromise.then(() => {
                if (saveOffline || !this.appProvider.isOnline()) {
                    return storeOffline();
                }

                const errors = [];
                const discussionIds = [];

                const promises = groupIds.map((groupId, index) => {
                    const grouOptions = this.utils.clone(options);
                    if (attachmentsIds[index]) {
                        grouOptions.attachmentsid = attachmentsIds[index];
                    }

                    return this.forumProvider.addNewDiscussionOnline(forumId, subject, message, grouOptions, groupId, siteId)
                            .then((discussionId) => {
                        discussionIds.push(discussionId);
                    }).catch((error) => {
                        errors.push(error);
                    });
                });

                return Promise.all(promises).then(() => {
                    if (errors.length == groupIds.length) {
                        // All requests have failed.
                        for (let i = 0; i < errors.length; i++) {
                            if (this.utils.isWebServiceError(errors[i]) || attachments.length > 0) {
                                // The WebService has thrown an error or offline not supported, reject.
                                return Promise.reject(errors[i]);
                            }
                        }

                        // Couldn't connect to server, store offline.
                        return storeOffline();
                    }

                    return discussionIds;
                });
            });
        });
    }

    /**
     * Convert offline reply to online format in order to be compatible with them.
     *
     * @param offlineReply Offline version of the reply.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the object converted to Online.
     */
    convertOfflineReplyToOnline(offlineReply: any, siteId?: string): Promise<any> {
        const reply: any = {
                attachments: [],
                canreply: false,
                children: [],
                created: offlineReply.timecreated,
                discussion: offlineReply.discussionid,
                id: false,
                mailed: 0,
                mailnow: 0,
                message: offlineReply.message,
                messageformat: 1,
                messagetrust: 0,
                modified: false,
                parent: offlineReply.postid,
                postread: false,
                subject: offlineReply.subject,
                totalscore: 0,
                userid: offlineReply.userid,
                isprivatereply: offlineReply.options && offlineReply.options.private
            },
            promises = [];

        // Treat attachments if any.
        if (offlineReply.options && offlineReply.options.attachmentsid) {
            reply.attachments = offlineReply.options.attachmentsid.online || [];

            if (offlineReply.options.attachmentsid.offline) {
                promises.push(this.getReplyStoredFiles(offlineReply.forumid, reply.parent, siteId, reply.userid)
                            .then((files) => {
                    reply.attachments = reply.attachments.concat(files);
                }));
            }
        }

        // Get user data.
        promises.push(this.userProvider.getProfile(offlineReply.userid, offlineReply.courseid, true).then((user) => {
            reply.userfullname = user.fullname;
            reply.userpictureurl = user.profileimageurl;
        }).catch(() => {
            // Ignore errors.
        }));

        return Promise.all(promises).then(() => {
            reply.attachment = reply.attachments.length > 0 ? 1 : 0;

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
    deleteNewDiscussionStoredFiles(forumId: number, timecreated: number, siteId?: string): Promise<any> {
        return this.forumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        });
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
    deleteReplyStoredFiles(forumId: number, postId: number, siteId?: string, userId?: number): Promise<any> {
        return this.forumOffline.getReplyFolder(forumId, postId, siteId, userId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath).catch(() => {
                // Ignore any errors, CoreFileProvider.removeDir fails if folder doesn't exists.
            });
        });
    }

    /**
     * Returns the availability message of the given forum.
     *
     * @param forum Forum instance.
     * @return Message or null if the forum has no cut-off or due date.
     */
    getAvailabilityMessage(forum: any): string {
        if (this.isCutoffDateReached(forum)) {
            return this.translate.instant('addon.mod_forum.cutoffdatereached');
        } else if (this.isDueDateReached(forum)) {
            const dueDate = this.timeUtils.userDate(forum.duedate * 1000);

            return this.translate.instant('addon.mod_forum.thisforumisdue', {$a: dueDate});
        } else if (forum.duedate > 0) {
            const dueDate = this.timeUtils.userDate(forum.duedate * 1000);

            return this.translate.instant('addon.mod_forum.thisforumhasduedate', {$a: dueDate});
        } else {
            return null;
        }
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
    getDiscussionById(forumId: number, cmId: number, discussionId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const findDiscussion = (page: number): Promise<any> => {
            return this.forumProvider.getDiscussions(forumId, cmId, undefined, page, false, siteId).then((response) => {
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

                return Promise.reject(null);
            });
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
    getNewDiscussionStoredFiles(forumId: number, timecreated: number, siteId?: string): Promise<any[]> {
        return this.forumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then((folderPath) => {
            return this.uploaderProvider.getStoredFiles(folderPath);
        });
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
    getReplyStoredFiles(forumId: number, postId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.forumOffline.getReplyFolder(forumId, postId, siteId, userId).then((folderPath) => {
            return this.uploaderProvider.getStoredFiles(folderPath);
        });
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

        return this.uploaderProvider.areFileListDifferent(post.files, original.files);
    }

    /**
     * Is the cutoff date for the forum reached?
     *
     * @param forum Forum instance.
     */
    isCutoffDateReached(forum: any): boolean {
        const now = Date.now() / 1000;

        return forum.cutoffdate > 0 && forum.cutoffdate < now;
    }

    /**
     * Is the due date for the forum reached?
     *
     * @param forum Forum instance.
     */
    isDueDateReached(forum: any): boolean {
        const now = Date.now() / 1000;

        return forum.duedate > 0 && forum.duedate < now;
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
    storeNewDiscussionFiles(forumId: number, timecreated: number, files: any[], siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.forumOffline.getNewDiscussionFolder(forumId, timecreated, siteId).then((folderPath) => {
            return this.uploaderProvider.storeFilesToUpload(folderPath, files);
        });
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
    storeReplyFiles(forumId: number, postId: number, files: any[], siteId?: string, userId?: number): Promise<any> {
        // Get the folder where to store the files.
        return this.forumOffline.getReplyFolder(forumId, postId, siteId, userId).then((folderPath) => {
            return this.uploaderProvider.storeFilesToUpload(folderPath, files);
        });
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
    uploadOrStoreNewDiscussionFiles(forumId: number, timecreated: number, files: any[], offline: boolean, siteId?: string)
            : Promise<any> {
        if (offline) {
            return this.storeNewDiscussionFiles(forumId, timecreated, files, siteId);
        } else {
            return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModForumProvider.COMPONENT, forumId, siteId);
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
    uploadOrStoreReplyFiles(forumId: number, postId: number, files: any[], offline: boolean, siteId?: string, userId?: number)
            : Promise<any> {
        if (offline) {
            return this.storeReplyFiles(forumId, postId, files, siteId, userId);
        } else {
            return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModForumProvider.COMPONENT, forumId, siteId);
        }
    }
}
