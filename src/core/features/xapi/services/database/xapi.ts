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
 * Database variables for CoreXAPIOfflineProvider service.
 */
export const STATEMENTS_TABLE_NAME = 'core_xapi_statements';
export const STATES_TABLE_NAME = 'core_xapi_states';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreXAPIOfflineProvider',
    version: 2,
    tables: [
        {
            name: STATEMENTS_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'contextid',
                    type: 'INTEGER',
                },
                {
                    name: 'component',
                    type: 'TEXT',
                },
                {
                    name: 'statements',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'extra',
                    type: 'TEXT',
                },
            ],
        },
        {
            name: STATES_TABLE_NAME,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                    autoIncrement: true,
                },
                {
                    name: 'component',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'itemid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'stateid',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'statedata',
                    type: 'TEXT',
                },
                {
                    name: 'registration',
                    type: 'TEXT',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'extra',
                    type: 'TEXT',
                },
            ],
        },
    ],
};

/**
 * Structure of statement data stored in DB.
 */
export type CoreXAPIStatementDBRecord = {
    id: number; // ID.
    contextid: number; // Context ID of the statements.
    component: string; // Component to send the statements to.
    statements: string; // Statements (JSON-encoded).
    timecreated: number; // When were the statements created.
    courseid?: number; // Course ID if the context is inside a course.
    extra?: string; // Extra data.
};

/**
 * Structure of state data stored in DB.
 */
export type CoreXAPIStateDBRecord = {
    id: number; // ID.
    component: string; // Component name.
    itemid: number; // The Agent Id (usually the plugin instance).
    stateid: string; // Component identified for the state data.
    statedata?: string; // JSON state data.
    registration?: string; // Optional registration identifier.
    timecreated: number; // When was the state modified.
    timemodified: number; // When was the state modified.
    courseid?: number; // Course ID if the activity is inside a course.
    extra?: string; // Extra data.
};
