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

import { MAIN_MENU_FEATURE_PREFIX } from '@features/mainmenu/constants';

export const ADDON_MESSAGES_NEW_MESSAGE_EVENT = 'addon_messages_new_message_event';
export const ADDON_MESSAGES_READ_CHANGED_EVENT = 'addon_messages_read_changed_event';
// Notify a conversation should be opened.
export const ADDON_MESSAGES_OPEN_CONVERSATION_EVENT = 'addon_messages_open_conversation_event';
export const ADDON_MESSAGES_UPDATE_CONVERSATION_LIST_EVENT = 'addon_messages_update_conversation_list_event';
export const ADDON_MESSAGES_MEMBER_INFO_CHANGED_EVENT = 'addon_messages_member_changed_event';
export const ADDON_MESSAGES_UNREAD_CONVERSATION_COUNTS_EVENT = 'addon_messages_unread_conversation_counts_event';
export const ADDON_MESSAGES_CONTACT_REQUESTS_COUNT_EVENT = 'addon_messages_contact_requests_count_event';

export const ADDON_MESSAGES_POLL_INTERVAL = 10000;
export const ADDON_MESSAGES_PUSH_SIMULATION_COMPONENT = 'AddonMessagesPushSimulation';

export const ADDON_MESSAGES_PAGE_NAME = 'messages';
export const ADDON_MESSAGES_SETTINGS_PAGE_NAME = 'messages';

export const ADDONS_MESSAGES_COMPONENT_NAME = 'AddonMessages';
export const ADDONS_MESSAGES_MENU_FEATURE_NAME = `${MAIN_MENU_FEATURE_PREFIX}${ADDONS_MESSAGES_COMPONENT_NAME}`;

export const enum AddonMessagesMessagePrivacy {
    COURSEMEMBER = 0, // Privacy setting for being messaged by anyone within courses user is member.
    ONLYCONTACTS = 1, // Privacy setting for being messaged only by contacts.
    SITE = 2, // Privacy setting for being messaged by anyone on the site.
}

export const enum AddonMessagesMessageConversationType {
    INDIVIDUAL = 1, // An individual conversation.
    GROUP = 2, // A group conversation.
    SELF = 3, // A self conversation.
}

export const ADDON_MESSAGES_LIMIT_CONTACTS = 50;
export const ADDON_MESSAGES_LIMIT_MESSAGES = 50;
export const ADDON_MESSAGES_LIMIT_INITIAL_USER_SEARCH = 3;
export const ADDON_MESSAGES_LIMIT_SEARCH = 50;

export const ADDON_MESSAGES_NOTIFICATION_PREFERENCES_KEY = 'message_provider_moodle_instantmessage';

export const ADDON_MESSAGES_AUTO_SYNCED = 'addon_messages_autom_synced';

export const enum AddonMessagesUpdateConversationAction {
    MUTE = 'mute',
    FAVOURITE = 'favourite',
    DELETE = 'delete',
}
