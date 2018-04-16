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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Service that provides some features for chats.
 */
@Injectable()
export class AddonModChatProvider {
    static COMPONENT = 'mmaModChat';
    static POLL_INTERVAL = 4000;

    constructor(private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider) {}

    /**
     * Get a chat.
     *
     * @param  {number}  courseId        Course ID.
     * @param  {number}  cmId            Course module ID.
     * @param  {boolean} [refresh=false] True when we should not get the value from the cache.
     * @return {Promise<any>} Promise resolved when the chat is retrieved.
     */
    getChat(courseId: number, cmId: number, refresh: boolean = false): Promise<any> {
        const params = {
            courseids: [courseId]
        };
        const preSets = {
            getFromCache: refresh ? false : undefined,
        };

        return this.sitesProvider.getCurrentSite().read('mod_chat_get_chats_by_courses', params, preSets).then((response) => {
            if (response.chats) {
                const chat = response.chats.find((chat) => chat.coursemodule == cmId);
                if (chat) {
                    return chat;
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Log the user into a chat room.
     *
     * @param  {number} chatId Chat instance ID.
     * @return {Promise<any>} Promise resolved when the WS is executed.
     */
    loginUser(chatId: number): Promise<any> {
        const params = {
            chatid: chatId
        };

        return this.sitesProvider.getCurrentSite().write('mod_chat_login_user', params).then((response) => {
            if (response.chatsid) {
                return response.chatsid;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Report a chat as being viewed.
     *
     * @param  {number} chatId Chat instance ID.
     * @return {Promise<any>} Promise resolved when the WS call is executed.
     */
    logView(chatId: number): Promise<any> {
        const params = {
            chatid: chatId
        };

        return this.sitesProvider.getCurrentSite().write('mod_chat_view_chat', params);
    }

    /**
     * Send a message to a chat.
     *
     * @param  {number} sessionId  Chat sessiond ID.
     * @param  {string} message    Message text.
     * @param  {number} beepUserId Beep user ID.
     * @return {Promise<any>} Promise resolved when the WS is executed.
     */
    sendMessage(sessionId: number, message: string, beepUserId: number): Promise<any> {
        const params = {
            chatsid: sessionId,
            messagetext: message,
            beepid: beepUserId
        };

        return this.sitesProvider.getCurrentSite().write('mod_chat_send_chat_message', params).then((response) => {
            if (response.messageid) {
                return response.messageid;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get the latest messages from a chat session.
     *
     * @param  {number} sessionId Chat sessiond ID.
     * @param  {number} lastTime  Last time when messages were retrieved.
     * @return {Promise<any>} Promise resolved when the WS is executed.
     */
    getLatestMessages(sessionId: number, lastTime: number): Promise<any> {
        const params = {
            chatsid: sessionId,
            chatlasttime: lastTime
        };

        /* We use write to not use cache. It doesn't make sense to store the messages in cache
           because we won't be able to retireve them if AddonModChatProvider.loginUser fails. */
        return this.sitesProvider.getCurrentSite().write('mod_chat_get_chat_latest_messages', params);
    }

    /**
     * Get user data for messages since they only have userid.
     *
     * @param  {any[]}  messages Messages to get the user data for.
     * @param  {number} courseId ID of the course the messages belong to.
     * @return {Promise<any>} Promise always resolved with the formatted messages.
     */
    getMessagesUserData(messages: any[], courseId: number): Promise<any> {
        const promises = messages.map((message) => {
            return this.userProvider.getProfile(message.userid, courseId, true).then((user) => {
                message.userfullname = user.fullname;
                message.userprofileimageurl = user.profileimageurl;
            }).catch(() => {
                // Error getting profile. Set default data.
                message.userfullname = message.userid;
            });
        });

        return Promise.all(promises).then(() => {
            return messages;
        });
    }

    /**
     * Get the actives users of a current chat.
     *
     * @param  {number} sessionId Chat sessiond ID.
     * @return {Promise<any>} Promise resolved when the WS is executed.
     */
    getChatUsers(sessionId: number): Promise<any> {
        const params = {
            chatsid: sessionId
        };
        const preSets = {
            getFromCache: false
        };

        return this.sitesProvider.getCurrentSite().read('mod_chat_get_chat_users', params, preSets);
    }
}
