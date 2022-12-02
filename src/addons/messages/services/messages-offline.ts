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
import { CoreSites } from '@services/sites';
import { CoreNetwork } from '@services/network';
import { CoreTextUtils } from '@services/utils/text';
import {
    AddonMessagesOfflineConversationMessagesDBRecord,
    AddonMessagesOfflineMessagesDBRecord,
    CONVERSATION_MESSAGES_TABLE,
    MESSAGES_TABLE,
} from './database/messages';
import { makeSingleton } from '@singletons';
import { AddonMessagesConversation } from './messages';

/**
 * Service to handle Offline messages.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesOfflineProvider {

    /**
     * Delete a message.
     *
     * @param conversationId Conversation ID.
     * @param message The message.
     * @param timeCreated The time the message was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteConversationMessage(conversationId: number, message: string, timeCreated: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(CONVERSATION_MESSAGES_TABLE, {
            conversationid: conversationId,
            text: message,
            timecreated: timeCreated,
        });
    }

    /**
     * Delete all the messages in a conversation.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteConversationMessages(conversationId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(CONVERSATION_MESSAGES_TABLE, {
            conversationid: conversationId,
        });
    }

    /**
     * Delete a message.
     *
     * @param toUserId User ID to send the message to.
     * @param message The message.
     * @param timeCreated The time the message was created.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async deleteMessage(toUserId: number, message: string, timeCreated: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.getDb().deleteRecords(MESSAGES_TABLE, {
            touserid: toUserId,
            smallmessage: message,
            timecreated: timeCreated,
        });
    }

    /**
     * Get all messages where deviceoffline is set to 1.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with messages.
     */
    async getAllDeviceOfflineMessages(
        siteId?: string,
    ): Promise<AddonMessagesOfflineAnyMessagesFormatted[]> {
        const site = await CoreSites.getSite(siteId);

        const [
            messages,
            conversations,
        ] = await Promise.all([
            site.getDb().getRecords<AddonMessagesOfflineMessagesDBRecord>(MESSAGES_TABLE, { deviceoffline: 1 }),
            site.getDb().getRecords<AddonMessagesOfflineConversationMessagesDBRecord>(
                CONVERSATION_MESSAGES_TABLE,
                { deviceoffline: 1 },
            ),
        ]);

        const messageResult:
        AddonMessagesOfflineAnyMessagesFormatted[] =
            this.parseMessages(messages);
        const formattedConv = this.parseConversationMessages(conversations);

        return messageResult.concat(formattedConv);
    }

    /**
     * Get all offline messages.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with messages.
     */
    async getAllMessages(
        siteId?: string,
    ): Promise<AddonMessagesOfflineAnyMessagesFormatted[]> {
        const site = await CoreSites.getSite(siteId);

        const [
            messages,
            conversations,
        ] = await Promise.all([
            site.getDb().getAllRecords<AddonMessagesOfflineMessagesDBRecord>(MESSAGES_TABLE),
            site.getDb().getAllRecords<AddonMessagesOfflineConversationMessagesDBRecord>(CONVERSATION_MESSAGES_TABLE),
        ]);

        const messageResult:
        AddonMessagesOfflineAnyMessagesFormatted[] =
            this.parseMessages(messages);
        const formattedConv = this.parseConversationMessages(conversations);

        return messageResult.concat(formattedConv);
    }

    /**
     * Get offline messages to send to a certain user.
     *
     * @param conversationId Conversation ID.
     * @param userIdFrom To add to the conversation messages when parsing.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with messages.
     */
    async getConversationMessages(
        conversationId: number,
        userIdFrom?: number,
        siteId?: string,
    ): Promise<AddonMessagesOfflineConversationMessagesDBRecordFormatted[]> {
        const site = await CoreSites.getSite(siteId);

        const messages: AddonMessagesOfflineConversationMessagesDBRecord[] = await site.getDb().getRecords(
            CONVERSATION_MESSAGES_TABLE,
            { conversationid: conversationId },
        );

        return this.parseConversationMessages(messages, userIdFrom);
    }

    /**
     * Get offline messages to send to a certain user.
     *
     * @param toUserId User ID to get messages to.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with messages.
     */
    async getMessages(toUserId: number, siteId?: string): Promise<AddonMessagesOfflineMessagesDBRecordFormatted[]> {
        const site = await CoreSites.getSite(siteId);

        const messages: AddonMessagesOfflineMessagesDBRecord[] =
            await site.getDb().getRecords(MESSAGES_TABLE, { touserid: toUserId });

        return this.parseMessages(messages);
    }

    /**
     * Check if there are offline messages to send to a conversation.
     *
     * @param conversationId Conversation ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    async hasConversationMessages(conversationId: number, siteId?: string): Promise<boolean> {
        const messages = await this.getConversationMessages(conversationId, undefined, siteId);

        return !!messages.length;
    }

    /**
     * Check if there are offline messages to send to a certain user.
     *
     * @param toUserId User ID to check.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    async hasMessages(toUserId: number, siteId?: string): Promise<boolean> {
        const messages = await this.getMessages(toUserId, siteId);

        return !!messages.length;
    }

    /**
     * Parse some fields of each offline conversation messages.
     *
     * @param messages List of messages to parse.
     * @param userIdFrom To add to the conversation messages when parsin.
     * @returns Parsed messages.
     */
    protected parseConversationMessages(
        messages: AddonMessagesOfflineConversationMessagesDBRecord[],
        userIdFrom?: number,
    ): AddonMessagesOfflineConversationMessagesDBRecordFormatted[] {
        if (!messages) {
            return [];
        }

        return messages.map((message) => {
            const parsedMessage: AddonMessagesOfflineConversationMessagesDBRecordFormatted = {
                conversationid: message.conversationid,
                text: message.text,
                timecreated: message.timecreated,
                deviceoffline: message.deviceoffline,
                conversation: message.conversation ? CoreTextUtils.parseJSON(message.conversation, undefined) : undefined,
                pending: true,
                useridfrom: userIdFrom,
            };

            return parsedMessage;
        });
    }

    /**
     * Parse some fields of each offline messages.
     *
     * @param messages List of messages to parse.
     * @returns Parsed messages.
     */
    protected parseMessages(
        messages: AddonMessagesOfflineMessagesDBRecord[],
    ): AddonMessagesOfflineMessagesDBRecordFormatted[] {
        if (!messages) {
            return [];
        }

        return messages.map((message) => {
            const parsedMessage: AddonMessagesOfflineMessagesDBRecordFormatted = {
                touserid: message.touserid,
                useridfrom: message.useridfrom,
                smallmessage: message.smallmessage,
                timecreated: message.timecreated,
                deviceoffline: message.deviceoffline,
                pending: true,
                text: message.smallmessage,
            };

            return parsedMessage;
        });
    }

    /**
     * Save a conversation message to be sent later.
     *
     * @param conversation Conversation.
     * @param message The message to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveConversationMessage(
        conversation: AddonMessagesConversation,
        message: string,
        siteId?: string,
    ): Promise<AddonMessagesOfflineConversationMessagesDBRecord> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonMessagesOfflineConversationMessagesDBRecord = {
            conversationid: conversation.id,
            text: message,
            timecreated: Date.now(),
            deviceoffline: CoreNetwork.isOnline() ? 0 : 1,
            conversation: JSON.stringify({
                name: conversation.name || '',
                subname: conversation.subname || '',
                imageurl: conversation.imageurl || '',
                isfavourite: conversation.isfavourite ? 1 : 0,
                type: conversation.type,
            }),
        };

        await site.getDb().insertRecord(CONVERSATION_MESSAGES_TABLE, entry);

        return entry;
    }

    /**
     * Save a message to be sent later.
     *
     * @param toUserId User ID recipient of the message.
     * @param message The message to send.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async saveMessage(toUserId: number, message: string, siteId?: string): Promise<AddonMessagesOfflineMessagesDBRecord> {
        const site = await CoreSites.getSite(siteId);

        const entry: AddonMessagesOfflineMessagesDBRecord = {
            touserid: toUserId,
            useridfrom: site.getUserId(),
            smallmessage: message,
            timecreated: Date.now(),
            deviceoffline: CoreNetwork.isOnline() ? 0 : 1,
        };

        await site.getDb().insertRecord(MESSAGES_TABLE, entry);

        return entry;
    }

    /**
     * Set deviceoffline for a group of messages.
     *
     * @param messages Messages to update. Should be the same entry as retrieved from the DB.
     * @param value Value to set.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if stored, rejected if failure.
     */
    async setMessagesDeviceOffline(
        messages: AddonMessagesOfflineAnyMessagesFormatted[],
        value: boolean,
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const db = site.getDb();

        const promises: Promise<number>[] = [];
        const data = { deviceoffline: value ? 1 : 0 };

        messages.forEach((message) => {
            if ('conversationid' in message) {
                promises.push(db.updateRecords(
                    CONVERSATION_MESSAGES_TABLE,
                    data,
                    { conversationid: message.conversationid, text: message.text, timecreated: message.timecreated },
                ));
            } else {
                promises.push(db.updateRecords(
                    MESSAGES_TABLE,
                    data,
                    { touserid: message.touserid, smallmessage: message.smallmessage, timecreated: message.timecreated },
                ));
            }
        });

        await Promise.all(promises);
    }

}

export const AddonMessagesOffline = makeSingleton(AddonMessagesOfflineProvider);

export type AddonMessagesOfflineMessagesDBRecordFormatted = AddonMessagesOfflineMessagesDBRecord & {
    pending?: boolean; // Will be likely true.
    text?: string; // Copy of smallmessage.
};

export type AddonMessagesOfflineConversationMessagesDBRecordFormatted =
    Omit<AddonMessagesOfflineConversationMessagesDBRecord, 'conversation'> &
    {
        conversation?: AddonMessagesConversation; // Data about the conversation.
        pending: boolean; // Will be always true.
        useridfrom?: number; // User Id who send the message, will be likely us.
    };

export type AddonMessagesOfflineAnyMessagesFormatted =
    AddonMessagesOfflineConversationMessagesDBRecordFormatted | AddonMessagesOfflineMessagesDBRecordFormatted;
