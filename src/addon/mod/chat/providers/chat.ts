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

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCourseLogHelperProvider } from '@core/course/providers/log-helper';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning, CoreWSExternalFile } from '@providers/ws';
import { AddonModChatMessageForView, AddonModChatSessionMessageForView } from './helper';

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
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the chat is retrieved.
     */
    getChat(courseId: number, cmId: number, siteId?: string): Promise<AddonModChatChat> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                courseids: [courseId]
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getChatsCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            return site.read('mod_chat_get_chats_by_courses', params, preSets)
                    .then((response: AddonModChatGetChatsByCoursesResult): any => {

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
     * @param chatId Chat instance ID.
     * @return Promise resolved when the WS is executed.
     */
    loginUser(chatId: number): Promise<string> {
        const params = {
            chatid: chatId
        };

        return this.sitesProvider.getCurrentSite().write('mod_chat_login_user', params)
                .then((response: AddonModChatLoginUserResult): any => {

            if (response.chatsid) {
                return response.chatsid;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Report a chat as being viewed.
     *
     * @param id Chat instance ID.
     * @param name Name of the chat.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the WS call is successful.
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
     * @param sessionId Chat sessiond ID.
     * @param message Message text.
     * @param beepUserId Beep user ID.
     * @return Promise resolved when the WS is executed.
     */
    sendMessage(sessionId: string, message: string, beepUserId: number): Promise<number> {
        const params = {
            chatsid: sessionId,
            messagetext: message,
            beepid: beepUserId
        };

        return this.sitesProvider.getCurrentSite().write('mod_chat_send_chat_message', params)
                .then((response: AddonModChatSendChatMessageResult): any => {

            if (response.messageid) {
                return response.messageid;
            }

            return Promise.reject(null);
        });
    }

    /**
     * Get the latest messages from a chat session.
     *
     * @param sessionId Chat sessiond ID.
     * @param lastTime Last time when messages were retrieved.
     * @return Promise resolved when the WS is executed.
     */
    getLatestMessages(sessionId: string, lastTime: number): Promise<AddonModChatGetChatLatestMessagesResult> {
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
     * @param messages Messages to get the user data for.
     * @param courseId ID of the course the messages belong to.
     * @return Promise always resolved with the formatted messages.
     */
    getMessagesUserData(messages: (AddonModChatMessage | AddonModChatSessionMessage)[], courseId: number)
            : Promise<(AddonModChatMessageForView | AddonModChatSessionMessageForView)[]> {

        const promises = messages.map((message: AddonModChatMessageForView | AddonModChatSessionMessageForView) => {
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
     * @param sessionId Chat sessiond ID.
     * @return Promise resolved when the WS is executed.
     */
    getChatUsers(sessionId: string): Promise<AddonModChatGetChatUsersResult> {
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
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with a boolean.
     */
    areSessionsAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('mod_chat_get_sessions') && site.wsAvailable('mod_chat_get_session_messages');
        });
    }

    /**
     * Get chat sessions.
     *
     * @param chatId Chat ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of sessions.
     * @since 3.5
     */
    getSessions(chatId: number, groupId: number = 0, showAll: boolean = false, ignoreCache: boolean = false, siteId?: string):
            Promise<AddonModChatSession[]> {

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

            return site.read('mod_chat_get_sessions', params, preSets).then((response: AddonModChatGetSessionsResult): any => {
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
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param sessionEnd Session end time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of messages.
     * @since 3.5
     */
    getSessionMessages(chatId: number, sessionStart: number, sessionEnd: number, groupId: number = 0, ignoreCache: boolean = false,
            siteId?: string): Promise<AddonModChatSessionMessage[]> {

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

            return site.read('mod_chat_get_session_messages', params, preSets)
                    .then((response: AddonModChatGetSessionMessagesResult): any => {

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
     * @param courseId Course ID.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateChats(courseId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getChatsCacheKey(courseId));
    }

    /**
     * Invalidate chat sessions.
     *
     * @param chatId Chat ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateSessions(chatId: number, groupId: number = 0, showAll: boolean = false): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getSessionsCacheKey(chatId, groupId, showAll));
    }

    /**
     * Invalidate all chat sessions.
     *
     * @param chatId Chat ID.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllSessions(chatId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKeyStartingWith(this.getSessionsCacheKeyPrefix(chatId));
    }

    /**
     * Invalidate chat session messages.
     *
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateSessionMessages(chatId: number, sessionStart: number, groupId: number = 0): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKey(this.getSessionMessagesCacheKey(chatId, sessionStart, groupId));
    }

    /**
     * Invalidate all chat session messages.
     *
     * @param chatId Chat ID.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllSessionMessages(chatId: number): Promise<any> {
        const site = this.sitesProvider.getCurrentSite();

        return site.invalidateWsCacheForKeyStartingWith(this.getSessionMessagesCacheKeyPrefix(chatId));
    }

    /**
     * Get cache key for chats WS call.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getChatsCacheKey(courseId: number): string {
        return  this.ROOT_CACHE_KEY + 'chats:' + courseId;
    }

    /**
     * Get cache key for sessions WS call.
     *
     * @param chatId Chat ID.
     * @param groupId Goup ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @return Cache key.
     */
    protected getSessionsCacheKey(chatId: number, groupId: number, showAll: boolean): string {
        return  this.getSessionsCacheKeyPrefix(chatId) + groupId + ':' + (showAll ? 1 : 0);
    }

    /**
     * Get cache key prefix for sessions WS call.
     *
     * @param chatId Chat ID.
     * @return Cache key prefix.
     */
    protected getSessionsCacheKeyPrefix(chatId: number): string {
        return  this.ROOT_CACHE_KEY + 'sessions:' + chatId + ':';
    }

    /**
     * Get cache key for session messages WS call.
     *
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @return Cache key.
     */
    protected getSessionMessagesCacheKey(chatId: number, sessionStart: number, groupId: number): string {
        return this.getSessionMessagesCacheKeyPrefix(chatId) + sessionStart + ':' + groupId;
    }

    /**
     * Get cache key prefix for session messages WS call.
     *
     * @param chatId Chat ID.
     * @return Cache key prefix.
     */
    protected getSessionMessagesCacheKeyPrefix(chatId: number): string {
        return this.ROOT_CACHE_KEY + 'sessionsMessages:' + chatId + ':';
    }
}

/**
 * Chat returned by mod_chat_get_chats_by_courses.
 */
export type AddonModChatChat = {
    id: number; // Chat id.
    coursemodule: number; // Course module id.
    course: number; // Course id.
    name: string; // Chat name.
    intro: string; // The Chat intro.
    introformat: number; // Intro format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    introfiles?: CoreWSExternalFile[]; // @since 3.2.
    chatmethod?: string; // Chat method (sockets, ajax, header_js).
    keepdays?: number; // Keep days.
    studentlogs?: number; // Student logs visible to everyone.
    chattime?: number; // Chat time.
    schedule?: number; // Schedule type.
    timemodified?: number; // Time of last modification.
    section?: number; // Course section id.
    visible?: boolean; // Visible.
    groupmode?: number; // Group mode.
    groupingid?: number; // Group id.
};

/**
 * Chat user returned by mod_chat_get_chat_users.
 */
export type AddonModChatUser = {
    id: number; // User id.
    fullname: string; // User full name.
    profileimageurl: string; // User picture URL.
};

/**
 * Meessage returned by mod_chat_get_chat_latest_messages.
 */
export type AddonModChatMessage = {
    id: number; // Message id.
    userid: number; // User id.
    system: boolean; // True if is a system message (like user joined).
    message: string; // Message text.
    timestamp: number; // Timestamp for the message.
};

/**
 * Message with user data.
 */
export type AddonModChatMessageWithUserData = AddonModChatMessage & AddonModChatMessageUserData;

/**
 * Chat session.
 */
export type AddonModChatSession = {
    sessionstart: number; // Session start time.
    sessionend: number; // Session end time.
    sessionusers: AddonModChatSessionUser[]; // Session users.
    iscomplete: boolean; // Whether the session is completed or not.
};

/**
 * Chat user returned by mod_chat_get_sessions.
 */
export type AddonModChatSessionUser = {
    userid: number; // User id.
    messagecount: number; // Number of messages in the session.
};

/**
 * Message returned by mod_chat_get_session_messages.
 */
export type AddonModChatSessionMessage = {
    id: number; // The message record id.
    chatid: number; // The chat id.
    userid: number; // The user who wrote the message.
    groupid: number; // The group this message belongs to.
    issystem: boolean; // Whether is a system message or not.
    message: string; // The message text.
    timestamp: number; // The message timestamp (indicates when the message was sent).
};

/**
 * Session message with user data.
 */
export type AddonModChatSessionMessageWithUserData = AddonModChatSessionMessage & AddonModChatMessageUserData;

/**
 * Result of WS mod_chat_get_chats_by_courses.
 */
export type AddonModChatGetChatsByCoursesResult = {
    chats: AddonModChatChat[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_get_chat_users.
 */
export type AddonModChatGetChatUsersResult = {
    users: AddonModChatUser[]; // List of users.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_get_sessions.
 */
export type AddonModChatGetSessionsResult = {
    sessions: AddonModChatSession[]; // List of sessions.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_get_session_messages.
 */
export type AddonModChatGetSessionMessagesResult = {
    messages: AddonModChatSessionMessage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_send_chat_message.
 */
export type AddonModChatSendChatMessageResult = {
    messageid: number; // Message sent id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_get_chat_latest_messages.
 */
export type AddonModChatGetChatLatestMessagesResult = {
    messages: AddonModChatMessage[]; // List of messages.
    chatnewlasttime: number; // New last time.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS mod_chat_login_user.
 */
export type AddonModChatLoginUserResult = {
    chatsid: string; // Unique chat session id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * User data added to messages.
 */
type AddonModChatMessageUserData = {
    userfullname?: string; // Calculated in the app. Full name of the user who wrote the message.
    userprofileimageurl?: string; // Calculated in the app. Full name of the user who wrote the message.
};
