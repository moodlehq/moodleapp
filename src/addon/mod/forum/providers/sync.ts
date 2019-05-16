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
import { CoreSyncBaseProvider } from '@classes/base-sync';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { CoreAppProvider } from '@providers/app';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModForumProvider } from './forum';
import { AddonModForumHelperProvider } from './helper';
import { AddonModForumOfflineProvider } from './offline';
import { CoreRatingSyncProvider } from '@core/rating/providers/sync';

/**
 * Service to sync forums.
 */
@Injectable()
export class AddonModForumSyncProvider extends CoreSyncBaseProvider {

    static AUTO_SYNCED = 'addon_mod_forum_autom_synced';
    static MANUAL_SYNCED = 'addon_mod_forum_manual_synced';

    protected componentTranslate: string;

    constructor(translate: TranslateService,
            appProvider: CoreAppProvider,
            courseProvider: CoreCourseProvider,
            private eventsProvider: CoreEventsProvider,
            private groupsProvider: CoreGroupsProvider,
            loggerProvider: CoreLoggerProvider,
            sitesProvider: CoreSitesProvider,
            syncProvider: CoreSyncProvider,
            textUtils: CoreTextUtilsProvider,
            timeUtils: CoreTimeUtilsProvider,
            private uploaderProvider: CoreFileUploaderProvider,
            private utils: CoreUtilsProvider,
            private forumProvider: AddonModForumProvider,
            private forumHelper: AddonModForumHelperProvider,
            private forumOffline: AddonModForumOfflineProvider,
            private logHelper: CoreCourseLogHelperProvider,
            private ratingSync: CoreRatingSyncProvider) {

        super('AddonModForumSyncProvider', loggerProvider, sitesProvider, appProvider, syncProvider, textUtils, translate,
                timeUtils);

        this.componentTranslate = courseProvider.translateModuleName('forum');
    }

    /**
     * Try to synchronize all the forums in a certain site or in all sites.
     *
     * @param  {string} [siteId] Site ID to sync. If not defined, sync all sites.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected if sync fails.
     */
    syncAllForums(siteId?: string, force?: boolean): Promise<any> {
        return this.syncOnSites('all forums', this.syncAllForumsFunc.bind(this), [force], siteId);
    }

    /**
     * Sync all forums on a site.
     *
     * @param  {string} siteId Site ID to sync.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @return {Promise<any>}          Promise resolved if sync is successful, rejected if sync fails.
     */
    protected syncAllForumsFunc(siteId: string, force?: boolean): Promise<any> {
        const sitePromises = [];

        // Sync all new discussions.
        sitePromises.push(this.forumOffline.getAllNewDiscussions(siteId).then((discussions) => {
            const promises = {};

            // Do not sync same forum twice.
            discussions.forEach((discussion) => {
                if (typeof promises[discussion.forumid] != 'undefined') {
                    return;
                }

                promises[discussion.forumid] = force ? this.syncForumDiscussions(discussion.forumid, discussion.userid, siteId) :
                    this.syncForumDiscussionsIfNeeded(discussion.forumid, discussion.userid, siteId);

                promises[discussion.forumid].then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModForumSyncProvider.AUTO_SYNCED, {
                            forumId: discussion.forumid,
                            userId: discussion.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(this.utils.objectToArray(promises));
        }));

        // Sync all discussion replies.
        sitePromises.push(this.forumOffline.getAllReplies(siteId).then((replies) => {
            const promises = {};

            // Do not sync same discussion twice.
            replies.forEach((reply) => {
                if (typeof promises[reply.discussionid] != 'undefined') {
                    return;
                }

                promises[reply.discussionid] = force ? this.syncDiscussionReplies(reply.discussionid, reply.userid, siteId) :
                    this.syncDiscussionRepliesIfNeeded(reply.discussionid, reply.userid, siteId);

                promises[reply.discussionid].then((result) => {
                    if (result && result.updated) {
                        // Sync successful, send event.
                        this.eventsProvider.trigger(AddonModForumSyncProvider.AUTO_SYNCED, {
                            forumId: reply.forumid,
                            discussionId: reply.discussionid,
                            userId: reply.userid,
                            warnings: result.warnings
                        }, siteId);
                    }
                });
            });

            return Promise.all(this.utils.objectToArray(promises));
        }));

        sitePromises.push(this.syncRatings(undefined, undefined, force, siteId));

        return Promise.all(sitePromises);
    }

    /**
     * Sync a forum only if a certain time has passed since the last time.
     *
     * @param  {number} forumId  Forum ID.
     * @param  {number} userId   User the discussion belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved when the forum is synced or if it doesn't need to be synced.
     */
    syncForumDiscussionsIfNeeded(forumId: number, userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getForumSyncId(forumId, userId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncForumDiscussions(forumId, userId, siteId);
            }
        });
    }

    /**
     * Synchronize all offline discussions of a forum.
     *
     * @param  {number} forumId  Forum ID to be synced.
     * @param  {number} [userId] User the discussions belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncForumDiscussions(forumId: number, userId?: number, siteId?: string): Promise<any> {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getForumSyncId(forumId, userId);

        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        // Verify that forum isn't blocked.
        if (this.syncProvider.isBlocked(AddonModForumProvider.COMPONENT, syncId, siteId)) {
            this.logger.debug('Cannot sync forum ' + forumId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync forum ' + forumId + ' for user ' + userId);

        const result = {
            warnings: [],
            updated: false
        };

        // Sync offline logs.
        const syncPromise = this.logHelper.syncIfNeeded(AddonModForumProvider.COMPONENT, forumId, siteId).catch(() => {
            // Ignore errors.
        }).then(() => {
            // Get offline responses to be sent.
            return this.forumOffline.getNewDiscussions(forumId, siteId, userId).catch(() => {
                // No offline data found, return empty object.
                return [];
            });
        }).then((discussions) => {
            if (!discussions.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = [];

            discussions.forEach((data) => {
                let groupsPromise;
                if (data.groupid == AddonModForumProvider.ALL_GROUPS) {
                    // Fetch all group ids.
                    groupsPromise = this.forumProvider.getForumById(data.courseid, data.forumid, siteId).then((forum) => {
                        return this.groupsProvider.getActivityAllowedGroups(forum.cmid).then((groups) => {
                            return groups.map((group) => group.id);
                        });
                    });
                } else {
                    groupsPromise = Promise.resolve([data.groupid]);
                }

                promises.push(groupsPromise.then((groupIds) => {
                    const errors = [];

                    return Promise.all(groupIds.map((groupId) => {
                        // First of all upload the attachments (if any).
                        return this.uploadAttachments(forumId, data, true, siteId, userId).then((itemId) => {
                            // Now try to add the discussion.
                            const options = this.utils.clone(data.options || {});
                            options.attachmentsid = itemId;

                            return this.forumProvider.addNewDiscussionOnline(forumId, data.subject, data.message, options,
                                    groupId, siteId);
                        }).catch((error) => {
                            errors.push(error);
                        });
                    })).then(() => {
                        if (errors.length == groupIds.length) {
                            // All requests have failed, reject if errors were not returned by WS.
                            for (let i = 0; i < errors.length; i++) {
                                if (!this.utils.isWebServiceError(errors[i])) {
                                    return Promise.reject(errors[i]);
                                }
                            }
                        }

                        // All requests succeeded, some failed or all failed with a WS error.
                        result.updated = true;

                        return this.deleteNewDiscussion(forumId, data.timecreated, siteId, userId).then(() => {
                            if (errors.length == groupIds.length) {
                                // All requests failed with WS error.
                                result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                    component: this.componentTranslate,
                                    name: data.name,
                                    error: this.textUtils.getErrorMessageFromError(errors[0])
                                }));
                            }
                        });
                    });
                }));
            });

            return Promise.all(promises);
        }).then(() => {
            if (result.updated) {
                // Data has been sent to server. Now invalidate the WS calls.
                const promises = [
                    this.forumProvider.invalidateDiscussionsList(forumId, siteId),
                    this.forumProvider.invalidateCanAddDiscussion(forumId, siteId),
                ];

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(syncId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Synchronize forum offline ratings.
     *
     * @param {number} [cmId] Course module to be synced. If not defined, sync all forums.
     * @param {number} [discussionId] Discussion id to be synced. If not defined, sync all discussions.
     * @param {boolean} [force] Wether to force sync not depending on last execution.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if sync is successful, rejected otherwise.
     */
    syncRatings(cmId?: number, discussionId?: number, force?: boolean, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.ratingSync.syncRatings('mod_forum', 'post', 'module', cmId, discussionId, force, siteId).then((results) => {
            let updated = false;
            const warnings = [];
            const promises = [];

            results.forEach((result) => {
                if (result.updated.length) {
                    updated = true;

                    // Invalidate discussions of updated ratings.
                    promises.push(this.forumProvider.invalidateDiscussionPosts(result.itemSet.itemSetId, siteId));
                }
                if (result.warnings.length) {
                    // Fetch forum to construct the warning message.
                    promises.push(this.forumProvider.getForum(result.itemSet.courseId, result.itemSet.instanceId, siteId)
                            .then((forum) => {
                        result.warnings.forEach((warning) => {
                            warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: forum.name,
                                error: warning
                            }));
                        });
                    }));
                }
            });

            return this.utils.allPromises(promises).then(() => {
                return { updated, warnings };
            });
        });
    }

    /**
     * Synchronize all offline discussion replies of a forum.
     *
     * @param  {number} forumId  Forum ID to be synced.
     * @param  {number} [userId] User the discussions belong to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if sync is successful, rejected otherwise.
     */
    syncForumReplies(forumId: number, userId?: number, siteId?: string): Promise<any> {
        // Get offline forum replies to be sent.
        return this.forumOffline.getForumReplies(forumId, siteId, userId).catch(() => {
            // No offline data found, return empty list.
            return [];
        }).then((replies) => {
            if (!replies.length) {
                // Nothing to sync.
                return { warnings: [], updated: false };
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = {};

            // Do not sync same discussion twice.
            replies.forEach((reply) => {
                if (typeof promises[reply.discussionid] != 'undefined') {
                    return;
                }
                promises[reply.discussionid] = this.syncDiscussionReplies(reply.discussionid, userId, siteId);
            });

            return Promise.all(this.utils.objectToArray(promises)).then((results) => {
                return results.reduce((a, b) => ({
                        warnings: a.warnings.concat(b.warnings),
                        updated: a.updated || b.updated,
                    }), { warnings: [], updated: false });
            });
        });
    }

    /**
     * Sync a forum discussion replies only if a certain time has passed since the last time.
     *
     * @param  {number} discussionId Discussion ID to be synced.
     * @param  {number} [userId]     User the posts belong to.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved when the forum discussion is synced or if it doesn't need to be synced.
     */
    syncDiscussionRepliesIfNeeded(discussionId: number, userId?: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getDiscussionSyncId(discussionId, userId);

        return this.isSyncNeeded(syncId, siteId).then((needed) => {
            if (needed) {
                return this.syncDiscussionReplies(discussionId, userId, siteId);
            }
        });
    }

    /**
     * Synchronize all offline replies from a discussion.
     *
     * @param  {number} discussionId Discussion ID to be synced.
     * @param  {number} [userId]     User the posts belong to.
     * @param  {string} [siteId]     Site ID. If not defined, current site.
     * @return {Promise<any>}        Promise resolved if sync is successful, rejected otherwise.
     */
    syncDiscussionReplies(discussionId: number, userId?: number, siteId?: string): Promise<any> {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const syncId = this.getDiscussionSyncId(discussionId, userId);

        if (this.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return this.getOngoingSync(syncId, siteId);
        }

        // Verify that forum isn't blocked.
        if (this.syncProvider.isBlocked(AddonModForumProvider.COMPONENT, syncId, siteId)) {
            this.logger.debug('Cannot sync forum discussion ' + discussionId + ' because it is blocked.');

            return Promise.reject(this.translate.instant('core.errorsyncblocked', {$a: this.componentTranslate}));
        }

        this.logger.debug('Try to sync forum discussion ' + discussionId + ' for user ' + userId);

        let forumId;
        const result = {
            warnings: [],
            updated: false
        };

        // Get offline responses to be sent.
        const syncPromise = this.forumOffline.getDiscussionReplies(discussionId, siteId, userId).catch(() => {
            // No offline data found, return empty object.
            return [];
        }).then((replies) => {
            if (!replies.length) {
                // Nothing to sync.
                return;
            } else if (!this.appProvider.isOnline()) {
                // Cannot sync in offline.
                return Promise.reject(null);
            }

            const promises = [];

            replies.forEach((data) => {
                forumId = data.forumid;
                data.options = data.options || {};

                // First of all upload the attachments (if any).
                const promise = this.uploadAttachments(forumId, data, false, siteId, userId).then((itemId) => {
                    // Now try to send the reply.
                    data.options.attachmentsid = itemId;

                    return this.forumProvider.replyPostOnline(data.postid, data.subject, data.message, data.options, siteId);
                });

                promises.push(promise.then(() => {
                    result.updated = true;

                    return this.deleteReply(forumId, data.postid, siteId, userId);
                }).catch((error) => {
                    if (this.utils.isWebServiceError(error)) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;

                        return this.deleteReply(forumId, data.postid, siteId, userId).then(() => {
                            // Responses deleted, add a warning.
                            result.warnings.push(this.translate.instant('core.warningofflinedatadeleted', {
                                component: this.componentTranslate,
                                name: data.name,
                                error: this.textUtils.getErrorMessageFromError(error)
                            }));
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return Promise.reject(error);
                    }
                }));
            });

            return Promise.all(promises);
        }).then(() => {
            // Data has been sent to server. Now invalidate the WS calls.
            const promises = [];
            if (forumId) {
                promises.push(this.forumProvider.invalidateDiscussionsList(forumId, siteId));
            }
            promises.push(this.forumProvider.invalidateDiscussionPosts(discussionId, siteId));

            return this.utils.allPromises(promises).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // Sync finished, set sync time.
            return this.setSyncTime(syncId, siteId).catch(() => {
                // Ignore errors.
            });
        }).then(() => {
            // All done, return the warnings.
            return result;
        });

        return this.addOngoingSync(syncId, syncPromise, siteId);
    }

    /**
     * Delete a new discussion.
     *
     * @param  {number} forumId     Forum ID the discussion belongs to.
     * @param  {number} timecreated The timecreated of the discussion.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @param  {number} [userId]    User the discussion belongs to. If not defined, current user in site.
     * @return {Promise<any>}       Promise resolved when deleted.
     */
    protected deleteNewDiscussion(forumId: number, timecreated: number, siteId?: string, userId?: number): Promise<any> {
        const promises = [];

        promises.push(this.forumOffline.deleteNewDiscussion(forumId, timecreated, siteId, userId));
        promises.push(this.forumHelper.deleteNewDiscussionStoredFiles(forumId, timecreated, siteId).catch(() => {
            // Ignore errors, maybe there are no files.
        }));

        return Promise.all(promises);
    }

    /**
     * Delete a new discussion.
     *
     * @param  {number} forumId  Forum ID the discussion belongs to.
     * @param  {number} postId   ID of the post being replied.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @param  {number} [userId] User the discussion belongs to. If not defined, current user in site.
     * @return {Promise<any>}    Promise resolved when deleted.
     */
    protected deleteReply(forumId: number, postId: number, siteId?: string, userId?: number): Promise<any> {
        const promises = [];

        promises.push(this.forumOffline.deleteReply(postId, siteId, userId));
        promises.push(this.forumHelper.deleteReplyStoredFiles(forumId, postId, siteId, userId).catch(() => {
            // Ignore errors, maybe there are no files.
        }));

        return Promise.all(promises);
    }

    /**
     * Upload attachments of an offline post/discussion.
     *
     * @param  {number}  forumId  Forum ID the post belongs to.
     * @param  {any}     post     Offline post or discussion.
     * @param  {boolean} isDisc   True if it's a new discussion, false if it's a reply.
     * @param  {string}  [siteId] Site ID. If not defined, current site.
     * @param  {number}  [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise<any>}     Promise resolved with draftid if uploaded, resolved with undefined if nothing to upload.
     */
    protected uploadAttachments(forumId: number, post: any, isDisc: boolean, siteId?: string, userId?: number): Promise<any> {
        const attachments = post && post.options && post.options.attachmentsid;

        if (attachments) {
            // Has some attachments to sync.
            let files = attachments.online || [];
            let promise;

            if (attachments.offline) {
                // Has offline files.
                if (isDisc) {
                    promise = this.forumHelper.getNewDiscussionStoredFiles(forumId, post.timecreated, siteId);
                } else {
                    promise = this.forumHelper.getReplyStoredFiles(forumId, post.postid, siteId, userId);
                }

                promise.then((atts) => {
                    files = files.concat(atts);
                }).catch(() => {
                    // Folder not found, no files to add.
                });
            } else {
                promise = Promise.resolve();
            }

            return promise.then(() => {
                return this.uploaderProvider.uploadOrReuploadFiles(files, AddonModForumProvider.COMPONENT, forumId, siteId);
            });
        }

        // No attachments, resolve.
        return Promise.resolve();
    }

    /**
     * Get the ID of a forum sync.
     *
     * @param  {number} forumId  Forum ID.
     * @param  {number} [userId] User the responses belong to.. If not defined, current user.
     * @return {string}          Sync ID.
     */
    getForumSyncId(forumId: number, userId?: number): string {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();

        return 'forum#' + forumId + '#' + userId;
    }

    /**
     * Get the ID of a discussion sync.
     *
     * @param  {number} discussionId Discussion ID.
     * @param  {number} [userId]     User the responses belong to.. If not defined, current user.
     * @return {string}              Sync ID.
     */
    getDiscussionSyncId(discussionId: number, userId?: number): string {
        userId = userId || this.sitesProvider.getCurrentSiteUserId();

        return 'discussion#' + discussionId + '#' + userId;
    }
}
