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

angular.module('mm.addons.mod_chat')

/**
 * Chat service.
 *
 * @module mm.addons.mod_chat
 * @ngdoc service
 * @name $mmaModChat
 */
.factory('$mmaModChat', function($q, $mmSite, $mmUser, $mmSitesManager) {
    var self = {};


    /**
     * Return whether or not the plugin is enabled in a certain site. Plugin is enabled if the chat WS are available.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#isPluginEnabled
     * @param  {String} [siteId] Site ID. If not defined, current site.
     * @return {Promise}         Promise resolved with true if plugin is enabled, rejected or resolved with false otherwise.
     */
    self.isPluginEnabled = function(siteId) {
        siteId = siteId || $mmSite.getId();

        return $mmSitesManager.getSite(siteId).then(function(site) {
            return  site.wsAvailable('mod_chat_get_chats_by_courses') &&
                    site.wsAvailable('mod_chat_login_user') &&
                    site.wsAvailable('mod_chat_get_chat_users') &&
                    site.wsAvailable('mod_chat_send_chat_message') &&
                    site.wsAvailable('mod_chat_get_chat_latest_messages');
        });
    };

    /**
     * Get a chat.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#getChat
     * @param {Number} courseid Course ID.
     * @param {Number} cmid     Course module ID.
     * @param {Boolean} [refresh] True when we should not get the value from the cache.
     * @return {Promise}        Promise resolved when the chat is retrieved.
     */
    self.getChat = function(courseid, cmid, refresh) {
        var params = {
            courseids: [courseid]
            },
            preSets = {};

        if (refresh) {
            preSets.getFromCache = false;
        }

        return $mmSite.read('mod_chat_get_chats_by_courses', params, preSets).then(function(response) {
            if (response.chats) {
                var currentChat;
                angular.forEach(response.chats, function(chat) {
                    if (chat.coursemodule == cmid) {
                        currentChat = chat;
                    }
                });
                if (currentChat) {
                    return currentChat;
                }
            }
            return $q.reject();
        });
    };

    /**
     * Get a chat.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#loginUser
     * @param {Number} chatId   Chat instance ID.
     * @return {Promise}        Promise resolved when the WS is executed.
     */
    self.loginUser = function(chatId) {
        var params = {
            chatid: chatId
        };

        return $mmSite.write('mod_chat_login_user', params).then(function(response) {
            if (response.chatsid) {
                return response.chatsid;
            }
            return $q.reject();
        });
    };

    /**
     * Report a chat as being viewed.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#logView
     * @param {String} id Module ID.
     * @return {Promise}  Promise resolved when the WS call is successful.
     */
    self.logView = function(id) {
        if (id) {
            var params = {
                chatid: id
            };
            return $mmSite.write('mod_chat_view_chat', params);
        }
        return $q.reject();
    };

    /**
     * Send a message to a chat.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#sendMessage
     * @param {Number} chatsid  Chat sessiond ID.
     * @param {String} message  Message text.
     * @param {Number} beep     Beep user ID.
     * @return {Promise}        Promise resolved when the WS is executed.
     */
    self.sendMessage = function(chatsid, message, beep) {
        var params = {
            chatsid: chatsid,
            messagetext: message,
            beepid: beep
        };

        return $mmSite.write('mod_chat_send_chat_message', params).then(function(response) {
            if (response.messageid) {
                return response.messageid;
            }
            return $q.reject();
        });
    };

    /**
     * Get the latest messages from a chat.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#getLatestMessages
     * @param {Number} chatsid  Chat sessiond ID.
     * @param {Number} lasttime Last time when messages were retrieved.
     * @return {Promise}        Promise resolved when the WS is executed.
     */
    self.getLatestMessages = function(chatsid, lasttime) {
        var params = {
            chatsid: chatsid,
            chatlasttime: lasttime
        };
        var preSets = {
            getFromCache: false
        };

        return $mmSite.read('mod_chat_get_chat_latest_messages', params, preSets);
    };

    /**
     * Get user data for messages since they only have userid.
     *
     * @module mm.addons.messages
     * @ngdoc method
     * @name $mmaModChat#getMessagesUserData
     * @param {Object[]} messages    Messages to get the data for.
     * @param {Number}   courseid    ID of the course the messages belong to.
     * @return {Promise}             Promise always resolved. Resolve param is the formatted messages.
     */
    self.getMessagesUserData = function(messages, courseid) {
        var promises = [];

        angular.forEach(messages, function(message) {
            var promise = $mmUser.getProfile(message.userid, courseid, true).then(function(user) {
                message.userfullname = user.fullname;
                message.userprofileimageurl = user.profileimageurl;
            }, function() {
                // Error getting profile. Set default data.
                message.userfullname = message.userid;
            });
            promises.push(promise);
        });
        return $q.all(promises).then(function() {
            return messages;
        });
    };

    /**
     * Get the actives users of a current chat.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#getChatUsers
     * @param {Number} chatsid  Chat sessiond ID.
     * @return {Promise}        Promise resolved when the WS is executed.
     */
    self.getChatUsers = function(chatsid) {
        var params = {
            chatsid: chatsid
        };
        var preSets = {
            getFromCache: false
        };

        return $mmSite.read('mod_chat_get_chat_users', params, preSets);
    };

    return self;
});