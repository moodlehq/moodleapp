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
 * Database variables for CoreCommentsOfflineProvider.
 */
export const COMMENTS_TABLE = 'core_comments_offline_comments';
export const COMMENTS_DELETED_TABLE = 'core_comments_deleted_offline_comments';
export const COMMENTS_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreCommentsOfflineProvider',
    version: 1,
    tables: [
        {
            name: COMMENTS_TABLE,
            columns: [
                {
                    name: 'contextlevel',
                    type: 'TEXT',
                },
                {
                    name: 'instanceid',
                    type: 'INTEGER',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'itemid',
                    type: 'INTEGER',
                },
                {
                    name: 'area',
                    type: 'TEXT',
                },
                {
                    name: 'content',
                    type: 'TEXT',
                },
                {
                    name: 'lastmodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['contextlevel', 'instanceid', 'component', 'itemid', 'area'],
        },
        {
            name: COMMENTS_DELETED_TABLE,
            columns: [
                {
                    name: 'commentid',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'contextlevel',
                    type: 'TEXT',
                },
                {
                    name: 'instanceid',
                    type: 'INTEGER',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'itemid',
                    type: 'INTEGER',
                },
                {
                    name: 'area',
                    type: 'TEXT',
                },
                {
                    name: 'deleted',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

export type CoreCommentsDBRecord = {
    contextlevel: string; // Primary key.
    instanceid: number; // Primary key.
    component: string; // Primary key.
    itemid: number; // Primary key.
    area: string; // Primary key.
    content: string;
    lastmodified: number;
};

export type CoreCommentsDeletedDBRecord = {
    commentid: number; // Primary key.
    contextlevel: string;
    instanceid: number;
    component: string;
    itemid: number;
    area: string;
    deleted: number;
};
