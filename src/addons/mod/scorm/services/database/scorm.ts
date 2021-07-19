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
 * Database variables for AddonModScormOfflineProvider.
 */
export const ATTEMPTS_TABLE_NAME = 'addon_mod_scorm_offline_attempts';
export const TRACKS_TABLE_NAME = 'addon_mod_scorm_offline_scos_tracks';
export const OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonModScormOfflineProvider',
    version: 1,
    tables: [
        {
            name: ATTEMPTS_TABLE_NAME,
            columns: [
                {
                    name: 'scormid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'attempt', // Attempt number.
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                    notNull: true,
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
                    name: 'snapshot',
                    type: 'TEXT',
                },
            ],
            primaryKeys: ['scormid', 'userid', 'attempt'],
        },
        {
            name: TRACKS_TABLE_NAME,
            columns: [
                {
                    name: 'scormid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'attempt', // Attempt number.
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'scoid',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'element',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'value',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'synced',
                    type: 'INTEGER',
                },
            ],
            primaryKeys: ['scormid', 'userid', 'attempt', 'scoid', 'element'],
        },
    ],
};

/**
 * Offline common data.
 */
export type AddonModScormOfflineDBCommonData = {
    scormid: number;
    attempt: number;
    userid: number;
};

/**
 * SCORM attempt data.
 */
export type AddonModScormAttemptDBRecord = AddonModScormOfflineDBCommonData & {
    courseid: number;
    timecreated: number;
    timemodified: number;
    snapshot?: string | null;
};

/**
 * SCORM track data.
 */
export type AddonModScormTrackDBRecord = AddonModScormOfflineDBCommonData & {
    scoid: number;
    element: string;
    value?: string | null;
    timemodified: number;
    synced: number;
};
