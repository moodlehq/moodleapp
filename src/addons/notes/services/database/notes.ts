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
import { AddonNotesPublishState } from '../notes';
import { CoreTextFormat } from '@singletons/text';

/**
 * Database variables for AddonNotesOfflineProvider.
 */
export const NOTES_TABLE = 'addon_notes_offline_notes';
export const NOTES_DELETED_TABLE = 'addon_notes_deleted_offline_notes';
export const NOTES_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonNotesOfflineProvider',
    version: 2,
    tables: [
        {
            name: NOTES_TABLE,
            columns: [
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'publishstate',
                    type: 'TEXT',
                },
                {
                    name: 'content',
                    type: 'TEXT',
                },
                {
                    name: 'format',
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
            ],
            primaryKeys: ['userid', 'content', 'created'],
        },
        {
            name: NOTES_DELETED_TABLE,
            columns: [
                {
                    name: 'noteid',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'deleted',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

export type AddonNotesDBRecord = {
    userid: number; // Primary key.
    content: string; // Primary key.
    created: number; // Primary key.
    courseid: number;
    publishstate: AddonNotesPublishState;
    format: CoreTextFormat;
    lastmodified: number;
};

export type AddonNotesDeletedDBRecord = {
    noteid: number; // Primary key.
    deleted: number;
    courseid: number;
};
