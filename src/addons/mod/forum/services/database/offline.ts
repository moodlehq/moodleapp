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
import { AddonModForumOfflineDiscussion, AddonModForumOfflineReply } from '../forum-offline';

/**
 * Database variables for AddonModForum service.
 */
export const DISCUSSIONS_TABLE = 'addon_mod_forum_discussions';
export const REPLIES_TABLE = 'addon_mod_forum_replies';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModForumOfflineProvider',
    version: 1,
    tables: [
        {
            name: DISCUSSIONS_TABLE,
            columns: [
                {
                    name: 'forumid',
                    type: 'INTEGER',
                },
                {
                    name: 'name',
                    type: 'TEXT',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'subject',
                    type: 'TEXT',
                },
                {
                    name: 'message',
                    type: 'TEXT',
                },
                {
                    name: 'options',
                    type: 'TEXT',
                },
                {
                    name: 'groupid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['forumid', 'userid', 'timecreated'],
        },
        {
            name: REPLIES_TABLE,
            columns: [
                {
                    name: 'postid',
                    type: 'INTEGER',
                },
                {
                    name: 'discussionid',
                    type: 'INTEGER',
                },
                {
                    name: 'forumid',
                    type: 'INTEGER',
                },
                {
                    name: 'name',
                    type: 'TEXT',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'subject',
                    type: 'TEXT',
                },
                {
                    name: 'message',
                    type: 'TEXT',
                },
                {
                    name: 'options',
                    type: 'TEXT',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['postid', 'userid'],
        },
    ],
};

export type AddonModForumOfflineDiscussionDBRecord = Omit<AddonModForumOfflineDiscussion, 'options'> & {
    options: string;
};

export type AddonModForumOfflineReplyDBRecord = Omit<AddonModForumOfflineReply, 'options'> & {
    options: string;
};
