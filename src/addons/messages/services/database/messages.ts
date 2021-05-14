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

import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for AddonMessagesOffline service.
 */
export const MESSAGES_TABLE = 'addon_messages_offline_messages'; // When group messaging isn't available or new conversation starts.
export const CONVERSATION_MESSAGES_TABLE = 'addon_messages_offline_conversation_messages'; // Conversation messages.
export const MESSAGES_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonMessagesOfflineProvider',
    version: 1,
    tables: [
        {
            name: MESSAGES_TABLE,
            columns: [
                {
                    name: 'touserid',
                    type: 'INTEGER',
                },
                {
                    name: 'useridfrom',
                    type: 'INTEGER',
                },
                {
                    name: 'smallmessage',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
                {
                    name: 'deviceoffline', // If message was stored because device was offline.
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['touserid', 'smallmessage', 'timecreated'],
        },
        {
            name: CONVERSATION_MESSAGES_TABLE,
            columns: [
                {
                    name: 'conversationid',
                    type: 'INTEGER',
                },
                {
                    name: 'text',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
                {
                    name: 'deviceoffline', // If message was stored because device was offline.
                    type: 'INTEGER',
                },
                {
                    name: 'conversation', // Data about the conversation.
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['conversationid', 'text', 'timecreated'],
        },
    ],
};

export type AddonMessagesOfflineMessagesDBRecord = {
    touserid: number;
    useridfrom: number;
    smallmessage: string;
    timecreated: number;
    deviceoffline: number; // If message was stored because device was offline.
};

export type AddonMessagesOfflineConversationMessagesDBRecord = {
    conversationid: number;
    text: string;
    timecreated: number;
    deviceoffline: number; // If message was stored because device was offline.
    conversation: string; // Data about the conversation.
};
