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
.factory('$mmaModChat', function($q, $mmSite) {
    var self = {};


    /**
     * Return whether or not the plugin is enabled. Plugin is enabled if the chat WS are available.
     *
     * @module mm.addons.mod_chat
     * @ngdoc method
     * @name $mmaModChat#isPluginEnabled
     * @return {Boolean} True if plugin is enabled, false otherwise.
     */
    self.isPluginEnabled = function() {
        return  $mmSite.wsAvailable('mod_chat_get_chats_by_courses') &&
                $mmSite.wsAvailable('mod_chat_login_user') &&
                $mmSite.wsAvailable('mod_chat_get_chat_users') &&
                $mmSite.wsAvailable('mod_chat_send_chat_message') &&
                $mmSite.wsAvailable('mod_chat_get_chat_latest_messages');
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

    return self;
});