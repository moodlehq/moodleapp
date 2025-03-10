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
import { CoreLogger } from '@singletons/logger';
import { CoreSites } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { CoreUser, CoreUserBasicData } from '@features/user/services/user';
import {
    AddonMessagesOffline,
    AddonMessagesOfflineAnyMessagesFormatted,
    AddonMessagesOfflineConversationMessagesDBRecordFormatted,
    AddonMessagesOfflineMessagesDBRecordFormatted,
} from './messages-offline';
import { CoreTime } from '@singletons/time';
import { CoreEvents } from '@singletons/events';
import { CoreSite } from '@classes/sites/site';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreWSError } from '@classes/errors/wserror';
import { AddonNotificationsPreferencesNotificationProcessorState } from '@addons/notifications/services/notifications';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreCacheUpdateFrequency } from '@/core/constants';
import {
    ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT,
    ADDON_MESSAGES_LIMIT_CONTACTS,
    ADDON_MESSAGES_LIMIT_INITIAL_USER_SEARCH,
    ADDON_MESSAGES_LIMIT_MESSAGES,
    ADDON_MESSAGES_LIMIT_SEARCH,
    ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT,
    ADDON_MESSAGES_NEW_MESSAGE_EVENT,
    ADDON_MESSAGES_OPEN_CONVERSATION_EVENT,
    ADDON_MESSAGES_POLL_INTERVAL,
    ADDON_MESSAGES_PUSH_SIMULATION_COMPONENT,
    ADDON_MESSAGES_READ_CHANGED_EVENT,
    ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT,
    ADDON_MESSAGES_UPDATE_CONVERSATION_LIST_EVENT,
    AddonMessagesMessageConversationType,
    AddonMessagesMessagePrivacy,
    AddonMessagesUpdateConversationAction,
} from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTextFormat, DEFAULT_TEXT_FORMAT } from '@singletons/text';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [ADDON_MESSAGES_NEW_MESSAGE_EVENT]: AddonMessagesNewMessagedEventData;
        [ADDON_MESSAGES_READ_CHANGED_EVENT]: AddonMessagesReadChangedEventData;
        [ADDON_MESSAGES_OPEN_CONVERSATION_EVENT]: AddonMessagesOpenConversationEventData;
        [ADDON_MESSAGES_UPDATE_CONVERSATION_LIST_EVENT]: AddonMessagesUpdateConversationListEventData;
        [ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT]: AddonMessagesMemberInfoChangedEventData;
        [ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT]: AddonMessagesUnreadConversationCountsEventData;
        [ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT]: AddonMessagesContactRequestCountEventData;
    }

}

/**
 * Service to handle messages.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmaMessages:';

    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_NEW_MESSAGE_EVENT instead.
     */
    static readonly NEW_MESSAGE_EVENT = ADDON_MESSAGES_NEW_MESSAGE_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_READ_CHANGED_EVENT instead.
     */
    static readonly READ_CHANGED_EVENT = ADDON_MESSAGES_READ_CHANGED_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_OPEN_CONVERSATION_EVENT instead.
     */
    static readonly OPEN_CONVERSATION_EVENT = ADDON_MESSAGES_OPEN_CONVERSATION_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_UPDATE_CONVERSATION_LIST_EVENT instead.
     */
    static readonly UPDATE_CONVERSATION_LIST_EVENT = ADDON_MESSAGES_UPDATE_CONVERSATION_LIST_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT instead.
     */
    static readonly MEMBER_INFO_CHANGED_EVENT = ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT instead.
     */
    static readonly UNREAD_CONVERSATION_COUNTS_EVENT = ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT instead.
     */
    static readonly CONTACT_REQUESTS_COUNT_EVENT = ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_POLL_INTERVAL instead.
     */
    static readonly POLL_INTERVAL = ADDON_MESSAGES_POLL_INTERVAL;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_PUSH_SIMULATION_COMPONENT instead.
     */
    static readonly PUSH_SIMULATION_COMPONENT = ADDON_MESSAGES_PUSH_SIMULATION_COMPONENT;

    /**
     * @deprecated since 5.0. Use AddonMessagesMessagePrivacy.COURSEMEMBER instead.
     */
    static readonly MESSAGE_PRIVACY_COURSEMEMBER = AddonMessagesMessagePrivacy.COURSEMEMBER;
    /**
     * @deprecated since 5.0. Use AddonMessagesMessagePrivacy.ONLYCONTACTS instead.
     */
    static readonly MESSAGE_PRIVACY_ONLYCONTACTS = AddonMessagesMessagePrivacy.ONLYCONTACTS;
    /**
     * @deprecated since 5.0. Use AddonMessagesMessagePrivacy.SITE instead.
     */
    static readonly MESSAGE_PRIVACY_SITE = AddonMessagesMessagePrivacy.SITE;
    /**
     * @deprecated since 5.0. Use AddonMessagesMessageConversationType.INDIVIDUAL instead.
     */
    static readonly MESSAGE_CONVERSATION_TYPE_INDIVIDUAL = AddonMessagesMessageConversationType.INDIVIDUAL;
    /**
     * @deprecated since 5.0. Use AddonMessagesMessageConversationType.GROUP instead.
     */
    static readonly MESSAGE_CONVERSATION_TYPE_GROUP = AddonMessagesMessageConversationType.GROUP;
    /**
     * @deprecated since 5.0. Use AddonMessagesMessageConversationType.SELF instead.
     */
    static readonly MESSAGE_CONVERSATION_TYPE_SELF = AddonMessagesMessageConversationType.SELF;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_LIMIT_CONTACTS instead.
     */
    static readonly LIMIT_CONTACTS = ADDON_MESSAGES_LIMIT_CONTACTS;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_LIMIT_MESSAGES instead.
     */
    static readonly LIMIT_MESSAGES = ADDON_MESSAGES_LIMIT_MESSAGES;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_LIMIT_INITIAL_USER_SEARCH instead.
     */
    static readonly LIMIT_INITIAL_USER_SEARCH = ADDON_MESSAGES_LIMIT_INITIAL_USER_SEARCH;
    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_LIMIT_SEARCH instead.
     */
    static readonly LIMIT_SEARCH = ADDON_MESSAGES_LIMIT_SEARCH;

    /**
     * @deprecated since 5.0. Use ADDON_MESSAGES_NEW_MESSAGE_EVENT instead.
     */
    static readonly NOTIFICATION_PREFERENCES_KEY = 'message_provider_moodle_instantmessage';

    protected logger = CoreLogger.getInstance('AddonMessages');

    /**
     * Add a contact.
     *
     * @param userId User ID of the person to add.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     * @deprecatedonmoodle since 3.6
     */
    protected async addContact(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params = {
            userids: [userId],
        };

        await site.write('core_message_create_contacts', params);

        await this.invalidateAllContactsCache(site.getId());
    }

    /**
     * Block a user.
     *
     * @param userId User ID of the person to block.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when done.
     */
    async blockContact(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        try {
            if (site.wsAvailable('core_message_block_user')) {
                // Since Moodle 3.6
                const params: AddonMessagesBlockUserWSParams = {
                    userid: site.getUserId(),
                    blockeduserid: userId,
                };
                await site.write('core_message_block_user', params);
            } else {
                const params: { userids: number[] } = {
                    userids: [userId],
                };
                await site.write('core_message_block_contacts', params);
            }

            await this.invalidateAllMemberInfo(userId, site);
        } finally {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, userBlocked: true };

            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);
        }
    }

    /**
     * Confirm a contact request from another user.
     *
     * @param userId ID of the user who made the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     * @since 3.6
     */
    async confirmContactRequest(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesConfirmContactRequestWSParams = {
            userid: userId,
            requesteduserid: site.getUserId(),
        };

        await site.write('core_message_confirm_contact_request', params);

        await CorePromiseUtils.allPromises([
            this.invalidateAllMemberInfo(userId, site),
            this.invalidateContactsCache(site.id),
            this.invalidateUserContacts(site.id),
            this.refreshContactRequestsCount(site.id),
        ]).finally(() => {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, contactRequestConfirmed: true };
            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);
        });
    }

    /**
     * Send a contact request to another user.
     *
     * @param userId ID of the receiver of the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     * @since 3.6
     */
    async createContactRequest(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        // Use legacy function if not available.
        if (!site.wsAvailable('core_message_create_contact_request')) {
            await this.addContact(userId, site.getId());
        } else {
            const params: AddonMessagesCreateContactRequestWSParams = {
                userid: site.getUserId(),
                requesteduserid: userId,
            };

            const result = await site.write<AddonMessagesCreateContactRequestWSResponse>(
                'core_message_create_contact_request',
                params,
            );

            if (result.warnings?.length) {
                throw new CoreWSError(result.warnings[0]);
            }
        }

        await this.invalidateAllMemberInfo(userId, site).finally(() => {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, contactRequestCreated: true };
            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);
        });
    }

    /**
     * Decline a contact request from another user.
     *
     * @param userId ID of the user who made the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     * @since 3.6
     */
    async declineContactRequest(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesDeclineContactRequestWSParams = {
            userid: userId,
            requesteduserid: site.getUserId(),
        };

        await site.write('core_message_decline_contact_request', params);

        await CorePromiseUtils.allPromises([
            this.invalidateAllMemberInfo(userId, site),
            this.refreshContactRequestsCount(site.id),
        ]).finally(() => {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, contactRequestDeclined: true };
            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);
        });
    }

    /**
     * Delete a conversation.
     *
     * @param conversationId Conversation to delete.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Promise resolved when the conversation has been deleted.
     */
    async deleteConversation(conversationId: number, siteId?: string, userId?: number): Promise<void> {
        await this.deleteConversations([conversationId], siteId, userId);
    }

    /**
     * Delete several conversations.
     *
     * @param conversationIds Conversations to delete.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     */
    async deleteConversations(conversationIds: number[], siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const params: AddonMessagesDeleteConversationsByIdWSParams = {
            userid: userId,
            conversationids: conversationIds,
        };

        await site.write('core_message_delete_conversations_by_id', params);

        await Promise.all(conversationIds.map(async (conversationId) => {
            try {
                return AddonMessagesOffline.deleteConversationMessages(conversationId, site.getId());
            } catch {
                // Ignore errors.
            }
        }));
    }

    /**
     * Delete a message (online or offline).
     *
     * @param message Message to delete.
     * @param deleteForAll Whether the message should be deleted for all users.
     * @returns Promise resolved when the message has been deleted.
     */
    deleteMessage(message: AddonMessagesConversationMessageFormatted, deleteForAll?: boolean): Promise<void> {
        if ('id' in message) {
            // Message has ID, it means it has been sent to the server.
            if (deleteForAll) {
                return this.deleteMessageForAllOnline(message.id);
            } else {
                return this.deleteMessageOnline(message.id, !!('read' in message && message.read));
            }
        }

        // It's an offline message.
        if (!('conversationid' in message)) {
            return AddonMessagesOffline.deleteMessage(message.touserid, message.smallmessage, message.timecreated);
        }

        return AddonMessagesOffline.deleteConversationMessage(message.conversationid, message.text, message.timecreated);
    }

    /**
     * Delete a message from the server.
     *
     * @param id Message ID.
     * @param read True if message is read, false otherwise.
     * @param userId User we want to delete the message for. If not defined, use current user.
     * @returns Promise resolved when the message has been deleted.
     */
    async deleteMessageOnline(id: number, read: boolean, userId?: number): Promise<void> {
        userId = userId || CoreSites.getCurrentSiteUserId();

        const params: AddonMessagesDeleteMessageWSParams = {
            messageid: id,
            userid: userId,
        };

        if (read !== undefined) {
            params.read = read;
        }

        await CoreSites.getCurrentSite()?.write('core_message_delete_message', params);

        await this.invalidateDiscussionCache(userId);
    }

    /**
     * Delete a message for all users.
     *
     * @param id Message ID.
     * @param userId User we want to delete the message for. If not defined, use current user.
     */
    async deleteMessageForAllOnline(id: number, userId?: number): Promise<void> {
        userId = userId || CoreSites.getCurrentSiteUserId();

        const params: AddonMessagesDeleteMessageForAllUsersWSParams = {
            messageid: id,
            userid: userId,
        };

        await CoreSites.getCurrentSite()?.write('core_message_delete_message_for_all_users', params);

        await this.invalidateDiscussionCache(userId);
    }

    /**
     * Format a conversation.
     *
     * @param conversation Conversation to format.
     * @param userId User ID viewing the conversation.
     * @returns Formatted conversation.
     */
    protected formatConversation(
        conversation: AddonMessagesConversationFormatted,
        userId: number,
    ): AddonMessagesConversationFormatted {

        const numMessages = conversation.messages.length;
        const lastMessage = numMessages ? conversation.messages[numMessages - 1] : null;

        conversation.lastmessage = lastMessage ? lastMessage.text : undefined;
        conversation.lastmessagedate = lastMessage ? lastMessage.timecreated : undefined;
        conversation.sentfromcurrentuser = lastMessage ? lastMessage.useridfrom == userId : undefined;

        if (conversation.type != AddonMessagesMessageConversationType.GROUP) {
            const isIndividual = conversation.type == AddonMessagesMessageConversationType.INDIVIDUAL;

            const otherUser = conversation.members.find((member) =>
                (isIndividual && member.id != userId) || (!isIndividual && member.id == userId));

            if (otherUser) {
                conversation.name = conversation.name ? conversation.name : otherUser.fullname;
                conversation.imageurl = conversation.imageurl ? conversation.imageurl : otherUser.profileimageurl;

                conversation.otherUser = otherUser;
                conversation.userid = otherUser.id;
                conversation.showonlinestatus = otherUser.showonlinestatus;
                conversation.isonline = otherUser.isonline;
                conversation.isblocked = otherUser.isblocked;
                conversation.otherUser = otherUser;
            }
        }

        return conversation;
    }

    /**
     * Get the cache key for blocked contacts.
     *
     * @param userId The user who's contacts we're looking for.
     * @returns Cache key.
     */
    protected getCacheKeyForBlockedContacts(userId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}blockedContacts:${userId}`;
    }

    /**
     * Get the cache key for contacts.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForContacts(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}contacts`;
    }

    /**
     * Get the cache key for comfirmed contacts.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForUserContacts(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}userContacts`;
    }

    /**
     * Get the cache key for contact requests.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForContactRequests(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}contactRequests`;
    }

    /**
     * Get the cache key for contact requests count.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForContactRequestsCount(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}contactRequestsCount`;
    }

    /**
     * Get the cache key for a discussion.
     *
     * @param userId The other person with whom the current user is having the discussion.
     * @returns Cache key.
     */
    getCacheKeyForDiscussion(userId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}discussion:${userId}`;
    }

    /**
     * Get the cache key for the message count.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCacheKeyForMessageCount(userId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}count:${userId}`;
    }

    /**
     * Get the cache key for unread conversation counts.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForUnreadConversationCounts(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}unreadConversationCounts`;
    }

    /**
     * Get the cache key for the list of discussions.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForDiscussions(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}discussions`;
    }

    /**
     * Get cache key for get conversations.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @returns Cache key.
     */
    protected getCacheKeyForConversation(userId: number, conversationId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}conversation:${userId}:${conversationId}`;
    }

    /**
     * Get cache key for get conversations between users.
     *
     * @param userId User ID.
     * @param otherUserId Other user ID.
     * @returns Cache key.
     */
    protected getCacheKeyForConversationBetweenUsers(userId: number, otherUserId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}conversationBetweenUsers:${userId}:${otherUserId}`;
    }

    /**
     * Get cache key for get conversation members.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @returns Cache key.
     */
    protected getCacheKeyForConversationMembers(userId: number, conversationId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}conversationMembers:${userId}:${conversationId}`;
    }

    /**
     * Get cache key for get conversation messages.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @returns Cache key.
     */
    protected getCacheKeyForConversationMessages(userId: number, conversationId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}conversationMessages:${userId}:${conversationId}`;
    }

    /**
     * Get cache key for get conversations.
     *
     * @param userId User ID.
     * @param type Filter by type.
     * @param favourites Filter favourites.
     * @returns Cache key.
     */
    protected getCacheKeyForConversations(userId: number, type?: number, favourites?: boolean): string {
        return this.getCommonCacheKeyForUserConversations(userId) + ':' + type + ':' + favourites;
    }

    /**
     * Get cache key for conversation counts.
     *
     * @returns Cache key.
     */
    protected getCacheKeyForConversationCounts(): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}conversationCounts`;
    }

    /**
     * Get cache key for member info.
     *
     * @param userId User ID.
     * @param otherUserId The other user ID.
     * @returns Cache key.
     */
    protected getCacheKeyForMemberInfo(userId: number, otherUserId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}memberInfo:${userId}:${otherUserId}`;
    }

    /**
     * Get cache key for get self conversation.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCacheKeyForSelfConversation(userId: number): string {
        return `${AddonMessagesProvider.ROOT_CACHE_KEY}selfconversation:${userId}`;
    }

    /**
     * Get common cache key for get user conversations.
     *
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getCommonCacheKeyForUserConversations(userId: number): string {
        return this.getRootCacheKeyForConversations() + userId;
    }

    /**
     * Get root cache key for get conversations.
     *
     * @returns Cache key.
     */
    protected getRootCacheKeyForConversations(): string {
        return AddonMessagesProvider.ROOT_CACHE_KEY + 'conversations:';
    }

    /**
     * Get all the contacts of the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the WS data.
     * @deprecatedonmoodle since 3.6
     */
    async getAllContacts(siteId?: string): Promise<AddonMessagesGetContactsWSResponse> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const contacts = await this.getContacts(siteId);

        try {
            const blocked = await this.getBlockedContacts(siteId);
            contacts.blocked = blocked.users;
            this.storeUsersFromAllContacts(contacts);

            return contacts;
        } catch {
            // The WS for blocked contacts might fail, but we still want the contacts.
            contacts.blocked = [];
            this.storeUsersFromAllContacts(contacts);

            return contacts;
        }
    }

    /**
     * Get all the users blocked by the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the WS data.
     */
    async getBlockedContacts(siteId?: string): Promise<AddonMessagesGetBlockedUsersWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const userId = site.getUserId();

        const params: AddonMessagesGetBlockedUsersWSParams = {
            userid: userId,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForBlockedContacts(userId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
        };

        return site.read('core_message_get_blocked_users', params, preSets);
    }

    /**
     * Get the contacts of the current user.
     *
     * This excludes the blocked users.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the WS data.
     * @deprecatedonmoodle since 3.6
     */
    async getContacts(siteId?: string): Promise<AddonMessagesGetContactsWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForContacts(),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
        };

        const contacts = await site.read<AddonMessagesGetContactsWSResponse>('core_message_get_contacts', undefined, preSets);

        // Filter contacts with negative ID, they are notifications.
        const validContacts: AddonMessagesGetContactsWSResponse = {
            online: [],
            offline: [],
            strangers: [],
        };

        for (const typeName in contacts) {
            if (!validContacts[typeName]) {
                validContacts[typeName] = [];
            }

            contacts[typeName].forEach((contact: AddonMessagesGetContactsContact) => {
                if (contact.id > 0) {
                    validContacts[typeName].push(contact);
                }
            });
        }

        return validContacts;
    }

    /**
     * Get the list of user contacts.
     *
     * @param limitFrom Position of the first contact to fetch.
     * @param limitNum Number of contacts to fetch. Default is ADDON_MESSAGES_LIMIT_CONTACTS.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the list of user contacts.
     * @since 3.6
     */
    async getUserContacts(
        limitFrom: number = 0,
        limitNum: number = ADDON_MESSAGES_LIMIT_CONTACTS,
        siteId?: string,
    ): Promise<{contacts: AddonMessagesConversationMember[]; canLoadMore: boolean}> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesGetUserContactsWSParams = {
            userid: site.getUserId(),
            limitfrom: limitFrom,
            limitnum: limitNum <= 0 ? 0 : limitNum + 1,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForUserContacts(),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
        };

        const contacts = await site.read<AddonMessagesGetUserContactsWSResponse>('core_message_get_user_contacts', params, preSets);

        if (!contacts || !contacts.length) {
            return { contacts: [], canLoadMore: false };
        }

        CoreUser.storeUsers(contacts, site.id);
        if (limitNum <= 0) {
            return { contacts, canLoadMore: false };
        }

        return {
            contacts: contacts.slice(0, limitNum),
            canLoadMore: contacts.length > limitNum,
        };
    }

    /**
     * Get the contact request sent to the current user.
     *
     * @param limitFrom Position of the first contact request to fetch.
     * @param limitNum Number of contact requests to fetch. Default is ADDON_MESSAGES_LIMIT_CONTACTS.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the list of contact requests.
     * @since 3.6
     */
    async getContactRequests(
        limitFrom: number = 0,
        limitNum: number = ADDON_MESSAGES_LIMIT_CONTACTS,
        siteId?: string,
    ): Promise<{requests: AddonMessagesConversationMember[]; canLoadMore: boolean}> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesGetContactRequestsWSParams = {
            userid: site.getUserId(),
            limitfrom: limitFrom,
            limitnum: limitNum <= 0 ? 0 : limitNum + 1,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForContactRequests(),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
        };

        const requests = await site.read<AddonMessagesGetContactRequestsWSResponse>(
            'core_message_get_contact_requests',
            params,
            preSets,
        );

        if (!requests || !requests.length) {
            return { requests: [], canLoadMore: false };
        }

        CoreUser.storeUsers(requests, site.id);
        if (limitNum <= 0) {
            return { requests, canLoadMore: false };
        }

        return {
            requests: requests.slice(0, limitNum),
            canLoadMore: requests.length > limitNum,
        };
    }

    /**
     * Get the number of contact requests sent to the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with the number of contact requests.
     * @since 3.6
     */
    async getContactRequestsCount(siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesGetReceivedContactRequestsCountWSParams = {
            userid: site.getUserId(),
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForContactRequestsCount(),
            typeExpected: 'number',
        };

        const data: AddonMessagesContactRequestCountEventData = {
            count: await site.read('core_message_get_received_contact_requests_count', params, preSets),
        };

        // Notify the new count so all badges are updated.
        CoreEvents.trigger(ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT, data , site.id);

        return data.count;

    }

    /**
     * Get a conversation by the conversation ID.
     *
     * @param conversationId Conversation ID to fetch.
     * @param includeContactRequests Include contact requests.
     * @param includePrivacyInfo Include privacy info.
     * @param messageOffset Offset for messages list.
     * @param messageLimit Limit of messages. Defaults to 1 (last message).
     *                     We recommend getConversationMessages to get them.
     * @param memberOffset Offset for members list.
     * @param memberLimit Limit of members. Defaults to 2 (to be able to know the other user in individual ones).
     *                    We recommend getConversationMembers to get them.
     * @param newestFirst Whether to order messages by newest first.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Promise resolved with the response.
     * @since 3.6
     */
    async getConversation(
        conversationId: number,
        includeContactRequests: boolean = false,
        includePrivacyInfo: boolean = false,
        messageOffset: number = 0,
        messageLimit: number = 1,
        memberOffset: number = 0,
        memberLimit: number = 2,
        newestFirst: boolean = true,
        siteId?: string,
        userId?: number,
    ): Promise<AddonMessagesConversationFormatted> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversation(userId, conversationId),
        };

        const params: AddonMessagesGetConversationWSParams = {
            userid: userId,
            conversationid: conversationId,
            includecontactrequests: includeContactRequests,
            includeprivacyinfo: includePrivacyInfo,
            messageoffset: messageOffset,
            messagelimit: messageLimit,
            memberoffset: memberOffset,
            memberlimit: memberLimit,
            newestmessagesfirst: newestFirst,
        };

        const conversation = await site.read<AddonMessagesGetConversationWSResponse>(
            'core_message_get_conversation',
            params,
            preSets,
        );

        return this.formatConversation(conversation, userId);
    }

    /**
     * Get a conversation between two users.
     *
     * @param otherUserId The other user ID.
     * @param includeContactRequests Include contact requests.
     * @param includePrivacyInfo Include privacy info.
     * @param messageOffset Offset for messages list.
     * @param messageLimit Limit of messages. Defaults to 1 (last message).
     *                     We recommend getConversationMessages to get them.
     * @param memberOffset Offset for members list.
     * @param memberLimit Limit of members. Defaults to 2 (to be able to know the other user in individual ones).
     *                    We recommend getConversationMembers to get them.
     * @param newestFirst Whether to order messages by newest first.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @returns Promise resolved with the response.
     * @since 3.6
     */
    async getConversationBetweenUsers(
        otherUserId: number,
        includeContactRequests?: boolean,
        includePrivacyInfo?: boolean,
        messageOffset: number = 0,
        messageLimit: number = 1,
        memberOffset: number = 0,
        memberLimit: number = 2,
        newestFirst: boolean = true,
        siteId?: string,
        userId?: number,
        preferCache?: boolean,
    ): Promise<AddonMessagesConversationFormatted> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversationBetweenUsers(userId, otherUserId),
            omitExpires: !!preferCache,
        };

        const params: AddonMessagesGetConversationBetweenUsersWSParams = {
            userid: userId,
            otheruserid: otherUserId,
            includecontactrequests: !!includeContactRequests,
            includeprivacyinfo: !!includePrivacyInfo,
            messageoffset: messageOffset,
            messagelimit: messageLimit,
            memberoffset: memberOffset,
            memberlimit: memberLimit,
            newestmessagesfirst: !!newestFirst,
        };

        const conversation: AddonMessagesConversation =
            await site.read('core_message_get_conversation_between_users', params, preSets);

        return this.formatConversation(conversation, userId);
    }

    /**
     * Get a conversation members.
     *
     * @param conversationId Conversation ID to fetch.
     * @param limitFrom Offset for members list.
     * @param limitTo Limit of members.
     * @param includeContactRequests Include contact requests.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in.
     * @returns Conversation members.
     * @since 3.6
     */
    async getConversationMembers(
        conversationId: number,
        limitFrom: number = 0,
        limitTo?: number,
        includeContactRequests?: boolean,
        siteId?: string,
        userId?: number,
    ): Promise<{members: AddonMessagesConversationMember[]; canLoadMore: boolean}> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();
        limitTo = limitTo ?? ADDON_MESSAGES_LIMIT_MESSAGES;

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversationMembers(userId, conversationId),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        const params: AddonMessagesGetConversationMembersWSParams = {
            userid: userId,
            conversationid: conversationId,
            limitfrom: limitFrom,
            limitnum: limitTo < 1 ? limitTo : limitTo + 1,
            includecontactrequests: !!includeContactRequests,
            includeprivacyinfo: true,
        };

        const members: AddonMessagesConversationMember[] =
            await site.read('core_message_get_conversation_members', params, preSets);
        if (limitTo < 1) {
            return {
                canLoadMore: false,
                members: members,
            };
        }

        return {
            canLoadMore: members.length > limitTo,
            members: members.slice(0, limitTo),
        };
    }

    /**
     * Get a conversation by the conversation ID.
     *
     * @param conversationId Conversation ID to fetch.
     * @param options Options.
     * @returns Promise resolved with the response.
     * @since 3.6
     */
    async getConversationMessages(
        conversationId: number,
        options: AddonMessagesGetConversationMessagesOptions = {},
    ): Promise<AddonMessagesGetConversationMessagesResult> {

        const site = await CoreSites.getSite(options.siteId);

        options.userId = options.userId || site.getUserId();
        options.limitFrom = options.limitFrom || 0;
        options.limitTo = options.limitTo ?? ADDON_MESSAGES_LIMIT_MESSAGES;
        options.timeFrom = options.timeFrom || 0;
        options.newestFirst = options.newestFirst ?? true;

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversationMessages(options.userId, conversationId),
        };
        const params: AddonMessagesGetConversationMessagesWSParams = {
            currentuserid: options.userId,
            convid: conversationId,
            limitfrom: options.limitFrom,
            limitnum: options.limitTo < 1 ? options.limitTo : options.limitTo + 1, // If there's a limit, get 1 more than requested.
            newest: !!options.newestFirst,
            timefrom: options.timeFrom,
        };

        if (options.limitFrom > 0) {
            // Do not use cache when retrieving older messages.
            // This is to prevent storing too much data and to prevent inconsistencies between "pages" loaded.
            preSets.getFromCache = false;
            preSets.saveToCache = false;
            preSets.emergencyCache = false;
        } else if (options.forceCache) {
            preSets.omitExpires = true;
        } else if (options.ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const result: AddonMessagesGetConversationMessagesResult =
            await site.read('core_message_get_conversation_messages', params, preSets);

        if (options.limitTo < 1) {
            result.canLoadMore = false;
        } else {
            result.canLoadMore = result.messages.length > options.limitTo;
            result.messages = result.messages.slice(0, options.limitTo);
        }

        result.messages.forEach((message) => {
            // Convert time to milliseconds.
            message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;
        });

        if (options.excludePending) {
            // No need to get offline messages, return the ones we have.
            return result;
        }

        // Get offline messages.
        const offlineMessages =
            await AddonMessagesOffline.getConversationMessages(conversationId, options.userId, site.getId());

        result.messages = result.messages.concat(offlineMessages);

        return result;
    }

    /**
     * Get the discussions of a certain user. This function is used in Moodle sites higher than 3.6.
     * If the site is older than 3.6, please use getDiscussions.
     *
     * @param type Filter by type.
     * @param favourites Whether to restrict the results to contain NO favourite conversations (false), ONLY favourite
     *                   conversation (true), or ignore any restriction altogether (undefined or null).
     * @param limitFrom The offset to start at.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @returns Promise resolved with the conversations.
     * @since 3.6
     */
    async getConversations(
        type?: number,
        favourites?: boolean,
        limitFrom: number = 0,
        siteId?: string,
        userId?: number,
        forceCache?: boolean,
        ignoreCache?: boolean,
    ): Promise<{conversations: AddonMessagesConversationFormatted[]; canLoadMore: boolean}> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversations(userId, type, favourites),
        };

        const params: AddonMessagesGetConversationsWSParams = {
            userid: userId,
            limitfrom: limitFrom,
            limitnum: ADDON_MESSAGES_LIMIT_MESSAGES + 1,
        };

        if (forceCache) {
            preSets.omitExpires = true;
        } else if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }
        if (type !== undefined && type != null) {
            params.type = type;
        }
        if (favourites !== undefined && favourites != null) {
            params.favourites = !!favourites;
        }
        if (site.isVersionGreaterEqualThan('3.7') && type != AddonMessagesMessageConversationType.GROUP) {
            // Add self conversation to the list.
            params.mergeself = true;
        }

        let response: AddonMessagesGetConversationsResult;
        try {
            response = await site.read('core_message_get_conversations', params, preSets);
        } catch (error) {
            if (params.mergeself) {
                // Try again without the new param. Maybe the user is offline and he has a previous request cached.
                delete params.mergeself;

                return site.read('core_message_get_conversations', params, preSets);
            }

            throw error;
        }

        // Format the conversations, adding some calculated fields.
        const conversations = response.conversations
            .slice(0, ADDON_MESSAGES_LIMIT_MESSAGES)
            .map((conversation) => this.formatConversation(conversation, userId!));

        return {
            conversations,
            canLoadMore: response.conversations.length > ADDON_MESSAGES_LIMIT_MESSAGES,
        };
    }

    /**
     * Get conversation counts by type.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with favourite,
     *         individual, group and self conversation counts.
     * @since 3.6
     */
    async getConversationCounts(siteId?: string): Promise<{favourites: number; individual: number; group: number; self: number}> {
        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversationCounts(),
        };

        const result = await site.read<AddonMessagesGetConversationCountsWSResponse>(
            'core_message_get_conversation_counts',
            {},
            preSets,
        );

        const counts = {
            favourites: result.favourites,
            individual: result.types[AddonMessagesMessageConversationType.INDIVIDUAL],
            group: result.types[AddonMessagesMessageConversationType.GROUP],
            self: result.types[AddonMessagesMessageConversationType.SELF] || 0,
        };

        return counts;
    }

    /**
     * Return the current user's discussion with another user.
     *
     * @param userId The ID of the other user.
     * @param excludePending True to exclude messages pending to be sent.
     * @param lfReceivedUnread Number of unread received messages already fetched, so fetch will be done from this.
     * @param lfReceivedRead Number of read received messages already fetched, so fetch will be done from this.
     * @param lfSentUnread Number of unread sent messages already fetched, so fetch will be done from this.
     * @param lfSentRead Number of read sent messages already fetched, so fetch will be done from this.
     * @param notUsed Deprecated since 3.9.5
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with messages and a boolean telling if can load more messages.
     */
    async getDiscussion(
        userId: number,
        excludePending: boolean,
        lfReceivedUnread: number = 0,
        lfReceivedRead: number = 0,
        lfSentUnread: number = 0,
        lfSentRead: number = 0,
        notUsed: boolean = false, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string,
    ): Promise<AddonMessagesGetDiscussionMessages> {

        const site = await CoreSites.getSite(siteId);

        const result: AddonMessagesGetDiscussionMessages = {
            messages: [],
            canLoadMore: false,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForDiscussion(userId),
        };
        const params: AddonMessagesGetMessagesWSParams = {
            useridto: site.getUserId(),
            useridfrom: userId,
            limitnum: ADDON_MESSAGES_LIMIT_MESSAGES,
        };

        if (lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0) {
            // Do not use cache when retrieving older messages.
            // This is to prevent storing too much data and to prevent inconsistencies between "pages" loaded.
            preSets.getFromCache = false;
            preSets.saveToCache = false;
            preSets.emergencyCache = false;
        }

        // Get message received by current user.
        const received = await this.getRecentMessages(params, preSets, lfReceivedUnread, lfReceivedRead, undefined, site.getId());
        result.messages = received;
        const hasReceived = received.length > 0;

        // Get message sent by current user.
        params.useridto = userId;
        params.useridfrom = site.getUserId();
        const sent = await this.getRecentMessages(params, preSets, lfSentUnread, lfSentRead, undefined, siteId);
        result.messages = result.messages.concat(sent);
        const hasSent = sent.length > 0;

        if (result.messages.length > ADDON_MESSAGES_LIMIT_MESSAGES) {
            // Sort messages and get the more recent ones.
            result.canLoadMore = true;
            result.messages = this.sortMessages(result['messages']);
            result.messages = result.messages.slice(-ADDON_MESSAGES_LIMIT_MESSAGES);
        } else {
            result.canLoadMore = result.messages.length == ADDON_MESSAGES_LIMIT_MESSAGES && (!hasReceived || !hasSent);
        }

        if (excludePending) {
            // No need to get offline messages, return the ones we have.
            return result;
        }

        // Get offline messages.
        const offlineMessages = await AddonMessagesOffline.getMessages(userId, site.getId());

        result.messages = result.messages.concat(offlineMessages);

        return result;
    }

    /**
     * Get the discussions of the current user. This function is used in Moodle sites older than 3.6.
     * If the site is 3.6 or higher, please use getConversations.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with an object where the keys are the user ID of the other user.
     */
    async getDiscussions(siteId?: string): Promise<{[userId: number]: AddonMessagesDiscussion}> {
        const discussions: { [userId: number]: AddonMessagesDiscussion } = {};

        /**
         * Convenience function to treat a recent message, adding it to discussions list if needed.
         */
        const treatRecentMessage = (
            message: AddonMessagesGetMessagesMessage |
            AddonMessagesOfflineConversationMessagesDBRecordFormatted |
            AddonMessagesOfflineMessagesDBRecordFormatted,
            userId: number,
            userFullname: string,
        ): void => {
            if (discussions[userId] === undefined) {
                discussions[userId] = {
                    fullname: userFullname,
                    profileimageurl: '',
                };

                if ((!('timeread' in message) || !message.timeread) && !message.pending && message.useridfrom != currentUserId) {
                    discussions[userId].unread = true;
                }
            }

            const messageId = ('id' in message) ? message.id : 0;

            // Extract the most recent message. Pending messages are considered more recent than messages already sent.
            const discMessage = discussions[userId].message;
            if (discMessage === undefined || (!discMessage.pending && message.pending) ||
                (discMessage.pending == message.pending && (discMessage.timecreated < message.timecreated ||
                    (discMessage.timecreated == message.timecreated && discMessage.id < messageId)))) {

                discussions[userId].message = {
                    id: messageId,
                    user: userId,
                    message: message.text || '',
                    timecreated: message.timecreated,
                    pending: !!message.pending,
                };
            }
        };

        const site = await CoreSites.getSite(siteId);

        const currentUserId = site.getUserId();
        const params: AddonMessagesGetMessagesWSParams = {
            useridto: currentUserId,
            useridfrom: 0,
            limitnum: ADDON_MESSAGES_LIMIT_MESSAGES,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForDiscussions(),
        };

        const received = await this.getRecentMessages(params, preSets, undefined, undefined, undefined, site.getId());
        // Extract the discussions by filtering same senders.
        received.forEach((message) => {
            treatRecentMessage(message, message.useridfrom, message.userfromfullname);
        });

        // Now get the last messages sent by the current user.
        params.useridfrom = params.useridto;
        params.useridto = 0;

        const sent = await this.getRecentMessages(params, preSets);
        // Extract the discussions by filtering same senders.
        sent.forEach((message) => {
            treatRecentMessage(message, message.useridto, message.usertofullname);
        });

        const offlineMessages = await AddonMessagesOffline.getAllMessages(site.getId());

        offlineMessages.forEach((message) => {
            treatRecentMessage(message, 'touserid' in message ? message.touserid : 0, '');
        });

        const discussionsWithUserImg = await this.getDiscussionsUserImg(discussions, site.getId());
        this.storeUsersFromDiscussions(discussionsWithUserImg);

        return discussionsWithUserImg;
    }

    /**
     * Get user images for all the discussions that don't have one already.
     *
     * @param discussions List of discussions.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise always resolved. Resolve param is the formatted discussions.
     */
    protected async getDiscussionsUserImg(
        discussions: { [userId: number]: AddonMessagesDiscussion },
        siteId?: string,
    ): Promise<{[userId: number]: AddonMessagesDiscussion}> {
        const promises: Promise<void>[] = [];

        for (const userId in discussions) {
            if (!discussions[userId].profileimageurl && discussions[userId].message) {
                // We don't have the user image. Try to retrieve it.
                promises.push(CoreUser.getProfile(discussions[userId].message!.user, 0, true, siteId).then((user) => {
                    discussions[userId].profileimageurl = user.profileimageurl;

                    return;
                }).catch(() => {
                    // Error getting profile, resolve promise without adding any extra data.
                }));
            }
        }

        await Promise.all(promises);

        return discussions;
    }

    /**
     * Get conversation member info by user id, works even if no conversation betwen the users exists.
     *
     * @param otherUserId The other user ID.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Promise resolved with the member info.
     * @since 3.6
     */
    async getMemberInfo(otherUserId: number, siteId?: string, userId?: number): Promise<AddonMessagesConversationMember> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForMemberInfo(userId, otherUserId),
            updateFrequency: CoreCacheUpdateFrequency.OFTEN,
        };
        const params: AddonMessagesGetMemberInfoWSParams = {
            referenceuserid: userId,
            userids: [otherUserId],
            includecontactrequests: true,
            includeprivacyinfo: true,
        };
        const members: AddonMessagesConversationMember[] = await site.read('core_message_get_member_info', params, preSets);
        if (!members || members.length < 1) {
            // Should never happen.
            throw new CoreError('Error fetching member info.');
        }

        return members[0];
    }

    /**
     * Get the cache key for the get message preferences call.
     *
     * @returns Cache key.
     */
    protected getMessagePreferencesCacheKey(): string {
        return AddonMessagesProvider.ROOT_CACHE_KEY + 'messagePreferences';
    }

    /**
     * Get message preferences.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the message preferences.
     */
    async getMessagePreferences(siteId?: string): Promise<AddonMessagesMessagePreferences> {
        this.logger.debug('Get message preferences');

        const site = await CoreSites.getSite(siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getMessagePreferencesCacheKey(),
            updateFrequency: CoreCacheUpdateFrequency.SOMETIMES,
        };

        const data = await site.read<AddonMessagesGetUserMessagePreferencesWSResponse>(
            'core_message_get_user_message_preferences',
            {},
            preSets,
        );

        if (data.preferences) {
            data.preferences.blocknoncontacts = data.blocknoncontacts;

            return data.preferences;
        }

        throw new CoreError('Error getting message preferences');
    }

    /**
     * Get messages according to the params.
     *
     * @param params Parameters to pass to the WS.
     * @param preSets Set of presets for the WS.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the data.
     */
    protected async getMessages(
        params: AddonMessagesGetMessagesWSParams,
        preSets: CoreSiteWSPreSets,
        siteId?: string,
    ): Promise<AddonMessagesGetMessagesResult> {

        params.type = 'conversations';
        params.newestfirst = true;

        const site = await CoreSites.getSite(siteId);
        const response: AddonMessagesGetMessagesResult = await site.read('core_message_get_messages', params, preSets);

        response.messages.forEach((message) => {
            message.read = !!params.read;
            // Convert times to milliseconds.
            message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;
            message.timeread = message.timeread ? message.timeread * 1000 : 0;
        });

        return response;
    }

    /**
     * Get the most recent messages.
     *
     * @param params Parameters to pass to the WS.
     * @param preSets Set of presets for the WS.
     * @param limitFromUnread Number of read messages already fetched, so fetch will be done from this number.
     * @param limitFromRead Number of unread messages already fetched, so fetch will be done from this number.
     * @param notUsed // Deprecated 3.9.5
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the data.
     */
    async getRecentMessages(
        params: AddonMessagesGetMessagesWSParams,
        preSets: CoreSiteWSPreSets,
        limitFromUnread: number = 0,
        limitFromRead: number = 0,
        notUsed: boolean = false, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string,
    ): Promise<AddonMessagesGetMessagesMessage[]> {
        limitFromUnread = limitFromUnread || 0;
        limitFromRead = limitFromRead || 0;

        params.read = false;
        params.limitfrom = limitFromUnread;

        const response = await this.getMessages(params, preSets, siteId);
        let messages = response.messages;

        if (!messages) {
            throw new CoreError('Error fetching recent messages');
        }

        if (messages.length >= (params.limitnum || 0)) {
            return messages;
        }

        // We need to fetch more messages.
        params.limitnum = (params.limitnum || 0) - messages.length;
        params.read = true;
        params.limitfrom = limitFromRead;

        try {
            const response = await this.getMessages(params, preSets, siteId);
            if (response.messages) {
                messages = messages.concat(response.messages);
            }

            return messages;
        } catch {
            return messages;
        }
    }

    /**
     * Get a self conversation.
     *
     * @param messageOffset Offset for messages list.
     * @param messageLimit Limit of messages. Defaults to 1 (last message).
     *                     We recommend getConversationMessages to get them.
     * @param newestFirst Whether to order messages by newest first.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID to get the self conversation for. If not defined, current user in the site.
     * @returns Promise resolved with the response.
     * @since 3.7
     */
    async getSelfConversation(
        messageOffset: number = 0,
        messageLimit: number = 1,
        newestFirst: boolean = true,
        siteId?: string,
        userId?: number,
    ): Promise<AddonMessagesConversationFormatted> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForSelfConversation(userId),
        };

        const params: AddonMessagesGetSelfConversationWSParams = {
            userid: userId,
            messageoffset: messageOffset,
            messagelimit: messageLimit,
            newestmessagesfirst: !!newestFirst,
        };
        const conversation = await site.read<AddonMessagesConversation>('core_message_get_self_conversation', params, preSets);

        return this.formatConversation(conversation, userId);
    }

    /**
     * Get unread conversation counts by type.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with the unread favourite, individual and group conversation counts.
     */
    async getUnreadConversationCounts(
        siteId?: string,
    ): Promise<{favourites: number; individual: number; group: number; self: number; orMore?: boolean}> {
        const site = await CoreSites.getSite(siteId);

        let counts: AddonMessagesUnreadConversationCountsEventData;

        if (this.isGroupMessagingEnabled()) {
            // @since 3.6
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getCacheKeyForUnreadConversationCounts(),
            };

            const result: AddonMessagesGetConversationCountsWSResponse =
                await site.read('core_message_get_unread_conversation_counts', {}, preSets);

            counts = {
                favourites: result.favourites,
                individual: result.types[AddonMessagesMessageConversationType.INDIVIDUAL],
                group: result.types[AddonMessagesMessageConversationType.GROUP],
                self: result.types[AddonMessagesMessageConversationType.SELF] || 0,
            };

        } else {
            const params: AddonMessageGetUnreadConversationsCountWSParams = {
                useridto: site.getUserId(),
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getCacheKeyForMessageCount(site.getUserId()),
                typeExpected: 'number',
            };

            const count = await site.read<number>('core_message_get_unread_conversations_count', params, preSets);

            counts = { favourites: 0, individual: count, group: 0, self: 0 };
        }

        // Notify the new counts so all views are updated.
        CoreEvents.trigger(ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT, counts, site.id);

        return counts;
    }

    /**
     * Get the latest unread received messages.
     *
     * @param notUsed Not user anymore.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved with the message unread count.
     */
    async getUnreadReceivedMessages(
        notUsed: boolean = true, // eslint-disable-line @typescript-eslint/no-unused-vars
        forceCache: boolean = false,
        ignoreCache: boolean = false,
        siteId?: string,
    ): Promise<AddonMessagesGetMessagesResult> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesGetMessagesWSParams = {
            read: false,
            limitfrom: 0,
            limitnum: ADDON_MESSAGES_LIMIT_MESSAGES,
            useridto: site.getUserId(),
            useridfrom: 0,
        };
        const preSets: CoreSiteWSPreSets = {};
        if (forceCache) {
            preSets.omitExpires = true;
        } else if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        return this.getMessages(params, preSets, siteId);
    }

    /**
     * Invalidate all contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateAllContactsCache(siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await this.invalidateContactsCache(siteId);

        await this.invalidateBlockedContactsCache(siteId);
    }

    /**
     * Invalidate blocked contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     */
    async invalidateBlockedContactsCache(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const userId = site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForBlockedContacts(userId));
    }

    /**
     * Invalidate contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateContactsCache(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCacheKeyForContacts());
    }

    /**
     * Invalidate user contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateUserContacts(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCacheKeyForUserContacts());
    }

    /**
     * Invalidate contact requests cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateContactRequestsCache(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        return site.invalidateWsCacheForKey(this.getCacheKeyForContactRequests());
    }

    /**
     * Invalidate contact requests count cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateContactRequestsCountCache(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCacheKeyForContactRequestsCount());
    }

    /**
     * Invalidate conversation.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateConversation(conversationId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForConversation(userId, conversationId));
    }

    /**
     * Invalidate conversation between users.
     *
     * @param otherUserId Other user ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateConversationBetweenUsers(otherUserId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForConversationBetweenUsers(userId, otherUserId));
    }

    /**
     * Invalidate conversation members cache.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateConversationMembers(conversationId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForConversationMembers(userId, conversationId));
    }

    /**
     * Invalidate conversation messages cache.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateConversationMessages(conversationId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForConversationMessages(userId, conversationId));
    }

    /**
     * Invalidate conversations cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateConversations(siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKeyStartingWith(this.getCommonCacheKeyForUserConversations(userId));
    }

    /**
     * Invalidate conversation counts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateConversationCounts(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCacheKeyForConversationCounts());
    }

    /**
     * Invalidate discussion cache.
     *
     * @param userId The user ID with whom the current user is having the discussion.
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateDiscussionCache(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCacheKeyForDiscussion(userId));
    }

    /**
     * Invalidate discussions cache.
     *
     * Note that {@link this.getDiscussions} uses the contacts, so we need to invalidate contacts too.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateDiscussionsCache(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const promises: Promise<void>[] = [];
        promises.push(site.invalidateWsCacheForKey(this.getCacheKeyForDiscussions()));
        promises.push(this.invalidateContactsCache(site.getId()));

        await Promise.all(promises);
    }

    /**
     * Invalidate member info cache.
     *
     * @param otherUserId The other user ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateMemberInfo(otherUserId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForMemberInfo(userId, otherUserId));
    }

    /**
     * Invalidate get message preferences.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateMessagePreferences(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getMessagePreferencesCacheKey());
    }

    /**
     * Invalidate all cache entries with member info.
     *
     * @param userId Id of the user to invalidate.
     * @param site Site object.
     * @returns Promise resolved when done.
     */
    protected async invalidateAllMemberInfo(userId: number, site: CoreSite): Promise<void> {
        await CorePromiseUtils.allPromises([
            this.invalidateMemberInfo(userId, site.id),
            this.invalidateUserContacts(site.id),
            this.invalidateBlockedContactsCache(site.id),
            this.invalidateContactRequestsCache(site.id),
            this.invalidateConversations(site.id),
            this.getConversationBetweenUsers(
                userId,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                site.id,
                undefined,
                true,
            ).then((conversation) => CorePromiseUtils.allPromises([
                this.invalidateConversation(conversation.id),
                this.invalidateConversationMembers(conversation.id, site.id),
            ])).catch(() => {
                // The conversation does not exist or we can't fetch it now, ignore it.
            }),
        ]);
    }

    /**
     * Invalidate a self conversation.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async invalidateSelfConversation(siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        await site.invalidateWsCacheForKey(this.getCacheKeyForSelfConversation(userId));
    }

    /**
     * Invalidate unread conversation counts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async invalidateUnreadConversationCounts(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        if (this.isGroupMessagingEnabled()) {
            // @since 3.6
            return site.invalidateWsCacheForKey(this.getCacheKeyForUnreadConversationCounts());

        } else {
            return site.invalidateWsCacheForKey(this.getCacheKeyForMessageCount(site.getUserId()));
        }
    }

    /**
     * Checks if the a user is blocked by the current user.
     *
     * @param userId The user ID to check against.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with boolean, rejected when we do not know.
     */
    async isBlocked(userId: number, siteId?: string): Promise<boolean> {
        if (this.isGroupMessagingEnabled()) {
            const member = await this.getMemberInfo(userId, siteId);

            return member.isblocked;
        }

        const blockedContacts = await this.getBlockedContacts(siteId);
        if (!blockedContacts.users || blockedContacts.users.length < 1) {
            return false;
        }

        return blockedContacts.users.some((user) => userId == user.id);
    }

    /**
     * Checks if the a user is a contact of the current user.
     *
     * @param userId The user ID to check against.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with boolean, rejected when we do not know.
     */
    async isContact(userId: number, siteId?: string): Promise<boolean> {
        if (this.isGroupMessagingEnabled()) {
            const member = await this.getMemberInfo(userId, siteId);

            return member.iscontact;
        }

        const contacts = await this.getContacts(siteId);

        return ['online', 'offline'].some((type) => {
            if (contacts[type] && contacts[type].length > 0) {
                return contacts[type].some((user: AddonMessagesGetContactsContact) => userId == user.id);
            }

            return false;
        });
    }

    /**
     * Returns whether or not group messaging is supported.
     *
     * @returns If related WS is available on current site.
     * @since 3.6
     */
    isGroupMessagingEnabled(): boolean {
        return CoreSites.wsAvailableInCurrentSite('core_message_get_conversations');
    }

    /**
     * Returns whether or not group messaging is supported in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.6
     */
    async isGroupMessagingEnabledInSite(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            return site.wsAvailable('core_message_get_conversations');
        } catch {
            return false;
        }
    }

    /**
     * Returns whether or not messaging is enabled for a certain site.
     *
     * This could call a WS so do not abuse this method.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when enabled, otherwise rejected.
     */
    async isMessagingEnabledForSite(siteId?: string): Promise<void> {
        const enabled = await this.isPluginEnabled(siteId);

        if (!enabled) {
            throw new CoreError('Messaging not enabled for the site');
        }
    }

    /**
     * Returns whether or not a site supports muting or unmuting a conversation.
     *
     * @param site The site to check, undefined for current site.
     * @returns If related WS is available on current site.
     * @since 3.7
     */
    isMuteConversationEnabled(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('core_message_mute_conversations');
    }

    /**
     * Returns whether or not a site supports muting or unmuting a conversation.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.7
     */
    async isMuteConversationEnabledInSite(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            return this.isMuteConversationEnabled(site);
        } catch {
            return false;
        }
    }

    /**
     * Returns whether or not the plugin is enabled in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    async isPluginEnabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return site.canUseAdvancedFeature('messaging');
    }

    /**
     * Returns whether or not self conversation is supported in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @returns If related WS is available on the site.
     * @since 3.7
     */
    isSelfConversationEnabled(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site?.wsAvailable('core_message_get_self_conversation');
    }

    /**
     * Returns whether or not self conversation is supported in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.7
     */
    async isSelfConversationEnabledInSite(siteId?: string): Promise<boolean> {
        try {
            const site = await CoreSites.getSite(siteId);

            return this.isSelfConversationEnabled(site);
        } catch {
            return false;
        }
    }

    /**
     * Mark message as read.
     *
     * @param messageId ID of message to mark as read
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean marking success or not.
     */
    async markMessageRead(messageId: number, siteId?: string): Promise<AddonMessagesMarkMessageReadResult> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesMarkMessageReadWSParams = {
            messageid: messageId,
            timeread: CoreTime.timestamp(),
        };

        return site.write('core_message_mark_message_read', params);
    }

    /**
     * Mark all messages of a conversation as read.
     *
     * @param conversationId Conversation ID.
     * @returns Promise resolved if success.
     * @since 3.6
     */
    async markAllConversationMessagesRead(conversationId: number): Promise<void> {
        const params: AddonMessagesMarkAllConversationMessagesAsReadWSParams = {
            userid: CoreSites.getCurrentSiteUserId(),
            conversationid: conversationId,
        };

        const preSets: CoreSiteWSPreSets = {
            responseExpected: false,
        };

        await CoreSites.getCurrentSite()?.write('core_message_mark_all_conversation_messages_as_read', params, preSets);
    }

    /**
     * Mark all messages of a discussion as read.
     *
     * @param userIdFrom User Id for the sender.
     * @returns Promise resolved with boolean marking success or not.
     * @deprecatedonmoodle since 3.6
     */
    async markAllMessagesRead(userIdFrom?: number): Promise<boolean> {
        const params: AddonMessagesMarkAllMessagesAsReadWSParams = {
            useridto: CoreSites.getCurrentSiteUserId(),
            useridfrom: userIdFrom,
        };

        const preSets: CoreSiteWSPreSets = {
            typeExpected: 'boolean',
        };

        const site = CoreSites.getCurrentSite();

        if (!site) {
            return false;
        }

        return site.write('core_message_mark_all_messages_as_read', params, preSets);
    }

    /**
     * Mute or unmute a conversation.
     *
     * @param conversationId Conversation ID.
     * @param set Whether to mute or unmute.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async muteConversation(conversationId: number, set: boolean, siteId?: string, userId?: number): Promise<void> {
        await this.muteConversations([conversationId], set, siteId, userId);
    }

    /**
     * Mute or unmute some conversations.
     *
     * @param conversations Conversation IDs.
     * @param set Whether to mute or unmute.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async muteConversations(conversations: number[], set: boolean, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();
        const params: AddonMessagesMuteConversationsWSParams = {
            userid: userId,
            conversationids: conversations,
        };

        const wsName = set ? 'core_message_mute_conversations' : 'core_message_unmute_conversations';
        await site.write(wsName, params);

        // Invalidate the conversations data.
        const promises = conversations.map((conversationId) => this.invalidateConversation(conversationId, site.getId(), userId));

        try {
            await Promise.all(promises);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Refresh the number of contact requests sent to the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with the number of contact requests.
     * @since 3.6
     */
    async refreshContactRequestsCount(siteId?: string): Promise<number> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await this.invalidateContactRequestsCountCache(siteId);

        return this.getContactRequestsCount(siteId);
    }

    /**
     * Refresh unread conversation counts and trigger event.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with the unread favourite, individual and group conversation counts.
     */
    async refreshUnreadConversationCounts(
        siteId?: string,
    ): Promise<{favourites: number; individual: number; group: number; orMore?: boolean}> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        await this.invalidateUnreadConversationCounts(siteId);

        return this.getUnreadConversationCounts(siteId);
    }

    /**
     * Remove a contact.
     *
     * @param userId User ID of the person to remove.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     */
    async removeContact(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesDeleteContactsWSParams = {
            userids: [userId],
        };

        const preSets: CoreSiteWSPreSets = {
            responseExpected: false,
        };

        await site.write('core_message_delete_contacts', params, preSets);

        return CorePromiseUtils.allPromises([
            this.invalidateUserContacts(site.id),
            this.invalidateAllMemberInfo(userId, site),
            this.invalidateContactsCache(site.id),
        ]).then(() => {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, contactRemoved: true };
            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);

            return;
        });
    }

    /**
     * Search for contacts.
     *
     * By default this only returns the first 100 contacts, but note that the WS can return thousands
     * of results which would take a while to process. The limit here is just a convenience to
     * prevent viewed to crash because too many DOM elements are created.
     *
     * @param query The query string.
     * @param limit The number of results to return, 0 for none.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the contacts.
     */
    async searchContacts(query: string, limit: number = 100, siteId?: string): Promise<AddonMessagesSearchContactsContact[]> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesSearchContactsWSParams = {
            searchtext: query,
            onlymycourses: false,
        };

        const preSets: CoreSiteWSPreSets = {
            getFromCache: false,
        };

        let contacts: AddonMessagesSearchContactsContact[] = await site.read('core_message_search_contacts', params, preSets);

        if (limit && contacts.length > limit) {
            contacts = contacts.splice(0, limit);
        }

        CoreUser.storeUsers(contacts);

        return contacts;
    }

    /**
     * Search for all the messges with a specific text.
     *
     * @param query The query string.
     * @param userId The user ID. If not defined, current user.
     * @param limitFrom Position of the first result to get. Defaults to 0.
     * @param limitNum Number of results to get. Defaults to ADDON_MESSAGES_LIMIT_SEARCH.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the results.
     */
    async searchMessages(
        query: string,
        userId?: number,
        limitFrom: number = 0,
        limitNum: number = ADDON_MESSAGES_LIMIT_SEARCH,
        siteId?: string,
    ): Promise<{messages: AddonMessagesMessageAreaContact[]; canLoadMore: boolean}> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesDataForMessageareaSearchMessagesWSParams = {
            userid: userId || site.getUserId(),
            search: query,
            limitfrom: limitFrom,
            limitnum: limitNum <= 0 ? 0 : limitNum + 1,
        };

        const preSets: CoreSiteWSPreSets = {
            getFromCache: false,
        };

        const result: AddonMessagesDataForMessageareaSearchMessagesWSResponse =
            await site.read('core_message_data_for_messagearea_search_messages', params, preSets);
        if (!result.contacts || !result.contacts.length) {
            return { messages: [], canLoadMore: false };
        }

        const users: CoreUserBasicData[] = result.contacts.map((contact) => ({
            id: contact.userid,
            fullname: contact.fullname,
            profileimageurl: contact.profileimageurl,
        }));

        CoreUser.storeUsers(users, site.id);

        if (limitNum <= 0) {
            return { messages: result.contacts, canLoadMore: false };
        }

        return {
            messages: result.contacts.slice(0, limitNum),
            canLoadMore: result.contacts.length > limitNum,
        };
    }

    /**
     * Search for users.
     *
     * @param query Text to search for.
     * @param limitFrom Position of the first found user to fetch.
     * @param limitNum Number of found users to fetch. Defaults to ADDON_MESSAGES_LIMIT_SEARCH.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved with two lists of found users: contacts and non-contacts.
     * @since 3.6
     */
    async searchUsers(
        query: string,
        limitFrom: number = 0,
        limitNum: number = ADDON_MESSAGES_LIMIT_SEARCH,
        siteId?: string,
    ): Promise<{
            contacts: AddonMessagesConversationMember[];
            nonContacts: AddonMessagesConversationMember[];
            canLoadMoreContacts: boolean;
            canLoadMoreNonContacts: boolean;
        }> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonMessagesMessageSearchUsersWSParams = {
            userid: site.getUserId(),
            search: query,
            limitfrom: limitFrom,
            limitnum: limitNum <= 0 ? 0 : limitNum + 1,
        };
        const preSets: CoreSiteWSPreSets = {
            getFromCache: false,
        };

        const result: AddonMessagesSearchUsersWSResponse = await site.read('core_message_message_search_users', params, preSets);
        const contacts = result.contacts || [];
        const nonContacts = result.noncontacts || [];

        CoreUser.storeUsers(contacts, site.id);
        CoreUser.storeUsers(nonContacts, site.id);

        if (limitNum <= 0) {
            return { contacts, nonContacts, canLoadMoreContacts: false, canLoadMoreNonContacts: false };
        }

        return {
            contacts: contacts.slice(0, limitNum),
            nonContacts: nonContacts.slice(0, limitNum),
            canLoadMoreContacts: contacts.length > limitNum,
            canLoadMoreNonContacts: nonContacts.length > limitNum,
        };
    }

    /**
     * Send a message to someone.
     *
     * @param toUserId User ID to send the message to.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with:
     *         - sent (Boolean) True if message was sent to server, false if stored in device.
     *         - message (Object) If sent=false, contains the stored message.
     */
    async sendMessage(
        toUserId: number,
        message: string,
        siteId?: string,
    ): Promise<AddonMessagesSendMessageResults> {

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async (): Promise<AddonMessagesSendMessageResults> => {
            const entry = await AddonMessagesOffline.saveMessage(toUserId, message, siteId);

            return {
                sent: false,
                message: {
                    msgid: -1,
                    text: entry.smallmessage,
                    timecreated: entry.timecreated,
                    conversationid: 0,
                    useridfrom: entry.useridfrom,
                    candeletemessagesforallusers: true,
                },
            };
        };

        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // Check if this conversation already has offline messages.
        // If so, store this message since they need to be sent in order.
        let hasStoredMessages = false;
        try {
            hasStoredMessages = await AddonMessagesOffline.hasMessages(toUserId, siteId);
        } catch {
            // Error, it's safer to assume it has messages.
            hasStoredMessages = true;
        }

        if (hasStoredMessages) {
            return storeOffline();
        }

        try {
            // Online and no messages stored. Send it to server.
            const result = await this.sendMessageOnline(toUserId, message);

            return {
                sent: true,
                message: result,
            };
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                throw error;
            }

            // Error sending message, store it to retry later.
            return storeOffline();
        }
    }

    /**
     * Send a message to someone. It will fail if offline or cannot connect.
     *
     * @param toUserId User ID to send the message to.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     */
    async sendMessageOnline(toUserId: number, message: string, siteId?: string): Promise<AddonMessagesSendInstantMessagesMessage> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const messages = [
            {
                touserid: toUserId,
                text: message,
                textformat: DEFAULT_TEXT_FORMAT,
            },
        ];

        const response = await this.sendMessagesOnline(messages, siteId);

        if (response && response[0] && response[0].msgid === -1) {
            // There was an error, and it should be translated already.
            throw new CoreWSError({ message: response[0].errormessage, errorcode: 'sendmessageerror' });
        }

        try {
            await this.invalidateDiscussionCache(toUserId, siteId);
        } catch {
            // Ignore errors.
        }

        return response[0];
    }

    /**
     * Send some messages. It will fail if offline or cannot connect.
     * IMPORTANT: Sending several messages at once for the same discussions can cause problems with display order,
     * since messages with same timecreated aren't ordered by ID.
     *
     * @param messages Messages to send. Each message must contain touserid, text and textformat.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure. Promise resolved doesn't mean that messages
     *         have been sent, the resolve param can contain errors for messages not sent.
     */
    async sendMessagesOnline(
        messages: AddonMessagesMessageData[],
        siteId?: string,
    ): Promise<AddonMessagesSendInstantMessagesMessage[]> {
        const site = await CoreSites.getSite(siteId);

        const data: AddonMessagesSendInstantMessagesWSParams = {
            messages,
        };

        return site.write('core_message_send_instant_messages', data);
    }

    /**
     * Send a message to a conversation.
     *
     * @param conversation Conversation.
     * @param message The message to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with:
     *         - sent (boolean) True if message was sent to server, false if stored in device.
     *         - message (any) If sent=false, contains the stored message.
     * @since 3.6
     */
    async sendMessageToConversation(
        conversation: AddonMessagesConversation,
        message: string,
        siteId?: string,
    ): Promise<AddonMessagesSendMessageResults> {

        const site = await CoreSites.getSite(siteId);
        siteId = site.getId();

        // Convenience function to store a message to be synchronized later.
        const storeOffline = async(): Promise<AddonMessagesSendMessageResults> => {
            const entry = await AddonMessagesOffline.saveConversationMessage(conversation, message, siteId);

            return {
                sent: false,
                message: {
                    id: -1,
                    useridfrom: site.getUserId(),
                    text: entry.text,
                    timecreated: entry.timecreated,
                },
            };
        };

        if (!CoreNetwork.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // Check if this conversation already has offline messages.
        // If so, store this message since they need to be sent in order.
        let hasStoredMessages = false;
        try {
            hasStoredMessages = await AddonMessagesOffline.hasConversationMessages(conversation.id, siteId);
        } catch {
            // Error, it's safer to assume it has messages.
            hasStoredMessages = true;
        }

        if (hasStoredMessages) {
            return storeOffline();
        }

        try {
            // Online and no messages stored. Send it to server.
            const result = await this.sendMessageToConversationOnline(conversation.id, message, siteId);

            return {
                sent: true,
                message: result,
            };
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
                // It's a WebService error, the user cannot send the message so don't store it.
                throw error;
            }

            // Error sending message, store it to retry later.
            return storeOffline();
        }
    }

    /**
     * Send a message to a conversation. It will fail if offline or cannot connect.
     *
     * @param conversationId Conversation ID.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     * @since 3.6
     */
    async sendMessageToConversationOnline(
        conversationId: number,
        message: string,
        siteId?: string,
    ): Promise<AddonMessagesSendMessagesToConversationMessage> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const messages = [
            {
                text: message,
                textformat: DEFAULT_TEXT_FORMAT,
            },
        ];

        const response = await this.sendMessagesToConversationOnline(conversationId, messages, siteId);

        try {
            await this.invalidateConversationMessages(conversationId, siteId);
        } catch {
            // Ignore errors.
        }

        return response[0];
    }

    /**
     * Send some messages to a conversation. It will fail if offline or cannot connect.
     *
     * @param conversationId Conversation ID.
     * @param messages Messages to send. Each message must contain text and, optionally, textformat.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected if failure.
     * @since 3.6
     */
    async sendMessagesToConversationOnline(
        conversationId: number,
        messages: CoreMessageSendMessagesToConversationMessageData[],
        siteId?: string,
    ): Promise<AddonMessagesSendMessagesToConversationMessage[]> {

        const site = await CoreSites.getSite(siteId);
        const params: CoreMessageSendMessagesToConversationWSParams = {
            conversationid: conversationId,
            messages: messages.map((message) => ({
                text: message.text,
                textformat: message.textformat !== undefined ? message.textformat : DEFAULT_TEXT_FORMAT,
            })),
        };

        return site.write('core_message_send_messages_to_conversation', params);
    }

    /**
     * Set or unset a conversation as favourite.
     *
     * @param conversationId Conversation ID.
     * @param set Whether to set or unset it as favourite.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    setFavouriteConversation(conversationId: number, set: boolean, siteId?: string, userId?: number): Promise<void> {
        return this.setFavouriteConversations([conversationId], set, siteId, userId);
    }

    /**
     * Set or unset some conversations as favourites.
     *
     * @param conversations Conversation IDs.
     * @param set Whether to set or unset them as favourites.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @returns Resolved when done.
     */
    async setFavouriteConversations(conversations: number[], set: boolean, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        userId = userId || site.getUserId();

        const params: AddonMessagesSetFavouriteConversationsWSParams = {
            userid: userId,
            conversations: conversations,
        };
        const wsName = set ? 'core_message_set_favourite_conversations' : 'core_message_unset_favourite_conversations';

        await site.write(wsName, params);

        // Invalidate the conversations data.
        const promises = conversations.map((conversationId) => this.invalidateConversation(conversationId, site.getId(), userId));

        try {
            await Promise.all(promises);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Helper method to sort conversations by last message time.
     *
     * @param conversations Array of conversations.
     * @returns Conversations sorted with most recent last.
     */
    sortConversations(conversations: AddonMessagesConversationFormatted[] = []): AddonMessagesConversationFormatted[] {
        return conversations.sort((a, b) => {
            const timeA = Number(a.lastmessagedate);
            const timeB = Number(b.lastmessagedate);

            if (timeA == timeB && a.id) {
                // Same time, sort by ID.
                return a.id <= b.id ? 1 : -1;
            }

            return timeA <= timeB ? 1 : -1;
        });
    }

    /**
     * Helper method to sort messages by time.
     *
     * @param messages Array of messages containing the key 'timecreated'.
     * @returns Messages sorted with most recent last.
     */
    sortMessages(messages: AddonMessagesConversationMessageFormatted[]): AddonMessagesConversationMessageFormatted[];
    sortMessages(
        messages: (AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[],
    ): (AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[];
    sortMessages(messages: AddonMessagesOfflineAnyMessagesFormatted[]): AddonMessagesOfflineAnyMessagesFormatted[];
    sortMessages(
        messages: (AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[] |
        AddonMessagesOfflineAnyMessagesFormatted[] |
        AddonMessagesConversationMessageFormatted[],
    ): (AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[] |
        AddonMessagesOfflineAnyMessagesFormatted[] |
        AddonMessagesConversationMessageFormatted[] {
        return messages.sort((a, b) => {
            // Pending messages last.
            if (a.pending && !b.pending) {
                return 1;
            } else if (!a.pending && b.pending) {
                return -1;
            }

            const timecreatedA = a.timecreated;
            const timecreatedB = b.timecreated;
            if (timecreatedA == timecreatedB && 'id' in a) {
                const bId = 'id' in b ? b.id : 0;

                // Same time, sort by ID.
                return a.id >= bId ? 1 : -1;
            }

            return timecreatedA >= timecreatedB ? 1 : -1;
        });
    }

    /**
     * Store user data from contacts in local DB.
     *
     * @param contactTypes List of contacts grouped in types.
     */
    protected storeUsersFromAllContacts(contactTypes: AddonMessagesGetContactsWSResponse): void {
        for (const x in contactTypes) {
            CoreUser.storeUsers(contactTypes[x]);
        }
    }

    /**
     * Store user data from discussions in local DB.
     *
     * @param discussions List of discussions.
     * @param siteId Site ID. If not defined, current site.
     */
    protected storeUsersFromDiscussions(discussions: { [userId: number]: AddonMessagesDiscussion }, siteId?: string): void {
        const users: CoreUserBasicData[] = [];

        for (const userId in discussions) {
            users.push({
                id: parseInt(userId, 10),
                fullname: discussions[userId].fullname,
                profileimageurl: discussions[userId].profileimageurl,
            });
        }
        CoreUser.storeUsers(users, siteId);
    }

    /**
     * Unblock a user.
     *
     * @param userId User ID of the person to unblock.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Resolved when done.
     */
    async unblockContact(userId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        try {
            if (site.wsAvailable('core_message_unblock_user')) {
                // Since Moodle 3.6
                const params: AddonMessagesUnblockUserWSParams = {
                    userid: site.getUserId(),
                    unblockeduserid: userId,
                };
                await site.write('core_message_unblock_user', params);
            } else {
                const params: { userids: number[] } = {
                    userids: [userId],
                };
                const preSets: CoreSiteWSPreSets = {
                    responseExpected: false,
                };
                await site.write('core_message_unblock_contacts', params, preSets);
            }

            await this.invalidateAllMemberInfo(userId, site);
        } finally {
            const data: AddonMessagesMemberInfoChangedEventData = { userId, userUnblocked: true };

            CoreEvents.trigger(ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT, data, site.id);
        }
    }

}

export const AddonMessages = makeSingleton(AddonMessagesProvider);

/**
 * Options to pass to getConversationMessages.
 */
export type AddonMessagesGetConversationMessagesOptions = {
    excludePending?: boolean; // True to exclude messages pending to be sent.
    limitFrom?: number; // Offset for messages list. Defaults to 0.
    limitTo?: number; // Limit of messages.
    newestFirst?: boolean; // Whether to order messages by newest first.
    timeFrom?: number; // The timestamp from which the messages were created (in seconds). Defaults to 0.
    siteId?: string; // Site ID. If not defined, use current site.
    userId?: number; // User ID. If not defined, current user in the site.
    forceCache?: boolean; // True if it should return cached data. Has priority over ignoreCache.
    ignoreCache?: boolean; // True if it should ignore cached data (it will always fail in offline or server down).
};

/**
 * Data returned by core_message_get_self_conversation WS.
 */
export type AddonMessagesConversation = {
    id: number; // The conversation id.
    name?: string; // The conversation name, if set.
    subname?: string; // A subtitle for the conversation name, if set.
    imageurl?: string; // A link to the conversation picture, if set.
    type: number; // The type of the conversation (1=individual,2=group,3=self).
    membercount: number; // Total number of conversation members.
    ismuted: boolean; // If the user muted this conversation.
    isfavourite: boolean; // If the user marked this conversation as a favourite.
    isread: boolean; // If the user has read all messages in the conversation.
    unreadcount?: number; // The number of unread messages in this conversation.
    members: AddonMessagesConversationMember[];
    messages: AddonMessagesConversationMessage[];
    candeletemessagesforallusers: boolean; // @since 3.7. If the user can delete messages in the conversation for all users.
};

/**
 * Params of core_message_get_conversation WS.
 */
type AddonMessagesGetConversationWSParams = {
    userid: number; // The id of the user who we are viewing conversations for.
    conversationid: number; // The id of the conversation to fetch.
    includecontactrequests: boolean; // Include contact requests in the members.
    includeprivacyinfo: boolean; // Include privacy info in the members.
    memberlimit?: number; // Limit for number of members.
    memberoffset?: number; // Offset for member list.
    messagelimit?: number; // Limit for number of messages.
    messageoffset?: number; // Offset for messages list.
    newestmessagesfirst?: boolean; // Order messages by newest first.
};

/**
 * Data returned by core_message_get_conversation WS.
 */
type AddonMessagesGetConversationWSResponse = AddonMessagesConversation;

/**
 * Params of core_message_get_self_conversation WS.
 */
type AddonMessagesGetSelfConversationWSParams = {
    userid: number; // The id of the user who we are viewing self-conversations for.
    messagelimit?: number; // Limit for number of messages.
    messageoffset?: number; // Offset for messages list.
    newestmessagesfirst?: boolean; // Order messages by newest first.
};

/**
 * Conversation with some calculated data.
 */
export type AddonMessagesConversationFormatted = AddonMessagesConversation & {
    lastmessage?: string; // Calculated in the app. Last message.
    lastmessagedate?: number; // Calculated in the app. Date the last message was sent.
    sentfromcurrentuser?: boolean; // Calculated in the app. Whether last message was sent by the current user.
    name?: string; // Calculated in the app. If private conversation, name of the other user.
    userid?: number; // Calculated in the app. URL. If private conversation, ID of the other user.
    showonlinestatus?: boolean; // Calculated in the app. If private conversation, whether to show online status of the other user.
    isonline?: boolean; // Calculated in the app. If private conversation, whether the other user is online.
    isblocked?: boolean; // Calculated in the app. If private conversation, whether the other user is blocked.
    otherUser?: AddonMessagesConversationMember; // Calculated in the app. Other user in the conversation.
};

/**
 * Params of core_message_get_conversation_between_users WS.
 */
type AddonMessagesGetConversationBetweenUsersWSParams = {
    userid: number; // The id of the user who we are viewing conversations for.
    otheruserid: number; // The other user id.
    includecontactrequests: boolean; // Include contact requests in the members.
    includeprivacyinfo: boolean; // Include privacy info in the members.
    memberlimit?: number; // Limit for number of members.
    memberoffset?: number; // Offset for member list.
    messagelimit?: number; // Limit for number of messages.
    messageoffset?: number; // Offset for messages list.
    newestmessagesfirst?: boolean; // Order messages by newest first.
};

/**
 * Params of core_message_get_member_info WS.
 */
type AddonMessagesGetMemberInfoWSParams = {
    referenceuserid: number; // Id of the user.
    userids: number[];
    includecontactrequests?: boolean; // Include contact requests in response.
    includeprivacyinfo?: boolean; // Include privacy info in response.
};

/**
 * Params of core_message_get_conversation_members WS.
 */
type AddonMessagesGetConversationMembersWSParams = {
    userid: number; // The id of the user we are performing this action on behalf of.
    conversationid: number; // The id of the conversation.
    includecontactrequests?: boolean; // Do we want to include contact requests?.
    includeprivacyinfo?: boolean; // Do we want to include privacy info?.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Conversation member returned by core_message_get_member_info and core_message_get_conversation_members WS.
 */
export type AddonMessagesConversationMember = {
    id: number; // The user id.
    fullname: string; // The user's name.
    profileurl: string; // The link to the user's profile page.
    profileimageurl: string; // User picture URL.
    profileimageurlsmall: string; // Small user picture URL.
    isonline: boolean; // The user's online status.
    showonlinestatus: boolean; // Show the user's online status?.
    isblocked: boolean; // If the user has been blocked.
    iscontact: boolean; // Is the user a contact?.
    isdeleted: boolean; // Is the user deleted?.
    canmessageevenifblocked: boolean; // @since 3.8. If the user can still message even if they get blocked.
    canmessage: boolean; // If the user can be messaged.
    requirescontact: boolean; // If the user requires to be contacts.
    contactrequests?: { // The contact requests.
        id: number; // The id of the contact request.
        userid: number; // The id of the user who created the contact request.
        requesteduserid: number; // The id of the user confirming the request.
        timecreated: number; // The timecreated timestamp for the contact request.
    }[];
    conversations?: { // Conversations between users.
        id: number; // Conversations id.
        type: number; // Conversation type: private or public.
        name: string; // Multilang compatible conversation name2.
        timecreated: number; // The timecreated timestamp for the conversation.
    }[];
};

/**
 * Conversation message.
 */
export type AddonMessagesConversationMessage = {
    id: number; // The id of the message.
    useridfrom: number; // The id of the user who sent the message.
    text: string; // The text of the message.
    timecreated: number; // The timecreated timestamp for the message.
};

/**
 * Conversation message with some calculated data.
 */
export type AddonMessagesConversationMessageFormatted =
    (AddonMessagesConversationMessage
    | AddonMessagesGetMessagesMessage
    | AddonMessagesOfflineMessagesDBRecordFormatted
    | AddonMessagesOfflineConversationMessagesDBRecordFormatted) & {
        pending?: boolean; // Calculated in the app. Whether the message is pending to be sent.
        sending?: boolean; // Calculated in the app. Whether the message is being sent right now.
        hash?: string; // Calculated in the app. A hash to identify the message.
        showDate?: boolean; // Calculated in the app. Whether to show the date before the message.
        showUserData?: boolean; // Calculated in the app. Whether to show the user data in the message.
        showTail?: boolean; // Calculated in the app. Whether to show a "tail" in the message.
    };

/**
 * Data returned by core_message_get_user_message_preferences WS.
 */
export type AddonMessagesGetUserMessagePreferencesWSResponse = {
    preferences: AddonMessagesMessagePreferences;
    blocknoncontacts: number; // Privacy messaging setting to define who can message you.
    entertosend: boolean; // User preference for using enter to send messages.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Message preferences.
 */
export type AddonMessagesMessagePreferences = {
    userid: number; // User id.
    disableall: number; // Whether all the preferences are disabled.
    processors: { // Config form values.
        displayname: string; // Display name.
        name: string; // Processor name.
        hassettings: boolean; // Whether has settings.
        contextid: number; // Context id.
        userconfigured: number; // Whether is configured by the user.
    }[];
    components: { // Available components.
        displayname: string; // Display name.
        notifications: AddonMessagesMessagePreferencesNotification[]; // List of notificaitons for the component.
    }[];
} & AddonMessagesMessagePreferencesCalculatedData;

/**
 * Notification processor in message preferences.
 */
export type AddonMessagesMessagePreferencesNotification = {
    displayname: string; // Display name.
    preferencekey: string; // Preference key.
    processors: AddonMessagesMessagePreferencesNotificationProcessor[]; // Processors values for this notification.
};

/**
 * Notification processor in message preferences.
 */
export type AddonMessagesMessagePreferencesNotificationProcessor = {
    displayname: string; // Display name.
    name: string; // Processor name.
    locked: boolean; // Is locked by admin?.
    lockedmessage?: string; // @since 3.6. Text to display if locked.
    userconfigured: number; // Is configured?.
    enabled?: boolean; // @since 4.0. Processor enabled.
    loggedin: AddonNotificationsPreferencesNotificationProcessorState; // @deprecatedonmoodle since 4.0.
    loggedoff: AddonNotificationsPreferencesNotificationProcessorState; // @deprecatedonmoodle since 4.0.
};

/**
 * Message discussion (before 3.6).
 *
 * @deprecatedonmoodle since 3.6.
 */
export type AddonMessagesDiscussion = {
    fullname: string; // Full name of the other user in the discussion.
    profileimageurl?: string; // Profile image of the other user in the discussion.
    message?: { // Last message.
        id: number; // Message ID.
        user: number; // User ID that sent the message.
        message: string; // Text of the message.
        timecreated: number; // Time the message was sent.
        pending?: boolean; // Whether the message is pending to be sent.
    };
    unread?: boolean; // Whether the discussion has unread messages.
};

/**
 * Contact for message area.
 */
export type AddonMessagesMessageAreaContact = {
    userid: number; // The user's id.
    fullname: string; // The user's name.
    profileimageurl: string; // User picture URL.
    profileimageurlsmall: string; // Small user picture URL.
    ismessaging: boolean; // If we are messaging the user.
    sentfromcurrentuser: boolean; // Was the last message sent from the current user?.
    lastmessage: string; // The user's last message.
    lastmessagedate: number; // @since 3.6. Timestamp for last message.
    messageid: number; // The unique search message id.
    showonlinestatus: boolean; // Show the user's online status?.
    isonline: boolean; // The user's online status.
    isread: boolean; // If the user has read the message.
    isblocked: boolean; // If the user has been blocked.
    unreadcount: number; // The number of unread messages in this conversation.
    conversationid: number; // @since 3.6. The id of the conversation.
} & AddonMessagesMessageAreaContactCalculatedData;

/**
 * Params of core_message_get_blocked_users WS.
 */
type AddonMessagesGetBlockedUsersWSParams = {
    userid: number; // The user whose blocked users we want to retrieve.
};

/**
 * Result of WS core_message_get_blocked_users.
 */
export type AddonMessagesGetBlockedUsersWSResponse = {
    users: AddonMessagesBlockedUser[]; // List of blocked users.
    warnings?: CoreWSExternalWarning[];
};

/**
 * User data returned by core_message_get_blocked_users.
 */
export type AddonMessagesBlockedUser = {
    id: number; // User ID.
    fullname: string; // User full name.
    profileimageurl?: string; // User picture URL.
};

/**
 * Result of WS core_message_get_contacts.
 */
export type AddonMessagesGetContactsWSResponse = {
    online: AddonMessagesGetContactsContact[]; // List of online contacts.
    offline: AddonMessagesGetContactsContact[]; // List of offline contacts.
    strangers: AddonMessagesGetContactsContact[]; // List of users that are not in the user's contact list but have sent a message.
} & AddonMessagesGetContactsCalculatedData;

/**
 * User data returned by core_message_get_contacts.
 */
export type AddonMessagesGetContactsContact = {
    id: number; // User ID.
    fullname: string; // User full name.
    profileimageurl?: string; // User picture URL.
    profileimageurlsmall?: string; // Small user picture URL.
    unread: number; // Unread message count.
};

/**
 * Params of core_message_search_contacts WS.
 */
type AddonMessagesSearchContactsWSParams = {
    searchtext: string; // String the user's fullname has to match to be found.
    onlymycourses?: boolean; // Limit search to the user's courses.
};

/**
 * User data returned by core_message_search_contacts.
 */
export type AddonMessagesSearchContactsContact = {
    id: number; // User ID.
    fullname: string; // User full name.
    profileimageurl?: string; // User picture URL.
    profileimageurlsmall?: string; // Small user picture URL.
};

/**
 * Params of core_message_get_conversation_messages WS.
 */
type AddonMessagesGetConversationMessagesWSParams = {
    currentuserid: number; // The current user's id.
    convid: number; // The conversation id.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
    newest?: boolean; // Newest first?.
    timefrom?: number; // The timestamp from which the messages were created.
};

/**
 * Data returned by core_message_get_conversation_messages WS.
 */
type AddonMessagesGetConversationMessagesWSResponse = {
    id: number; // The conversation id.
    members: AddonMessagesConversationMember[];
    messages: AddonMessagesConversationMessage[];
};

/**
 * Result formatted of WS core_message_get_conversation_messages.
 */
export type AddonMessagesGetConversationMessagesResult = Omit<AddonMessagesGetConversationMessagesWSResponse, 'messages'> & {
    messages: (AddonMessagesConversationMessage | AddonMessagesOfflineConversationMessagesDBRecordFormatted)[];
} & AddonMessagesGetConversationMessagesCalculatedData;

/**
 * Params of core_message_get_conversations WS.
 */
type AddonMessagesGetConversationsWSParams = {
    userid: number; // The id of the user who we are viewing conversations for.
    limitfrom?: number; // The offset to start at.
    limitnum?: number; // Limit number of conversations to this.
    type?: number; // Filter by type.
    favourites?: boolean; // Whether to restrict the results to contain NO favourite conversations (false), ONLY favourite
    // conversation(true), or ignore any restriction altogether(null).
    mergeself?: boolean; // Whether to include self-conversations (true) or ONLY private conversations (false) when private
    // conversations are requested.

};

/**
 * Result of WS core_message_get_conversations.
 */
export type AddonMessagesGetConversationsResult = {
    conversations: AddonMessagesConversation[];
};

/**
 * Params of core_message_get_messages WS.
 */
export type AddonMessagesGetMessagesWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
    useridfrom?: number; // The user id who send the message, 0 for any user. -10 or -20 for no-reply or support user.
    type?: string; // Type of message to return, expected values are: notifications, conversations and both.
    read?: boolean; // True for getting read messages, false for unread.
    newestfirst?: boolean; // True for ordering by newest first, false for oldest first.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Result of WS core_message_get_messages.
 */
export type AddonMessagesGetMessagesResult = {
    messages: AddonMessagesGetMessagesMessage[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Message data returned by core_message_get_messages.
 */
export type AddonMessagesGetMessagesMessage = {
    id: number; // Message id.
    useridfrom: number; // User from id.
    useridto: number; // User to id.
    subject: string; // The message subject.
    text: string; // The message text formated.
    fullmessage: string; // The message.
    fullmessageformat: CoreTextFormat; // Fullmessage format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    fullmessagehtml: string; // The message in html.
    smallmessage: string; // The shorten message.
    notification: number; // Is a notification?.
    contexturl: string; // Context URL.
    contexturlname: string; // Context URL link name.
    timecreated: number; // Time created.
    timeread: number; // Time read.
    usertofullname: string; // User to full name.
    userfromfullname: string; // User from full name.
    component?: string; // @since 3.7. The component that generated the notification.
    eventtype?: string; // @since 3.7. The type of notification.
    customdata?: string; // @since 3.7. Custom data to be passed to the message processor.
} & AddonMessagesGetMessagesMessageCalculatedData;

/**
 * Response object on get discussion.
 */
export type AddonMessagesGetDiscussionMessages = {
    messages: (AddonMessagesGetMessagesMessage | AddonMessagesOfflineMessagesDBRecordFormatted)[];
    canLoadMore: boolean;
};

/**
 * Params of core_message_data_for_messagearea_search_messages WS.
 */
type AddonMessagesDataForMessageareaSearchMessagesWSParams = {
    userid: number; // The id of the user who is performing the search.
    search: string; // The string being searched.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Result of WS core_message_data_for_messagearea_search_messages.
 */
export type AddonMessagesDataForMessageareaSearchMessagesWSResponse = {
    contacts: AddonMessagesMessageAreaContact[];
};

/**
 * Params of core_message_message_search_users WS.
 */
type AddonMessagesMessageSearchUsersWSParams = {
    userid: number; // The id of the user who is performing the search.
    search: string; // The string being searched.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Result of WS core_message_message_search_users.
 */
export type AddonMessagesSearchUsersWSResponse = {
    contacts: AddonMessagesConversationMember[];
    noncontacts: AddonMessagesConversationMember[];
};

/**
 * Params of core_message_mark_message_read WS.
 */
type AddonMessagesMarkMessageReadWSParams = {
    messageid: number; // Id of the message in the messages table.
    timeread?: number; // Timestamp for when the message should be marked read.
};

/**
 * Result of WS core_message_mark_message_read.
 */
export type AddonMessagesMarkMessageReadResult = {
    messageid: number; // The id of the message in the messages table.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_message_send_instant_messages.
 */
export type AddonMessagesSendInstantMessagesMessage = {
    msgid: number; // Test this to know if it succeeds: i of the created message if it succeeded, -1 when failed.
    clientmsgid?: string; // Your own id for the message.
    errormessage?: string; // Error message - if it failed.
    text?: string; // @since 3.6. The text of the message.
    timecreated?: number; // @since 3.6. The timecreated timestamp for the message.
    conversationid?: number; // @since 3.6. The conversation id for this message.
    useridfrom?: number; // @since 3.6. The user id who sent the message.
    candeletemessagesforallusers: boolean; // @since 3.7. If the user can delete messages in the conversation for all users.
};

export type CoreMessageSendMessagesToConversationMessageData ={
    text: string; // The text of the message.
    textformat?: CoreTextFormat; // Text format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
};

/**
 * Params of core_message_send_messages_to_conversation WS.
 */
type CoreMessageSendMessagesToConversationWSParams = {
    conversationid: number; // Id of the conversation.
    messages: CoreMessageSendMessagesToConversationMessageData[];
};

/**
 * Result of WS core_message_send_messages_to_conversation.
 */
export type AddonMessagesSendMessagesToConversationMessage = {
    id: number; // The id of the message.
    useridfrom: number; // The id of the user who sent the message.
    text: string; // The text of the message.
    timecreated: number; // The timecreated timestamp for the message.
};

/**
 * Result for Send Messages functions trying online or storing in offline.
 */
export type AddonMessagesSendMessageResults = {
    sent: boolean;
    message: AddonMessagesSendMessagesToConversationMessage | AddonMessagesSendInstantMessagesMessage;
};

/**
 * Calculated data for core_message_get_contacts.
 */
export type AddonMessagesGetContactsCalculatedData = {
    blocked?: AddonMessagesBlockedUser[]; // Calculated in the app. List of blocked users.
};

/**
 * Calculated data for core_message_get_conversation_messages.
 */
export type AddonMessagesGetConversationMessagesCalculatedData = {
    canLoadMore?: boolean; // Calculated in the app. Whether more messages can be loaded.
};

/**
 * Calculated data for message preferences.
 */
export type AddonMessagesMessagePreferencesCalculatedData = {
    blocknoncontacts?: number; // Calculated in the app. Based on the result of core_message_get_user_message_preferences.
};

/**
 * Calculated data for messages returned by core_message_get_messages.
 */
export type AddonMessagesGetMessagesMessageCalculatedData = {
    pending?: boolean; // Calculated in the app. Whether the message is pending to be sent.
    read?: boolean; // Calculated in the app. Whether the message has been read.
};

/**
 * Calculated data for contact for message area.
 */
export type AddonMessagesMessageAreaContactCalculatedData = {
    id?: number; // Calculated in the app. User ID.
};

/**
 * Params of core_message_block_user WS.
 */
type AddonMessagesBlockUserWSParams = {
    userid: number; // The id of the user who is blocking.
    blockeduserid: number; // The id of the user being blocked.
};

/**
 * Params of core_message_unblock_user WS.
 */
type AddonMessagesUnblockUserWSParams = {
    userid: number; // The id of the user who is unblocking.
    unblockeduserid: number; // The id of the user being unblocked.
};

/**
 * Params of core_message_confirm_contact_request WS.
 */
type AddonMessagesConfirmContactRequestWSParams = {
    userid: number; // The id of the user making the request.
    requesteduserid: number; // The id of the user being requested.
};

/**
 * Params of core_message_create_contact_request WS.
 */
type AddonMessagesCreateContactRequestWSParams = AddonMessagesConfirmContactRequestWSParams;

/**
 * Data returned by core_message_create_contact_request WS.
 */
export type AddonMessagesCreateContactRequestWSResponse = {
    request?: {
        id: number; // Message id.
        userid: number; // User from id.
        requesteduserid: number; // User to id.
        timecreated: number; // Time created.
    }; // Request record.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Params of core_message_decline_contact_request WS.
 */
type AddonMessagesDeclineContactRequestWSParams = AddonMessagesConfirmContactRequestWSParams;

/**
 * Params of core_message_delete_conversations_by_id WS.
 */
type AddonMessagesDeleteConversationsByIdWSParams = {
    userid: number; // The user id of who we want to delete the conversation for.
    conversationids: number[]; // List of conversation IDs.
};

/**
 * Params of core_message_delete_message WS.
 */
type AddonMessagesDeleteMessageWSParams = {
    messageid: number; // The message id.
    userid: number; // The user id of who we want to delete the message for.
    read?: boolean; // If is a message read.
};

/**
 * Params of core_message_delete_message_for_all_users WS.
 */
type AddonMessagesDeleteMessageForAllUsersWSParams = {
    messageid: number; // The message id.
    userid: number; // The user id of who we want to delete the message for all users.
};

/**
 * Params of core_message_get_user_contacts WS.
 */
type AddonMessagesGetUserContactsWSParams = {
    userid: number; // The id of the user who we retrieving the contacts for.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Data returned by core_message_get_user_contacts WS.
 */
export type AddonMessagesGetUserContactsWSResponse = {
    id: number; // The user id.
    fullname: string; // The user's name.
    profileurl: string; // The link to the user's profile page.
    profileimageurl: string; // User picture URL.
    profileimageurlsmall: string; // Small user picture URL.
    isonline: boolean; // The user's online status.
    showonlinestatus: boolean; // Show the user's online status?.
    isblocked: boolean; // If the user has been blocked.
    iscontact: boolean; // Is the user a contact?.
    isdeleted: boolean; // Is the user deleted?.
    canmessageevenifblocked: boolean; // If the user can still message even if they get blocked.
    canmessage: boolean; // If the user can be messaged.
    requirescontact: boolean; // If the user requires to be contacts.
    contactrequests?: { // The contact requests.
        id: number; // The id of the contact request.
        userid: number; // The id of the user who created the contact request.
        requesteduserid: number; // The id of the user confirming the request.
        timecreated: number; // The timecreated timestamp for the contact request.
    }[];
    conversations?: { // Conversations between users.
        id: number; // Conversations id.
        type: number; // Conversation type: private or public.
        name: string; // Multilang compatible conversation name2.
        timecreated: number; // The timecreated timestamp for the conversation.
    }[];
}[];

/**
 * Params of core_message_get_contact_requests WS.
 */
type AddonMessagesGetContactRequestsWSParams = {
    userid: number; // The id of the user we want the requests for.
    limitfrom?: number; // Limit from.
    limitnum?: number; // Limit number.
};

/**
 * Data returned by core_message_get_contact_requests WS.
 */
export type AddonMessagesGetContactRequestsWSResponse = {
    id: number; // The user id.
    fullname: string; // The user's name.
    profileurl: string; // The link to the user's profile page.
    profileimageurl: string; // User picture URL.
    profileimageurlsmall: string; // Small user picture URL.
    isonline: boolean; // The user's online status.
    showonlinestatus: boolean; // Show the user's online status?.
    isblocked: boolean; // If the user has been blocked.
    iscontact: boolean; // Is the user a contact?.
    isdeleted: boolean; // Is the user deleted?.
    canmessageevenifblocked: boolean; // If the user can still message even if they get blocked.
    canmessage: boolean; // If the user can be messaged.
    requirescontact: boolean; // If the user requires to be contacts.
    contactrequests?: { // The contact requests.
        id: number; // The id of the contact request.
        userid: number; // The id of the user who created the contact request.
        requesteduserid: number; // The id of the user confirming the request.
        timecreated: number; // The timecreated timestamp for the contact request.
    }[];
    conversations?: { // Conversations between users.
        id: number; // Conversations id.
        type: number; // Conversation type: private or public.
        name: string; // Multilang compatible conversation name2.
        timecreated: number; // The timecreated timestamp for the conversation.
    }[];
}[];

/**
 * Params of core_message_get_received_contact_requests_count WS.
 */
type AddonMessagesGetReceivedContactRequestsCountWSParams = {
    userid: number; // The id of the user we want to return the number of received contact requests for.
};

/**
 * Params of core_message_mark_all_conversation_messages_as_read WS.
 */
type AddonMessagesMarkAllConversationMessagesAsReadWSParams = {
    userid: number; // The user id who who we are marking the messages as read for.
    conversationid: number; // The conversation id who who we are marking the messages as read for.
};

/**
 * Params of core_message_mark_all_messages_as_read WS. Deprecated on Moodle 3.6
 */
type AddonMessagesMarkAllMessagesAsReadWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
    useridfrom?: number; // The user id who send the message, 0 for any user. -10 or -20 for no-reply or support user.
};

/**
 * Params of core_message_mute_conversations and core_message_unmute_conversations WS.
 */
type AddonMessagesMuteConversationsWSParams = {
    userid: number; // The id of the user who is blocking.
    conversationids: number[];
};

/**
 * Params of core_message_delete_contacts WS.
 */
type AddonMessagesDeleteContactsWSParams = {
    userids: number[]; // List of user IDs.
    userid?: number; // The id of the user we are deleting the contacts for, 0 for the current user.

};

/**
 * One message data.
 */
export type AddonMessagesMessageData = {
    touserid: number; // Id of the user to send the private message.
    text: string; // The text of the message.
    textformat?: CoreTextFormat; // Text format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    clientmsgid?: string; // Your own client id for the message. If this id is provided, the fail message id will be returned.
};

/**
 * Params of core_message_send_instant_messages WS.
 */
type AddonMessagesSendInstantMessagesWSParams = {
    messages: AddonMessagesMessageData[];
};

/**
 * Data returned by core_message_get_conversation_counts and core_message_get_unread_conversation_counts WS.
 */
export type AddonMessagesGetConversationCountsWSResponse = {
    favourites: number; // Total number of favourite conversations.
    types: {
        1: number; // Total number of individual conversations.
        2: number; // Total number of group conversations.
        3: number; // Total number of self conversations.
    };
};

/**
 * Params of core_message_set_favourite_conversations and core_message_unset_favourite_conversations WS.
 */
type AddonMessagesSetFavouriteConversationsWSParams = {
    userid?: number; // Id of the user, 0 for current user.
    conversations: number[];
};

/**
 * Params of core_message_get_unread_conversations_count WS.
 */
type AddonMessageGetUnreadConversationsCountWSParams = {
    useridto: number; // The user id who received the message, 0 for any user.
};

/**
 * Data sent by UNREAD_CONVERSATION_COUNTS_EVENT event.
 */
export type AddonMessagesUnreadConversationCountsEventData = {
    favourites: number;
    individual: number;
    group: number;
    self: number;
    orMore?: boolean;
};

/**
 * Data sent by CONTACT_REQUESTS_COUNT_EVENT event.
 */
export type AddonMessagesContactRequestCountEventData = {
    count: number;
};

/**
 * Data sent by MEMBER_INFO_CHANGED_EVENT event.
 */
export type AddonMessagesMemberInfoChangedEventData = {
    userId: number;
    userBlocked?: boolean;
    userUnblocked?: boolean;
    contactRequestConfirmed?: boolean;
    contactRequestCreated?: boolean;
    contactRequestDeclined?: boolean;
    contactRemoved?: boolean;
};

/**
 * Data sent by READ_CHANGED_EVENT event.
 */
export type AddonMessagesReadChangedEventData = {
    userId?: number;
    conversationId?: number;
};

/**
 * Data sent by NEW_MESSAGE_EVENT event.
 */
export type AddonMessagesNewMessagedEventData = {
    conversationId?: number;
    userId?: number;
    message?: string; // If undefined it means the conversation has no messages, e.g. last message was deleted.
    timecreated: number;
    userFrom?: AddonMessagesConversationMember;
    isfavourite: boolean;
    type?: number;
};

/**
 * Data sent by UPDATE_CONVERSATION_LIST_EVENT event.
 */
export type AddonMessagesUpdateConversationListEventData = {
    conversationId: number;
    action: AddonMessagesUpdateConversationAction;
    value?: boolean;
};

/**
 * Data sent by OPEN_CONVERSATION_EVENT event.
 */
export type AddonMessagesOpenConversationEventData = {
    userId?: number;
    conversationId?: number;
};
