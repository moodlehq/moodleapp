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
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';

/**
 * Service that provides some features for chats.
 */
@Injectable()
export class AddonModChatProvider {
    static COMPONENT = 'mmaModChat';
    static POLL_INTERVAL = 4000;

    protected ROOT_CACHE_KEY = 'AddonModChat:';

    constructor(private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider,
        private logHelper: CoreCourseLogHelperProvider, protected utils: CoreUtilsProvider, private translate: TranslateService) {}

    /**
     * Get a chat.
     *
     * @param {number} courseId Course ID.
     * @param {number} cmId Course module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the chat is retrieved.
     */
    getChat(courseId: number, cmId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseids: [courseId]
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getChatsCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            return site.read('mod_chat_get_chats_by_courses', params, preSets).then((response) => {
                if (response.chats) {
                    const chat = response.chats.find((chat) => chat.coursemodule == cmId);
                    if (chat) {
                        return chat;
                    }
                }

                return Promise.reject(null);
            });
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
     * @param  {number} id Chat instance ID.
     * @param {string} [name] Name of the chat.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}  Promise resolved when the WS call is successful.
     */
    logView(id: number, name?: string, siteId?: string): Promise<any> {
        const params = {
            chatid: id
        };

        return this.logHelper.logSingle('mod_chat_view_chat', params, AddonModChatProvider.COMPONENT, id, name, 'chat', {}, siteId);
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
                // Error getting profile, most probably the user is deleted.
                message.userfullname = this.translate.instant('core.deleteduser') + ' ' + message.userid;
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

    /**
     * Return whether WS for passed sessions are available.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with a boolean.
     */
    areSessionsAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('mod_chat_get_sessions') && site.wsAvailable('mod_chat_get_session_messages');
        });
    }

    /**
     * Get chat sessions.
     *
     * @param {number} chatId Chat ID.
     * @param {number} [groupId=0] Group ID, 0 means that the function will determine the user group.
     * @param {boolean} [showAll=false] Whether to include incomplete sessions or not.
     * @param {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of sessions.
     * @since 3.5
     */
    getSessions(chatId: number, groupId: number = 0, showAll: boolean = false, ignoreCache: boolean = false, siteId?: string):
            Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                chatid: chatId,
                groupid: groupId,
                showall: showAll ? 1 : 0
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getSessionsCacheKey(chatId, groupId, showAll),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };
            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_chat_get_sessions', params, preSets).then((response) => {
                if (!response || !response.sessions) {
                    return Promise.reject(null);
                }

                return response.sessions;
            });
        });
    }

    /**
     * Get chat session messages.
     *
     * @param {number} chatId Chat ID.
     * @param {number} sessionStart Session start time.
     * @param {number} sessionEnd Session end time.
     * @param {number} [groupId=0] Group ID, 0 means that the function will determine the user group.
     * @param {boolean} [ignoreCache=false] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of messages.
     * @since 3.5
     */
    getSessionMessages(chatId: number, sessionStart: number, sessionEnd: number, groupId: number = 0, ignoreCache: boolean = false,
            siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                chatid: chatId,
                sessionstart: sessionStart,
                sessionend: sessionEnd,
                groupid: groupId
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getSessionMessagesCacheKey(chatId, sessionStart, groupId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };
            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('mod_chat_get_session_messages', params, preSets).then((response) => {
                if (!response || !response.messages) {
                    return Promise.reject(null);
                }

                return response.messages;
            });
        });
    }

    /**
     * Invalidate chats.
     *
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateChats(courseId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getChatsCacheKey(courseId));
    }

    /**
     * Invalidate chat sessions.
     *
     * @param {number} chatId Chat ID.
     * @param {number} [groupId=0] Group ID, 0 means that the function will determine the user group.
     * @param {boolean} [showAll=false] Whether to include incomplete sessions or not.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSessions(chatId: number, groupId: number = 0, showAll: boolean = false): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getSessionsCacheKey(chatId, groupId, showAll));
    }

    /**
     * Invalidate all chat sessions.
     *
     * @param {number} chatId Chat ID.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllSessions(chatId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKeyStartingWith(this.getSessionsCacheKeyPrefix(chatId));
    }

    /**
     * Invalidate chat session messages.
     *
     * @param {number} chatId Chat ID.
     * @param {number} sessionStart Session start time.
     * @param {number} [groupId=0] Group ID, 0 means that the function will determine the user group.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSessionMessages(chatId: number, sessionStart: number, groupId: number = 0): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getSessionMessagesCacheKey(chatId, sessionStart, groupId));
    }

    /**
     * Invalidate all chat session messages.
     *
     * @param {number} chatId Chat ID.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateAllSessionMessages(chatId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKeyStartingWith(this.getSessionMessagesCacheKeyPrefix(chatId));
    }

    /**
     * Get cache key for chats WS call.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getChatsCacheKey(courseId: number): string {
        return  this.ROOT_CACHE_KEY + 'chats:' + courseId;
    }

    /**
     * Get cache key for sessions WS call.
     *
     * @param {number} chatId Chat ID.
     * @param {number} groupId Goup ID, 0 means that the function will determine the user group.
     * @param {boolean} showAll Whether to include incomplete sessions or not.
     * @return {string} Cache key.
     */
    protected getSessionsCacheKey(chatId: number, groupId: number, showAll: boolean): string {
        return  this.getSessionsCacheKeyPrefix(chatId) + groupId + ':' + (showAll ? 1 : 0);
    }

    /**
     * Get cache key prefix for sessions WS call.
     *
     * @param {number} chatId Chat ID.
     * @return {string} Cache key prefix.
     */
    protected getSessionsCacheKeyPrefix(chatId: number): string {
        return  this.ROOT_CACHE_KEY + 'sessions:' + chatId + ':';
    }

    /**
     * Get cache key for session messages WS call.
     *
     * @param {number} chatId Chat ID.
     * @param {number} sessionStart Session start time.
     * @param {number} groupId Group ID, 0 means that the function will determine the user group.
     * @return {string} Cache key.
     */
    protected getSessionMessagesCacheKey(chatId: number, sessionStart: number, groupId: number): string {
        return this.getSessionMessagesCacheKeyPrefix(chatId) + sessionStart + ':' + groupId;
    }

    /**
     * Get cache key prefix for session messages WS call.
     *
     * @param {number} chatId Chat ID.
     * @return {string} Cache key prefix.
     */
    protected getSessionMessagesCacheKeyPrefix(chatId: number): string {
        return this.ROOT_CACHE_KEY + 'sessionsMessages:' + chatId + ':';
    }
}
