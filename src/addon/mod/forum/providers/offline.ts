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
import { CoreFileProvider } from '@providers/file';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { AddonModForumProvider } from './forum';

/**
 * Service to handle offline forum.
 */
@Injectable()
export class AddonModForumOfflineProvider {

    // Variables for database.
    static DISCUSSIONS_TABLE = 'addon_mod_forum_discussions';
    static REPLIES_TABLE = 'addon_mod_forum_replies';

    protected siteSchema: CoreSiteSchema = {
        name: 'AddonModForumOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonModForumOfflineProvider.DISCUSSIONS_TABLE,
                columns: [
                    {
                        name: 'forumid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'name',
                        type: 'TEXT',
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'subject',
                        type: 'TEXT',
                    },
                    {
                        name: 'message',
                        type: 'TEXT',
                    },
                    {
                        name: 'options',
                        type: 'TEXT',
                    },
                    {
                        name: 'groupid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                    }
                ],
                primaryKeys: ['forumid', 'userid', 'timecreated']
            },
            {
                name: AddonModForumOfflineProvider.REPLIES_TABLE,
                columns: [
                    {
                        name: 'postid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'discussionid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'forumid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'name',
                        type: 'TEXT',
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'subject',
                        type: 'TEXT',
                    },
                    {
                        name: 'message',
                        type: 'TEXT',
                    },
                    {
                        name: 'options',
                        type: 'TEXT',
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER',
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER',
                    }
                ],
                primaryKeys: ['postid', 'userid']
            }
        ]
    };

    constructor(private fileProvider: CoreFileProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a forum offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @return Promise resolved if stored, rejected if failure.
     */
    deleteNewDiscussion(forumId: number, timeCreated: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                forumid: forumId,
                userid: userId || site.getUserId(),
                timecreated: timeCreated,
            };

            return site.getDb().deleteRecords(AddonModForumOfflineProvider.DISCUSSIONS_TABLE, conditions);
        });
    }

    /**
     * Get a forum offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @return Promise resolved if stored, rejected if failure.
     */
    getNewDiscussion(forumId: number, timeCreated: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                forumid: forumId,
                userid: userId || site.getUserId(),
                timecreated: timeCreated,
            };

            return site.getDb().getRecord(AddonModForumOfflineProvider.DISCUSSIONS_TABLE, conditions).then((record) => {
                record.options = this.textUtils.parseJSON(record.options);

                return record;
            });
        });
    }

    /**
     * Get all offline new discussions.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with discussions.
     */
    getAllNewDiscussions(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModForumOfflineProvider.DISCUSSIONS_TABLE).then(this.parseRecordOptions.bind(this));
        });
    }

    /**
     * Check if there are offline new discussions to send.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussions belong to. If not defined, current user in site.
     * @return Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasNewDiscussions(forumId: number, siteId?: string, userId?: number): Promise<boolean> {
        return this.getNewDiscussions(forumId, siteId, userId).then((discussions) => {
            return !!discussions.length;
        }).catch(() => {
            // No offline data found, return false.
            return false;
        });
    }

    /**
     * Get new discussions to be synced.
     *
     * @param forumId Forum ID to get.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussions belong to. If not defined, current user in site.
     * @return Promise resolved with the object to be synced.
     */
    getNewDiscussions(forumId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                forumid: forumId,
                userid: userId || site.getUserId(),
            };

            return site.getDb().getRecords(AddonModForumOfflineProvider.DISCUSSIONS_TABLE, conditions)
                    .then(this.parseRecordOptions.bind(this));
        });
    }

    /**
     * Offline version for adding a new discussion to a forum.
     *
     * @param forumId Forum ID.
     * @param name Forum name.
     * @param courseId Course ID the forum belongs to.
     * @param subject New discussion's subject.
     * @param message New discussion's message.
     * @param options Options (subscribe, pin, ...).
     * @param groupId Group this discussion belongs to.
     * @param timeCreated The time the discussion was created. If not defined, current time.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belong to. If not defined, current user in site.
     * @return Promise resolved when new discussion is successfully saved.
     */
    addNewDiscussion(forumId: number, name: string, courseId: number, subject: string, message: string, options?: any,
            groupId?: number, timeCreated?: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                forumid: forumId,
                name: name,
                courseid: courseId,
                subject: subject,
                message: message,
                options: JSON.stringify(options || {}),
                groupid: groupId || AddonModForumProvider.ALL_PARTICIPANTS,
                userid: userId || site.getUserId(),
                timecreated: timeCreated || new Date().getTime()
            };

            return site.getDb().insertRecord(AddonModForumOfflineProvider.DISCUSSIONS_TABLE, data);
        });
    }

    /**
     * Delete forum offline replies.
     *
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @return Promise resolved if stored, rejected if failure.
     */
    deleteReply(postId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                postid: postId,
                userid: userId || site.getUserId(),
            };

            return site.getDb().deleteRecords(AddonModForumOfflineProvider.REPLIES_TABLE, conditions);
        });
    }

    /**
     * Get all offline replies.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with replies.
     */
    getAllReplies(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonModForumOfflineProvider.REPLIES_TABLE).then(this.parseRecordOptions.bind(this));
        });
    }

    /**
     * Check if there is an offline reply for a forum to be synced.
     *
     * @param forumId ID of the forum being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @return Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasForumReplies(forumId: number, siteId?: string, userId?: number): Promise<boolean> {
        return this.getForumReplies(forumId, siteId, userId).then((replies) => {
            return !!replies.length;
        }).catch(() => {
            // No offline data found, return false.
            return false;
        });
    }

    /**
     * Get the replies of a forum to be synced.
     *
     * @param forumId ID of the forum being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @return Promise resolved with replies.
     */
    getForumReplies(forumId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                forumid: forumId,
                userid: userId || site.getUserId(),
            };

            return site.getDb().getRecords(AddonModForumOfflineProvider.REPLIES_TABLE, conditions)
                    .then(this.parseRecordOptions.bind(this));
        });
    }

    /**
     * Check if there is an offline reply to be synced.
     *
     * @param discussionId ID of the discussion the user is replying to.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @return Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    hasDiscussionReplies(discussionId: number, siteId?: string, userId?: number): Promise<boolean> {
        return this.getDiscussionReplies(discussionId, siteId, userId).then((replies) => {
            return !!replies.length;
        }).catch(() => {
            // No offline data found, return false.
            return false;
        });
    }

    /**
     * Get the replies of a discussion to be synced.
     *
     * @param discussionId ID of the discussion the user is replying to.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @return Promise resolved with discussions.
     */
    getDiscussionReplies(discussionId: number, siteId?: string, userId?: number): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions = {
                discussionid: discussionId,
                userid: userId || site.getUserId(),
            };

            return site.getDb().getRecords(AddonModForumOfflineProvider.REPLIES_TABLE, conditions)
                    .then(this.parseRecordOptions.bind(this));
        });
    }

    /**
     * Offline version for replying to a certain post.
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
     * @param userId User the post belong to. If not defined, current user in site.
     * @return Promise resolved when the post is created.
     */
    replyPost(postId: number, discussionId: number, forumId: number, name: string, courseId: number, subject: string,
            message: string, options?: any, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                postid: postId,
                discussionid: discussionId,
                forumid: forumId,
                name: name,
                courseid: courseId,
                subject: subject,
                message: message,
                options: JSON.stringify(options || {}),
                userid: userId || site.getUserId(),
                timecreated: new Date().getTime()
            };

            return site.getDb().insertRecord(AddonModForumOfflineProvider.REPLIES_TABLE, data);
        });
    }

    /**
     * Get the path to the folder where to store files for offline attachments in a forum.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the path.
     */
    getForumFolder(forumId: number, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const siteFolderPath = this.fileProvider.getSiteFolder(site.getId());

            return this.textUtils.concatenatePaths(siteFolderPath, 'offlineforum/' + forumId);
        });
    }

    /**
     * Get the path to the folder where to store files for a new offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the path.
     */
    getNewDiscussionFolder(forumId: number, timeCreated: number, siteId?: string): Promise<string> {
        return this.getForumFolder(forumId, siteId).then((folderPath) => {
            return this.textUtils.concatenatePaths(folderPath, 'newdisc_' + timeCreated);
        });
    }

    /**
     * Get the path to the folder where to store files for a new offline reply.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @return Promise resolved with the path.
     */
    getReplyFolder(forumId: number, postId: number, siteId?: string, userId?: number): Promise<string> {
        return this.getForumFolder(forumId, siteId).then((folderPath) => {
            return this.sitesProvider.getSite(siteId).then((site) => {
                userId = userId || site.getUserId();

                return this.textUtils.concatenatePaths(folderPath, 'reply_' + postId + '_' + userId);
            });
        });
    }

    /**
     * Parse "options" column of fetched records.
     *
     * @param records List of records.
     * @return List of records with options parsed.
     */
    protected parseRecordOptions(records: any[]): any[] {
        records.forEach((record) => {
            record.options = this.textUtils.parseJSON(record.options);
        });

        return records;
    }
}
