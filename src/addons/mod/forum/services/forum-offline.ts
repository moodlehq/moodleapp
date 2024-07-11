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
import { CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreFile } from '@services/file';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { makeSingleton } from '@singletons';
import {
    AddonModForumOfflineDiscussionDBRecord,
    AddonModForumOfflineReplyDBRecord,
    DISCUSSIONS_TABLE,
    REPLIES_TABLE,
} from './database/offline';
import { CorePath } from '@singletons/path';
import { ADDON_MOD_FORUM_ALL_PARTICIPANTS } from '../constants';

/**
 * Service to handle offline forum.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumOfflineProvider {

    /**
     * Delete a forum offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteNewDiscussion(forumId: number, timeCreated: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            forumid: forumId,
            userid: userId || site.getUserId(),
            timecreated: timeCreated,
        };

        await site.getDb().deleteRecords(DISCUSSIONS_TABLE, conditions);
    }

    /**
     * Get a forum offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async getNewDiscussion(
        forumId: number,
        timeCreated: number,
        siteId?: string,
        userId?: number,
    ): Promise<AddonModForumOfflineDiscussion> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            forumid: forumId,
            userid: userId || site.getUserId(),
            timecreated: timeCreated,
        };

        const record = await site.getDb().getRecord<AddonModForumOfflineDiscussionDBRecord>(DISCUSSIONS_TABLE, conditions);

        return this.parseRecordOptions(record);
    }

    /**
     * Get all offline new discussions.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with discussions.
     */
    async getAllNewDiscussions(siteId?: string): Promise<AddonModForumOfflineDiscussion[]> {
        const site = await CoreSites.getSite(siteId);
        const records = await site.getDb().getRecords<AddonModForumOfflineDiscussionDBRecord>(DISCUSSIONS_TABLE);

        return this.parseRecordsOptions(records);
    }

    /**
     * Check if there are offline new discussions to send.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussions belong to. If not defined, current user in site.
     * @returns Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasNewDiscussions(forumId: number, siteId?: string, userId?: number): Promise<boolean> {
        try {
            const discussions = await this.getNewDiscussions(forumId, siteId, userId);

            return !!discussions.length;
        } catch (error) {
            // No offline data found, return false.

            return false;
        }
    }

    /**
     * Get new discussions to be synced.
     *
     * @param forumId Forum ID to get.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussions belong to. If not defined, current user in site.
     * @returns Promise resolved with the object to be synced.
     */
    async getNewDiscussions(forumId: number, siteId?: string, userId?: number): Promise<AddonModForumOfflineDiscussion[]> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            forumid: forumId,
            userid: userId || site.getUserId(),
        };

        const records = await site.getDb().getRecords<AddonModForumOfflineDiscussionDBRecord>(DISCUSSIONS_TABLE, conditions);

        return this.parseRecordsOptions(records);
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
     * @returns Promise resolved when new discussion is successfully saved.
     */
    async addNewDiscussion(
        forumId: number,
        name: string,
        courseId: number,
        subject: string,
        message: string,
        options?: AddonModForumDiscussionOptions,
        groupId?: number,
        timeCreated?: number,
        siteId?: string,
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const data: AddonModForumOfflineDiscussionDBRecord = {
            forumid: forumId,
            name: name,
            courseid: courseId,
            subject: subject,
            message: message,
            options: JSON.stringify(options || {}),
            groupid: groupId || ADDON_MOD_FORUM_ALL_PARTICIPANTS,
            userid: userId || site.getUserId(),
            timecreated: timeCreated || Date.now(),
        };

        await site.getDb().insertRecord(DISCUSSIONS_TABLE, data);
    }

    /**
     * Delete forum offline replies.
     *
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteReply(postId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            postid: postId,
            userid: userId || site.getUserId(),
        };

        await site.getDb().deleteRecords(REPLIES_TABLE, conditions);
    }

    /**
     * Get all offline replies.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with replies.
     */
    async getAllReplies(siteId?: string): Promise<AddonModForumOfflineReply[]> {
        const site = await CoreSites.getSite(siteId);
        const records = await site.getDb().getRecords<AddonModForumOfflineReplyDBRecord>(REPLIES_TABLE);

        return this.parseRecordsOptions(records);
    }

    /**
     * Check if there is an offline reply for a forum to be synced.
     *
     * @param forumId ID of the forum being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @returns Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasForumReplies(forumId: number, siteId?: string, userId?: number): Promise<boolean> {
        try {
            const replies = await this.getForumReplies(forumId, siteId, userId);

            return !!replies.length;
        } catch (error) {
            // No offline data found, return false.

            return false;
        }
    }

    /**
     * Get the replies of a forum to be synced.
     *
     * @param forumId ID of the forum being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @returns Promise resolved with replies.
     */
    async getForumReplies(forumId: number, siteId?: string, userId?: number): Promise<AddonModForumOfflineReply[]> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            forumid: forumId,
            userid: userId || site.getUserId(),
        };

        const records = await site.getDb().getRecords<AddonModForumOfflineReplyDBRecord>(REPLIES_TABLE, conditions);

        return this.parseRecordsOptions(records);
    }

    /**
     * Check if there is an offline reply to be synced.
     *
     * @param discussionId ID of the discussion the user is replying to.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @returns Promise resolved with boolean: true if has offline answers, false otherwise.
     */
    async hasDiscussionReplies(discussionId: number, siteId?: string, userId?: number): Promise<boolean> {
        try {
            const replies = await this.getDiscussionReplies(discussionId, siteId, userId);

            return !!replies.length;
        } catch (error) {
            // No offline data found, return false.

            return false;
        }
    }

    /**
     * Get the replies of a discussion to be synced.
     *
     * @param discussionId ID of the discussion the user is replying to.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @returns Promise resolved with discussions.
     */
    async getDiscussionReplies(discussionId: number, siteId?: string, userId?: number): Promise<AddonModForumOfflineReply[]> {
        const site = await CoreSites.getSite(siteId);
        const conditions = {
            discussionid: discussionId,
            userid: userId || site.getUserId(),
        };

        const records = await site.getDb().getRecords<AddonModForumOfflineReplyDBRecord>(REPLIES_TABLE, conditions);

        return this.parseRecordsOptions(records);
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
     * @returns Promise resolved when the post is created.
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
        userId?: number,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const data: AddonModForumOfflineReplyDBRecord = {
            postid: postId,
            discussionid: discussionId,
            forumid: forumId,
            name: name,
            courseid: courseId,
            subject: subject,
            message: message,
            options: JSON.stringify(options || {}),
            userid: userId || site.getUserId(),
            timecreated: Date.now(),
        };

        await site.getDb().insertRecord(REPLIES_TABLE, data);
    }

    /**
     * Get the path to the folder where to store files for offline attachments in a forum.
     *
     * @param forumId Forum ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getForumFolder(forumId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);
        const siteFolderPath = CoreFile.getSiteFolder(site.getId());

        return CorePath.concatenatePaths(siteFolderPath, 'offlineforum/' + forumId);
    }

    /**
     * Get the path to the folder where to store files for a new offline discussion.
     *
     * @param forumId Forum ID.
     * @param timeCreated The time the discussion was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the path.
     */
    async getNewDiscussionFolder(forumId: number, timeCreated: number, siteId?: string): Promise<string> {
        const folderPath = await this.getForumFolder(forumId, siteId);

        return CorePath.concatenatePaths(folderPath, 'newdisc_' + timeCreated);
    }

    /**
     * Get the path to the folder where to store files for a new offline reply.
     *
     * @param forumId Forum ID.
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the replies belong to. If not defined, current user in site.
     * @returns Promise resolved with the path.
     */
    async getReplyFolder(forumId: number, postId: number, siteId?: string, userId?: number): Promise<string> {
        const folderPath = await this.getForumFolder(forumId, siteId);
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        return CorePath.concatenatePaths(folderPath, 'reply_' + postId + '_' + userId);
    }

    /**
     * Parse "options" column of fetched record.
     *
     * @param records List of records.
     * @returns List of records with options parsed.
     */
    protected parseRecordsOptions<
        R extends { options: string },
        O extends Record<string, unknown> = Record<string, unknown>
    >(records: R[]): (Omit<R, 'options'> & { options: O })[] {
        return records.map(record => this.parseRecordOptions(record));
    }

    /**
     * Parse "options" column of fetched record.
     *
     * @param record Record.
     * @returns Record with options parsed.
     */
    protected parseRecordOptions<
        R extends { options: string },
        O extends Record<string, unknown> = Record<string, unknown>
    >(record: R): Omit<R, 'options'> & { options: O } {
        record.options = CoreTextUtils.parseJSON(record.options);

        return record as unknown as Omit<R, 'options'> & { options: O };
    }

}

export const AddonModForumOffline = makeSingleton(AddonModForumOfflineProvider);

export type AddonModForumDiscussionOptions = {
    attachmentsid?: number | CoreFileUploaderStoreFilesResult;
    discussionsubscribe?: boolean;
    discussionpinned?: boolean;
};

export type AddonModForumReplyOptions = {
    private?: boolean;
    attachmentsid?: number | CoreFileUploaderStoreFilesResult;
};

export type AddonModForumOfflineDiscussion = {
    forumid: number;
    name: string;
    courseid: number;
    subject: string;
    message: string;
    options: AddonModForumDiscussionOptions;
    groupid: number;
    groupname?: string;
    userid: number;
    timecreated: number;
};
export type AddonModForumOfflineReply = {
    postid: number;
    discussionid: number;
    forumid: number;
    name: string;
    courseid: number;
    subject: string;
    message: string;
    options: AddonModForumReplyOptions;
    userid: number;
    timecreated: number;
};
