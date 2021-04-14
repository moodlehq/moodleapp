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
import { AddonModDataAction } from '../data';

/**
 * Database variables for AddonModDataOfflineProvider.
 */
export const DATA_ENTRY_TABLE = 'addon_mod_data_entry_1';
export const ADDON_MOD_DATA_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModDataOfflineProvider',
    version: 1,
    tables: [
        {
            name: DATA_ENTRY_TABLE,
            columns: [
                {
                    name: 'dataid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'groupid',
                    type: 'INTEGER',
                },
                {
                    name: 'action',
                    type: 'TEXT',
                },
                {
                    name: 'entryid',
                    type: 'INTEGER',
                },
                {
                    name: 'fields',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['dataid', 'entryid', 'action'],
        },
    ],
};

/**
 * Data about data entries to sync.
 */
export type AddonModDataEntryDBRecord = {
    dataid: number; // Primary key.
    entryid: number; // Primary key. Negative for offline entries.
    action: AddonModDataAction; // Primary key.
    courseid: number;
    groupid: number;
    fields: string;
    timemodified: number;
};
