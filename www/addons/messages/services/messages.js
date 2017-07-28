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
 * Messages factory.
 *
 * @module mm.addons.messages
 * @ngdoc service
 * @name $mmaMessages
 */
.factory('$mmaMessages', function($mmSite, $mmSitesManager, $log, $q, $mmUser, $mmaMessagesOffline, $mmApp, $mmUtil,
            mmaMessagesNewMessageEvent, mmaMessagesLimitMessages, mmaMessagesLimitSearchMessages, $mmEmulatorHelper,
            mmaMessagesPushSimulationComponent) {
    $log = $log.getInstance('$mmaMessages');

    var self = {};

    /**
     * Add a contact.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#addContact
     * @param {Number} to User ID of the person to add.
     * @return {Promise}
     */
    self.addContact = function(userId) {
        return $mmSite.write('core_message_create_contacts', {
            userids: [ userId ]
        }).then(function() {
            return self.invalidateAllContactsCache($mmSite.getUserId());
        });
    };

    /**
     * Block a contact.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#blockContact
     * @param {Number} to User ID of the person to block.
     * @return {Promise}
     */
    self.blockContact = function(userId) {
        return $mmSite.write('core_message_block_contacts', {
            userids: [ userId ]
        }).then(function() {
            return self.invalidateAllContactsCache($mmSite.getUserId());
        });
    };

    /**
     * Check if messages can be deleted in current site.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#canDeleteMessages
     * @return {Boolean} True if can delete messages, false otherwise.
     */
    self.canDeleteMessages = function() {
        return $mmSite.wsAvailable('core_message_delete_message');
    };

    /**
     * Delete a message (online or offline).
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#deleteMessage
     * @param {Object} message Message to delete.
     * @return {Promise}       Promise resolved when the message has been deleted.
     */
    self.deleteMessage = function(message) {
        if (message.id) {
            // Message has ID, it means it has been sent to the server.
            return self.deleteMessageOnline(message.id, message.read);
        } else {
            // It's an offline message.
            return $mmaMessagesOffline.deleteMessage(message.touserid, message.smallmessage, message.timecreated);
        }
    };

    /**
     * Delete a message from the server.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#deleteMessageOnline
     * @param {Number} id       Message ID.
     * @param {Number} read     1 if message is read, 0 otherwise.
     * @param {Number} [userId] User we want to delete the message for. If not defined, use current user.
     * @return {Promise}        Promise resolved when the message has been deleted.
     */
    self.deleteMessageOnline = function(id, read, userId) {
        userId = userId || $mmSite.getUserId();
        var params = {
                messageid: id,
                userid: userId,
                read: read
            };
        return $mmSite.write('core_message_delete_message', params).then(function() {
            return self.invalidateDiscussionCache(userId);
        });
    };

    /**
     * Get all the contacts of the current user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getAllContacts
     * @return {Promise} Resolved with the WS data.
     */
    self.getAllContacts = function() {
        return self.getContacts().then(function(contacts) {
            return self.getBlockedContacts().then(function(blocked) {
                contacts.blocked = blocked.users;
                storeUsersFromAllContacts(contacts);
                return contacts;
            }, function() {
                // The WS for blocked contacts might not be available yet, but we still want the contacts.
                contacts.blocked = [];
                storeUsersFromAllContacts(contacts);
                return contacts;
            });
        });
    };

    /**
     * Get all the blocked contacts of the current user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getBlockedContacts
     * @return {Promise} Resolved with the WS data.
     */
    self.getBlockedContacts = function() {
        var params = {
                userid: $mmSite.getUserId()
            },
            presets = {
                cacheKey: self._getCacheKeyForBlockedContacts($mmSite.getUserId())
            };

        if (!$mmSite.wsAvailable('core_message_get_blocked_users')) {
            // If the WS is not available, we mock an empty response.
            return $q.when({users: [], warnings: []});
        }

        return $mmSite.read('core_message_get_blocked_users', params, presets);
    };

    /**
     * Get the cache key for contacts.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getCacheKeyForContacts
     * @return {String}
     * @protected
     */
    self._getCacheKeyForContacts = function() {
        // Note: the contacts WS does not take arguments, so we do not need any here.
        return 'mmaMessages:contacts';
    };

    /**
     * Get the cache key for blocked contacts.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getCacheKeyForBlockedContacts
     * @param {Number} userId The user who's contacts we're looking for.
     * @return {String}
     * @protected
     */
    self._getCacheKeyForBlockedContacts = function(userId) {
        return 'mmaMessages:blockedContacts:' + userId;
    };

    /**
     * Get the cache key for a discussion.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getCacheKeyForDiscussion
     * @param {Number} userId The other person with whom the current user is having the discussion.
     * @return {String}
     * @protected
     */
    self._getCacheKeyForDiscussion = function(userId) {
        return 'mmaMessages:discussion:' + userId;
    };

    /**
     * Get the cache key for the list of discussions.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getCacheKeyForDiscussions
     * @return {String}
     * @protected
     */
    self._getCacheKeyForDiscussions = function() {
        return 'mmaMessages:discussions';
    };

    /**
     * Get the cache key for the messaging enabled call.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getCacheKeyForEnabled
     * @return {String}
     * @protected
     */
    self._getCacheKeyForEnabled = function() {
        return 'mmaMessages:enabled';
    };

    /**
     * Get the contacts of the current user.
     *
     * This excludes the blocked users.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getContacts
     * @return {Promise} Resolved with the WS data.
     */
    self.getContacts = function() {
        var presets = {
                cacheKey: self._getCacheKeyForContacts()
            };
        return $mmSite.read('core_message_get_contacts', undefined, presets).then(function(contacts) {
            // Filter contacts with negative ID, they are notifications.
            var validContacts = {};
            angular.forEach(contacts, function(typeContacts, typeName) {
                if (!validContacts[typeName]) {
                    validContacts[typeName] = [];
                }

                angular.forEach(typeContacts, function(contact) {
                    if (contact.id > 0) {
                        validContacts[typeName].push(contact);
                    }
                });
            });
            return validContacts;
        });
    };

    /**
     * Get the name of the events of a discussion.
     * These events aren't used anymore, please just listen to mmaMessagesNewMessageEvent.
     *
     * @param  {Number} userid User ID of the discussion.
     * @return {String}        Name of the event.
     * @deprecated since version 2.10
     */
    self.getDiscussionEventName = function(userid) {
        return mmaMessagesNewMessageEvent + '_' + $mmSite.getUserId() + '_' + userid;
    };

    /**
     * Return the current user's discussion with another user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getDiscussion
     * @param  {Number} userId               The ID of the other user.
     * @param  {Boolean} excludePending      True to exclude messages pending to be sent.
     * @param  {Number} [lfReceivedUnread=0] Number of unread received messages already fetched, so fetch will be done from this.
     * @param  {Number} [lfReceivedRead=0]   Number of read received messages already fetched, so fetch will be done from this.
     * @param  {Number} [lfSentUnread=0]     Number of unread sent messages already fetched, so fetch will be done from this.
     * @param  {Number} [lfSentRead=0]       Number of read sent messages already fetched, so fetch will be done from this.
     * @param  {Boolean} [toDisplay=true]    True if messages will be displayed to the user, either in view or in a notification.
     * @param  {String} [siteId]             Site ID. If not defined, use current site.
     * @return {Promise}                     Promise resolved with messages and a boolean telling if can load more messages.
     */
    self.getDiscussion = function(userId, excludePending, lfReceivedUnread, lfReceivedRead, lfSentUnread, lfSentRead, toDisplay,
                siteId) {
        lfReceivedUnread = lfReceivedUnread || 0;
        lfReceivedRead = lfReceivedRead || 0;
        lfSentUnread = lfSentUnread || 0;
        lfSentRead = lfSentRead || 0;

        var result = {},
            presets = {
                cacheKey: self._getCacheKeyForDiscussion(userId)
            },
            params = {
                useridto: $mmSite.getUserId(),
                useridfrom: userId,
                limitnum: mmaMessagesLimitMessages
            },
            hasReceived,
            hasSent;

        if (lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0) {
            // Do not use cache when retrieving older messages. This is to prevent storing too much data
            // and to prevent inconsistencies between "pages" loaded.
            presets.getFromCache = 0;
            presets.saveToCache = 0;
            presets.emergencyCache = 0;
        }

        // Get message received by current user.
        return self._getRecentMessages(params, presets, lfReceivedUnread, lfReceivedRead, toDisplay, siteId)
                .then(function(response) {
            result.messages = response;
            params.useridto = userId;
            params.useridfrom = $mmSite.getUserId();
            hasReceived = response.length > 0;

            // Get message sent by current user.
            return self._getRecentMessages(params, presets, lfSentUnread, lfSentRead, toDisplay, siteId);
        }).then(function(response) {
            result.messages = result.messages.concat(response);
            hasSent = response.length > 0;

            if (result.messages.length > mmaMessagesLimitMessages) {
                // Sort messages and get the more recent ones.
                result.canLoadMore = true;
                result.messages = self.sortMessages(result.messages);
                result.messages = result.messages.slice(-mmaMessagesLimitMessages);
            } else {
                result.canLoadMore = result.messages.length == mmaMessagesLimitMessages && (!hasReceived || !hasSent);
            }

            if (excludePending) {
                // No need to get offline messages, return the ones we have.
                return result;
            }

            // Get offline messages.
            return $mmaMessagesOffline.getMessages(userId).then(function(offlineMessages) {
                // Mark offline messages as pending.
                angular.forEach(offlineMessages, function(message) {
                    message.pending = true;
                    message.text = message.smallmessage;
                });

                result.messages = result.messages.concat(offlineMessages);
                return result;
            });
        });
    };

    /**
     * Get the discussions of the current user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getDiscussions
     * @return {Promise} Resolved with an object where the keys are the user ID of the other user.
     */
    self.getDiscussions = function() {
        var discussions = {},
            currentUserId = $mmSite.getUserId(),
            params = {
                useridto: currentUserId,
                useridfrom: 0,
                limitnum: mmaMessagesLimitMessages
            },
            presets = {
                cacheKey: self._getCacheKeyForDiscussions()
            };

        // Get recent messages sent to current user.
        return self._getRecentMessages(params, presets).then(function(messages) {

            // Extract the discussions by filtering same senders.
            angular.forEach(messages, function(message) {
                treatRecentMessage(message, message.useridfrom, message.userfromfullname);
            });

            // Now get the last messages sent by the current user.
            params.useridfrom = params.useridto;
            params.useridto = 0;
            return self._getRecentMessages(params, presets);
        }).then(function(messages) {

            // Extract the discussions by filtering same senders.
            angular.forEach(messages, function(message) {
                treatRecentMessage(message, message.useridto, message.usertofullname);
            });

            // Now get unsent messages.
            return $mmaMessagesOffline.getAllMessages();
        }).then(function(offlineMessages) {
            angular.forEach(offlineMessages, function(message) {
                message.pending = true;
                message.text = message.smallmessage;
                treatRecentMessage(message, message.touserid, '');
            });

            return self.getDiscussionsUserImg(discussions).then(function(discussions) {
                storeUsersFromDiscussions(discussions);
                return discussions;
            });
        });

        // Convenience function to treat a recent message, adding it to discussions list if needed.
        function treatRecentMessage(message, userId, userFullname) {
            if (typeof discussions[userId] === 'undefined') {
                discussions[userId] = {
                    fullname: userFullname,
                    profileimageurl: ''
                };

                if (!message.timeread && !message.pending && message.useridfrom != currentUserId) {
                    discussions[userId].unread = true;
                }
            }

            // Extract the most recent message. Pending messages are considered more recent than messages already sent.
            var discMessage = discussions[userId].message;
            if (typeof discMessage === 'undefined' || (!discMessage.pending && message.pending) ||
                    (discMessage.pending == message.pending && (discMessage.timecreated < message.timecreated ||
                    (discMessage.timecreated == message.timecreated && discMessage.id < message.id)))) {

                discussions[userId].message = {
                    id: message.id,
                    user: userId,
                    message: message.text,
                    timecreated: message.timecreated,
                    pending: message.pending
                };
            }
        }
    };

    /**
     * Mark message as read.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#markMessageRead
     * @param   {Number}  messageId   ID of message to mark as read
     * @returns {Promise} Promise resolved with boolean marking success or not.
     */
    self.markMessageRead = function(messageId) {
        var params = {
                'messageid': messageId,
                'timeread': $mmUtil.timestamp()
            };
        return $mmSite.write('core_message_mark_message_read', params);

    };

    /**
     * Mark all messages of a discussion as read.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#markAllMessagesRead
     * @param   {Number}  userIdFrom  User Id for the sender.
     * @returns {Promise} Promise resolved with boolean marking success or not.
     */
    self.markAllMessagesRead = function(userIdFrom) {
        var params = {
                'useridto': $mmSite.getUserId(),
                'useridfrom': userIdFrom
            },
            preSets = {
                typeExpected: 'boolean'
            };
        return $mmSite.write('core_message_mark_all_messages_as_read', params, preSets);

    };

    /**
     * Returns whether or not we can mark all messages as read.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isMarkAllMessagesReadEnabled
     * @return {Boolean}
     */
    self.isMarkAllMessagesReadEnabled = function() {
        return $mmSite.wsAvailable('core_message_mark_all_messages_as_read');
    };

    /**
     * Get user images for all the discussions that don't have one already.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getDiscussionsUserImg
     * @param {Object[]} discussions List of discussions.
     * @return {Promise}             Promise always resolved. Resolve param is the formatted discussions.
     */
    self.getDiscussionsUserImg = function(discussions) {
        var promises = [];

        angular.forEach(discussions, function(discussion) {
            if (!discussion.profileimageurl) {
                // We don't have the user image. Try to retrieve it.
                var promise = $mmUser.getProfile(discussion.message.user, 1, true).then(function(user) {
                    discussion.profileimageurl = user.profileimageurl;
                }, function() {
                    // Error getting profile, resolve promise without adding any extra data.
                });
                promises.push(promise);
            }
        });
        return $q.all(promises).then(function() {
            return discussions;
        });
    };

    /**
     * Get messages according to the params.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getMessages
     * @param  {Object} params            Parameters to pass to the WS.
     * @param  {Object} preSets           Set of presets for the WS.
     * @param  {Boolean} [toDisplay=true] True if messages will be displayed to the user, either in view or in a notification.
     * @param  {String} [siteId]          Site ID. If not defined, use current site.
     * @return {Promise}
     * @protected
     */
    self._getMessages = function(params, preSets, toDisplay, siteId) {
        toDisplay = typeof toDisplay == 'undefined' ? true : toDisplay;
        siteId = siteId || $mmSite.getId();

        params = angular.extend(params, {
            type: 'conversations',
            newestfirst: 1,
        });

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var userId = site.getUserId();

            return site.read('core_message_get_messages', params, preSets).then(function(response) {
                angular.forEach(response.messages, function(message) {
                    message.read = params.read == 0 ? 0 : 1;
                    // Convert times to milliseconds.
                    message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;
                    message.timeread = message.timeread ? message.timeread * 1000 : 0;
                });

                if ($mmApp.isDesktop() && toDisplay && !params.read && params.useridto == userId && params.limitfrom === 0) {
                    // Store the last unread received messages. Don't block the user for this.
                    storeLastReceivedMessageIfNeeded(params.useridfrom, response.messages[0], siteId);
                }

                return response;
            });
        });
    };

    /**
     * Get the most recent messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_getRecentMessages
     * @param  {Object} params              Parameters to pass to the WS.
     * @param  {Object} preSets             Set of presets for the WS.
     * @param  {Number} [limitFromUnread=0] Number of read messages already fetched, so fetch will be done from this number.
     * @param  {Number} [limitFromRead=0]   Number of unread messages already fetched, so fetch will be done from this number.
     * @param  {Boolean} [toDisplay=true]   True if messages will be displayed to the user, either in view or in a notification.
     * @param  {String} [siteId]            Site ID. If not defined, use current site.
     * @return {Promise}
     * @protected
     */
    self._getRecentMessages = function(params, preSets, limitFromUnread, limitFromRead, toDisplay, siteId) {
        limitFromUnread = limitFromUnread || 0;
        limitFromRead = limitFromRead || 0;

        params = angular.extend(params, {
            read: 0,
            limitfrom: limitFromUnread
        });

        return self._getMessages(params, preSets, toDisplay, siteId).then(function(response) {
            var messages = response.messages;
            if (messages) {
                if (messages.length >= params.limitnum) {
                    return messages;
                }

                // We need to fetch more messages.
                params.limitnum = params.limitnum - messages.length;
                params.read = 1;
                params.limitfrom = limitFromRead;

                return self._getMessages(params, preSets, toDisplay, siteId).then(function(response) {
                    if (response.messages) {
                        messages = messages.concat(response.messages);
                    }
                    return messages;
                }, function() {
                    return messages;
                });

            } else {
                return $q.reject();
            }
        });
    };

    /**
     * Get the cache key for the get message preferences call.
     *
     * @return {String} Cache key.
     */
    function getMessagePreferencesCacheKey() {
        return 'mmaMessages:messagePreferences';
    }

    /**
     * Get message preferences.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getMessagePreferences
     * @param  {String} [siteId] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved with the message preferences.
     */
    self.getMessagePreferences = function(siteId) {
        $log.debug('Get message preferences');

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var preSets = {
                    cacheKey: getMessagePreferencesCacheKey()
                };

            return site.read('core_message_get_user_message_preferences', {}, preSets).then(function(data) {
                if (data.preferences) {
                    data.preferences.blocknoncontacts = data.blocknoncontacts;
                    return data.preferences;
                }
                return $q.reject();
            });
        });
    };

    /**
     * Get unread conversations count. Do not cache calls.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getUnreadConversationsCount
     * @param  {Number} [userId] The user id who received the message. If not defined, use current user.
     * @param  {String} [siteId] Site ID. If not defined, use current site.
     * @return {Promise}         Promise resolved with the message unread count.
     */
    self.getUnreadConversationsCount = function(userId, siteId) {
        var params;

        return $mmSitesManager.getSite(siteId).then(function(site) {
            userId = userId || site.getUserId();

            if (site.wsAvailable('core_message_get_unread_conversations_count')) {
                params = {
                        useridto: userId
                    },
                    preSets = {
                        getFromCache: 0,
                        emergencyCache: 0,
                        saveToCache: 0,
                        typeExpected: 'number'
                    };

                return site.read('core_message_get_unread_conversations_count', params, preSets).catch(function() {
                    // Return no messages if the call fails.
                    return 0;
                });
            }

            // Fallback call.
            params = {
                read: 0,
                limitfrom: 0,
                limitnum: mmaMessagesLimitMessages + 1,
                useridto: userId,
                useridfrom: 0,
            };
            return self._getMessages(params, undefined, false, siteId).then(function(response) {
                // Count the discussions by filtering same senders.
                var discussions = {},
                    count;
                angular.forEach(response.messages, function(message) {
                    discussions[message.useridto] = 1;
                });
                count = Object.keys(discussions).length;

                // Add + sign if there are more than the limit reachable.
                return (count > mmaMessagesLimitMessages) ? count + "+" : count;
            }).catch(function() {
                // Return no messages if the call fails.
                return 0;
            });
        });
    };

    /**
     * Get the latest unread received messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#getUnreadReceivedMessages
     * @param  {Boolean} [toDisplay=true] True if messages will be displayed to the user, either in view or in a notification.
     * @param  {Boolean} [forceCache]     True if it should return cached data. Has priority over ignoreCache.
     * @param  {Boolean} [ignoreCache]    True if it should ignore cached data (it will always fail in offline or server down).
     * @param  {String} [siteId]          Site ID. If not defined, use current site.
     * @return {Promise}                  Promise resolved with the message unread count.
     */
    self.getUnreadReceivedMessages = function(toDisplay, forceCache, ignoreCache, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var params = {
                    read: 0,
                    limitfrom: 0,
                    limitnum: mmaMessagesLimitMessages,
                    useridto: site.getUserId(),
                    useridfrom: 0
                },
                preSets = {};

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            return self._getMessages(params, preSets, toDisplay, siteId);
        });
    };

    /**
     * Invalidate all contacts cache.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateAllContactsCache
     * @param {Number} userId    The user ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateAllContactsCache = function(userId, siteId) {
        return self.invalidateContactsCache(siteId).then(function() {
            return self.invalidateBlockedContactsCache(userId, siteId);
        });
    };

    /**
     * Invalidate blocked contacts cache.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateBlockedContactsCache
     * @param {Number} userId    The user ID.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateBlockedContactsCache = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCacheKeyForBlockedContacts(userId));
        });
    };


    /**
     * Invalidate contacts cache.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateContactsCache
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateContactsCache = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCacheKeyForContacts());
        });
    };

    /**
     * Invalidate discussion cache.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateDiscussionCache
     * @param {Number} userId    The user ID with whom the current user is having the discussion.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateDiscussionCache = function(userId, siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCacheKeyForDiscussion(userId));
        });
    };

    /**
     * Invalidate discussions cache.
     *
     * Note that {@link $mmaMessages#getDiscussions} uses the contacts, so we need to invalidate contacts too.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateDiscussionsCache
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateDiscussionsCache = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCacheKeyForDiscussions()).then(function(){
                return self.invalidateContactsCache(siteId);
            });
        });
    };

    /**
     * Invalidate messaging enabled cache.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateEnabledCache
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}
     */
    self.invalidateEnabledCache = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(self._getCacheKeyForEnabled());
        });
    };

    /**
     * Invalidate get message preferences.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#invalidateMessagePreferences
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved when data is invalidated.
     */
    self.invalidateMessagePreferences = function(siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            return site.invalidateWsCacheForKey(getMessagePreferencesCacheKey());
        });
    };

    /**
     * Checks if the a user is blocked by the current user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isBlocked
     * @param {Number} userId The user ID to check against.
     * @return {Promise} Resolved with boolean, rejected when we do not know.
     */
    self.isBlocked = function(userId) {
        return self.getBlockedContacts().then(function(blockedContacts) {
            var blocked = false;
            if (!blockedContacts.users || blockedContacts.users.length < 1) {
                return blocked;
            }
            angular.forEach(blockedContacts.users, function(user) {
                if (userId == user.id) {
                    blocked = true;
                }
            });
            return blocked;
        });
    };

    /**
     * Checks if the a user is a contact of the current user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isContact
     * @param {Number} userId The user ID to check against.
     * @return {Promise} Resolved with boolean, rejected when we do not know.
     */
    self.isContact = function(userId) {
        return self.getContacts().then(function(contacts) {
            var isContact = false,
                types = ['online', 'offline'];

            angular.forEach(types, function(type) {
                if (contacts[type] && contacts[type].length > 0) {
                    angular.forEach(contacts[type], function(user) {
                        if (userId == user.id) {
                            isContact = true;
                        }
                    });
                }
            });

            return isContact;
        });
    };

    /**
     * Returns whether or not we can count unread messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isMessageCountEnabled
     * @param {Boolean} [useFallback=false] If we can use the fallback function.
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isMessageCountEnabled = function(useFallback) {
        return $mmSite.wsAvailable('core_message_get_unread_conversations_count') ||
            (useFallback && $mmSite.wsAvailable('core_message_get_messages'));
    };

    /**
     * Returns whether or not messaging is enabled for the current site.
     *
     * This could call a WS so do not abuse this method.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#_isMessagingEnabled
     * @return {Promise} Resolved when enabled, otherwise rejected.
     * @protected
     */
    self._isMessagingEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            var enabled = site.canUseAdvancedFeature('messaging', 'unknown');

            if (enabled === 'unknown') {
                // On older version we cannot check other than calling a WS. If the request
                // fails there is a very high chance that messaging is disabled.
                $log.debug('Using WS call to check if messaging is enabled.');
                return site.read('core_message_search_contacts', {
                    searchtext: 'CheckingIfMessagingIsEnabled',
                    onlymycourses: 0
                }, {
                    emergencyCache: false,
                    cacheKey: self._getCacheKeyForEnabled()
                });
            }

            if (enabled) {
                return true;
            }
            return $q.reject();
        });
    };

   /**
     * Returns whether or not messaging is enabled for a certain site.
     *
     * This could call a WS so do not abuse this method.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isMessagingEnabledForSite
     * @param {String} siteid Site ID.
     * @return {Promise}      Resolved when enabled, otherwise rejected.
     */
    self.isMessagingEnabledForSite = function(siteid) {
        return $mmSitesManager.getSite(siteid).then(function(site) {
            if (!site.canUseAdvancedFeature('messaging') || !site.wsAvailable('core_message_get_messages')) {
                return $q.reject();
            }

            // On older version we cannot check other than calling a WS. If the request
            // fails there is a very high chance that messaging is disabled.
            $log.debug('Using WS call to check if messaging is enabled.');
            return site.read('core_message_search_contacts', {
                searchtext: 'CheckingIfMessagingIsEnabled',
                onlymycourses: 0
            }, {
                emergencyCache: false,
                cacheKey: self._getCacheKeyForEnabled()
            });
        });
    };

    /**
     * Returns whether or not the message preferences are enabled for the current site.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isMessagePreferencesEnabled
     * @return {Boolean} True if enabled, false otherwise.
     */
    self.isMessagePreferencesEnabled = function() {
        return $mmSite.wsAvailable('core_message_get_user_message_preferences');
    };

    /**
     * Returns whether or not the plugin is enabled in a certain site.
     *
     * Do not abuse this method.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            if (!site.canUseAdvancedFeature('messaging')) {
                return false;
            } else if (!site.wsAvailable('core_message_get_messages')) {
                return false;
            } else {
                return self._isMessagingEnabled(siteId).then(function() {
                    return true;
                });
            }
        });
    };

    /**
     * Returns whether or not we can search contacts.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isSearchEnabled
     * @return {Boolean}
     * @deprecated since v3.3. Please use $mmaMessages#isSearchContactsEnabled instead. MOBILE-1789.
     */
    self.isSearchEnabled = function() {
        $log.debug('$mmaMessages#isSearchEnabled has been deprecated, please use $mmaMessages#isSearchContactsEnabled instead');
        return self.isSearchContactsEnabled();
    };

    /**
     * Returns whether or not we can search contacts.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isSearchContactsEnabled
     * @return {Boolean}
     */
    self.isSearchContactsEnabled = function() {
        return $mmSite.wsAvailable('core_message_search_contacts');
    };

    /**
     * Returns whether or not we can search messages.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#isSearchMessagesEnabled
     * @return {Boolean}
     */
    self.isSearchMessagesEnabled = function() {
        return $mmSite.wsAvailable('core_message_data_for_messagearea_search_messages');
    };

    /**
     * Remove a contact.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#removeContact
     * @param {Number} to User ID of the person to remove.
     * @return {Promise}
     */
    self.removeContact = function(userId) {
        return $mmSite.write('core_message_delete_contacts', {
            userids: [ userId ]
        }, {
            responseExpected: false
        }).then(function() {
            return self.invalidateContactsCache();
        });
    };

    /**
     * Search for contacts.
     *
     * By default this only returns the first 100 contacts, but note that the WS can return thousands
     * of results which would take a while to process. The limit here is just a convenience to
     * prevent viewed to crash because too many DOM elements are created.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#searchContacts
     * @param {String} query The query string.
     * @param {Number} [limit=100] The number of results to return, 0 for none.
     * @return {Promise}
     */
    self.searchContacts = function(query, limit) {
        var data = {
                searchtext: query,
                onlymycourses: 0
            },
            preSets = {
                getFromCache: 0 // Always try to get updated data. If it fails, it will get it from cache.
            };

        limit = typeof limit === 'undefined' ? 100 : limit;

        return $mmSite.read('core_message_search_contacts', data, preSets).then(function(contacts) {
            if (limit && contacts.length > limit) {
                contacts = contacts.splice(0, limit);
            }
            $mmUser.storeUsers(contacts);
            return contacts;
        });
    };

    /**
     * Search for all the messges with a specific text.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#searchMessages
     * @param  {String} query         The query string
     * @param  {Number} [userId]      The user ID. If not defined, current user.
     * @param  {Number} [limitFrom]   Position of the first result to get. Defaults to 0.
     * @param  {Number} [limitNumber] Number of results to get. Defaults to mmaMessagesLimitSearchMessages.
     * @return {Promise}              Promise resolved with the results.
     */
    self.searchMessages = function(query, userId, limitFrom, limitNum) {
        var param = {
                userid: userId || $mmSite.getUserId(),
                search: query,
                limitfrom: limitFrom || 0,
                limitnum: limitNum || mmaMessagesLimitSearchMessages
            },
            preSets = {
                getFromCache: 0 // Always try to get updated data. If it fails, it will get it from cache.
            };

        return $mmSite.read('core_message_data_for_messagearea_search_messages', param, preSets).then(function(searchResults) {
            return searchResults.contacts;
        });
    };

    /**
     * Send a message to someone.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#sendMessage
     * @param {Number} to User ID to send the message to.
     * @param {String} message The message to send
     * @return {Promise}       Promise resolved with:
     *                                 - sent (Boolean) True if message was sent to server, false if stored in device.
     *                                 - message (Object) If sent=false, contains the stored message.
     */
    self.sendMessage = function(to, message, siteId) {
        siteId = siteId || $mmSite.getId();

        if (!$mmApp.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // Check if this conversation already has offline messages.
        // If so, store this message since they need to be sent in order.
        return $mmaMessagesOffline.hasMessages(to, siteId).catch(function() {
            // Error, it's safer to assume it has messages.
            return true;
        }).then(function(hasStoredMessages) {
            if (hasStoredMessages) {
                return storeOffline();
            }

            // Online and no messages stored. Send it to server.
            return self.sendMessageOnline(to, message).then(function() {
                return {sent: true};
            }).catch(function(data) {
                if (data.wserror) {
                    // It's a WebService error, the user cannot send the message so don't store it.
                    return $q.reject(data.error);
                } else {
                    // Error sending message, store it to retry later.
                    return storeOffline();
                }
            });
        });

        // Convenience function to store a message to be synchronized later.
        function storeOffline() {
            return $mmaMessagesOffline.saveMessage(to, message, siteId).then(function(entry) {
                return {
                    sent: false,
                    message: entry
                };
            });
        }
    };

    /**
     * Send a message to someone. It will fail if offline or cannot connect.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#sendMessageOnline
     * @param {Number} to        User ID to send the message to.
     * @param {String} message   The message to send
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if success, rejected if failure. Reject param is an object with:
     *                                   - error: The error message.
     *                                   - wserror: True if it's an error returned by the WebService, false otherwise.
     */
    self.sendMessageOnline = function(to, message, siteId) {
        var messages = [
                {
                    touserid: to,
                    text: message,
                    textformat: 1
                }
            ];
        return self.sendMessagesOnline(messages, siteId).catch(function(error) {
            return $q.reject({
                error: error,
                wserror: $mmUtil.isWebServiceError(error)
            });
        }).then(function(response) {
            if (response && response[0] && response[0].msgid === -1) {
                // There was an error, and it should be translated already.
                return $q.reject({
                    error: response[0].errormessage,
                    wserror: true
                });
            }
            return self.invalidateDiscussionCache(to, siteId).catch(function() {
                // Ignore errors.
            });
        });
    };

    /**
     * Send some messages. It will fail if offline or cannot connect.
     * IMPORTANT: Sending several messages at once for the same discussions can cause problems with display order,
     * since messages with same timecreated aren't ordered by ID.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#sendMessagesOnline
     * @param  {Object} messages Messages to send. Each message must contain touserid, text and textformat.
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved if success, rejected if failure. Promise resolved doesn't mean that messages
     *                           have been sent, the resolve param can contain errors for messages not sent.
     */
    self.sendMessagesOnline = function(messages, siteId) {
        return $mmSitesManager.getSite(siteId).then(function(site) {
            var data = {
                    messages: messages
                };

            return site.write('core_message_send_instant_messages', data);
        });
    };

    /**
     * Helper method to sort messages by time.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#sortMessages
     * @param {Object[]} messages Array of messages containing the key 'timecreated'.
     * @return {Object[]} Messages sorted with most recent last.
     */
    self.sortMessages = function(messages) {
        return messages.sort(function (a, b) {
            var timecreatedA, timecreatedB;

            // Pending messages last.
            if (a.pending && !b.pending) {
                return 1;
            } else if (!a.pending && b.pending) {
                return -1;
            }

            timecreatedA = parseInt(a.timecreated, 10);
            timecreatedB = parseInt(b.timecreated, 10);
            if (timecreatedA == timecreatedB && a.id) {
                // Same time, sort by ID.
                return a.id >= b.id ? 1 : -1;
            }
            return timecreatedA >= timecreatedB ? 1 : -1;
        });
    };

    /**
     * Store user data from contacts in local DB.
     *
     * @param {Object[]} contactTypes List of contacts grouped in types.
     */
    function storeUsersFromAllContacts(contactTypes) {
        angular.forEach(contactTypes, function(contacts) {
            $mmUser.storeUsers(contacts);
        });
    }

    /**
     * Store user data from discussions in local DB.
     *
     * @param {Object[]} discussions List of discussions.
     */
    function storeUsersFromDiscussions(discussions) {
        angular.forEach(discussions, function(discussion, userid) {
            if (typeof userid != 'undefined' && !isNaN(parseInt(userid))) {
                $mmUser.storeUser(userid, discussion.fullname, discussion.profileimageurl);
            }
        });
    }

    /**
     * Store the last received message if it's newer than the last stored.
     *
     * @param  {Number} userIdFrom ID of the useridfrom retrieved, 0 for all users.
     * @param  {Object} message    Last message received.
     * @param  {String} siteId     Site ID.
     * @return {Promise}           Promise resolved when done.
     */
    function storeLastReceivedMessageIfNeeded(userIdFrom, message, siteId) {
        var component = mmaMessagesPushSimulationComponent;

        // Get the last received message.
        return $mmEmulatorHelper.getLastReceivedNotification(component, siteId).then(function(lastMessage) {
            if (userIdFrom > 0 && (!message || !lastMessage)) {
                // Seeing a single discussion. No received message or cannot know if it really is the last received message. Stop.
                return;
            }

            if (message && lastMessage && message.timecreated <= lastMessage.timecreated) {
                // The message isn't newer than the stored message, don't store it.
                return;
            }

            return $mmEmulatorHelper.storeLastReceivedNotification(component, message, siteId);
        });
    }

    /**
     * Unblock a user.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaMessages#unblockContact
     * @param {Number} to User ID of the person to unblock.
     * @return {Promise}
     */
    self.unblockContact = function(userId) {
        return $mmSite.write('core_message_unblock_contacts', {
            userids: [ userId ]
        }, {
            responseExpected: false
        }).then(function() {
            return self.invalidateAllContactsCache($mmSite.getUserId());
        });
    };

    return self;
});
