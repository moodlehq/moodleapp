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
import { CoreError } from '@classes/errors/error';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreCourseLogHelper } from '@features/course/services/log-helper';
import { CoreUser } from '@features/user/services/user';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import { makeSingleton, Translate } from '@singletons';

const ROOT_CACHE_KEY = 'AddonModChat:';

/**
 * Service that provides some features for chats.
 */
@Injectable({ providedIn: 'root' })
export class AddonModChatProvider {

    static readonly COMPONENT = 'mmaModChat';
    static readonly POLL_INTERVAL = 4000;

    /**
     * Get a chat.
     *
     * @param courseId Course ID.
     * @param cmId Course module ID.
     * @param options Other options.
     * @returns Promise resolved when the chat is retrieved.
     */
    async getChat(courseId: number, cmId: number, options: CoreSitesCommonWSOptions = {}): Promise<AddonModChatChat> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChatGetChatsByCoursesWSParams = {
            courseids: [courseId],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getChatsCacheKey(courseId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModChatProvider.COMPONENT,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChatGetChatsByCoursesWSResponse>('mod_chat_get_chats_by_courses', params, preSets);

        const chat = response.chats.find((chat) => chat.coursemodule == cmId);
        if (chat) {
            return chat;
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Log the user into a chat room.
     *
     * @param chatId Chat instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS is executed.
     */
    async loginUser(chatId: number, siteId?: string): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModChatLoginUserWSParams = {
            chatid: chatId,
        };

        const response = await site.write<AddonModChatLoginUserWSResponse>('mod_chat_login_user', params);

        return response.chatsid;
    }

    /**
     * Report a chat as being viewed.
     *
     * @param id Chat instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(id: number, siteId?: string): Promise<void> {
        const params: AddonModChatViewChatWSParams = {
            chatid: id,
        };

        await CoreCourseLogHelper.log(
            'mod_chat_view_chat',
            params,
            AddonModChatProvider.COMPONENT,
            id,
            siteId,
        );
    }

    /**
     * Report chat session views.
     *
     * @param id Chat instance ID.
     * @param period Session period if viewing an individual session.
     * @param period.start Period start.
     * @param period.end Period end.
     */
    async logViewSessions(id: number, period?: { start: number; end: number }): Promise<void> {
        const params: AddonModChatViewSessionsWSParams = {
            cmid: id,
        };

        if (period) {
            params.start = period.start;
            params.end = period.end;
        }

        await CoreCourseLogHelper.log(
            'mod_chat_view_sessions',
            params,
            AddonModChatProvider.COMPONENT,
            id,
        );
    }

    /**
     * Send a message to a chat.
     *
     * @param sessionId Chat sessiond ID.
     * @param message Message text.
     * @param beepUserId Beep user ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS is executed.
     */
    async sendMessage(sessionId: string, message: string, beepUserId: number, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModChatSendChatMessageWSParams = {
            chatsid: sessionId,
            messagetext: message,
            beepid: String(beepUserId),
        };

        const response = await site.write<AddonModChatSendChatMessageWSResponse>('mod_chat_send_chat_message', params);

        return response.messageid;
    }

    /**
     * Get the latest messages from a chat session.
     *
     * @param sessionId Chat sessiond ID.
     * @param lastTime Last time when messages were retrieved.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS is executed.
     */
    async getLatestMessages(
        sessionId: string,
        lastTime: number,
        siteId?: string,
    ): Promise<AddonModChatGetChatLatestMessagesWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModChatGetChatLatestMessagesWSParams = {
            chatsid: sessionId,
            chatlasttime: lastTime,
        };

        /* We use write to not use cache. It doesn't make sense to store the messages in cache
           because we won't be able to retireve them if AddonModChatProvider.loginUser fails. */
        return site.write('mod_chat_get_chat_latest_messages', params);
    }

    /**
     * Get user data for messages since they only have userid.
     *
     * @param messages Messages to get the user data for.
     * @param courseId ID of the course the messages belong to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise always resolved with the formatted messages.
     */
    async getMessagesUserData(messages: AddonModChatWSMessage[], courseId: number, siteId?: string): Promise<AddonModChatMessage[]>;
    async getMessagesUserData(
        messages: AddonModChatWSSessionMessage[],
        courseId: number,
        siteId?: string,
    ): Promise<AddonModChatSessionMessage[]>;
    async getMessagesUserData(
        messages: (AddonModChatWSMessage | AddonModChatWSSessionMessage)[],
        courseId: number,
        siteId?: string,
    ): Promise<(AddonModChatMessage | AddonModChatSessionMessage)[]> {
        const formattedMessages: (AddonModChatMessage | AddonModChatSessionMessage)[] = messages;

        await Promise.all(formattedMessages.map(async (message) => {
            try {
                const user = await CoreUser.getProfile(message.userid, courseId, true, siteId);

                message.userfullname = user.fullname;
                message.userprofileimageurl = user.profileimageurl;
            } catch {
                // Error getting profile, most probably the user is deleted.
                message.userfullname = Translate.instant('core.deleteduser') + ' ' + message.userid;
            }
        }));

        return formattedMessages;
    }

    /**
     * Get the actives users of a current chat.
     *
     * @param sessionId Chat sessiond ID.
     * @param options Other options.
     * @returns Promise resolved when the WS is executed.
     */
    async getChatUsers(sessionId: string, options: CoreCourseCommonModWSOptions = {}): Promise<AddonModChatGetChatUsersWSResponse> {
        // By default, always try to get the latest data.
        options.readingStrategy = options.readingStrategy || CoreSitesReadingStrategy.PREFER_NETWORK;

        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChatGetChatUsersWSParams = {
            chatsid: sessionId,
        };
        const preSets: CoreSiteWSPreSets = {
            component: AddonModChatProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        return site.read('mod_chat_get_chat_users', params, preSets);
    }

    /**
     * Get chat sessions.
     *
     * @param chatId Chat ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @param options Other options.
     * @returns Promise resolved with the list of sessions.
     */
    async getSessions(
        chatId: number,
        groupId: number = 0,
        showAll: boolean = false,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModChatSession[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChatGetSessionsWSParams = {
            chatid: chatId,
            groupid: groupId,
            showall: showAll,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSessionsCacheKey(chatId, groupId, showAll),
            updateFrequency: CoreSite.FREQUENCY_SOMETIMES,
            component: AddonModChatProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChatGetSessionsWSResponse>('mod_chat_get_sessions', params, preSets);

        return response.sessions;
    }

    /**
     * Get chat session messages.
     *
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param sessionEnd Session end time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param options Other options.
     * @returns Promise resolved with the list of messages.
     */
    async getSessionMessages(
        chatId: number,
        sessionStart: number,
        sessionEnd: number,
        groupId: number = 0,
        options: CoreCourseCommonModWSOptions = {},
    ): Promise<AddonModChatWSSessionMessage[]> {
        const site = await CoreSites.getSite(options.siteId);

        const params: AddonModChatGetSessionMessagesWSParams = {
            chatid: chatId,
            sessionstart: sessionStart,
            sessionend: sessionEnd,
            groupid: groupId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getSessionMessagesCacheKey(chatId, sessionStart, groupId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            component: AddonModChatProvider.COMPONENT,
            componentId: options.cmId,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response = await site.read<AddonModChatGetSessionMessagesWSResponse>(
            'mod_chat_get_session_messages',
            params,
            preSets,
        );

        return response.messages;
    }

    /**
     * Invalidate chats.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateChats(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getChatsCacheKey(courseId));
    }

    /**
     * Invalidate chat sessions.
     *
     * @param chatId Chat ID.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSessions(chatId: number, groupId: number = 0, showAll: boolean = false, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSessionsCacheKey(chatId, groupId, showAll));
    }

    /**
     * Invalidate all chat sessions.
     *
     * @param chatId Chat ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllSessions(chatId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getSessionsCacheKeyPrefix(chatId));
    }

    /**
     * Invalidate chat session messages.
     *
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSessionMessages(chatId: number, sessionStart: number, groupId: number = 0, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getSessionMessagesCacheKey(chatId, sessionStart, groupId));
    }

    /**
     * Invalidate all chat session messages.
     *
     * @param chatId Chat ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateAllSessionMessages(chatId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getSessionMessagesCacheKeyPrefix(chatId));
    }

    /**
     * Get cache key for chats WS call.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getChatsCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'chats:' + courseId;
    }

    /**
     * Get cache key for sessions WS call.
     *
     * @param chatId Chat ID.
     * @param groupId Goup ID, 0 means that the function will determine the user group.
     * @param showAll Whether to include incomplete sessions or not.
     * @returns Cache key.
     */
    protected getSessionsCacheKey(chatId: number, groupId: number, showAll: boolean): string {
        return this.getSessionsCacheKeyPrefix(chatId) + groupId + ':' + (showAll ? 1 : 0);
    }

    /**
     * Get cache key prefix for sessions WS call.
     *
     * @param chatId Chat ID.
     * @returns Cache key prefix.
     */
    protected getSessionsCacheKeyPrefix(chatId: number): string {
        return ROOT_CACHE_KEY + 'sessions:' + chatId + ':';
    }

    /**
     * Get cache key for session messages WS call.
     *
     * @param chatId Chat ID.
     * @param sessionStart Session start time.
     * @param groupId Group ID, 0 means that the function will determine the user group.
     * @returns Cache key.
     */
    protected getSessionMessagesCacheKey(chatId: number, sessionStart: number, groupId: number): string {
        return this.getSessionMessagesCacheKeyPrefix(chatId) + sessionStart + ':' + groupId;
    }

    /**
     * Get cache key prefix for session messages WS call.
     *
     * @param chatId Chat ID.
     * @returns Cache key prefix.
     */
    protected getSessionMessagesCacheKeyPrefix(chatId: number): string {
        return ROOT_CACHE_KEY + 'sessionsMessages:' + chatId + ':';
    }

}

export const AddonModChat = makeSingleton(AddonModChatProvider);

/**
 * Params of mod_chat_get_chats_by_courses WS.
 */
export type AddonModChatGetChatsByCoursesWSParams = {
    courseids?: number[]; // Array of course ids.
};

/**
 * Data returned by mod_chat_get_chats_by_courses WS.
 */
export type AddonModChatGetChatsByCoursesWSResponse = {
    chats: AddonModChatChat[];
    warnings?: CoreWSExternalWarning[];
};

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
    introfiles?: CoreWSExternalFile[];
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
 * Params of mod_chat_login_user WS.
 */
export type AddonModChatLoginUserWSParams = {
    chatid: number; // Chat instance id.
    groupid?: number; // Group id, 0 means that the function will determine the user group.
};

/**
 * Data returned by mod_chat_login_user WS.
 */
export type AddonModChatLoginUserWSResponse = {
    chatsid: string; // Unique chat session id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_chat_view_chat WS.
 */
export type AddonModChatViewChatWSParams = {
    chatid: number; // Chat instance id.
};

/**
 * Params of mod_chat_view_sessions WS.
 */
export type AddonModChatViewSessionsWSParams = {
    cmid: number; // Course module id.
    start?: number; // Session start time.
    end?: number; // Session end time.
};

/**
 * Params of mod_chat_send_chat_message WS.
 */
export type AddonModChatSendChatMessageWSParams = {
    chatsid: string; // Chat session id (obtained via mod_chat_login_user).
    messagetext: string; // The message text.
    beepid?: string; // The beep id.
};

/**
 * Data returned by mod_chat_send_chat_message WS.
 */
export type AddonModChatSendChatMessageWSResponse = {
    messageid: number; // Message sent id.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_chat_get_chat_latest_messages WS.
 */
export type AddonModChatGetChatLatestMessagesWSParams = {
    chatsid: string; // Chat session id (obtained via mod_chat_login_user).
    chatlasttime?: number; // Last time messages were retrieved (epoch time).
};

/**
 * Data returned by mod_chat_get_chat_latest_messages WS.
 */
export type AddonModChatGetChatLatestMessagesWSResponse = {
    messages: AddonModChatWSMessage[];
    chatnewlasttime: number; // New last time.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of mod_chat_get_chat_users WS.
 */
export type AddonModChatGetChatUsersWSParams = {
    chatsid: string; // Chat session id (obtained via mod_chat_login_user).
};

/**
 * Data returned by mod_chat_get_chat_users WS.
 */
export type AddonModChatGetChatUsersWSResponse = {
    users: AddonModChatUser[]; // List of users.
    warnings?: CoreWSExternalWarning[];
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
 * Params of mod_chat_get_sessions WS.
 */
export type AddonModChatGetSessionsWSParams = {
    chatid: number; // Chat instance id.
    groupid?: number; // Get messages from users in this group. 0 means that the function will determine the user group.
    showall?: boolean; // Whether to show completed sessions or not.
};

/**
 * Data returned by mod_chat_get_sessions WS.
 */
export type AddonModChatGetSessionsWSResponse = {
    sessions: AddonModChatSession[]; // List of sessions.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Chat session returned by mod_chat_get_sessions.
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
 * Params of mod_chat_get_session_messages WS.
 */
export type AddonModChatGetSessionMessagesWSParams = {
    chatid: number; // Chat instance id.
    sessionstart: number; // The session start time (timestamp).
    sessionend: number; // The session end time (timestamp).
    groupid?: number; // Get messages from users in this group. 0 means that the function will determine the user group.
};

/**
 * Data returned by mod_chat_get_session_messages WS.
 */
export type AddonModChatGetSessionMessagesWSResponse = {
    messages: AddonModChatWSSessionMessage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Meessage returned by mod_chat_get_chat_latest_messages.
 */
export type AddonModChatWSMessage = {
    id: number; // Message id.
    userid: number; // User id.
    system: boolean; // True if is a system message (like user joined).
    message: string; // Message text.
    timestamp: number; // Timestamp for the message.
};

/**
 * Message with user data.
 */
export type AddonModChatMessage = AddonModChatWSMessage & AddonModChatMessageUserData;

/**
 * Message returned by mod_chat_get_session_messages.
 */
export type AddonModChatWSSessionMessage = {
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
export type AddonModChatSessionMessage = AddonModChatWSSessionMessage & AddonModChatMessageUserData;

/**
 * User data added to messages.
 */
type AddonModChatMessageUserData = {
    userfullname?: string; // Calculated in the app. Full name of the user who wrote the message.
    userprofileimageurl?: string; // Calculated in the app. Full name of the user who wrote the message.
};
