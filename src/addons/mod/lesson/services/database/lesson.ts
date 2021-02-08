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
 * Database variables for AddonModLessonProvider.
 */
export const PASSWORD_TABLE_NAME = 'addon_mod_lesson_password';
export const SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModLessonProvider',
    version: 1,
    tables: [
        {
            name: PASSWORD_TABLE_NAME,
            columns: [
                {
                    name: 'lessonid',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'password',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

/**
 * Database variables for AddonModLessonOfflineProvider.
 */
export const RETAKES_TABLE_NAME = 'addon_mod_lesson_retakes';
export const PAGE_ATTEMPTS_TABLE_NAME = 'addon_mod_lesson_page_attempts';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModLessonOfflineProvider',
    version: 1,
    tables: [
        {
            name: RETAKES_TABLE_NAME,
            columns: [
                {
                    name: 'lessonid',
                    type: 'INTEGER',
                    primaryKey: true, // Only 1 offline retake per lesson.
                },
                {
                    name: 'retake', // Retake number.
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'finished',
                    type: 'INTEGER',
                },
                {
                    name: 'outoftime',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'lastquestionpage',
                    type: 'INTEGER',
                },
            ],
        },
        {
            name: PAGE_ATTEMPTS_TABLE_NAME,
            columns: [
                {
                    name: 'lessonid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'retake', // Retake number.
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'pageid',
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
                    name: 'data',
                    type: 'TEXT',
                },
                {
                    name: 'type',
                    type: 'INTEGER',
                },
                {
                    name: 'newpageid',
                    type: 'INTEGER',
                },
                {
                    name: 'correct',
                    type: 'INTEGER',
                },
                {
                    name: 'answerid',
                    type: 'INTEGER',
                },
                {
                    name: 'useranswer',
                    type: 'TEXT',
                },
            ],
            // A user can attempt several times per page and retake.
            primaryKeys: ['lessonid', 'retake', 'pageid', 'timemodified'],
        },
    ],
};

/**
 * Database variables for AddonModLessonSyncProvider.
 */
export const RETAKES_FINISHED_SYNC_TABLE_NAME = 'addon_mod_lesson_retakes_finished_sync';
export const SYNC_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModLessonSyncProvider',
    version: 1,
    tables: [
        {
            name: RETAKES_FINISHED_SYNC_TABLE_NAME,
            columns: [
                {
                    name: 'lessonid',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'retake',
                    type: 'INTEGER',
                },
                {
                    name: 'pageid',
                    type: 'INTEGER',
                },
                {
                    name: 'timefinished',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

/**
 * Lesson retake data.
 */
export type AddonModLessonPasswordDBRecord = {
    lessonid: number;
    password: string;
    timemodified: number;
};

/**
 * Lesson retake data.
 */
export type AddonModLessonRetakeDBRecord = {
    lessonid: number;
    retake: number;
    courseid: number;
    finished: number;
    outoftime?: number | null;
    timemodified?: number | null;
    lastquestionpage?: number | null;
};

/**
 * Lesson page attempts data.
 */
export type AddonModLessonPageAttemptDBRecord = {
    lessonid: number;
    retake: number;
    pageid: number;
    timemodified: number;
    courseid: number;
    data: string | null;
    type: number;
    newpageid: number;
    correct: number;
    answerid: number | null;
    useranswer: string | null;
};

/**
 * Data about a retake finished in sync.
 */
export type AddonModLessonRetakeFinishedInSyncDBRecord = {
    lessonid: number;
    retake: number;
    pageid: number;
    timefinished: number;
};
