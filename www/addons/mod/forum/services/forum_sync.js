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

angular.module('mm.addons.mod_forum')

/**
 * Forum synchronization service.
 *
 * @module mm.addons.mod_forum
 * @ngdoc service
 * @name $mmaModForumSync
 */
.factory('$mmaModForumSync', function($q, $log, $mmApp, $mmSitesManager, $mmaModForumOffline, $mmSite, $mmEvents, $mmSync, $mmLang,
        mmaModForumComponent, $mmaModForum, $translate, mmaModForumAutomSyncedEvent, mmaModForumSyncTime, $mmCourse, $mmSyncBlock,
        $mmaModForumHelper, $mmFileUploader) {

    $log = $log.getInstance('$mmaModForumSync');

    // Inherit self from $mmSync.
    var self = $mmSync.createChild(mmaModForumComponent, mmaModForumSyncTime);

    /**
     * Try to synchronize all Forums from current site that need it and haven't been synchronized in a while.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncAllForums
     * @param {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}        Promise resolved when the sync is done.
     */
    self.syncAllForums = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all forums because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync forums in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync forums in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Sync all new discussions.
                sitePromises.push($mmaModForumOffline.getAllNewDiscussions(siteId).then(function(discussions) {
                    var promises = {};

                    // Do not sync same forum twice.
                    for (var i in discussions) {
                        var discussion = discussions[i];

                        if (typeof promises[discussion.forumid] != 'undefined') {
                            continue;
                        }

                        promises[discussion.forumid] = self.syncForumDiscussionsIfNeeded(discussion.forumid, discussion.userid, siteId)
                                .then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModForumAutomSyncedEvent, {
                                    siteid: siteId,
                                    forumid: discussion.forumid,
                                    userid: discussion.userid,
                                    warnings: result.warnings
                                });
                            }
                        });
                    }
                    // Promises will be an object so, convert to an array first;
                    promises = Object.keys(promises).map(function (key) {return promises[key];});

                    return $q.all(promises);
                }));

                // Sync all discussion replies.
                sitePromises.push($mmaModForumOffline.getAllReplies(siteId).then(function(replies) {
                    var promises = {};

                    // Do not sync same discussion twice.
                    for (var i in replies) {
                        var reply = replies[i];

                        if (typeof promises[reply.discussionid] != 'undefined') {
                            continue;
                        }

                        promises[reply.discussionid] = self.syncDiscussionRepliesIfNeeded(reply.discussionid, reply.userid, siteId)
                                .then(function(result) {
                            if (result && result.updated) {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaModForumAutomSyncedEvent, {
                                    siteid: siteId,
                                    forumid: reply.forumid,
                                    discussionid: reply.discussionid,
                                    userid: reply.userid,
                                    warnings: result.warnings
                                });
                            }
                        });
                    }

                    // Promises will be an object so, convert to an array first;
                    promises = Object.keys(promises).map(function (key) {return promises[key];});

                    return $q.all(promises);
                }));

            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Sync a forum only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncForumDiscussionsIfNeeded
     * @param  {Number} forumId     Forum ID.
     * @param  {Number} userId      User the discussion belong to.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @return {Promise}            Promise resolved when the forum is synced or if it doesn't need to be synced.
     */
    self.syncForumDiscussionsIfNeeded = function(forumId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncId = self.getForumSyncId(forumId, userId);
        return self.isSyncNeeded(syncId, siteId).then(function(needed) {
            if (needed) {
                return self.syncForumDiscussions(forumId, userId, siteId);
            }
        });
    };

    /**
     * Synchronize all offline discussions of a forum.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncForumDiscussions
     * @param  {Number} forumId  Forum ID to be synced.
     * @param  {Number} [userId] User the discussions belong to.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncForumDiscussions = function(forumId, userId, siteId) {
        userId = userId || $mmSite.getUserId();
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            courseId,
            syncId = self.getForumSyncId(forumId, userId),
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        // Verify that forum isn't blocked.
        if ($mmSyncBlock.isBlocked(mmaModForumComponent, syncId, siteId)) {
            $log.debug('Cannot sync forum ' + forumId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('forum');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync forum ' + forumId + ' for user ' + userId);

        // Get offline responses to be sent.
        syncPromise = $mmaModForumOffline.getNewDiscussions(forumId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return [];
        }).then(function(discussions) {
            if (!discussions.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            var promises = [];

            angular.forEach(discussions, function(data) {
                var promise;

                courseId = data.courseid;

                // First of all upload the attachments (if any).
                promise = uploadAttachments(forumId, data, true, siteId, userId).then(function(itemId) {
                    // Now try to add the discussion.
                    return $mmaModForum.addNewDiscussionOnline(forumId, data.subject, data.message,
                            data.subscribe, data.groupid, itemId, siteId);
                });

                promises.push(promise.then(function() {
                    result.updated = true;

                    return deleteNewDiscussion(forumId, data.timecreated, siteId, userId);
                }).catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;
                        return deleteNewDiscussion(forumId, data.timecreated, siteId, userId).then(function() {
                            // Responses deleted, add a warning.
                            result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                                component: $mmCourse.translateModuleName('forum'),
                                name: data.name,
                                error: error.error
                            }));
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }));
            });

            return $q.all(promises);
        }).then(function() {
            if (result.updated) {
                // Data has been sent to server. Now invalidate the WS calls.
                var promises = [];
                promises.push($mmaModForum.invalidateDiscussionsList(forumId, siteId));
                promises.push($mmaModForum.invalidateCanAddDiscussion(forumId, siteId));

                return $q.all(promises).catch(function() {
                    // Ignore errors.
                });
            }
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(syncId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(syncId, syncPromise, siteId);
    };

    /**
     * Delete a new discussion.
     *
     * @param  {Number} forumId     Forum ID the discussion belongs to.
     * @param  {Number} timecreated The timecreated of the discussion.
     * @param  {String} [siteId]    Site ID. If not defined, current site.
     * @param  {Number} [userId]    User the discussion belongs to. If not defined, current user in site.
     * @return {Promise}            Promise resolved when deleted.
     */
    function deleteNewDiscussion(forumId, timecreated, siteId, userId) {
        var promises = [];

        promises.push($mmaModForumOffline.deleteNewDiscussion(forumId, timecreated, siteId, userId));
        promises.push($mmaModForumHelper.deleteNewDiscussionStoredFiles(forumId, timecreated, siteId).catch(function() {
            // Ignore errors, maybe there are no files.
        }));

        return $q.all(promises);
    }

    /**
     * Delete a new discussion.
     *
     * @param  {Number} forumId  Forum ID the discussion belongs to.
     * @param {Number}  postId   ID of the post being replied.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the discussion belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved when deleted.
     */
    function deleteReply(forumId, postId, siteId, userId) {
        var promises = [];

        promises.push($mmaModForumOffline.deleteReply(postId, siteId, userId));
        promises.push($mmaModForumHelper.deleteReplyStoredFiles(forumId, postId, siteId, userId).catch(function() {
            // Ignore errors, maybe there are no files.
        }));

        return $q.all(promises);
    }

    /**
     * Synchronize all offline discussion replies of a forum.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncForumReplies
     * @param  {Number}     forumId                 Forum ID to be synced.
     * @param  {Number}     [userId]                User the discussions belong to.
     * @param  {String}     [siteId]                Site ID. If not defined, current site.
     * @return {Promise}                            Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncForumReplies = function(forumId, userId, siteId) {
        // Get offline forum replies to be sent.
        return $mmaModForumOffline.getForumReplies(forumId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return {};
        }).then(function(replies) {
            if (!replies.length) {
                // Nothing to sync.
                return { warnings: [], updated: false };
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            var promises = {};

            // Do not sync same discussion twice.
            for (var i in replies) {
                var reply = replies[i];

                if (typeof promises[reply.discussionid] != 'undefined') {
                    continue;
                }
                promises[reply.discussionid] = self.syncDiscussionReplies(reply.discussionid, userId, siteId);
            }

            // Promises will be an object so, convert to an array first;
            promises = Object.keys(promises).map(function (key) {return promises[key];});

            return $q.all(promises).then(function(results) {
                return results.reduce(function(a, b) {
                    a.warnings = a.warnings.concat(b.warnings);
                    a.updated = a.updated || b.updated;
                    return a;
                }, { warnings: [], updated: false });
            });
        });
    };

    /**
     * Sync a forum discussion replies only if a certain time has passed since the last time.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncDiscussionRepliesIfNeeded
     * @param  {Number} discussionId  Discussion ID to be synced.
     * @param  {Number} [userId]      User the posts belong to.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the forum discussion is synced or if it doesn't need to be synced.
     */
    self.syncDiscussionRepliesIfNeeded = function(discussionId, userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncId = self.getDiscussionSyncId(discussionId, userId);
        return self.isSyncNeeded(syncId, siteId).then(function(needed) {
            if (needed) {
                return self.syncDiscussionReplies(discussionId, userId, siteId);
            }
        });
    };

    /**
     * Synchronize all offline replies from a discussion.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#syncDiscussionReplies
     * @param  {Number} discussionId  Discussion ID to be synced.
     * @param  {Number} [userId]      User the posts belong to.
     * @param  {String} [siteId]      Site ID. If not defined, current site.
     * @return {Promise}              Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncDiscussionReplies = function(discussionId, userId, siteId) {
        userId = userId || $mmSite.getUserId();
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            courseId,
            forumId,
            syncId = self.getDiscussionSyncId(discussionId, userId),
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(syncId, siteId);
        }

        // Verify that forum isn't blocked.
        if ($mmSyncBlock.isBlocked(this.component, syncId, siteId)) {
            $log.debug('Cannot sync forum discussion ' + discussionId + ' because it is blocked.');
            var modulename = $mmCourse.translateModuleName('forum');
            return $mmLang.translateAndReject('mm.core.errorsyncblocked', {$a: modulename});
        }

        $log.debug('Try to sync forum discussion ' + discussionId + ' for user ' + userId);

        // Get offline responses to be sent.
        syncPromise = $mmaModForumOffline.getDiscussionReplies(discussionId, siteId, userId).catch(function() {
            // No offline data found, return empty object.
            return [];
        }).then(function(replies) {
            if (!replies.length) {
                // Nothing to sync.
                return;
            } else if (!$mmApp.isOnline()) {
                // Cannot sync in offline.
                return $q.reject();
            }

            var promises = [];

            angular.forEach(replies, function(data) {
                var promise;

                courseId = data.courseid;
                forumId = data.forumid;

                // First of all upload the attachments (if any).
                promise = uploadAttachments(forumId, data, false, siteId, userId).then(function(itemId) {
                    // Now try to send the reply.
                    return $mmaModForum.replyPostOnline(data.postid, data.subject, data.message, itemId, siteId);
                });

                promises.push(promise.then(function() {
                    result.updated = true;

                    return deleteReply(forumId, data.postid, siteId, userId);
                }).catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;
                        return deleteReply(forumId, data.postid, siteId, userId).then(function() {
                            // Responses deleted, add a warning.
                            result.warnings.push($translate.instant('mm.core.warningofflinedatadeleted', {
                                component: $mmCourse.translateModuleName('forum'),
                                name: data.name,
                                error: error.error
                            }));
                        });
                    } else {
                        // Couldn't connect to server, reject.
                        return $q.reject(error && error.error);
                    }
                }));
            });

            return $q.all(promises);
        }).then(function() {
            // Data has been sent to server. Now invalidate the WS calls.
            var promises = [];
            if (forumId) {
                promises.push($mmaModForum.invalidateDiscussionsList(forumId, siteId));
            }
            promises.push($mmaModForum.invalidateDiscussionPosts(discussionId, siteId));

            return $q.all(promises).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // Sync finished, set sync time.
            return self.setSyncTime(syncId, siteId).catch(function() {
                // Ignore errors.
            });
        }).then(function() {
            // All done, return the warnings.
            return result;
        });

        return self.addOngoingSync(syncId, syncPromise, siteId);
    };

    /**
     * Upload attachments of an offline post/discussion.
     *
     * @param  {Number} forumId  Forum ID the post belongs to.
     * @param  {Object} post     Offline post or discussion.
     * @param  {Boolean} isDisc  True if it's a new discussion, false if it's a reply.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @param  {Number} [userId] User the reply belongs to. If not defined, current user in site.
     * @return {Promise}         Promise resolved with draftid if uploaded, resolved with undefined if nothing to upload.
     */
    function uploadAttachments(forumId, post, isDisc, siteId, userId) {
        var attachments = post && post.attachments;
        if (attachments) {
            // Has some attachments to sync.
            var files = attachments.online || [],
                promise;

            if (attachments.offline) {
                // Has offline files.
                if (isDisc) {
                    promise = $mmaModForumHelper.getNewDiscussionStoredFiles(forumId, post.timecreated, siteId);
                } else {
                    promise = $mmaModForumHelper.getReplyStoredFiles(forumId, post.postid, siteId, userId);
                }

                promise.then(function(atts) {
                    files = files.concat(atts);
                }).catch(function() {
                    // Folder not found, no files to add.
                });
            } else {
                promise = $q.when();
            }

            return promise.then(function() {
                return $mmFileUploader.uploadOrReuploadFiles(files, mmaModForumComponent, forumId, siteId);
            });
        }

        // No attachments, resolve.
        return $q.when();
    }

    /**
     * Get the ID of a forum sync.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#getForumSyncId
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} [userId] User the responses belong to.. If not defined, current user.
     * @return {String}          Sync ID.
     * @protected
     */
    self.getForumSyncId = function(forumId, userId) {
        userId = userId || $mmSite.getUserId();
        return 'forum#' + forumId + '#' + userId;
    };

    /**
     * Get the ID of a discussion sync.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#getDiscussionSyncId
     * @param  {Number} discussionId    Discussion ID.
     * @param  {Number} [userId]        User the responses belong to.. If not defined, current user.
     * @return {String}                 Sync ID.
     * @protected
     */
    self.getDiscussionSyncId = function(discussionId, userId) {
        userId = userId || $mmSite.getUserId();
        return 'discussion#' + discussionId + '#' + userId;
    };

    return self;
});
