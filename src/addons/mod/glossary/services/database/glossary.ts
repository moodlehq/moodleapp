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
 * Database variables for AddonModGlossaryProvider.
 */
export const ENTRIES_TABLE_NAME = 'addon_mod_glossary_entry_glossaryid';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModGlossaryProvider',
    version: 1,
    tables: [
        {
            name: ENTRIES_TABLE_NAME,
            columns: [
                {
                    name: 'entryid',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'glossaryid',
                    type: 'INTEGER',
                },
                {
                    name: 'pagefrom',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

/**
 * Database variables for AddonModGlossaryOfflineProvider.
 */
export const OFFLINE_ENTRIES_TABLE_NAME = 'addon_mod_glossary_entrues';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModGlossaryOfflineProvider',
    version: 1,
    tables: [
        {
            name: OFFLINE_ENTRIES_TABLE_NAME,
            columns: [
                {
                    name: 'glossaryid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'concept',
                    type: 'TEXT',
                },
                {
                    name: 'definition',
                    type: 'TEXT',
                },
                {
                    name: 'definitionformat',
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
                {
                    name: 'options',
                    type: 'TEXT',
                },
                {
                    name: 'attachments',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['glossaryid', 'concept', 'timecreated'],
        },
    ],
};

/**
 * Glossary entry to get glossaryid from entryid.
 */
export type AddonModGlossaryEntryDBRecord = {
    entryid: number;
    glossaryid: number;
    pagefrom: number;
};

/**
 * Glossary offline entry.
 */
export type AddonModGlossaryOfflineEntryDBRecord = {
    glossaryid: number;
    courseid: number;
    concept: string;
    definition: string;
    definitionformat: string;
    userid: number;
    timecreated: number;
    options: string;
    attachments: string;
};
