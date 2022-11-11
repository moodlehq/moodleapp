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

import { AddonCalendarProvider } from '@addons/calendar/services/calendar';
import { AddonCalendarEventDBRecord, EVENTS_TABLE } from '@addons/calendar/services/database/calendar';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreSiteSchema } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreReminderData, CoreRemindersService } from '../reminders';

/**
 * Database variables for CoreRemindersService service.
 */
export const REMINDERS_TABLE = 'core_reminders';
export const REMINDERS_SITE_SCHEMA: CoreSiteSchema = {
    name: 'CoreRemindersService',
    version: 1,
    canBeCleared: [],
    tables: [
        {
            name: REMINDERS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true,
                },
                {
                    name: 'component',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'instanceId',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'type',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'time',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'timebefore',
                    type: 'INTEGER',
                    notNull: true,
                },
                {
                    name: 'title',
                    type: 'TEXT',
                    notNull: true,
                },
                {
                    name: 'url',
                    type: 'TEXT',
                },

            ],
            uniqueKeys: [
                ['component', 'instanceId', 'timebefore'],
            ],
        },
    ],
    install: async (db: SQLiteDB): Promise<void> => {
        await migrateFromCalendarRemindersV1(db);
        await migrateFromCalendarRemindersV2(db);
    },
};

const migrateFromCalendarRemindersV1 = async (db: SQLiteDB): Promise<void> => {
    // Migrate reminders. New format @since 4.0.
    const oldTable = 'addon_calendar_reminders';

    const tableExists = await CoreUtils.promiseWorks(db.tableExists(oldTable));
    if (!tableExists) {
        return;
    }

    const records = await db.getAllRecords<AddonCalendarReminderDBRecord>(oldTable);
    const events: Record<number, AddonCalendarEventDBRecord> = {};
    const uniqueReminder: Record<number, number[]> = {};

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

        const event = events[record.eventid];

        let reminderTime = record.time;

        if (!reminderTime || reminderTime === -1) {
            // Default reminder.
            reminderTime = CoreRemindersService.DEFAULT_REMINDER_TIMEBEFORE;
        } else if (reminderTime > event.timestart) {
            // Reminder is after the event, ignore it.
            return;
        } else {
            // Remove seconds from the old reminder, it could include seconds by mistake.
            reminderTime = event.timestart - Math.floor(reminderTime / 60) * 60;
        }

        if (uniqueReminder[record.eventid] === undefined) {
            uniqueReminder[record.eventid] = [];
        } else {
            if (uniqueReminder[record.eventid].includes(reminderTime)) {
                // Reminder already exists.
                return;
            }
        }

        await createReminder(db, event, reminderTime);
    }));

    try {
        await db.dropTable(oldTable);
    } catch {
        // Error deleting old table, ignore.
    }
};

const migrateFromCalendarRemindersV2 = async (db: SQLiteDB): Promise<void> => {
    const oldTable = 'addon_calendar_reminders_2';

    const tableExists = await CoreUtils.promiseWorks(db.tableExists(oldTable));
    if (!tableExists) {
        return;
    }

    const records = await db.getAllRecords<AddonCalendarReminderDBRecord>(oldTable);
    const events: Record<number, AddonCalendarEventDBRecord> = {};
    const uniqueReminder: Record<number, number[]> = {};

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
        const event = events[record.eventid];

        const reminderTime = record.time || CoreRemindersService.DEFAULT_REMINDER_TIMEBEFORE;

        if (uniqueReminder[record.eventid] === undefined) {
            uniqueReminder[record.eventid] = [];
        } else {
            if (uniqueReminder[record.eventid].includes(reminderTime)) {
                // Reminder already exists.
                return;
            }
        }

        uniqueReminder[record.eventid].push(reminderTime);

        await createReminder(db, event, reminderTime);
    }));

    try {
        await db.dropTable(oldTable);
    } catch {
        // Error deleting old table, ignore.
    }
};

const createReminder = async (
    db: SQLiteDB,
    event: AddonCalendarEventDBRecord,
    reminderTime: number,
): Promise<void> => {
    const reminder: CoreReminderData = {
        component: AddonCalendarProvider.COMPONENT,
        instanceId: event.id,
        type: event.eventtype,
        timebefore: reminderTime,
        url: event.url,
        title: event.name,
        time: event.timestart,
    };

    await db.insertRecord(REMINDERS_TABLE, reminder);
};

export type CoreReminderDBRecord = {
    id: number; // Reminder ID.
    component: string; // Component where the reminder belongs.
    instanceId: number; // Instance Id where the reminder belongs.
    type: string; // Event idenfier type.
    time: number; // Event time.
    timebefore: number; // Seconds before the event to remind.
    title: string; // Notification title.
    url?: string; // URL where to redirect the user.
};

type AddonCalendarReminderDBRecord = {
    id: number;
    eventid: number;
    time: number | null; // Number of seconds before the event, null for default time.
    timecreated?: number | null;
};
