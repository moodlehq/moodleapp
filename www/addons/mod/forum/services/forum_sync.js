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
.factory('$mmaModForumSync', function($q, $log, $mmApp, $mmSitesManager, $mmaModForumOffline, $mmSite, $mmEvents, $mmSync,
        mmaModForumComponent, $mmaModForum, $translate, mmaModForumAutomSyncedEvent, mmaModForumSyncTime) {

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

        var syncId = self._getForumSyncId(forumId, userId);
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
            syncId = self._getForumSyncId(forumId, userId),
            result = {
                warnings: [],
                updated: false
            };

        if (self.isSyncing(syncId, siteId)) {
            // There's already a sync ongoing for this discussion, return the promise.
            return self.getOngoingSync(syncId, siteId);
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

                // A user has added some discussions.
                promise = $mmaModForum.addNewDiscussionOnline(forumId, data.subject, data.message, data.subscribe, data.groupid,
                    siteId);

                promises.push(promise.then(function() {
                    result.updated = true;

                    return $mmaModForumOffline.deleteNewDiscussion(forumId, data.timecreated, siteId, userId);
                }).catch(function(error) {
                    if (error && error.wserror) {
                        // The WebService has thrown an error, this means that responses cannot be submitted. Delete them.
                        result.updated = true;
                        return $mmaModForumOffline.deleteNewDiscussion(forumId, data.timecreated, siteId, userId).then(function() {
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
            promises.push($mmaModForum.invalidateDiscussionsList(forumId, siteId));
            promises.push($mmaModForum.invalidateCanAddDiscussion(forumId, siteId));

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
     * Get the ID of a forum sync.
     *
     * @module mm.addons.mod_forum
     * @ngdoc method
     * @name $mmaModForumSync#_getForumSyncId
     * @param  {Number} forumId  Forum ID.
     * @param  {Number} userId   User the responses belong to.
     * @return {String}          Sync ID.
     * @protected
     */
    self._getForumSyncId = function(forumId, userId) {
        return 'forum#' + forumId + '#' + userId;
    };

    return self;
});
