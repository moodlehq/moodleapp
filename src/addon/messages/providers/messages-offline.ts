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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Service to handle Offline messages.
 */
@Injectable()
export class AddonMessagesOfflineProvider {

    protected logger;

    // Variables for database.
    static MESSAGES_TABLE = 'addon_messages_offline_messages'; // When group messaging isn't available or a new conversation starts.
    static CONVERSATION_MESSAGES_TABLE = 'addon_messages_offline_conversation_messages'; // Conversation messages.
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonMessagesOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonMessagesOfflineProvider.MESSAGES_TABLE,
                columns: [
                    {
                        name: 'touserid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'useridfrom',
                        type: 'INTEGER'
                    },
                    {
                        name: 'smallmessage',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'deviceoffline', // If message was stored because device was offline.
                        type: 'INTEGER'
                    }
                ],
                primaryKeys: ['touserid', 'smallmessage', 'timecreated']
            },
            {
                name: AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE,
                columns: [
                    {
                        name: 'conversationid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'text',
                        type: 'TEXT'
                    },
                    {
                        name: 'timecreated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'deviceoffline', // If message was stored because device was offline.
                        type: 'INTEGER'
                    },
                    {
                        name: 'conversation', // Data about the conversation.
                        type: 'TEXT'
                    }
                ],
                primaryKeys: ['conversationid', 'text', 'timecreated']
            }
        ]
    };

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private appProvider: CoreAppProvider,
            private textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('AddonMessagesOfflineProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete a message.
     *
     * @param {number} conversationId Conversation ID.
     * @param {string} message The message.
     * @param {number} timeCreated The time the message was created.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    deleteConversationMessage(conversationId: number, message: string, timeCreated: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE, {
                    conversationid: conversationId,
                    text: message,
                    timecreated: timeCreated
                });
        });
    }

    /**
     * Delete all the messages in a conversation.
     *
     * @param {number} conversationId Conversation ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    deleteConversationMessages(conversationId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE, {
                    conversationid: conversationId
                });
        });
    }

    /**
     * Delete a message.
     *
     * @param  {number} toUserId    User ID to send the message to.
     * @param  {string} message     The message.
     * @param  {number} timeCreated The time the message was created.
     * @param  {string} [siteId]    Site ID. If not defined, current site.
     * @return {Promise<any>}       Promise resolved if stored, rejected if failure.
     */
    deleteMessage(toUserId: number, message: string, timeCreated: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().deleteRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {
                    touserid: toUserId,
                    smallmessage: message,
                    timecreated: timeCreated
                });
        });
    }

    /**
     * Get all messages where deviceoffline is set to 1.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}    Promise resolved with messages.
     */
    getAllDeviceOfflineMessages(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];

            promises.push(site.getDb().getRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {deviceoffline: 1}));
            promises.push(site.getDb().getRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE, {deviceoffline: 1}));

            return Promise.all(promises).then((results) => {
                results[1] = this.parseConversationMessages(results[1]);

                return results[0].concat(results[1]);
            });
        });
    }

    /**
     * Get all offline messages.
     *
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}         Promise resolved with messages.
     */
    getAllMessages(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];

            promises.push(site.getDb().getAllRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE));
            promises.push(site.getDb().getAllRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE));

            return Promise.all(promises).then((results) => {
                results[1] = this.parseConversationMessages(results[1]);

                return results[0].concat(results[1]);
            });
        });
    }

    /**
     * Get offline messages to send to a certain user.
     *
     * @param {number} conversationId Conversation ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with messages.
     */
    getConversationMessages(conversationId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE,
                    {conversationid: conversationId}).then((messages) => {

                return this.parseConversationMessages(messages);
            });
        });
    }

    /**
     * Get offline messages to send to a certain user.
     *
     * @param  {number} toUserId       User ID to get messages to.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>}    Promise resolved with messages.
     */
    getMessages(toUserId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, {touserid: toUserId});
        });
    }

    /**
     * Check if there are offline messages to send to a conversation.
     *
     * @param {number} conversationId Conversation ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    hasConversationMessages(conversationId: number, siteId?: string): Promise<boolean> {
        return this.getConversationMessages(conversationId, siteId).then((messages) => {
            return !!messages.length;
        });
    }

    /**
     * Check if there are offline messages to send to a certain user.
     *
     * @param  {number} toUserId User ID to check.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>}    Promise resolved with boolean: true if has offline messages, false otherwise.
     */
    hasMessages(toUserId: number, siteId?: string): Promise<boolean> {
        return this.getMessages(toUserId, siteId).then((messages) => {
            return !!messages.length;
        });
    }

    /**
     * Parse some fields of each offline conversation messages.
     *
     * @param {any[]} messages List of messages to parse.
     * @return {any[]} Parsed messages.
     */
    protected parseConversationMessages(messages: any[]): any[] {
        if (!messages) {
            return [];
        }

        messages.forEach((message) => {
            if (message.conversation) {
                message.conversation = this.textUtils.parseJSON(message.conversation, {});
            }
        });

        return messages;
    }

    /**
     * Save a conversation message to be sent later.
     *
     * @param {any} conversation Conversation.
     * @param {string} message The message to send.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if stored, rejected if failure.
     */
    saveConversationMessage(conversation: any, message: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                conversationid: conversation.id,
                text: message,
                timecreated: Date.now(),
                deviceoffline: this.appProvider.isOnline() ? 0 : 1,
                conversation: JSON.stringify({
                    name: conversation.name || '',
                    subname: conversation.subname || '',
                    imageurl: conversation.imageurl || '',
                    isfavourite: conversation.isfavourite ? 1 : 0,
                    type: conversation.type
                })
            };

            return site.getDb().insertRecord(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE, entry).then(() => {
                return entry;
            });
        });
    }

    /**
     * Save a message to be sent later.
     *
     * @param  {number} toUserId User ID recipient of the message.
     * @param  {string} message  The message to send.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
     */
    saveMessage(toUserId: number, message: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const entry = {
                touserid: toUserId,
                useridfrom: site.getUserId(),
                smallmessage: message,
                timecreated: new Date().getTime(),
                deviceoffline: this.appProvider.isOnline() ? 0 : 1
            };

            return site.getDb().insertRecord(AddonMessagesOfflineProvider.MESSAGES_TABLE, entry).then(() => {
                return entry;
            });
        });
    }

    /**
     * Set deviceoffline for a group of messages.
     *
     * @param  {any} messages Messages to update. Should be the same entry as retrieved from the DB.
     * @param  {boolean} value   Value to set.
     * @param  {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>}    Promise resolved if stored, rejected if failure.
     */
    setMessagesDeviceOffline(messages: any, value: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                promises = [],
                data = { deviceoffline: value ? 1 : 0 };

            messages.forEach((message) => {
                if (message.conversationid) {
                    promises.push(db.updateRecords(AddonMessagesOfflineProvider.CONVERSATION_MESSAGES_TABLE, data,
                            {conversationid: message.conversationid, text: message.text, timecreated: message.timecreated}));
                } else {
                    promises.push(db.updateRecords(AddonMessagesOfflineProvider.MESSAGES_TABLE, data,
                            {touserid: message.touserid, smallmessage: message.smallmessage, timecreated: message.timecreated}));
                }
            });

            return Promise.all(promises);
        });
    }
}
