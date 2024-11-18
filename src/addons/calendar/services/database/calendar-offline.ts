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
import { AddonCalendarEventType } from '@addons/calendar/constants';

/**
 * Database variables for AddonDatabaseOffline service.
 */
export const EVENTS_TABLE = 'addon_calendar_offline_events';
export const DELETED_EVENTS_TABLE = 'addon_calendar_deleted_events';
export const CALENDAR_OFFLINE_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonCalendarOfflineProvider',
    version: 1,
    tables: [
        {
            name: EVENTS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'name',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'timestart',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'eventtype',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'categoryid',
                    type: 'INTEGER',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'groupcourseid',
                    type: 'INTEGER',
                },
                {
                    name: 'groupid',
                    type: 'INTEGER',
                },
                {
                    name: 'description',
                    type: 'TEXT',
                },
                {
                    name: 'location',
                    type: 'TEXT',
                },
                {
                    name: 'duration',
                    type: 'INTEGER',
                },
                {
                    name: 'timedurationuntil',
                    type: 'INTEGER',
                },
                {
                    name: 'timedurationminutes',
                    type: 'INTEGER',
                },
                {
                    name: 'repeat',
                    type: 'INTEGER',
                },
                {
                    name: 'repeats',
                    type: 'INTEGER',
                },
                {
                    name: 'repeatid',
                    type: 'INTEGER',
                },
                {
                    name: 'repeateditall',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
        },
        {
            name: DELETED_EVENTS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'name',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'repeat',
                    type: 'INTEGER',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
            ],
        },
    ],
};

export type AddonCalendarOfflineEventDBRecord = {
    id: number; // Negative for offline entries.
    name: string;
    timestart: number;
    eventtype: AddonCalendarEventType;
    categoryid?: number;
    courseid?: number;
    groupcourseid?: number;
    groupid?: number;
    description?: string;
    location?: string;
    duration?: number;
    timedurationuntil?: number;
    timedurationminutes?: number;
    repeat?: number;
    repeats?: number;
    repeatid?: number;
    repeateditall?: number;
    userid?: number;
    timecreated?: number;
};

export type AddonCalendarOfflineDeletedEventDBRecord = {
    id: number;
    name: string; // Save the name to be able to notify the user.
    repeat?: number;
    timemodified?: number;
};
