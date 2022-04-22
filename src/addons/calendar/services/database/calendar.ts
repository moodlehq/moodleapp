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
import { CoreConfig } from '@services/config';
import { CoreSiteSchema } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { AddonCalendar, AddonCalendarEventType, AddonCalendarProvider } from '../calendar';

/**
 * Database variables for AddonCalendarProvider service.
 */
export const EVENTS_TABLE = 'addon_calendar_events_3';
export const REMINDERS_TABLE = 'addon_calendar_reminders_2';
export const CALENDAR_SITE_SCHEMA: CoreSiteSchema = {
    name: 'AddonCalendarProvider',
    version: 4,
    canBeCleared: [EVENTS_TABLE],
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
                    name: 'description',
                    type: 'TEXT',
                },
                {
                    name: 'eventtype',
                    type: 'TEXT',
                },
                {
                    name: 'courseid',
                    type: 'INTEGER',
                },
                {
                    name: 'timestart',
                    type: 'INTEGER',
                },
                {
                    name: 'timeduration',
                    type: 'INTEGER',
                },
                {
                    name: 'categoryid',
                    type: 'INTEGER',
                },
                {
                    name: 'groupid',
                    type: 'INTEGER',
                },
                {
                    name: 'userid',
                    type: 'INTEGER',
                },
                {
                    name: 'instance',
                    type: 'INTEGER',
                },
                {
                    name: 'modulename',
                    type: 'TEXT',
                },
                {
                    name: 'timemodified',
                    type: 'INTEGER',
                },
                {
                    name: 'repeatid',
                    type: 'INTEGER',
                },
                {
                    name: 'visible',
                    type: 'INTEGER',
                },
                {
                    name: 'uuid',
                    type: 'TEXT',
                },
                {
                    name: 'sequence',
                    type: 'INTEGER',
                },
                {
                    name: 'subscriptionid',
                    type: 'INTEGER',
                },
                {
                    name: 'location',
                    type: 'TEXT',
                },
                {
                    name: 'eventcount',
                    type: 'INTEGER',
                },
                {
                    name: 'timesort',
                    type: 'INTEGER',
                },
                {
                    name: 'category',
                    type: 'TEXT',
                },
                {
                    name: 'course',
                    type: 'TEXT',
                },
                {
                    name: 'subscription',
                    type: 'TEXT',
                },
                {
                    name: 'canedit',
                    type: 'INTEGER',
                },
                {
                    name: 'candelete',
                    type: 'INTEGER',
                },
                {
                    name: 'deleteurl',
                    type: 'TEXT',
                },
                {
                    name: 'editurl',
                    type: 'TEXT',
                },
                {
                    name: 'viewurl',
                    type: 'TEXT',
                },
                {
                    name: 'isactionevent',
                    type: 'INTEGER',
                },
                {
                    name: 'url',
                    type: 'TEXT',
                },
                {
                    name: 'islastday',
                    type: 'INTEGER',
                },
                {
                    name: 'popupname',
                    type: 'TEXT',
                },
                {
                    name: 'mindaytimestamp',
                    type: 'INTEGER',
                },
                {
                    name: 'maxdaytimestamp',
                    type: 'INTEGER',
                },
                {
                    name: 'draggable',
                    type: 'INTEGER',
                },
            ],
        },
        {
            name: REMINDERS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'eventid',
                    type: 'INTEGER',
                },
                {
                    name: 'time',
                    type: 'INTEGER',
                },
                {
                    name: 'timecreated',
                    type: 'INTEGER',
                },
            ],
            uniqueKeys: [
                ['eventid', 'time'],
            ],
        },
    ],
    async migrate(db: SQLiteDB, oldVersion: number, siteId: string): Promise<void> {
        if (oldVersion < 3) {
            // Migrate calendar events. New format @since 3.7.
            let oldTable = 'addon_calendar_events_2';

            try {
                await db.tableExists(oldTable);
            } catch {
                // The v2 table doesn't exist, try with v1.
                oldTable = 'addon_calendar_events';
            }

            await db.migrateTable(oldTable, EVENTS_TABLE);
        }

        if (oldVersion < 4) {
            // Migrate default notification time if it was changed.
            // Don't use getDefaultNotificationTime to be able to detect if the value was changed or not.
            const key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;
            const defaultTime = await CoreUtils.ignoreErrors(CoreConfig.get(key, null));

            if (defaultTime) {
                // Convert from minutes to seconds.
                AddonCalendar.setDefaultNotificationTime(defaultTime * 60, siteId);
            }

            // Migrate reminders. New format @since 4.0.
            const oldTable = 'addon_calendar_reminders';

            try {
                await db.tableExists(oldTable);
            } catch (error) {
                // Old table does not exist, ignore.
                return;
            }

            const records = await db.getAllRecords<AddonCalendarReminderDBRecord>(oldTable);
            const events: Record<number, AddonCalendarEventDBRecord> = {};

            await Promise.all(records.map(async (record) => {
                // Get the event to compare the reminder time with the event time.
                if (!events[record.eventid]) {
                    try {
                        events[record.eventid] = await db.getRecord(EVENTS_TABLE, { id: record.eventid });
                    } catch {
                        // Event not found in local DB, shouldn't happen. Ignore the reminder.
                        return;
                    }
                }

                if (!record.time || record.time === -1) {
                    // Default reminder. Use null now.
                    record.time = null;
                } else if (record.time > events[record.eventid].timestart) {
                    // Reminder is after the event, ignore it.
                    return;
                } else {
                    // Remove seconds from the old reminder, it could include seconds by mistake.
                    record.time = events[record.eventid].timestart - Math.floor(record.time / 60) * 60;
                }

                return db.insertRecord(REMINDERS_TABLE, record);
            }));

            try {
                await db.dropTable(oldTable);
            } catch (error) {
                // Error deleting old table, ignore.
            }
        }
    },
};

export type AddonCalendarEventDBRecord = {
    id: number;
    name: string;
    description: string;
    eventtype: AddonCalendarEventType;
    timestart: number;
    timeduration: number;
    categoryid?: number;
    groupid?: number;
    userid?: number;
    instance?: number;
    modulename?: string;
    timemodified: number;
    repeatid?: number;
    visible: number;
    // Following properties are only available on AddonCalendarGetEventsEvent
    courseid?: number;
    uuid?: string;
    sequence?: number;
    subscriptionid?: number;
    // Following properties are only available on AddonCalendarCalendarEvent
    location?: string;
    eventcount?: number;
    timesort?: number;
    category?: string;
    course?: string;
    subscription?: string;
    canedit?: number;
    candelete?: number;
    deleteurl?: string;
    editurl?: string;
    viewurl?: string;
    isactionevent?: number;
    url?: string;
    islastday?: number;
    popupname?: string;
    mindaytimestamp?: number;
    maxdaytimestamp?: number;
    draggable?: number;
};

export type AddonCalendarReminderDBRecord = {
    id: number;
    eventid: number;
    time: number | null; // Number of seconds before the event, null for default time.
    timecreated?: number | null;
};
