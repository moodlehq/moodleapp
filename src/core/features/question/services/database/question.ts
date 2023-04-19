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

import { SQLiteDB } from '@classes/sqlitedb';
import { CoreSiteSchema } from '@services/sites';

/**
 * Database variables for CoreQuestion service.
 */
export const QUESTION_TABLE_NAME = 'questions_2';
export const QUESTION_ANSWERS_TABLE_NAME = 'question_answers';
export const QUESTION_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreQuestionProvider',
    version: 2,
    tables: [
        {
            name: QUESTION_TABLE_NAME,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'attemptid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'slot',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'componentid',
                    type: 'INTEGER',
                },
                {
                    name: 'state',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['component', 'attemptid', 'slot'],
        },
        {
            name: QUESTION_ANSWERS_TABLE_NAME,
            columns: [
                {
                    name: 'component',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'attemptid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'name',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'componentid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'questionslot',
                    type: 'INTEGER',
                },
                {
                    name: 'value',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['component', 'attemptid', 'name'],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number): Promise<void> {
        if (oldVersion < 2) {
            await db.migrateTable(
                'questions',
                QUESTION_TABLE_NAME,
                ({ component, componentid, attemptid, slot, state }) => ({ component, componentid, attemptid, slot, state }),
            );
        }
    },
};

/**
 * Data about a question.
 */
export type CoreQuestionDBRecord = {
    component: string;
    attemptid: number;
    slot: number;
    componentid: number;
    state: string;
};

/**
 * Data about a question answer.
 */
export type CoreQuestionAnswerDBRecord = {
    component: string;
    attemptid: number;
    name: string;
    componentid: number;
    userid: number;
    questionslot: number;
    value: string;
    timemodified: number;
};
