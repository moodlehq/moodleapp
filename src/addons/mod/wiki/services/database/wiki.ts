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
 * Database variables for AddonModWikiOfflineProvider.
 */
export const NEW_PAGES_TABLE_NAME = 'addon_mod_wiki_new_pages_store';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModWikiOfflineProvider',
    version: 1,
    tables: [
        {
            name: NEW_PAGES_TABLE_NAME,
            columns: [
                {
                    name: 'wikiid',
                    type: 'INTEGER',
                },
                {
                    name: 'subwikiid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'groupid',
                    type: 'INTEGER',
                },
                {
                    name: 'title',
                    type: 'TEXT',
                },
                {
                    name: 'cachedcontent',
                    type: 'TEXT',
                },
                {
                    name: 'contentformat',
                    type: 'TEXT',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'caneditpage',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['wikiid', 'subwikiid', 'userid', 'groupid', 'title'],
        },
    ],
};

/**
 * Wiki new page data.
 */
export type AddonModWikiPageDBRecord = {
    wikiid: number;
    subwikiid: number;
    userid: number;
    groupid: number;
    title: string;
    cachedcontent: string;
    contentformat: string;
    courseid?: null; // Currently not used.
    timecreated: number;
    timemodified: number;
    caneditpage: number;
};
