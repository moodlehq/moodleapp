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
import { CoreTextFormat } from '@singletons/text';

/**
 * Database variables for AddonBlogOfflineService.
 */
export const OFFLINE_BLOG_ENTRIES_TABLE_NAME = 'addon_blog_entries';
export const OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME = 'addon_blog_entries_removed';

export const BLOG_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonBlogOfflineService',
    version: 1,
    tables: [
        {
            name: OFFLINE_BLOG_ENTRIES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'subject',
                    type: 'TEXT',
                },
                {
                    name: 'summary',
                    type: 'TEXT',
                },
                {
                    name: 'summaryformat',
                    type: 'INTEGER',
                },
                {
                    name: 'created',
                    type: 'INTEGER',
                },
                {
                    name: 'lastmodified',
                    type: 'INTEGER',
                },
                {
                    name: 'options',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['id'],
        },
        {
            name: OFFLINE_BLOG_ENTRIES_REMOVED_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                },
                {
                    name: 'subject',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['id'],
        },
    ],
};

/**
 * Blog offline entry.
 */
export type AddonBlogOfflineEntryDBRecord = {
    id: number;
    userid: number;
    subject: string;
    summary: string;
    summaryformat: CoreTextFormat;
    created: number;
    lastmodified: number;
    options: string;
};
