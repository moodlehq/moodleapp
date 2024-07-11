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

export const ADDON_MOD_FORUM_PAGE_NAME = 'mod_forum';
export const ADDON_MOD_FORUM_SEARCH_PAGE_NAME = 'forum/search';

export const ADDON_MOD_FORUM_COMPONENT = 'mmaModForum';

export const ADDON_MOD_FORUM_AUTO_SYNCED = 'addon_mod_forum_autom_synced';
export const ADDON_MOD_FORUM_MANUAL_SYNCED = 'addon_mod_forum_manual_synced';

export const ADDON_MOD_FORUM_DISCUSSIONS_PER_PAGE = 10; // Max of discussions per page.
export const ADDON_MOD_FORUM_NEW_DISCUSSION_EVENT = 'addon_mod_forum_new_discussion';
export const ADDON_MOD_FORUM_REPLY_DISCUSSION_EVENT = 'addon_mod_forum_reply_discussion';
export const ADDON_MOD_FORUM_CHANGE_DISCUSSION_EVENT = 'addon_mod_forum_change_discussion_status';
export const ADDON_MOD_FORUM_MARK_READ_EVENT = 'addon_mod_forum_mark_read';

export const ADDON_MOD_FORUM_PREFERENCE_SORTORDER = 'forum_discussionlistsortorder';

export const enum AddonModForumSortorder {
    LASTPOST_DESC = 1,
    LASTPOST_ASC = 2,
    CREATED_DESC = 3,
    CREATED_ASC = 4,
    REPLIES_DESC = 5,
    REPLIES_ASC = 6,
}

export const ADDON_MOD_FORUM_ALL_PARTICIPANTS = -1;
export const ADDON_MOD_FORUM_ALL_GROUPS = -2;
