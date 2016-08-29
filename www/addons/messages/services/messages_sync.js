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

angular.module('mm.addons.messages')

/**
 * Messages synchronization factory.
 *
 * @module mm.addons.messages
 * @ngdoc service
 * @name $mmaMessagesSync
 */
.factory('$mmaMessagesSync', function($log, $mmSite, $q, $timeout, $mmUser, $mmApp, $translate, $mmaMessages, $mmaMessagesOffline,
            $mmSitesManager, $mmEvents, mmaMessagesAutomSyncedEvent) {
    $log = $log.getInstance('$mmaMessagesSync');

    var self = {},
        syncPromises = {}; // Store sync promises.

    /**
     * Check if a discussion is being synchronized.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesSync#isSyncingDiscussion
     * @param  {Number} userId   User ID of the discussion.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Boolean}         True if synchronizing, false otherwise.
     */
    self.isSyncingDiscussion = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();
        return !!(syncPromises[siteId] && syncPromises[siteId][userId]);
    };

    /**
     * Try to synchronize all the discussions in a certain site or in all sites.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesSync#syncAllDiscussions
     * @param  {String} [siteId] Site ID to sync. If not defined, sync all sites.
     * @return {Promise}         Promise resolved if sync is successful, rejected if sync fails.
     */
    self.syncAllDiscussions = function(siteId) {
        if (!$mmApp.isOnline()) {
            $log.debug('Cannot sync all discussions because device is offline.');
            return $q.reject();
        }

        var promise;
        if (!siteId) {
            // No site ID defined, sync all sites.
            $log.debug('Try to sync discussions in all sites.');
            promise = $mmSitesManager.getSitesIds();
        } else {
            $log.debug('Try to sync discussions in site ' + siteId);
            promise = $q.when([siteId]);
        }

        return promise.then(function(siteIds) {
            var sitePromises = [];

            angular.forEach(siteIds, function(siteId) {
                // Get all messages pending to be sent in the site.
                sitePromises.push($mmaMessagesOffline.getAllMessages(siteId).then(function(messages) {
                    var userIds = [],
                        promises = [];

                    // Get all the discussions to be synced.
                    angular.forEach(messages, function(message) {
                        if (userIds.indexOf(message.touserid) == -1) {
                            userIds.push(message.touserid);
                        }
                    });

                    // Sync all discussions.
                    angular.forEach(userIds, function(userId) {
                        promises.push(self.syncDiscussion(userId, siteId).then(function(warnings) {
                            if (typeof warnings != 'undefined') {
                                // Sync successful, send event.
                                $mmEvents.trigger(mmaMessagesAutomSyncedEvent, {
                                    siteid: siteId,
                                    userid: userId,
                                    warnings: warnings
                                });
                            }
                        }));
                    });

                    return $q.all(promises);
                }));
            });

            return $q.all(sitePromises);
        });
    };

    /**
     * Synchronize a discussion.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesSync#syncDiscussion
     * @param  {Number} userId   User ID of the discussion.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if sync is successful, rejected otherwise.
     */
    self.syncDiscussion = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();

        var syncPromise,
            deleted = false,
            warnings = [];

        if (syncPromises[siteId] && syncPromises[siteId][userId]) {
            // There's already a sync ongoing for this discussion, return the promise.
            return syncPromises[siteId][userId];
        } else if (!syncPromises[siteId]) {
            syncPromises[siteId] = {};
        }

        $log.debug('Try to sync discussion with user ' + userId);

        // Get offline messages to be sent.
        syncPromise = $mmaMessagesOffline.getMessages(userId, siteId).then(function(messages) {
            if (!messages.length) {
                // Nothing to sync.
                return [];
            }

            var promise = $q.when(),
                errors = [];

            // Order message by timecreated.
            messages = $mmaMessages.sortMessages(messages);

            // Send the messages. We don't use $mmaMessages#sendMessagesOnline because there's a problem with display order.
            // @todo Use $mmaMessages#sendMessagesOnline once the display order is fixed.
            angular.forEach(messages, function(message, index) {
                // Chain message sending. If 1 message fails to be sent we'll stop sending.
                promise = promise.then(function() {
                    var time = new Date().getTime();
                    return $mmaMessages.sendMessageOnline(userId, message.smallmessage, siteId).catch(function(data) {
                        if (data.wserror) {
                            // Error returned by WS. Store the error to show a warning but keep sending messages.
                            if (errors.indexOf(data.error) == -1) {
                                errors.push(data.error);
                            }
                        } else {
                            // Error sending, stop execution.
                            return $q.reject(data.error);
                        }
                    }).then(function() {
                        // Message was sent, delete it from local DB.
                        return $mmaMessagesOffline.deleteMessage(userId, message.smallmessage, message.timecreated, siteId);
                    }).then(function() {
                        // All done. If the process was too fast add a delay to ensure timecreated of messages is different.
                        var diff = new Date().getTime() - time;
                        if (diff < 1000 && index < messages.length - 1) {
                            return $timeout(function() {}, 1000 - diff);
                        }
                    });
                });
            });

            return promise.then(function() {
                return errors;
            });
        }).then(function(errors) {
            if (errors && errors.length) {
                // At least an error occurred, get user full name and add errors to warnings array.
                return $mmUser.getProfile(userId, undefined, true).catch(function() {
                    // Ignore errors.
                    return {};
                }).then(function(user) {
                    angular.forEach(errors, function(error) {
                        warnings.push($translate.instant('mma.messages.warningmessagenotsent', {
                            user: user.fullname ? user.fullname : userId,
                            error: error
                        }));
                    });
                });
            }
        }).then(function() {
            // All done, return the warnings.
            return warnings;
        }).finally(function() {
            deleted = true;
            delete syncPromises[siteId][userId];
        });

        if (!deleted) {
            syncPromises[siteId][userId] = syncPromise;
        }
        return syncPromise;
    };

    /**
     * If there's an ongoing sync for a certain discussion, wait for it to end.
     * If there's no sync ongoing the promise will be resolved right away.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessagesSync#waitForSync
     * @param  {Number} userId   User ID of the discussion.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when there's no sync going on for the discussion.
     */
    self.waitForSync = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();
        if (syncPromises[siteId] && syncPromises[siteId][userId]) {
            // There's a sync ongoing for this discussion.
            return syncPromises[siteId][userId].catch(function() {});
        }
        return $q.when();
    };

    return self;
});
