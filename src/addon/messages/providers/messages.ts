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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUserProvider } from '@core/user/providers/user';
import { AddonMessagesOfflineProvider } from './messages-offline';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreEmulatorHelperProvider } from '@core/emulator/providers/helper';
import { CoreEventsProvider } from '@providers/events';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';

/**
 * Service to handle messages.
 */
@Injectable()
export class AddonMessagesProvider {
    protected ROOT_CACHE_KEY = 'mmaMessages:';
    protected LIMIT_MESSAGES = AddonMessagesProvider.LIMIT_MESSAGES;
    static NEW_MESSAGE_EVENT = 'addon_messages_new_message_event';
    static READ_CHANGED_EVENT = 'addon_messages_read_changed_event';
    static OPEN_CONVERSATION_EVENT = 'addon_messages_open_conversation_event'; // Notify that a conversation should be opened.
    static SPLIT_VIEW_LOAD_EVENT = 'addon_messages_split_view_load_event';
    static UPDATE_CONVERSATION_LIST_EVENT = 'addon_messages_update_conversation_list_event';
    static MEMBER_INFO_CHANGED_EVENT = 'addon_messages_member_changed_event';
    static UNREAD_CONVERSATION_COUNTS_EVENT = 'addon_messages_unread_conversation_counts_event';
    static CONTACT_REQUESTS_COUNT_EVENT = 'addon_messages_contact_requests_count_event';
    static POLL_INTERVAL = 10000;
    static PUSH_SIMULATION_COMPONENT = 'AddonMessagesPushSimulation';

    static MESSAGE_PRIVACY_COURSEMEMBER = 0; // Privacy setting for being messaged by anyone within courses user is member of.
    static MESSAGE_PRIVACY_ONLYCONTACTS = 1; // Privacy setting for being messaged only by contacts.
    static MESSAGE_PRIVACY_SITE = 2; // Privacy setting for being messaged by anyone on the site.
    static MESSAGE_CONVERSATION_TYPE_INDIVIDUAL = 1; // An individual conversation.
    static MESSAGE_CONVERSATION_TYPE_GROUP = 2; // A group conversation.
    static MESSAGE_CONVERSATION_TYPE_SELF = 3; // A self conversation.
    static LIMIT_CONTACTS = 50;
    static LIMIT_MESSAGES = 50;
    static LIMIT_INITIAL_USER_SEARCH = 3;
    static LIMIT_SEARCH = 50;

    static NOTIFICATION_PREFERENCES_KEY = 'message_provider_moodle_instantmessage';

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private userProvider: CoreUserProvider, private messagesOffline: AddonMessagesOfflineProvider,
            private utils: CoreUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            private emulatorHelper: CoreEmulatorHelperProvider, private eventsProvider: CoreEventsProvider) {
        this.logger = logger.getInstance('AddonMessagesProvider');
    }

    /**
     * Add a contact.
     *
     * @param userId User ID of the person to add.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     * @deprecated since Moodle 3.6
     */
    addContact(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                userids: [ userId ]
            };

            return site.write('core_message_create_contacts', params).then(() => {
                return this.invalidateAllContactsCache(site.getUserId(), site.getId());
            });
        });
    }

    /**
     * Block a user.
     *
     * @param userId User ID of the person to block.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when done.
     */
    blockContact(userId: number, siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            let promise;
            if (site.wsAvailable('core_message_block_user')) {
                // Since Moodle 3.6
                const params = {
                    userid: site.getUserId(),
                    blockeduserid: userId,
                };
                promise = site.write('core_message_block_user', params);
            } else {
                const params = {
                    userids: [userId]
                };
                promise = site.write('core_message_block_contacts', params);
            }

            return promise.then(() => {
                return this.invalidateAllMemberInfo(userId, site).finally(() => {
                    const data = { userId, userBlocked: true };
                    this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                });
            });
        });
    }

    /**
     * Confirm a contact request from another user.
     *
     * @param userId ID of the user who made the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     * @since 3.6
     */
    confirmContactRequest(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                userid: userId,
                requesteduserid: site.getUserId(),
            };

            return site.write('core_message_confirm_contact_request', params).then(() => {
                return this.utils.allPromises([
                    this.invalidateAllMemberInfo(userId, site),
                    this.invalidateContactsCache(site.id),
                    this.invalidateUserContacts(site.id),
                    this.refreshContactRequestsCount(site.id),
                ]).finally(() => {
                    const data = { userId, contactRequestConfirmed: true };
                    this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                });
            });
        });
    }

    /**
     * Send a contact request to another user.
     *
     * @param userId ID of the receiver of the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     * @since 3.6
     */
    createContactRequest(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                userid: site.getUserId(),
                requesteduserid: userId,
            };

            return site.write('core_message_create_contact_request', params).then(() => {
                return this.invalidateAllMemberInfo(userId, site).finally(() => {
                    const data = { userId, contactRequestCreated: true };
                    this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                });
            });
        });
    }

    /**
     * Decline a contact request from another user.
     *
     * @param userId ID of the user who made the contact request.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     * @since 3.6
     */
    declineContactRequest(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                userid: userId,
                requesteduserid: site.getUserId(),
            };

            return site.write('core_message_decline_contact_request', params).then(() => {
                return this.utils.allPromises([
                    this.invalidateAllMemberInfo(userId, site),
                    this.refreshContactRequestsCount(site.id),
                ]).finally(() => {
                    const data = { userId, contactRequestDeclined: true };
                    this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                });
            });
        });
    }

    /**
     * Delete a conversation.
     *
     * @param conversationId Conversation to delete.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Promise resolved when the conversation has been deleted.
     */
    deleteConversation(conversationId: number, siteId?: string, userId?: number): Promise<any> {
        return this.deleteConversations([conversationId], siteId, userId);
    }

    /**
     * Delete several conversations.
     *
     * @param conversationIds Conversations to delete.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Promise resolved when the conversations have been deleted.
     */
    deleteConversations(conversationIds: number[], siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    userid: userId,
                    conversationids: conversationIds
                };

            return site.write('core_message_delete_conversations_by_id', params).then(() => {
                const promises = [];

                conversationIds.forEach((conversationId) => {
                    promises.push(this.messagesOffline.deleteConversationMessages(conversationId, site.getId()).catch(() => {
                        // Ignore errors (shouldn't happen).
                    }));
                });

                return Promise.all(promises);
            });
        });
    }

    /**
     * Delete a message (online or offline).
     *
     * @param message Message to delete.
     * @param deleteForAll Whether the message should be deleted for all users.
     * @return Promise resolved when the message has been deleted.
     */
    deleteMessage(message: any, deleteForAll?: boolean): Promise<any> {
        if (message.id) {
            // Message has ID, it means it has been sent to the server.
            if (deleteForAll) {
                return this.deleteMessageForAllOnline(message.id);
            } else {
                return this.deleteMessageOnline(message.id, message.read);
            }
        }

        // It's an offline message.
        if (message.conversationid) {
            return this.messagesOffline.deleteConversationMessage(message.conversationid, message.text, message.timecreated);
        } else {
            return this.messagesOffline.deleteMessage(message.touserid, message.smallmessage, message.timecreated);
        }
    }

    /**
     * Delete a message from the server.
     *
     * @param id Message ID.
     * @param read 1 if message is read, 0 otherwise.
     * @param userId User we want to delete the message for. If not defined, use current user.
     * @return Promise resolved when the message has been deleted.
     */
    deleteMessageOnline(id: number, read: number, userId?: number): Promise<any> {
        const params: any = {
            messageid: id,
            userid: userId || this.sitesProvider.getCurrentSiteUserId()
        };

        if (typeof read != 'undefined') {
            params.read = read;
        }

        return this.sitesProvider.getCurrentSite().write('core_message_delete_message', params).then(() => {
            return this.invalidateDiscussionCache(userId);
        });
    }

    /**
     * Delete a message for all users.
     *
     * @param id Message ID.
     * @param userId User we want to delete the message for. If not defined, use current user.
     * @return Promise resolved when the message has been deleted.
     */
    deleteMessageForAllOnline(id: number, userId?: number): Promise<any> {
        const params: any = {
            messageid: id,
            userid: userId || this.sitesProvider.getCurrentSiteUserId()
        };

        return this.sitesProvider.getCurrentSite().write('core_message_delete_message_for_all_users', params).then(() => {
            return this.invalidateDiscussionCache(userId);
        });
    }

    /**
     * Format a conversation.
     *
     * @param conversation Conversation to format.
     * @param userId User ID viewing the conversation.
     * @return Formatted conversation.
     */
    protected formatConversation(conversation: AddonMessagesConversationFormatted, userId: number)
            : AddonMessagesConversationFormatted {

        const numMessages = conversation.messages.length,
            lastMessage = numMessages ? conversation.messages[numMessages - 1] : null;

        conversation.lastmessage = lastMessage ? lastMessage.text : null;
        conversation.lastmessagedate = lastMessage ? lastMessage.timecreated : null;
        conversation.sentfromcurrentuser = lastMessage ? lastMessage.useridfrom == userId : null;

        if (conversation.type != AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP) {
            const isIndividual = conversation.type == AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_INDIVIDUAL,
                otherUser = conversation.members.reduce((carry, member) => {
                    if (!carry && ((isIndividual && member.id != userId) || (!isIndividual && member.id == userId))) {
                        carry = member;
                    }

                    return carry;
                }, null);

            conversation.name = conversation.name ? conversation.name : otherUser.fullname;
            conversation.imageurl = conversation.imageurl ? conversation.imageurl : otherUser.profileimageurl;
            conversation.userid = otherUser.id;
            conversation.showonlinestatus = otherUser.showonlinestatus;
            conversation.isonline = otherUser.isonline;
            conversation.isblocked = otherUser.isblocked;
            conversation.otherUser = otherUser;
        }

        return conversation;
    }

    /**
     * Get the cache key for blocked contacts.
     *
     * @param userId The user who's contacts we're looking for.
     * @return Cache key.
     */
    protected getCacheKeyForBlockedContacts(userId: number): string {
        return this.ROOT_CACHE_KEY + 'blockedContacts:' + userId;
    }

    /**
     * Get the cache key for contacts.
     *
     * @return Cache key.
     */
    protected getCacheKeyForContacts(): string {
        return this.ROOT_CACHE_KEY + 'contacts';
    }

    /**
     * Get the cache key for comfirmed contacts.
     *
     * @return Cache key.
     */
    protected getCacheKeyForUserContacts(): string {
        return this.ROOT_CACHE_KEY + 'userContacts';
    }

    /**
     * Get the cache key for contact requests.
     *
     * @return Cache key.
     */
    protected getCacheKeyForContactRequests(): string {
        return this.ROOT_CACHE_KEY + 'contactRequests';
    }

    /**
     * Get the cache key for contact requests count.
     *
     * @return Cache key.
     */
    protected getCacheKeyForContactRequestsCount(): string {
        return this.ROOT_CACHE_KEY + 'contactRequestsCount';
    }

    /**
     * Get the cache key for a discussion.
     *
     * @param userId The other person with whom the current user is having the discussion.
     * @return Cache key.
     */
    getCacheKeyForDiscussion(userId: number): string {
        return this.ROOT_CACHE_KEY + 'discussion:' + userId;
    }

    /**
     * Get the cache key for the message count.
     *
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCacheKeyForMessageCount(userId: number): string {
        return this.ROOT_CACHE_KEY + 'count:' + userId;
    }

    /**
     * Get the cache key for unread conversation counts.
     *
     * @return Cache key.
     */
    protected getCacheKeyForUnreadConversationCounts(): string {
        return this.ROOT_CACHE_KEY + 'unreadConversationCounts';
    }

    /**
     * Get the cache key for the list of discussions.
     *
     * @return Cache key.
     */
    protected getCacheKeyForDiscussions(): string {
        return this.ROOT_CACHE_KEY + 'discussions';
    }

    /**
     * Get cache key for get conversations.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @return Cache key.
     */
    protected getCacheKeyForConversation(userId: number, conversationId: number): string {
        return this.ROOT_CACHE_KEY + 'conversation:' + userId + ':' + conversationId;
    }

    /**
     * Get cache key for get conversations between users.
     *
     * @param userId User ID.
     * @param otherUserId Other user ID.
     * @return Cache key.
     */
    protected getCacheKeyForConversationBetweenUsers(userId: number, otherUserId: number): string {
        return this.ROOT_CACHE_KEY + 'conversationBetweenUsers:' + userId + ':' + otherUserId;
    }

    /**
     * Get cache key for get conversation members.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @return Cache key.
     */
    protected getCacheKeyForConversationMembers(userId: number, conversationId: number): string {
        return this.ROOT_CACHE_KEY + 'conversationMembers:' + userId + ':' + conversationId;
    }

    /**
     * Get cache key for get conversation messages.
     *
     * @param userId User ID.
     * @param conversationId Conversation ID.
     * @return Cache key.
     */
    protected getCacheKeyForConversationMessages(userId: number, conversationId: number): string {
        return this.ROOT_CACHE_KEY + 'conversationMessages:' + userId + ':' + conversationId;
    }

    /**
     * Get cache key for get conversations.
     *
     * @param userId User ID.
     * @param type Filter by type.
     * @param favourites Filter favourites.
     * @return Cache key.
     */
    protected getCacheKeyForConversations(userId: number, type?: number, favourites?: boolean): string {
        return this.getCommonCacheKeyForUserConversations(userId) + ':' + type + ':' + favourites;
    }

    /**
     * Get cache key for conversation counts.
     *
     * @return Cache key.
     */
    protected getCacheKeyForConversationCounts(): string {
        return this.ROOT_CACHE_KEY + 'conversationCounts';
    }

    /**
     * Get cache key for member info.
     *
     * @param userId User ID.
     * @param otherUserId The other user ID.
     * @return Cache key.
     */
    protected getCacheKeyForMemberInfo(userId: number, otherUserId: number): string {
        return this.ROOT_CACHE_KEY + 'memberInfo:' + userId + ':' + otherUserId;
    }

    /**
     * Get cache key for get self conversation.
     *
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCacheKeyForSelfConversation(userId: number): string {
        return this.ROOT_CACHE_KEY + 'selfconversation:' + userId;
    }

    /**
     * Get common cache key for get user conversations.
     *
     * @param userId User ID.
     * @return Cache key.
     */
    protected getCommonCacheKeyForUserConversations(userId: number): string {
        return this.getRootCacheKeyForConversations() + userId;
    }

    /**
     * Get root cache key for get conversations.
     *
     * @return Cache key.
     */
    protected getRootCacheKeyForConversations(): string {
        return this.ROOT_CACHE_KEY + 'conversations:';
    }

    /**
     * Get all the contacts of the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the WS data.
     * @deprecated since Moodle 3.6
     */
    getAllContacts(siteId?: string): Promise<AddonMessagesGetContactsResult> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getContacts(siteId).then((contacts) => {
            return this.getBlockedContacts(siteId).then((blocked) => {
                contacts.blocked = blocked.users;
                this.storeUsersFromAllContacts(contacts);

                return contacts;
            }).catch(() => {
                // The WS for blocked contacts might fail, but we still want the contacts.
                contacts.blocked = [];
                this.storeUsersFromAllContacts(contacts);

                return contacts;
            });
        });
    }

    /**
     * Get all the users blocked by the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the WS data.
     */
    getBlockedContacts(siteId?: string): Promise<AddonMessagesGetBlockedUsersResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const userId = site.getUserId(),
                params = {
                    userid: userId
                },
                preSets = {
                    cacheKey: this.getCacheKeyForBlockedContacts(userId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                };

            return site.read('core_message_get_blocked_users', params, preSets);
        });
    }

    /**
     * Get the contacts of the current user.
     *
     * This excludes the blocked users.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the WS data.
     * @deprecated since Moodle 3.6
     */
    getContacts(siteId?: string): Promise<AddonMessagesGetContactsResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                cacheKey: this.getCacheKeyForContacts(),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            return site.read('core_message_get_contacts', undefined, preSets).then((contacts: AddonMessagesGetContactsResult) => {
                // Filter contacts with negative ID, they are notifications.
                const validContacts: AddonMessagesGetContactsResult = {
                    online: [],
                    offline: [],
                    strangers: []
                };

                for (const typeName in contacts) {
                    if (!validContacts[typeName]) {
                        validContacts[typeName] = [];
                    }

                    contacts[typeName].forEach((contact) => {
                        if (contact.id > 0) {
                            validContacts[typeName].push(contact);
                        }
                    });
                }

                return validContacts;
            });
        });
    }

    /**
     * Get the list of user contacts.
     *
     * @param limitFrom Position of the first contact to fetch.
     * @param limitNum Number of contacts to fetch. Default is AddonMessagesProvider.LIMIT_CONTACTS.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the list of user contacts.
     * @since 3.6
     */
    getUserContacts(limitFrom: number = 0, limitNum: number = AddonMessagesProvider.LIMIT_CONTACTS , siteId?: string):
            Promise<{contacts: AddonMessagesConversationMember[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                userid: site.getUserId(),
                limitfrom: limitFrom,
                limitnum: limitNum <= 0 ? 0 : limitNum + 1
            };
            const preSets = {
                cacheKey: this.getCacheKeyForUserContacts(),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            return site.read('core_message_get_user_contacts', params, preSets)
                    .then((contacts: AddonMessagesConversationMember[]) => {

                if (!contacts || !contacts.length) {
                    return { contacts: [], canLoadMore: false };
                }

                this.userProvider.storeUsers(contacts, site.id);

                if (limitNum <= 0) {
                    return { contacts, canLoadMore: false };
                }

                return {
                    contacts: contacts.slice(0, limitNum),
                    canLoadMore: contacts.length > limitNum
                };
            });
        });
    }

    /**
     * Get the contact request sent to the current user.
     *
     * @param limitFrom Position of the first contact request to fetch.
     * @param limitNum Number of contact requests to fetch. Default is AddonMessagesProvider.LIMIT_CONTACTS.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the list of contact requests.
     * @since 3.6
     */
    getContactRequests(limitFrom: number = 0, limitNum: number =  AddonMessagesProvider.LIMIT_CONTACTS, siteId?: string):
            Promise<{requests: AddonMessagesConversationMember[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                userid: site.getUserId(),
                limitfrom: limitFrom,
                limitnum: limitNum <= 0 ? 0 : limitNum + 1
            };
            const preSets = {
                cacheKey: this.getCacheKeyForContactRequests(),
                updateFrequency: CoreSite.FREQUENCY_OFTEN
            };

            return site.read('core_message_get_contact_requests', data, preSets)
                    .then((requests: AddonMessagesConversationMember[]) => {

                if (!requests || !requests.length) {
                    return { requests: [], canLoadMore: false };
                }

                this.userProvider.storeUsers(requests, site.id);

                if (limitNum <= 0) {
                    return { requests, canLoadMore: false };
                }

                return {
                    requests: requests.slice(0, limitNum),
                    canLoadMore: requests.length > limitNum
                };
            });
        });
    }

    /**
     * Get the number of contact requests sent to the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with the number of contact requests.
     * @since 3.6
     */
    getContactRequestsCount(siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                userid: site.getUserId(),
            };
            const preSets = {
                cacheKey: this.getCacheKeyForContactRequestsCount(),
                typeExpected: 'number'
            };

            return site.read('core_message_get_received_contact_requests_count', data, preSets).then((count: number) => {
                // Notify the new count so all badges are updated.
                this.eventsProvider.trigger(AddonMessagesProvider.CONTACT_REQUESTS_COUNT_EVENT, { count }, site.id);

                return count;
            });
        });
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
     * @return Promise resolved with the response.
     * @since 3.6
     */
    getConversation(conversationId: number, includeContactRequests?: boolean, includePrivacyInfo?: boolean,
            messageOffset: number = 0, messageLimit: number = 1, memberOffset: number = 0, memberLimit: number = 2,
            newestFirst: boolean = true, siteId?: string, userId?: number): Promise<AddonMessagesConversationFormatted> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const preSets = {
                    cacheKey: this.getCacheKeyForConversation(userId, conversationId)
                },
                params: any = {
                    userid: userId,
                    conversationid: conversationId,
                    includecontactrequests: includeContactRequests ? 1 : 0,
                    includeprivacyinfo: includePrivacyInfo ? 1 : 0,
                    messageoffset: messageOffset,
                    messagelimit: messageLimit,
                    memberoffset: memberOffset,
                    memberlimit: memberLimit,
                    newestmessagesfirst: newestFirst ? 1 : 0
                };

            return site.read('core_message_get_conversation', params, preSets).then((conversation: AddonMessagesConversation) => {
                return this.formatConversation(conversation, userId);
            });
        });
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
     * @return Promise resolved with the response.
     * @since 3.6
     */
    getConversationBetweenUsers(otherUserId: number, includeContactRequests?: boolean, includePrivacyInfo?: boolean,
            messageOffset: number = 0, messageLimit: number = 1, memberOffset: number = 0, memberLimit: number = 2,
            newestFirst: boolean = true, siteId?: string, userId?: number, preferCache?: boolean)
            : Promise<AddonMessagesConversationFormatted> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const preSets = {
                    cacheKey: this.getCacheKeyForConversationBetweenUsers(userId, otherUserId),
                    omitExpires: !!preferCache,
                },
                params: any = {
                    userid: userId,
                    otheruserid: otherUserId,
                    includecontactrequests: includeContactRequests ? 1 : 0,
                    includeprivacyinfo: includePrivacyInfo ? 1 : 0,
                    messageoffset: messageOffset,
                    messagelimit: messageLimit,
                    memberoffset: memberOffset,
                    memberlimit: memberLimit,
                    newestmessagesfirst: newestFirst ? 1 : 0
                };

            return site.read('core_message_get_conversation_between_users', params, preSets)
                    .then((conversation: AddonMessagesConversation) => {
                return this.formatConversation(conversation, userId);
            });
        });
    }

    /**
     * Get a conversation members.
     *
     * @param conversationId Conversation ID to fetch.
     * @param limitFrom Offset for members list.
     * @param limitTo Limit of members.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in
     * @since 3.6
     */
    getConversationMembers(conversationId: number, limitFrom: number = 0, limitTo?: number, includeContactRequests?: boolean,
            siteId?: string, userId?: number): Promise<{members: AddonMessagesConversationMember[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            if (typeof limitTo == 'undefined' || limitTo === null) {
                limitTo = this.LIMIT_MESSAGES;
            }

            const preSets = {
                    cacheKey: this.getCacheKeyForConversationMembers(userId, conversationId),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                },
                params: any = {
                    userid: userId,
                    conversationid: conversationId,
                    limitfrom: limitFrom,
                    limitnum: limitTo < 1 ? limitTo : limitTo + 1, // If there is a limit, get 1 more than requested.
                    includecontactrequests: includeContactRequests ? 1 : 0,
                    includeprivacyinfo: 1,
                };

            return site.read('core_message_get_conversation_members', params, preSets)
                    .then((members: AddonMessagesConversationMember[]) => {

                if (limitTo < 1) {
                    return {
                        canLoadMore: false,
                        members: members
                    };
                } else {
                    return {
                        canLoadMore: members.length > limitTo,
                        members: members.slice(0, limitTo)
                    };
                }

            });
        });
    }

    /**
     * Get a conversation by the conversation ID.
     *
     * @param conversationId Conversation ID to fetch.
     * @param options Options.
     * @return Promise resolved with the response.
     * @since 3.6
     */
    async getConversationMessages(conversationId: number, options?: AddonMessagesGetConversationMessagesOptions)
            : Promise<AddonMessagesGetConversationMessagesResult> {

        options = options || {};

        const site = await this.sitesProvider.getSite(options.siteId);

        options.userId = options.userId || site.getUserId();
        options.limitFrom = options.limitFrom || 0;
        options.limitTo = options.limitTo === undefined || options.limitTo === null ? this.LIMIT_MESSAGES : options.limitTo;
        options.timeFrom = options.timeFrom || 0;
        options.newestFirst = options.newestFirst === undefined || options.newestFirst === null ? true : options.newestFirst;

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCacheKeyForConversationMessages(options.userId, conversationId),
        };
        const params = {
            currentuserid: options.userId,
            convid: conversationId,
            limitfrom: options.limitFrom,
            limitnum: options.limitTo < 1 ? options.limitTo : options.limitTo + 1, // If there's a limit, get 1 more than requested.
            newest: options.newestFirst ? 1 : 0,
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
            result.messages = result.messages;
        } else {
            result.canLoadMore = result.messages.length > options.limitTo;
            result.messages = result.messages.slice(0, options.limitTo);
        }

        let lastReceived;

        result.messages.forEach((message) => {
            // Convert time to milliseconds.
            message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;

            if (!lastReceived && message.useridfrom != options.userId) {
                lastReceived = message;
            }
        });

        if (this.appProvider.isDesktop() && options.limitFrom === 0 && lastReceived) {
            // Store the last received message (we cannot know if it's unread or not). Don't block the user for this.
            this.storeLastReceivedMessageIfNeeded(conversationId, lastReceived, site.getId());
        }

        if (options.excludePending) {
            // No need to get offline messages, return the ones we have.
            return result;
        }

        // Get offline messages.
        const offlineMessages = await this.messagesOffline.getConversationMessages(conversationId);

        // Mark offline messages as pending.
        offlineMessages.forEach((message) => {
            message.pending = true;
            message.useridfrom = options.userId;
        });

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
     * @return Promise resolved with the conversations.
     * @since 3.6
     */
    getConversations(type?: number, favourites?: boolean, limitFrom: number = 0, siteId?: string, userId?: number,
            forceCache?: boolean, ignoreCache?: boolean)
            : Promise<{conversations: AddonMessagesConversationFormatted[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const preSets = {
                    cacheKey: this.getCacheKeyForConversations(userId, type, favourites)
                },
                params: any = {
                    userid: userId,
                    limitfrom: limitFrom,
                    limitnum: this.LIMIT_MESSAGES + 1,
                };

            if (forceCache) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            if (typeof type != 'undefined' && type != null) {
                params.type = type;
            }
            if (typeof favourites != 'undefined' && favourites != null) {
                params.favourites = favourites ? 1 : 0;
            }

            if (site.isVersionGreaterEqualThan('3.7') && type != AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP) {
                // Add self conversation to the list.
                params.mergeself = 1;
            }

            return site.read('core_message_get_conversations', params, preSets).catch((error) => {
                if (params.mergeself) {
                    // Try again without the new param. Maybe the user is offline and he has a previous request cached.
                    delete params.mergeself;

                    return site.read('core_message_get_conversations', params, preSets);
                }

                return Promise.reject(error);
            }).then((response: AddonMessagesGetConversationsResult) => {
                // Format the conversations, adding some calculated fields.
                const conversations = response.conversations.slice(0, this.LIMIT_MESSAGES).map((conversation) => {
                        return this.formatConversation(conversation, userId);
                    }),
                    conv = conversations[0],
                    lastMessage = conv && conv.messages[0];

                if (this.appProvider.isDesktop() && limitFrom === 0 && lastMessage && !conv.sentfromcurrentuser) {
                    // Store the last received message (we cannot know if it's unread or not). Don't block the user for this.
                    this.storeLastReceivedMessageIfNeeded(conv.id, lastMessage, site.getId());
                }

                return {
                    conversations: conversations,
                    canLoadMore: response.conversations.length > this.LIMIT_MESSAGES
                };
            });
        });
    }

    /**
     * Get conversation counts by type.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with favourite,
     *         individual, group and self conversation counts.
     * @since 3.6
     */
    getConversationCounts(siteId?: string): Promise<{favourites: number, individual: number, group: number, self: number}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                cacheKey: this.getCacheKeyForConversationCounts()
            };

            return site.read('core_message_get_conversation_counts', {}, preSets)
                    .then((result: AddonMessagesGetConversationCountsResult) => {

                const counts = {
                    favourites: result.favourites,
                    individual: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_INDIVIDUAL],
                    group: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP],
                    self: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_SELF] || 0
                };

                return counts;
            });
        });
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
     * @param toDisplay True if messages will be displayed to the user, either in view or in a notification.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with messages and a boolean telling if can load more messages.
     */
    getDiscussion(userId: number, excludePending: boolean, lfReceivedUnread: number = 0, lfReceivedRead: number = 0,
            lfSentUnread: number = 0, lfSentRead: number = 0, toDisplay: boolean = true, siteId?: string)
            : Promise<{messages: AddonMessagesGetMessagesMessage[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const result = {
                    messages: <AddonMessagesGetMessagesMessage[]> [],
                    canLoadMore: false
                },
                preSets = {
                    cacheKey: this.getCacheKeyForDiscussion(userId)
                },
                params = {
                    useridto: site.getUserId(),
                    useridfrom: userId,
                    limitnum: this.LIMIT_MESSAGES
                };

            let hasReceived,
                hasSent;

            if (lfReceivedUnread > 0 || lfReceivedRead > 0 || lfSentUnread > 0 || lfSentRead > 0) {
                // Do not use cache when retrieving older messages.
                // This is to prevent storing too much data and to prevent inconsistencies between "pages" loaded.
                preSets['getFromCache'] = false;
                preSets['saveToCache'] = false;
                preSets['emergencyCache'] = false;
            }

            // Get message received by current user.
            return this.getRecentMessages(params, preSets, lfReceivedUnread, lfReceivedRead, toDisplay, site.getId())
                    .then((response) => {
                result.messages = response;
                params.useridto = userId;
                params.useridfrom = site.getUserId();
                hasReceived = response.length > 0;

                // Get message sent by current user.
                return this.getRecentMessages(params, preSets, lfSentUnread, lfSentRead, toDisplay, siteId);
            }).then((response) => {
                result.messages = result.messages.concat(response);
                hasSent = response.length > 0;

                if (result.messages.length > this.LIMIT_MESSAGES) {
                    // Sort messages and get the more recent ones.
                    result.canLoadMore = true;
                    result.messages = this.sortMessages(result['messages']);
                    result.messages = result.messages.slice(-this.LIMIT_MESSAGES);
                } else {
                    result.canLoadMore = result.messages.length == this.LIMIT_MESSAGES && (!hasReceived || !hasSent);
                }

                if (excludePending) {
                    // No need to get offline messages, return the ones we have.
                    return result;
                }

                // Get offline messages.
                return this.messagesOffline.getMessages(userId).then((offlineMessages) => {
                    // Mark offline messages as pending.
                    offlineMessages.forEach((message) => {
                        message.pending = true;
                        message.text = message.smallmessage;
                    });

                    result.messages = result.messages.concat(offlineMessages);

                    return result;
                });
            });
        });
    }

    /**
     * Get the discussions of the current user. This function is used in Moodle sites older than 3.6.
     * If the site is 3.6 or higher, please use getConversations.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object where the keys are the user ID of the other user.
     */
    getDiscussions(siteId?: string): Promise<{[userId: number]: AddonMessagesDiscussion}> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const discussions: {[userId: number]: AddonMessagesDiscussion} = {},
                currentUserId = site.getUserId(),
                params = {
                    useridto: currentUserId,
                    useridfrom: 0,
                    limitnum: this.LIMIT_MESSAGES
                },
                preSets = {
                    cacheKey: this.getCacheKeyForDiscussions()
                };

            /**
             * Convenience function to treat a recent message, adding it to discussions list if needed.
             */
            const treatRecentMessage = (message: AddonMessagesGetMessagesMessage, userId: number, userFullname: string): void => {
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
                const discMessage = discussions[userId].message;
                if (typeof discMessage === 'undefined' || (!discMessage.pending && message.pending) ||
                        (discMessage.pending == message.pending && (discMessage.timecreated < message.timecreated ||
                        (discMessage.timecreated == message.timecreated && discMessage.id < message.id)))) {

                    discussions[userId].message = {
                        id: message.id,
                        user: userId,
                        message: message.text,
                        timecreated: message.timecreated,
                        pending: !!message.pending
                    };
                }
            };

            // Get recent messages sent to current user.
            return this.getRecentMessages(params, preSets, undefined, undefined, undefined, site.getId()).then((messages) => {

                // Extract the discussions by filtering same senders.
                messages.forEach((message) => {
                    treatRecentMessage(message, message.useridfrom, message.userfromfullname);
                });

                // Now get the last messages sent by the current user.
                params.useridfrom = params.useridto;
                params.useridto = 0;

                return this.getRecentMessages(params, preSets);
            }).then((messages) => {

                // Extract the discussions by filtering same senders.
                messages.forEach((message) => {
                    treatRecentMessage(message, message.useridto, message.usertofullname);
                });

                // Now get unsent messages.
                return this.messagesOffline.getAllMessages(site.getId());
            }).then((offlineMessages) => {
                offlineMessages.forEach((message) => {
                    message.pending = true;
                    message.text = message.smallmessage;
                    treatRecentMessage(message, message.touserid, '');
                });

                return this.getDiscussionsUserImg(discussions, site.getId()).then((discussions) => {
                    this.storeUsersFromDiscussions(discussions);

                    return discussions;
                });
            });
        });
    }

    /**
     * Get user images for all the discussions that don't have one already.
     *
     * @param discussions List of discussions.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise always resolved. Resolve param is the formatted discussions.
     */
    protected getDiscussionsUserImg(discussions: any, siteId?: string): Promise<any> {
        const promises = [];

        for (const userId in discussions) {
            if (!discussions[userId].profileimageurl) {
                // We don't have the user image. Try to retrieve it.
                promises.push(this.userProvider.getProfile(discussions[userId].message.user, 0, true, siteId).then((user) => {
                    discussions[userId].profileimageurl = user.profileimageurl;
                }).catch(() => {
                    // Error getting profile, resolve promise without adding any extra data.
                }));
            }
        }

        return Promise.all(promises).then(() => {
            return discussions;
        });
    }

    /**
     * Get conversation member info by user id, works even if no conversation betwen the users exists.
     *
     * @param otherUserId The other user ID.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Promise resolved with the member info.
     * @since 3.6
     */
    getMemberInfo(otherUserId: number, siteId?: string, userId?: number): Promise<AddonMessagesConversationMember> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const preSets = {
                    cacheKey: this.getCacheKeyForMemberInfo(userId, otherUserId),
                    updateFrequency: CoreSite.FREQUENCY_OFTEN
                },
                params: any = {
                    referenceuserid: userId,
                    userids: [otherUserId],
                    includecontactrequests: 1,
                    includeprivacyinfo: 1,
                };

            return site.read('core_message_get_member_info', params, preSets)
                    .then((members: AddonMessagesConversationMember[]): any => {

                if (!members || members.length < 1) {
                    // Should never happen.
                    return Promise.reject(null);
                }

                return members[0];
            });
        });
    }

    /**
     * Get the cache key for the get message preferences call.
     *
     * @return Cache key.
     */
    protected getMessagePreferencesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'messagePreferences';
    }

    /**
     * Get message preferences.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the message preferences.
     */
    getMessagePreferences(siteId?: string): Promise<AddonMessagesMessagePreferences> {
        this.logger.debug('Get message preferences');

        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                    cacheKey: this.getMessagePreferencesCacheKey(),
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

            return site.read('core_message_get_user_message_preferences', {}, preSets)
                    .then((data: AddonMessagesGetUserMessagePreferencesResult): any => {

                if (data.preferences) {
                    data.preferences.blocknoncontacts = data.blocknoncontacts;

                    return data.preferences;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get messages according to the params.
     *
     * @param params Parameters to pass to the WS.
     * @param preSets Set of presets for the WS.
     * @param toDisplay True if messages will be displayed to the user, either in view or in a notification.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the data.
     */
    protected getMessages(params: any, preSets: any, toDisplay: boolean = true, siteId?: string)
            : Promise<AddonMessagesGetMessagesResult> {

        params['type'] = 'conversations';
        params['newestfirst'] = 1;

        return this.sitesProvider.getSite(siteId).then((site) => {
            const userId = site.getUserId();

            return site.read('core_message_get_messages', params, preSets).then((response: AddonMessagesGetMessagesResult) => {
                response.messages.forEach((message) => {
                    message.read = params.read == 0 ? 0 : 1;
                    // Convert times to milliseconds.
                    message.timecreated = message.timecreated ? message.timecreated * 1000 : 0;
                    message.timeread = message.timeread ? message.timeread * 1000 : 0;
                });

                if (toDisplay && this.appProvider.isDesktop() && !params.read && params.useridto == userId &&
                        params.limitfrom === 0) {
                    // Store the last unread received messages. Don't block the user for this.
                    this.storeLastReceivedMessageIfNeeded(params.useridfrom, response.messages[0], site.getId());
                }

                return response;
            });
        });
    }

    /**
     * Get the most recent messages.
     *
     * @param params Parameters to pass to the WS.
     * @param preSets Set of presets for the WS.
     * @param limitFromUnread Number of read messages already fetched, so fetch will be done from this number.
     * @param limitFromRead Number of unread messages already fetched, so fetch will be done from this number.
     * @param toDisplay True if messages will be displayed to the user, either in view or in a notification.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the data.
     */
    getRecentMessages(params: any, preSets: any, limitFromUnread: number = 0, limitFromRead: number = 0,
            toDisplay: boolean = true, siteId?: string): Promise<AddonMessagesGetMessagesMessage[]> {
        limitFromUnread = limitFromUnread || 0;
        limitFromRead = limitFromRead || 0;

        params['read'] = 0;
        params['limitfrom'] = limitFromUnread;

        return this.getMessages(params, preSets, toDisplay, siteId).then((response) => {
            let messages = response.messages;
            if (messages) {
                if (messages.length >= params.limitnum) {
                    return messages;
                }

                // We need to fetch more messages.
                params.limitnum = params.limitnum - messages.length;
                params.read = 1;
                params.limitfrom = limitFromRead;

                return this.getMessages(params, preSets, toDisplay, siteId).then((response) => {
                    if (response.messages) {
                        messages = messages.concat(response.messages);
                    }

                    return messages;
                }).catch(() => {
                    return messages;
                });

            } else {
                return Promise.reject(null);
            }
        });
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
     * @return Promise resolved with the response.
     * @since 3.7
     */
    getSelfConversation(messageOffset: number = 0, messageLimit: number = 1, newestFirst: boolean = true, siteId?: string,
            userId?: number): Promise<AddonMessagesConversationFormatted> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const preSets = {
                    cacheKey: this.getCacheKeyForSelfConversation(userId)
                },
                params: any = {
                    userid: userId,
                    messageoffset: messageOffset,
                    messagelimit: messageLimit,
                    newestmessagesfirst: newestFirst ? 1 : 0
                };

            return site.read('core_message_get_self_conversation', params, preSets)
                    .then((conversation: AddonMessagesConversation) => {
                return this.formatConversation(conversation, userId);
            });
        });
    }

    /**
     * Get unread conversation counts by type.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with the unread favourite, individual and group conversation counts.
     */
    getUnreadConversationCounts(siteId?: string):
            Promise<{favourites: number, individual: number, group: number, self: number, orMore?: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            let promise: Promise<{favourites: number, individual: number, group: number, self: number, orMore?: boolean}>;

            if (this.isGroupMessagingEnabled()) {
                // @since 3.6
                const preSets = {
                    cacheKey: this.getCacheKeyForUnreadConversationCounts()
                };

                promise = site.read('core_message_get_unread_conversation_counts', {}, preSets)
                        .then((result: AddonMessagesGetUnreadConversationCountsResult) => {
                    return {
                        favourites: result.favourites,
                        individual: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_INDIVIDUAL],
                        group: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_GROUP],
                        self: result.types[AddonMessagesProvider.MESSAGE_CONVERSATION_TYPE_SELF] || 0
                    };
                });

            } else if (this.isMessageCountEnabled()) {
                // @since 3.2
                const params = {
                        useridto: site.getUserId(),
                    },
                    preSets = {
                        cacheKey: this.getCacheKeyForMessageCount(site.getUserId()),
                        typeExpected: 'number'
                    };

                promise = site.read('core_message_get_unread_conversations_count', params, preSets).then((count: number) => {
                    return { favourites: 0, individual: count, group: 0, self: 0 };
                });
            } else {
                // Fallback call.
                const params = {
                    read: 0,
                    limitfrom: 0,
                    limitnum: this.LIMIT_MESSAGES + 1,
                    useridto: site.getUserId(),
                    useridfrom: 0,
                };

                promise = this.getMessages(params, undefined, false, siteId).then((response) => {
                    // Count the discussions by filtering same senders.
                    const discussions = {};
                    response.messages.forEach((message) => {
                        discussions[message.useridto] = 1;
                    });

                    const count = Object.keys(discussions).length;

                    return {
                        favourites: 0,
                        individual: count,
                        group: 0,
                        self: 0,
                        orMore: count > this.LIMIT_MESSAGES
                    };
                });
            }

            return promise.then((counts) => {
                // Notify the new counts so all views are updated.
                this.eventsProvider.trigger(AddonMessagesProvider.UNREAD_CONVERSATION_COUNTS_EVENT, counts, site.id);

                return counts;
            });
        });
    }

    /**
     * Get the latest unread received messages.
     *
     * @param toDisplay True if messages will be displayed to the user, either in view or in a notification.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved with the message unread count.
     */
    getUnreadReceivedMessages(toDisplay: boolean = true, forceCache: boolean = false, ignoreCache: boolean = false,
            siteId?: string): Promise<AddonMessagesGetMessagesResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    read: 0,
                    limitfrom: 0,
                    limitnum: this.LIMIT_MESSAGES,
                    useridto: site.getUserId(),
                    useridfrom: 0
                },
                preSets = {};

            if (forceCache) {
                preSets['omitExpires'] = true;
            } else if (ignoreCache) {
                preSets['getFromCache'] = false;
                preSets['emergencyCache'] = false;
            }

            return this.getMessages(params, preSets, toDisplay, siteId);
        });
    }

    /**
     * Invalidate all contacts cache.
     *
     * @param userId The user ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateAllContactsCache(userId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.invalidateContactsCache(siteId).then(() => {
            return this.invalidateBlockedContactsCache(userId, siteId);
        });
    }

    /**
     * Invalidate blocked contacts cache.
     *
     * @param userId The user ID.
     * @param siteId Site ID. If not defined, current site.
     */
    invalidateBlockedContactsCache(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForBlockedContacts(userId));
        });
    }

    /**
     * Invalidate contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateContactsCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForContacts());
        });
    }

    /**
     * Invalidate user contacts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateUserContacts(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForUserContacts());
        });
    }

    /**
     * Invalidate contact requests cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateContactRequestsCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForContactRequests());
        });
    }

    /**
     * Invalidate contact requests count cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateContactRequestsCountCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForContactRequestsCount());
        });
    }

    /**
     * Invalidate conversation.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateConversation(conversationId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForConversation(userId, conversationId));
        });
    }

    /**
     * Invalidate conversation between users.
     *
     * @param otherUserId Other user ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateConversationBetweenUsers(otherUserId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForConversationBetweenUsers(userId, otherUserId));
        });
    }

    /**
     * Invalidate conversation members cache.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateConversationMembers(conversationId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForConversationMembers(userId, conversationId));
        });
    }

    /**
     * Invalidate conversation messages cache.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateConversationMessages(conversationId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForConversationMessages(userId, conversationId));
        });
    }

    /**
     * Invalidate conversations cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateConversations(siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKeyStartingWith(this.getCommonCacheKeyForUserConversations(userId));
        });
    }

    /**
     * Invalidate conversation counts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateConversationCounts(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForConversationCounts());
        });
    }

    /**
     * Invalidate discussion cache.
     *
     * @param userId The user ID with whom the current user is having the discussion.
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateDiscussionCache(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCacheKeyForDiscussion(userId));
        });
    }

    /**
     * Invalidate discussions cache.
     *
     * Note that {@link this.getDiscussions} uses the contacts, so we need to invalidate contacts too.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateDiscussionsCache(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];
            promises.push(site.invalidateWsCacheForKey(this.getCacheKeyForDiscussions()));
            promises.push(this.invalidateContactsCache(site.getId()));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidate member info cache.
     *
     * @param otherUserId The other user ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateMemberInfo(otherUserId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForMemberInfo(userId, otherUserId));
        });
    }

    /**
     * Invalidate get message preferences.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateMessagePreferences(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getMessagePreferencesCacheKey());
        });
    }

    /**
     * Invalidate all cache entries with member info.
     *
     * @param userId Id of the user to invalidate.
     * @param site Site object.
     * @return Promise resolved when done.
     */
    protected invalidateAllMemberInfo(userId: number, site: CoreSite): Promise<any> {
        return this.utils.allPromises([
            this.invalidateMemberInfo(userId, site.id),
            this.invalidateUserContacts(site.id),
            this.invalidateContactRequestsCache(site.id),
            this.invalidateConversations(site.id),
            this.getConversationBetweenUsers(userId, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
                    site.id, undefined, true).then((conversation) => {
                return this.utils.allPromises([
                    this.invalidateConversation(conversation.id),
                    this.invalidateConversationMembers(conversation.id, site.id),
                ]);
            }).catch(() => {
                // The conversation does not exist or we can't fetch it now, ignore it.
            })
        ]);
    }

    /**
     * Invalidate a self conversation.
     *
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    invalidateSelfConversation(siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            return site.invalidateWsCacheForKey(this.getCacheKeyForSelfConversation(userId));
        });
    }

    /**
     * Invalidate unread conversation counts cache.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when done.
     */
    invalidateUnreadConversationCounts(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (this.isGroupMessagingEnabled()) {
                // @since 3.6
                return site.invalidateWsCacheForKey(this.getCacheKeyForUnreadConversationCounts());

            } else if (this.isMessageCountEnabled()) {
                // @since 3.2
                return site.invalidateWsCacheForKey(this.getCacheKeyForMessageCount(site.getUserId()));
            }
        });
    }

    /**
     * Checks if the a user is blocked by the current user.
     *
     * @param userId The user ID to check against.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with boolean, rejected when we do not know.
     */
    isBlocked(userId: number, siteId?: string): Promise<boolean> {
        if (this.isGroupMessagingEnabled()) {
            return this.getMemberInfo(userId, siteId).then((member) => {
                return member.isblocked;
            });
        }

        return this.getBlockedContacts(siteId).then((blockedContacts) => {
            if (!blockedContacts.users || blockedContacts.users.length < 1) {
                return false;
            }

            return blockedContacts.users.some((user) => {
                return userId == user.id;
            });
        });
    }

    /**
     * Checks if the a user is a contact of the current user.
     *
     * @param userId The user ID to check against.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with boolean, rejected when we do not know.
     */
    isContact(userId: number, siteId?: string): Promise<boolean> {
        if (this.isGroupMessagingEnabled()) {
            return this.getMemberInfo(userId, siteId).then((member) => {
                return member.iscontact;
            });
        }

        return this.getContacts(siteId).then((contacts) => {
            return ['online', 'offline'].some((type) => {
                if (contacts[type] && contacts[type].length > 0) {
                    return contacts[type].some((user) => {
                        return userId == user.id;
                    });
                }

                return false;
            });
        });
    }

    /**
     * Returns whether or not group messaging is supported.
     *
     * @return If related WS is available on current site.
     * @since 3.6
     */
    isGroupMessagingEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_get_conversations');
    }

    /**
     * Returns whether or not group messaging is supported in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.6
     */
    isGroupMessagingEnabledInSite(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.wsAvailable('core_message_get_conversations');
        }).catch(() => {
            return false;
        });
    }

    /**
     * Returns whether or not we can mark all messages as read.
     *
     * @return If related WS is available on current site.
     * @since  3.2
     */
    isMarkAllMessagesReadEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_mark_all_conversation_messages_as_read') ||
                this.sitesProvider.wsAvailableInCurrentSite('core_message_mark_all_messages_as_read');
    }

    /**
     * Returns whether or not we can count unread messages.
     *
     * @return True if enabled, false otherwise.
     * @since  3.2
     */
    isMessageCountEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_get_unread_conversations_count');
    }

    /**
     * Returns whether or not the message preferences are enabled for the current site.
     *
     * @return True if enabled, false otherwise.
     * @since  3.2
     */
    isMessagePreferencesEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_get_user_message_preferences');
    }

    /**
     * Returns whether or not messaging is enabled for a certain site.
     *
     * This could call a WS so do not abuse this method.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Resolved when enabled, otherwise rejected.
     */
    isMessagingEnabledForSite(siteId?: string): Promise<any> {
        return this.isPluginEnabled(siteId).then((enabled) => {
            if (!enabled) {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Returns whether or not a site supports muting or unmuting a conversation.
     *
     * @param site The site to check, undefined for current site.
     * @return If related WS is available on current site.
     * @since 3.7
     */
    isMuteConversationEnabled(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_message_mute_conversations');
    }

    /**
     * Returns whether or not a site supports muting or unmuting a conversation.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.7
     */
    isMuteConversationEnabledInSite(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isMuteConversationEnabled(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Returns whether or not the plugin is enabled in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isPluginEnabled(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.canUseAdvancedFeature('messaging');
        });
    }

    /**
     * Returns whether or not we can search messages.
     *
     * @since  3.2
     */
    isSearchMessagesEnabled(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_message_data_for_messagearea_search_messages');
    }

    /**
     * Returns whether or not self conversation is supported in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return If related WS is available on the site.
     * @since 3.7
     */
    isSelfConversationEnabled(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_message_get_self_conversation');
    }

    /**
     * Returns whether or not self conversation is supported in a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether related WS is available on a certain site.
     * @since 3.7
     */
    isSelfConversationEnabledInSite(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isSelfConversationEnabled(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Mark message as read.
     *
     * @param messageId ID of message to mark as read
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean marking success or not.
     */
    markMessageRead(messageId: number, siteId?: string): Promise<AddonMessagesMarkMessageReadResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                messageid: messageId,
                timeread: this.timeUtils.timestamp()
            };

            return site.write('core_message_mark_message_read', params);
        });
    }

    /**
     * Mark all messages of a conversation as read.
     *
     * @param conversationId Conversation ID.
     * @return Promise resolved if success.
     * @since 3.6
     */
    markAllConversationMessagesRead(conversationId?: number): Promise<null> {
        const params = {
                userid: this.sitesProvider.getCurrentSiteUserId(),
                conversationid: conversationId
            },
            preSets = {
                responseExpected: false
            };

        return this.sitesProvider.getCurrentSite().write('core_message_mark_all_conversation_messages_as_read', params, preSets);
    }

    /**
     * Mark all messages of a discussion as read.
     *
     * @param userIdFrom User Id for the sender.
     * @return Promise resolved with boolean marking success or not.
     */
    markAllMessagesRead(userIdFrom?: number): Promise<boolean> {
        const params = {
                useridto: this.sitesProvider.getCurrentSiteUserId(),
                useridfrom: userIdFrom
            },
            preSets = {
                typeExpected: 'boolean'
            };

        return this.sitesProvider.getCurrentSite().write('core_message_mark_all_messages_as_read', params, preSets);
    }

    /**
     * Mute or unmute a conversation.
     *
     * @param conversationId Conversation ID.
     * @param set Whether to mute or unmute.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    muteConversation(conversationId: number, set: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.muteConversations([conversationId], set, siteId, userId);
    }

    /**
     * Mute or unmute some conversations.
     *
     * @param conversations Conversation IDs.
     * @param set Whether to mute or unmute.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    muteConversations(conversations: number[], set: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    userid: userId,
                    conversationids: conversations
                },
                wsName = set ? 'core_message_mute_conversations' : 'core_message_unmute_conversations';

            return site.write(wsName, params).then(() => {
                // Invalidate the conversations data.
                const promises = [];

                conversations.forEach((conversationId) => {
                    promises.push(this.invalidateConversation(conversationId, site.getId(), userId));
                });

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            });
        });
    }

    /**
     * Refresh the number of contact requests sent to the current user.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with the number of contact requests.
     * @since 3.6
     */
    refreshContactRequestsCount(siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.invalidateContactRequestsCountCache(siteId).then(() => {
            return this.getContactRequestsCount(siteId);
        });
    }

    /**
     * Refresh unread conversation counts and trigger event.
     *
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with the unread favourite, individual and group conversation counts.
     */
    refreshUnreadConversationCounts(siteId?: string):
            Promise<{favourites: number, individual: number, group: number, orMore?: boolean}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.invalidateUnreadConversationCounts(siteId).then(() => {
            return this.getUnreadConversationCounts(siteId);
        });
    }

    /**
     * Remove a contact.
     *
     * @param userId User ID of the person to remove.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     */
    removeContact(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    userids: [ userId ]
                },
                preSets = {
                    responseExpected: false
                };

            return site.write('core_message_delete_contacts', params, preSets).then(() => {
                if (this.isGroupMessagingEnabled()) {
                    return this.utils.allPromises([
                        this.invalidateUserContacts(site.id),
                        this.invalidateAllMemberInfo(userId, site),
                    ]).then(() => {
                        const data = { userId, contactRemoved: true };
                        this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                    });
                } else {
                    return this.invalidateContactsCache(site.id);
                }
            });
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
     * @return Promise resolved with the contacts.
     */
    searchContacts(query: string, limit: number = 100, siteId?: string): Promise<AddonMessagesSearchContactsContact[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    searchtext: query,
                    onlymycourses: 0
                },
                preSets = {
                    getFromCache: false // Always try to get updated data. If it fails, it will get it from cache.
                };

            return site.read('core_message_search_contacts', data, preSets)
                    .then((contacts: AddonMessagesSearchContactsContact[]) => {

                if (limit && contacts.length > limit) {
                    contacts = contacts.splice(0, limit);
                }
                this.userProvider.storeUsers(contacts);

                return contacts;
            });
        });
    }

    /**
     * Search for all the messges with a specific text.
     *
     * @param query The query string.
     * @param userId The user ID. If not defined, current user.
     * @param limitFrom Position of the first result to get. Defaults to 0.
     * @param limitNum Number of results to get. Defaults to AddonMessagesProvider.LIMIT_SEARCH.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the results.
     */
    searchMessages(query: string, userId?: number, limitFrom: number = 0, limitNum: number = AddonMessagesProvider.LIMIT_SEARCH,
            siteId?: string): Promise<{messages: AddonMessagesMessageAreaContact[], canLoadMore: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    userid: userId || site.getUserId(),
                    search: query,
                    limitfrom: limitFrom,
                    limitnum: limitNum <= 0 ? 0 : limitNum + 1
                },
                preSets = {
                    getFromCache: false // Always try to get updated data. If it fails, it will get it from cache.
                };

            return site.read('core_message_data_for_messagearea_search_messages', params, preSets)
                    .then((result: AddonMessagesDataForMessageAreaSearchMessagesResult) => {

                if (!result.contacts || !result.contacts.length) {
                    return { messages: [], canLoadMore: false };
                }

                result.contacts.forEach((contact) => {
                    contact.id = contact.userid;
                });

                this.userProvider.storeUsers(result.contacts, site.id);

                if (limitNum <= 0) {
                    return { messages: result.contacts, canLoadMore: false };
                }

                return {
                    messages: result.contacts.slice(0, limitNum),
                    canLoadMore: result.contacts.length > limitNum
                };
            });
        });
    }

    /**
     * Search for users.
     *
     * @param query Text to search for.
     * @param limitFrom Position of the first found user to fetch.
     * @param limitNum Number of found users to fetch. Defaults to AddonMessagesProvider.LIMIT_SEARCH.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved with two lists of found users: contacts and non-contacts.
     * @since 3.6
     */
    searchUsers(query: string, limitFrom: number = 0, limitNum: number = AddonMessagesProvider.LIMIT_SEARCH, siteId?: string):
            Promise<{contacts: AddonMessagesConversationMember[], nonContacts: AddonMessagesConversationMember[],
                canLoadMoreContacts: boolean, canLoadMoreNonContacts: boolean}> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                    userid: site.getUserId(),
                    search: query,
                    limitfrom: limitFrom,
                    limitnum: limitNum <= 0 ? 0 : limitNum + 1
                },
                preSets = {
                    getFromCache: false // Always try to get updated data. If it fails, it will get it from cache.
                };

            return site.read('core_message_message_search_users', data, preSets).then((result: AddonMessagesSearchUsersResult) => {
                const contacts = result.contacts || [];
                const nonContacts = result.noncontacts || [];

                this.userProvider.storeUsers(contacts, site.id);
                this.userProvider.storeUsers(nonContacts, site.id);

                if (limitNum <= 0) {
                    return { contacts, nonContacts, canLoadMoreContacts: false, canLoadMoreNonContacts: false };
                }

                return {
                    contacts: contacts.slice(0, limitNum),
                    nonContacts: nonContacts.slice(0, limitNum),
                    canLoadMoreContacts: contacts.length > limitNum,
                    canLoadMoreNonContacts: nonContacts.length > limitNum
                };
            });
        });
    }

    /**
     * Send a message to someone.
     *
     * @param userIdTo User ID to send the message to.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with:
     *         - sent (Boolean) True if message was sent to server, false if stored in device.
     *         - message (Object) If sent=false, contains the stored message.
     */
    sendMessage(toUserId: number, message: string, siteId?: string)
            : Promise<{sent: boolean, message: AddonMessagesSendInstantMessagesMessage}> {

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.messagesOffline.saveMessage(toUserId, message, siteId).then((entry) => {
                return {
                    sent: false,
                    message: entry
                };
            });
        };

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!this.appProvider.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // Check if this conversation already has offline messages.
        // If so, store this message since they need to be sent in order.
        return this.messagesOffline.hasMessages(toUserId, siteId).catch(() => {
            // Error, it's safer to assume it has messages.
            return true;
        }).then((hasStoredMessages) => {
            if (hasStoredMessages) {
                return storeOffline();
            }

            // Online and no messages stored. Send it to server.
            return this.sendMessageOnline(toUserId, message).then((result) => {
                return {
                    sent: true,
                    message: result
                };
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // It's a WebService error, the user cannot send the message so don't store it.
                    return Promise.reject(error);
                }

                // Error sending message, store it to retry later.
                return storeOffline();
            });
        });
    }

    /**
     * Send a message to someone. It will fail if offline or cannot connect.
     *
     * @param toUserId User ID to send the message to.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected if failure.
     */
    sendMessageOnline(toUserId: number, message: string, siteId?: string): Promise<AddonMessagesSendInstantMessagesMessage> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const messages = [
                {
                    touserid: toUserId,
                    text: message,
                    textformat: 1
                }
            ];

        return this.sendMessagesOnline(messages, siteId).then((response) => {
            if (response && response[0] && response[0].msgid === -1) {
                // There was an error, and it should be translated already.
                return Promise.reject(this.utils.createFakeWSError(response[0].errormessage));
            }

            return this.invalidateDiscussionCache(toUserId, siteId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return response[0];
            });
        });
    }

    /**
     * Send some messages. It will fail if offline or cannot connect.
     * IMPORTANT: Sending several messages at once for the same discussions can cause problems with display order,
     * since messages with same timecreated aren't ordered by ID.
     *
     * @param messages Messages to send. Each message must contain touserid, text and textformat.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected if failure. Promise resolved doesn't mean that messages
     *         have been sent, the resolve param can contain errors for messages not sent.
     */
    sendMessagesOnline(messages: any[], siteId?: string): Promise<AddonMessagesSendInstantMessagesMessage[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const data = {
                messages: messages
            };

            return site.write('core_message_send_instant_messages', data);
        });
    }

    /**
     * Send a message to a conversation.
     *
     * @param conversation Conversation.
     * @param message The message to send.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with:
     *         - sent (boolean) True if message was sent to server, false if stored in device.
     *         - message (any) If sent=false, contains the stored message.
     * @since 3.6
     */
    sendMessageToConversation(conversation: any, message: string, siteId?: string)
            : Promise<{sent: boolean, message: AddonMessagesSendMessagesToConversationMessage}> {

        // Convenience function to store a message to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.messagesOffline.saveConversationMessage(conversation, message, siteId).then((entry) => {
                return {
                    sent: false,
                    message: entry
                };
            });
        };

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (!this.appProvider.isOnline()) {
            // App is offline, store the message.
            return storeOffline();
        }

        // Check if this conversation already has offline messages.
        // If so, store this message since they need to be sent in order.
        return this.messagesOffline.hasConversationMessages(conversation.id, siteId).catch(() => {
            // Error, it's safer to assume it has messages.
            return true;
        }).then((hasStoredMessages) => {
            if (hasStoredMessages) {
                return storeOffline();
            }

            // Online and no messages stored. Send it to server.
            return this.sendMessageToConversationOnline(conversation.id, message).then((result) => {
                return {
                    sent: true,
                    message: result
                };
            }).catch((error) => {
                if (this.utils.isWebServiceError(error)) {
                    // It's a WebService error, the user cannot send the message so don't store it.
                    return Promise.reject(error);
                }

                // Error sending message, store it to retry later.
                return storeOffline();
            });
        });
    }

    /**
     * Send a message to a conversation. It will fail if offline or cannot connect.
     *
     * @param conversationId Conversation ID.
     * @param message The message to send
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected if failure.
     * @since 3.6
     */
    sendMessageToConversationOnline(conversationId: number, message: string, siteId?: string)
            : Promise<AddonMessagesSendMessagesToConversationMessage> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const messages = [
                {
                    text: message,
                    textformat: 1
                }
            ];

        return this.sendMessagesToConversationOnline(conversationId, messages, siteId).then((response) => {
            return this.invalidateConversationMessages(conversationId, siteId).catch(() => {
                // Ignore errors.
            }).then(() => {
                return response[0];
            });
        });
    }

    /**
     * Send some messages to a conversation. It will fail if offline or cannot connect.
     *
     * @param conversationId Conversation ID.
     * @param messages Messages to send. Each message must contain text and, optionally, textformat.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved if success, rejected if failure.
     * @since 3.6
     */
    sendMessagesToConversationOnline(conversationId: number, messages: any[], siteId?: string)
            : Promise<AddonMessagesSendMessagesToConversationMessage[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                conversationid: conversationId,
                messages: messages.map((message) => {
                    return {
                        text: message.text,
                        textformat: typeof message.textformat != 'undefined' ? message.textformat : 1
                    };
                })
            };

            return site.write('core_message_send_messages_to_conversation', params);
        });
    }

    /**
     * Set or unset a conversation as favourite.
     *
     * @param conversationId Conversation ID.
     * @param set Whether to set or unset it as favourite.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    setFavouriteConversation(conversationId: number, set: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.setFavouriteConversations([conversationId], set, siteId, userId);
    }

    /**
     * Set or unset some conversations as favourites.
     *
     * @param conversations Conversation IDs.
     * @param set Whether to set or unset them as favourites.
     * @param siteId Site ID. If not defined, use current site.
     * @param userId User ID. If not defined, current user in the site.
     * @return Resolved when done.
     */
    setFavouriteConversations(conversations: number[], set: boolean, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            const params = {
                    userid: userId,
                    conversations: conversations
                },
                wsName = set ? 'core_message_set_favourite_conversations' : 'core_message_unset_favourite_conversations';

            return site.write(wsName, params).then(() => {
                // Invalidate the conversations data.
                const promises = [];

                conversations.forEach((conversationId) => {
                    promises.push(this.invalidateConversation(conversationId, site.getId(), userId));
                });

                return Promise.all(promises).catch(() => {
                    // Ignore errors.
                });
            });
        });
    }

    /**
     * Helper method to sort conversations by last message time.
     *
     * @param conversations Array of conversations.
     * @return Conversations sorted with most recent last.
     */
    sortConversations(conversations: AddonMessagesConversationFormatted[]): AddonMessagesConversationFormatted[] {
        return conversations.sort((a, b) => {
            const timeA = Number(a.lastmessagedate),
                timeB = Number(b.lastmessagedate);

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
     * @return Messages sorted with most recent last.
     */
    sortMessages(messages: any[]): any[] {
        return messages.sort((a, b) => {
            // Pending messages last.
            if (a.pending && !b.pending) {
                return 1;
            } else if (!a.pending && b.pending) {
                return -1;
            }

            const timecreatedA = parseInt(a.timecreated, 10),
                timecreatedB = parseInt(b.timecreated, 10);
            if (timecreatedA == timecreatedB && a.id) {
                // Same time, sort by ID.
                return a.id >= b.id ? 1 : -1;
            }

            return timecreatedA >= timecreatedB ? 1 : -1;
        });
    }

    /**
     * Store the last received message if it's newer than the last stored.
     *
     * @param convIdOrUserIdFrom Conversation ID (3.6+) or ID of the useridfrom retrieved (3.5-), 0 for all users.
     * @param message Last message received.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected storeLastReceivedMessageIfNeeded(convIdOrUserIdFrom: number,
            message: AddonMessagesGetMessagesMessage | AddonMessagesConversationMessage, siteId?: string): Promise<any> {

        const component = AddonMessagesProvider.PUSH_SIMULATION_COMPONENT;

        // Get the last received message.
        return this.emulatorHelper.getLastReceivedNotification(component, siteId).then((lastMessage) => {
            if (convIdOrUserIdFrom > 0 && (!message || !lastMessage)) {
                // Seeing a single discussion. No received message or cannot know if it really is the last received message. Stop.
                return;
            }

            if (message && lastMessage && message.timecreated <= lastMessage.timecreated) {
                // The message isn't newer than the stored message, don't store it.
                return;
            }

            return this.emulatorHelper.storeLastReceivedNotification(component, message, siteId);
        });
    }

    /**
     * Store user data from contacts in local DB.
     *
     * @param contactTypes List of contacts grouped in types.
     */
    protected storeUsersFromAllContacts(contactTypes: AddonMessagesGetContactsResult): void {
        for (const x in contactTypes) {
            this.userProvider.storeUsers(contactTypes[x]);
        }
    }

    /**
     * Store user data from discussions in local DB.
     *
     * @param discussions List of discussions.
     * @param siteId Site ID. If not defined, current site.
     */
    protected storeUsersFromDiscussions(discussions: any, siteId?: string): void {
        const users = [];
        for (const userId in discussions) {
            users.push({
                id: userId,
                fullname: discussions[userId].fullname,
                profileimageurl: discussions[userId].profileimageurl
            });
        }
        this.userProvider.storeUsers(users, siteId);
    }

    /**
     * Unblock a user.
     *
     * @param userId User ID of the person to unblock.
     * @param siteId Site ID. If not defined, use current site.
     * @return Resolved when done.
     */
    unblockContact(userId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            let promise;
            if (site.wsAvailable('core_message_unblock_user')) {
                // Since Moodle 3.6
                const params = {
                    userid: site.getUserId(),
                    unblockeduserid: userId,
                };
                promise = site.write('core_message_unblock_user', params);
            } else {
                const params = {
                    userids: [userId]
                };
                const preSets = {
                    responseExpected: false
                };
                promise = site.write('core_message_unblock_contacts', params, preSets);
            }

            return promise.then(() => {
                return this.invalidateAllMemberInfo(userId, site).finally(() => {
                    const data = { userId, userUnblocked: true };
                    this.eventsProvider.trigger(AddonMessagesProvider.MEMBER_INFO_CHANGED_EVENT, data, site.id);
                });
            });
        });
    }
}

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
 * Conversation.
 */
export type AddonMessagesConversation = {
    id: number; // The conversation id.
    name: string; // The conversation name, if set.
    subname: string; // A subtitle for the conversation name, if set.
    imageurl: string; // A link to the conversation picture, if set.
    type: number; // The type of the conversation (1=individual,2=group,3=self).
    membercount: number; // Total number of conversation members.
    ismuted: boolean; // @since 3.7. If the user muted this conversation.
    isfavourite: boolean; // If the user marked this conversation as a favourite.
    isread: boolean; // If the user has read all messages in the conversation.
    unreadcount: number; // The number of unread messages in this conversation.
    members: AddonMessagesConversationMember[];
    messages: AddonMessagesConversationMessage[];
    candeletemessagesforallusers: boolean; // @since 3.7. If the user can delete messages in the conversation for all users.
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
 * Conversation member.
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
    loggedin: {
        name: string; // Name.
        displayname: string; // Display name.
        checked: boolean; // Is checked?.
    };
    loggedoff: {
        name: string; // Name.
        displayname: string; // Display name.
        checked: boolean; // Is checked?.
    };
};

/**
 * Message discussion (before 3.6).
 */
export type AddonMessagesDiscussion = {
    fullname: string; // Full name of the other user in the discussion.
    profileimageurl: string; // Profile image of the other user in the discussion.
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
 * Result of WS core_message_get_blocked_users.
 */
export type AddonMessagesGetBlockedUsersResult = {
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
export type AddonMessagesGetContactsResult = {
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
 * User data returned by core_message_search_contacts.
 */
export type AddonMessagesSearchContactsContact = {
    id: number; // User ID.
    fullname: string; // User full name.
    profileimageurl?: string; // User picture URL.
    profileimageurlsmall?: string; // Small user picture URL.
};

/**
 * Result of WS core_message_get_conversation_messages.
 */
export type AddonMessagesGetConversationMessagesResult = {
    id: number; // The conversation id.
    members: AddonMessagesConversationMember[];
    messages: AddonMessagesConversationMessage[];
} & AddonMessagesGetConversationMessagesCalculatedData;

/**
 * Result of WS core_message_get_conversations.
 */
export type AddonMessagesGetConversationsResult = {
    conversations: AddonMessagesConversation[];
};

/**
 * Result of WS core_message_get_conversation_counts.
 */
export type AddonMessagesGetConversationCountsResult = {
    favourites: number; // Total number of favourite conversations.
    types: {
        1: number; // Total number of individual conversations.
        2: number; // Total number of group conversations.
        3: number; // @since 3.7. Total number of self conversations.
    };
};

/**
 * Result of WS core_message_get_unread_conversation_counts.
 */
export type AddonMessagesGetUnreadConversationCountsResult = {
    favourites: number; // Total number of unread favourite conversations.
    types: {
        1: number; // Total number of unread individual conversations.
        2: number; // Total number of unread group conversations.
        3: number; // @since 3.7. Total number of unread self conversations.
    };
};

/**
 * Result of WS core_message_get_user_message_preferences.
 */
export type AddonMessagesGetUserMessagePreferencesResult = {
    preferences: AddonMessagesMessagePreferences;
    blocknoncontacts: number; // Privacy messaging setting to define who can message you.
    entertosend: boolean; // @since 3.6. User preference for using enter to send messages.
    warnings?: CoreWSExternalWarning[];
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
    fullmessageformat: number; // Fullmessage format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
 * Result of WS core_message_data_for_messagearea_search_messages.
 */
export type AddonMessagesDataForMessageAreaSearchMessagesResult = {
    contacts: AddonMessagesMessageAreaContact[];
};

/**
 * Result of WS core_message_message_search_users.
 */
export type AddonMessagesSearchUsersResult = {
    contacts: AddonMessagesConversationMember[];
    noncontacts: AddonMessagesConversationMember[];
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
    msgid: number; // Test this to know if it succeeds:  id of the created message if it succeeded, -1 when failed.
    clientmsgid?: string; // Your own id for the message.
    errormessage?: string; // Error message - if it failed.
    text?: string; // @since 3.6. The text of the message.
    timecreated?: number; // @since 3.6. The timecreated timestamp for the message.
    conversationid?: number; // @since 3.6. The conversation id for this message.
    useridfrom?: number; // @since 3.6. The user id who sent the message.
    candeletemessagesforallusers: boolean; // @since 3.7. If the user can delete messages in the conversation for all users.
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
    read?: number; // Calculated in the app. Whether the message has been read.
};

/**
 * Calculated data for contact for message area.
 */
export type AddonMessagesMessageAreaContactCalculatedData = {
    id?: number; // Calculated in the app. User ID.
};
