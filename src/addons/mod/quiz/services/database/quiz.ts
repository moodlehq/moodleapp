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
 * Database variables for AddonModQuizOfflineProvider.
 */
export const ATTEMPTS_TABLE_NAME = 'addon_mod_quiz_attempts';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModQuizOfflineProvider',
    version: 1,
    tables: [
        {
            name: ATTEMPTS_TABLE_NAME,
            columns: [
                {
                    name: 'id', // Attempt ID.
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'attempt', // Attempt number.
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'quizid',
                    type: 'INTEGER',
                },
                {
                    name: 'currentpage',
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
                    name: 'finished',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

/**
 * Quiz attempt.
 */
export type AddonModQuizAttemptDBRecord = {
    id: number;
    attempt: number;
    courseid: number;
    userid: number;
    quizid: number;
    currentpage?: number;
    timecreated: number;
    timemodified: number;
    finished: number;
};
