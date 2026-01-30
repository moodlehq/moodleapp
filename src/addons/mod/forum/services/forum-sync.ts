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

import { ContextLevel } from '@/core/constants';
import { Injectable } from '@angular/core';
import { CoreCourseActivitySyncBaseProvider } from '@features/course/classes/activity-sync';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreFileUploader } from '@features/fileuploader/services/fileuploader';
import { CoreRatingSync } from '@features/rating/services/rating-sync';
import { CoreNetwork } from '@services/network';
import { CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreSync, CoreSyncResult } from '@services/sync';
import { CoreUtils } from '@static/utils';
import { makeSingleton, Translate } from '@singletons';
import { CoreEvents } from '@static/events';
import {
    AddonModForum,
    AddonModForumAddDiscussionPostWSOptionsObject,
    AddonModForumAddDiscussionWSOptionsObject,
} from './forum';
import { AddonModForumHelper } from './forum-helper';
import { AddonModForumOffline, AddonModForumOfflineDiscussion, AddonModForumOfflineReply } from './forum-offline';
import {
    ADDON_MOD_FORUM_ALL_GROUPS,
    ADDON_MOD_FORUM_AUTO_SYNCED,
    ADDON_MOD_FORUM_COMPONENT,
    ADDON_MOD_FORUM_COMPONENT_LEGACY,
    ADDON_MOD_FORUM_MANUAL_SYNCED,
} from '../constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreWSError } from '@classes/errors/wserror';

declare module '@static/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MOD_FORUM_AUTO_SYNCED]: AddonModForumAutoSyncData;
        [ADDON_MOD_FORUM_MANUAL_SYNCED]: AddonModForumManualSyncData;
    }

}

/**
 * Service to sync forums.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumSyncProvider extends CoreCourseActivitySyncBaseProvider<AddonModForumSyncResult> {

    protected componentTranslatableString = 'forum';

    constructor() {
        super('AddonModForumSyncProvider');
    }

    /**
     * Try to synchronize all the forums in a certain site or in all sites.
     *
     * @param siteId Site ID to sync. If not defined, sync all sites.
     * @param force Wether to force sync not depending on last execution.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    async syncAllForums(siteId?: string, force?: boolean): Promise<void> {
        await this.syncOnSites('all forums', (siteId) => this.syncAllForumsFunc(!!force, siteId), siteId);
    }

    /**
     * Sync all forums on a site.
     *
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID to sync.
     * @returns Promise resolved if sync is successful, rejected if sync fails.
     */
    protected async syncAllForumsFunc(force: boolean, siteId: string): Promise<void> {
        const sitePromises: Promise<unknown>[] = [];

        // Sync all new discussions.
        const syncDiscussions = async (discussions: AddonModForumOfflineDiscussion[]) => {
            // Do not sync same forum twice.
            const syncedForumIds: number[] = [];
            const promises = discussions.map(async discussion => {
                if (syncedForumIds.includes(discussion.forumid)) {
                    return;
                }

                syncedForumIds.push(discussion.forumid);
                const result = force
                    ? await this.syncForumDiscussions(discussion.forumid, discussion.userid, siteId)
                    : await this.syncForumDiscussionsIfNeeded(discussion.forumid, discussion.userid, siteId);

                if (result && result.updated) {
                    // Sync successful, send event.
                    CoreEvents.trigger(ADDON_MOD_FORUM_AUTO_SYNCED, {
                        forumId: discussion.forumid,
                        userId: discussion.userid,
                        warnings: result.warnings,
                    }, siteId);
                }
            });

            await Promise.all(Object.values(promises));
        };

        sitePromises.push(
            AddonModForumOffline.instance
                .getAllNewDiscussions(siteId)
                .then(discussions => syncDiscussions(discussions)),
        );

        // Sync all discussion replies.
        const syncReplies = async (replies: AddonModForumOfflineReply[]) => {
            // Do not sync same discussion twice.
            const syncedDiscussionIds: number[] = [];
            const promises = replies.map(async reply => {
                if (syncedDiscussionIds.includes(reply.discussionid)) {
                    return;
                }

                syncedDiscussionIds.push(reply.discussionid);

                const result = force
                    ? await this.syncDiscussionReplies(reply.discussionid, reply.userid, siteId)
                    : await this.syncDiscussionRepliesIfNeeded(reply.discussionid, reply.userid, siteId);

                if (result && result.updated) {
                    // Sync successful, send event.
                    CoreEvents.trigger(ADDON_MOD_FORUM_AUTO_SYNCED, {
                        forumId: reply.forumid,
                        discussionId: reply.discussionid,
                        userId: reply.userid,
                        warnings: result.warnings,
                    }, siteId);
                }
            });

            await Promise.all(promises);
        };

        sitePromises.push(
            AddonModForumOffline.instance
                .getAllReplies(siteId)
                .then(replies => syncReplies(replies)),
        );

        // Sync ratings.
        sitePromises.push(this.syncRatings(undefined, undefined, force, siteId));

        await Promise.all(sitePromises);
    }

    /**
     * Sync a forum only if a certain time has passed since the last time.
     *
     * @param forumId Forum ID.
     * @param userId User the discussion belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the forum is synced or if it doesn't need to be synced.
     */
    async syncForumDiscussionsIfNeeded(
        forumId: number,
        userId: number,
        siteId?: string,
    ): Promise<AddonModForumSyncResult | void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getForumSyncId(forumId, userId);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncForumDiscussions(forumId, userId, siteId);
        }
    }

    /**
     * Synchronize all offline discussions of a forum.
     *
     * @param forumId Forum ID to be synced.
     * @param userId User the discussions belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncForumDiscussions(
        forumId: number,
        userId?: number,
        siteId?: string,
    ): Promise<AddonModForumSyncResult> {
        userId = userId || CoreSites.getCurrentSiteUserId();
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getForumSyncId(forumId, userId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        // Verify that forum isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_FORUM_COMPONENT, syncId, siteId)) {
            this.logger.debug(`Cannot sync forum ${forumId} because it is blocked.`);

            throw new Error(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync forum ${forumId} for user ${userId}`);

        const result: AddonModForumSyncResult = {
            warnings: [],
            updated: false,
        };

        // Sync offline logs.
        const syncDiscussions = async (): Promise<AddonModForumSyncResult> => {
            await CorePromiseUtils.ignoreErrors(
                CoreCourseLogHelper.syncActivity(ADDON_MOD_FORUM_COMPONENT_LEGACY, forumId, siteId),
            );

            // Get offline responses to be sent.
            const discussions = await CorePromiseUtils.ignoreErrors(
                AddonModForumOffline.getNewDiscussions(forumId, siteId, userId),
                [] as AddonModForumOfflineDiscussion[],
            );

            if (discussions.length !== 0 && !CoreNetwork.isOnline()) {
                throw new Error('cannot sync in offline');
            }

            const promises = discussions.map(async discussion => {
                const errors: Error[] = [];
                const groupIds = discussion.groupid === ADDON_MOD_FORUM_ALL_GROUPS
                    ? await AddonModForum.instance
                        .getForumById(discussion.courseid, discussion.forumid, { siteId })
                        .then(forum => CoreGroups.getActivityAllowedGroups(forum.cmid))
                        .then(result => result.groups.map((group) => group.id))
                    : [discussion.groupid];

                await Promise.all(groupIds.map(async groupId => {
                    try {
                        // First of all upload the attachments (if any).
                        const itemId = await this.uploadAttachments(forumId, discussion, true, siteId, userId);

                        // Now try to add the discussion.
                        const options = CoreUtils.clone(discussion.options || {});
                        options.attachmentsid = itemId!;

                        await AddonModForum.addNewDiscussionOnline(
                            forumId,
                            discussion.subject,
                            discussion.message,
                            options as unknown as AddonModForumAddDiscussionWSOptionsObject,
                            groupId,
                            siteId,
                        );
                    } catch (error) {
                        errors.push(error);
                    }
                }));

                if (errors.length === groupIds.length) {
                    // All requests have failed, reject if errors were not returned by WS.
                    for (const error of errors) {
                        if (!CoreWSError.isWebServiceError(error)) {
                            throw error;
                        }
                    }
                }

                // All requests succeeded, some failed or all failed with a WS error.
                result.updated = true;

                await this.deleteNewDiscussion(forumId, discussion.timecreated, siteId, userId);

                if (errors.length === groupIds.length) {
                    // All requests failed with WS error.
                    this.addOfflineDataDeletedWarning(result.warnings, discussion.name, errors[0]);
                }
            });

            await Promise.all(promises);

            if (result.updated) {
                // Data has been sent to server. Now invalidate the WS calls.
                const promises = [
                    AddonModForum.invalidateDiscussionsList(forumId, siteId),
                    AddonModForum.invalidateCanAddDiscussion(forumId, siteId),
                ];

                await CorePromiseUtils.ignoreErrors(Promise.all(promises));
            }

            // Sync finished, set sync time.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(syncId, siteId));

            return result;
        };

        return this.addOngoingSync(syncId, syncDiscussions(), siteId);
    }

    /**
     * Synchronize forum offline ratings.
     *
     * @param cmId Course module to be synced. If not defined, sync all forums.
     * @param discussionId Discussion id to be synced. If not defined, sync all discussions.
     * @param force Wether to force sync not depending on last execution.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncRatings(cmId?: number, discussionId?: number, force?: boolean, siteId?: string): Promise<AddonModForumSyncResult> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const results =
            await CoreRatingSync.syncRatings('mod_forum', 'post', ContextLevel.MODULE, cmId, discussionId, force, siteId);

        let updated = false;
        const warnings: string[] = [];
        const promises: Promise<void>[] = [];

        results.forEach((result) => {
            if (result.updated.length) {
                updated = true;

                // Invalidate discussions of updated ratings.
                promises.push(AddonModForum.invalidateDiscussionPosts(result.itemSet.itemSetId, undefined, siteId));
            }

            if (result.warnings.length) {
                // Fetch forum to construct the warning message.
                promises.push(AddonModForum.getForum(result.itemSet.courseId, result.itemSet.instanceId, { siteId })
                    .then((forum) => {
                        result.warnings.forEach((warning) => {
                            this.addOfflineDataDeletedWarning(warnings, forum.name, warning);
                        });

                        return;
                    }));
            }
        });

        await CorePromiseUtils.allPromises(promises);

        return { updated, warnings };
    }

    /**
     * Synchronize all offline discussion replies of a forum.
     *
     * @param forumId Forum ID to be synced.
     * @param userId User the discussions belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncForumReplies(forumId: number, userId?: number, siteId?: string): Promise<AddonModForumSyncResult> {
        // Get offline forum replies to be sent.
        const replies = await CorePromiseUtils.ignoreErrors(
            AddonModForumOffline.getForumReplies(forumId, siteId, userId),
            [] as AddonModForumOfflineReply[],
        );

        if (!replies.length) {
            // Nothing to sync.
            return { warnings: [], updated: false };
        } else if (!CoreNetwork.isOnline()) {
            // Cannot sync in offline.
            return Promise.reject(null);
        }

        const promises: Record<string, Promise<AddonModForumSyncResult>> = {};

        // Do not sync same discussion twice.
        replies.forEach((reply) => {
            if (promises[reply.discussionid] !== undefined) {
                return;
            }
            promises[reply.discussionid] = this.syncDiscussionReplies(reply.discussionid, userId, siteId);
        });

        const results = await Promise.all(Object.values(promises));

        return results.reduce((a, b) => ({
            warnings: a.warnings.concat(b.warnings),
            updated: a.updated || b.updated,
        }), { warnings: [], updated: false } as AddonModForumSyncResult);
    }

    /**
     * Sync a forum discussion replies only if a certain time has passed since the last time.
     *
     * @param discussionId Discussion ID to be synced.
     * @param userId User the posts belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the forum discussion is synced or if it doesn't need to be synced.
     */
    async syncDiscussionRepliesIfNeeded(
        discussionId: number,
        userId?: number,
        siteId?: string,
    ): Promise<AddonModForumSyncResult | void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getDiscussionSyncId(discussionId, userId);

        const needed = await this.isSyncNeeded(syncId, siteId);

        if (needed) {
            return this.syncDiscussionReplies(discussionId, userId, siteId);
        }
    }

    /**
     * Synchronize all offline replies from a discussion.
     *
     * @param discussionId Discussion ID to be synced.
     * @param userId User the posts belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if sync is successful, rejected otherwise.
     */
    async syncDiscussionReplies(discussionId: number, userId?: number, siteId?: string): Promise<AddonModForumSyncResult> {
        userId = userId || CoreSites.getCurrentSiteUserId();
        siteId = siteId || CoreSites.getCurrentSiteId();

        const syncId = this.getDiscussionSyncId(discussionId, userId);
        const currentSyncPromise = this.getOngoingSync(syncId, siteId);

        if (currentSyncPromise) {
            // There's already a sync ongoing for this discussion, return the promise.
            return currentSyncPromise;
        }

        // Verify that forum isn't blocked.
        if (CoreSync.isBlocked(ADDON_MOD_FORUM_COMPONENT, syncId, siteId)) {
            this.logger.debug(`Cannot sync forum discussion ${discussionId} because it is blocked.`);

            throw new Error(Translate.instant('core.errorsyncblocked', { $a: this.componentTranslate }));
        }

        this.logger.debug(`Try to sync forum discussion ${discussionId} for user ${userId}`);

        let forumId;
        const result: AddonModForumSyncResult = {
            warnings: [],
            updated: false,
        };

        // Get offline responses to be sent.
        const syncReplies = async () => {
            const replies = await CorePromiseUtils.ignoreErrors(
                AddonModForumOffline.getDiscussionReplies(discussionId, siteId, userId),
                [] as AddonModForumOfflineReply[],
            );

            if (replies.length !== 0 && !CoreNetwork.isOnline()) {
                throw new Error('Cannot sync in offline');
            }

            const promises = replies.map(async reply => {
                forumId = reply.forumid;
                reply.options = reply.options || {};

                try {
                    // First of all upload the attachments (if any).
                    await this.uploadAttachments(forumId, reply, false, siteId, userId).then((itemId) => {
                        // Now try to send the reply.
                        reply.options.attachmentsid = itemId;

                        return AddonModForum.replyPostOnline(
                            reply.postid,
                            reply.subject,
                            reply.message,
                            reply.options as unknown as AddonModForumAddDiscussionPostWSOptionsObject,
                            siteId,
                        );
                    });

                    result.updated = true;

                    await this.deleteReply(forumId, reply.postid, siteId, userId);
                } catch (error) {
                    if (!CoreWSError.isWebServiceError(error)) {
                        throw error;
                    }

                    // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                    result.updated = true;

                    await this.deleteReply(forumId, reply.postid, siteId, userId);

                    // Responses deleted, add a warning.
                    this.addOfflineDataDeletedWarning(result.warnings, reply.name, error);

                }
            });

            await Promise.all(promises);

            // Data has been sent to server. Now invalidate the WS calls.
            const invalidationPromises: Promise<void>[] = [];

            if (forumId) {
                invalidationPromises.push(AddonModForum.invalidateDiscussionsList(forumId, siteId));
            }

            invalidationPromises.push(AddonModForum.invalidateDiscussionPosts(discussionId, forumId, siteId));

            await CorePromiseUtils.allPromisesIgnoringErrors(invalidationPromises);

            // Sync finished, set sync time.
            await CorePromiseUtils.ignoreErrors(this.setSyncTime(syncId, siteId));

            // All done, return the warnings.
            return result;
        };

        return this.addOngoingSync(syncId, syncReplies(), siteId);
    }

    /**
     * Delete a new discussion.
     *
     * @param forumId Forum ID the discussion belongs to.
     * @param timecreated The timecreated of the discussion.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @returns Promise resolved when deleted.
     */
    protected async deleteNewDiscussion(forumId: number, timecreated: number, siteId?: string, userId?: number): Promise<void> {
        await Promise.all([
            AddonModForumOffline.deleteNewDiscussion(forumId, timecreated, siteId, userId),
            CorePromiseUtils.ignoreErrors(
                AddonModForumHelper.deleteNewDiscussionStoredFiles(forumId, timecreated, siteId),
            ),
        ]);
    }

    /**
     * Delete a new discussion.
     *
     * @param forumId Forum ID the discussion belongs to.
     * @param postId ID of the post being replied.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the discussion belongs to. If not defined, current user in site.
     * @returns Promise resolved when deleted.
     */
    protected async deleteReply(forumId: number, postId: number, siteId?: string, userId?: number): Promise<void> {
        await Promise.all([
            AddonModForumOffline.deleteReply(postId, siteId, userId),
            CorePromiseUtils.ignoreErrors(AddonModForumHelper.deleteReplyStoredFiles(forumId, postId, siteId, userId)),
        ]);
    }

    /**
     * Upload attachments of an offline post/discussion.
     *
     * @param forumId Forum ID the post belongs to.
     * @param post Offline post or discussion.
     * @param isDiscussion True if it's a new discussion, false if it's a reply.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User the reply belongs to. If not defined, current user in site.
     * @returns Promise resolved with draftid if uploaded, resolved with undefined if nothing to upload.
     */
    protected async uploadAttachments(
        forumId: number,
        post: AddonModForumOfflineDiscussion | AddonModForumOfflineReply,
        isDiscussion: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<number | undefined> {
        const attachments = post && post.options && post.options.attachmentsid;

        if (!attachments) {
            return;
        }

        // Has some attachments to sync.
        let files = typeof attachments === 'object' && attachments.online ? attachments.online : [];

        if (typeof attachments === 'object' && attachments.offline) {
            // Has offline files.
            try {
                const postAttachments = isDiscussion
                    ? await AddonModForumHelper.getNewDiscussionStoredFiles(
                        forumId,
                        (post as AddonModForumOfflineDiscussion).timecreated,
                        siteId,
                    )
                    : await AddonModForumHelper.getReplyStoredFiles(
                        forumId,
                        (post as AddonModForumOfflineReply).postid,
                        siteId,
                        userId,
                    );

                files = files.concat(postAttachments as unknown as []);
            } catch {
                // Folder not found, no files to add.
            }
        }

        return CoreFileUploader.uploadOrReuploadFiles(files, ADDON_MOD_FORUM_COMPONENT_LEGACY, forumId, siteId);
    }

    /**
     * Get the ID of a forum sync.
     *
     * @param forumId Forum ID.
     * @param userId User the responses belong to.. If not defined, current user.
     * @returns Sync ID.
     */
    getForumSyncId(forumId: number, userId?: number): string {
        userId = userId || CoreSites.getCurrentSiteUserId();

        return `forum#${forumId}#${userId}`;
    }

    /**
     * Get the ID of a discussion sync.
     *
     * @param discussionId Discussion ID.
     * @param userId User the responses belong to.. If not defined, current user.
     * @returns Sync ID.
     */
    getDiscussionSyncId(discussionId: number, userId?: number): string {
        userId = userId || CoreSites.getCurrentSiteUserId();

        return `discussion#${discussionId}#${userId}`;
    }

}

export const AddonModForumSync = makeSingleton(AddonModForumSyncProvider);

/**
 * Result of forum sync.
 */
export type AddonModForumSyncResult = CoreSyncResult;

/**
 * Data passed to ADDON_MOD_FORUM_AUTO_SYNCED event.
 */
export type AddonModForumAutoSyncData = {
    forumId: number;
    userId: number;
    warnings: string[];
    discussionId?: number;
};

/**
 * Data passed to ADDON_MOD_FORUM_MANUAL_SYNCED event.
 */
export type AddonModForumManualSyncData = {
    forumId: number;
    userId: number;
    source: string;
    discussionId?: number;
};
