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

import { Injectable } from '@angular/core';
import { SQLiteDBRecordValues } from '@classes/sqlitedb';
import { CoreSites } from '@services/sites';
import { CoreArray } from '@singletons/array';
import { makeSingleton } from '@singletons';
import { AddonCalendarSubmitCreateUpdateFormDataWSParams } from './calendar';
import {
    AddonCalendarOfflineDeletedEventDBRecord,
    AddonCalendarOfflineEventDBRecord,
    DELETED_EVENTS_TABLE,
    EVENTS_TABLE,
} from './database/calendar-offline';

/**
 * Service to handle offline calendar events.
 */
@Injectable({ providedIn: 'root' })
export class AddonCalendarOfflineProvider {

    /**
     * Delete an offline event.
     *
     * @param eventId Event ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async deleteEvent(eventId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const conditions: SQLiteDBRecordValues = {
            id: eventId,
        };

        await site.getDb().deleteRecords(EVENTS_TABLE, conditions);
    }

    /**
     * Get the IDs of all the events created/edited/deleted in offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the IDs.
     */
    async getAllEventsIds(siteId?: string): Promise<number[]> {
        const promises: Promise<number[]>[] = [];

        promises.push(this.getAllDeletedEventsIds(siteId));
        promises.push(this.getAllEditedEventsIds(siteId));

        const result = await Promise.all(promises);

        return CoreArray.mergeWithoutDuplicates(result[0], result[1]);
    }

    /**
     * Get all the events deleted in offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with all the events deleted in offline.
     */
    async getAllDeletedEvents(siteId?: string): Promise<AddonCalendarOfflineDeletedEventDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(DELETED_EVENTS_TABLE);
    }

    /**
     * Get the IDs of all the events deleted in offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the IDs of all the events deleted in offline.
     */
    async getAllDeletedEventsIds(siteId?: string): Promise<number[]> {
        const events = await this.getAllDeletedEvents(siteId);

        return events.map((event) => event.id);
    }

    /**
     * Get all the events created/edited in offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with events.
     */
    async getAllEditedEvents(siteId?: string): Promise<AddonCalendarOfflineEventDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return site.getDb().getRecords(EVENTS_TABLE);
    }

    /**
     * Get the IDs of all the events created/edited in offline.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with events IDs.
     */
    async getAllEditedEventsIds(siteId?: string): Promise<number[]> {
        const events = await this.getAllEditedEvents(siteId);

        return events.map((event) => event.id);
    }

    /**
     * Get an event deleted in offline.
     *
     * @param eventId Event ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the deleted event.
     */
    async getDeletedEvent(eventId: number, siteId?: string): Promise<AddonCalendarOfflineDeletedEventDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const conditions: SQLiteDBRecordValues = {
            id: eventId,
        };

        return site.getDb().getRecord(DELETED_EVENTS_TABLE, conditions);
    }

    /**
     * Get an offline event.
     *
     * @param eventId Event ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the event.
     */
    async getEvent(eventId: number, siteId?: string): Promise<AddonCalendarOfflineEventDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const conditions: SQLiteDBRecordValues = {
            id: eventId,
        };

        return site.getDb().getRecord(EVENTS_TABLE, conditions);
    }

    /**
     * Check if there are offline events to send.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline events, false otherwise.
     */
    async hasEditedEvents(siteId?: string): Promise<boolean> {
        try {
            const events = await this.getAllEditedEvents(siteId);

            return !!events.length;
        } catch {
            // No offline data found, return false.
            return false;
        }
    }

    /**
     * Check whether there's offline data for a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: true if has offline data, false otherwise.
     */
    async hasOfflineData(siteId?: string): Promise<boolean> {
        const ids = await this.getAllEventsIds(siteId);

        return ids.length > 0;
    }

    /**
     * Check if an event is deleted.
     *
     * @param eventId Event ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether the event is deleted.
     */
    async isEventDeleted(eventId: number, siteId?: string): Promise<boolean> {
        try {
            const event = await this.getDeletedEvent(eventId, siteId);

            return !!event;
        } catch {
            return false;
        }
    }

    /**
     * Mark an event as deleted.
     *
     * @param eventId Event ID to delete.
     * @param name Name of the event to delete.
     * @param deleteAll If it's a repeated event. whether to delete all events of the series.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async markDeleted(eventId: number, name: string, deleteAll?: boolean, siteId?: string): Promise<number> {
        const site = await CoreSites.getSite(siteId);
        const event: AddonCalendarOfflineDeletedEventDBRecord = {
            id: eventId,
            name: name || '',
            repeat: deleteAll ? 1 : 0,
            timemodified: Date.now(),
        };

        return site.getDb().insertRecord(DELETED_EVENTS_TABLE, event);
    }

    /**
     * Offline version for adding a new discussion to a forum.
     *
     * @param eventId Event ID. Negative value to edit offline event. If it's a new event, set it to undefined/null.
     * @param data Event data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the stored event.
     */
    async saveEvent(
        eventId: number | undefined,
        data: AddonCalendarSubmitCreateUpdateFormDataWSParams,
        siteId?: string,
    ): Promise<AddonCalendarOfflineEventDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const timeCreated = Date.now();
        const event: AddonCalendarOfflineEventDBRecord = {
            id: eventId || -timeCreated,
            name: data.name,
            timestart: data.timestart,
            eventtype: data.eventtype,
            categoryid: data.categoryid,
            courseid: data.courseid,
            groupcourseid: data.groupcourseid,
            groupid: data.groupid,
            description: data.description && data.description.text,
            location: data.location,
            duration: data.duration,
            timedurationuntil: data.timedurationuntil,
            timedurationminutes: data.timedurationminutes,
            repeat: data.repeat ? 1 : 0,
            repeats: data.repeats,
            repeatid: data.repeatid,
            repeateditall: data.repeateditall ? 1 : 0,
            timecreated: timeCreated,
            userid: site.getUserId(),
        };
        await site.getDb().insertRecord(EVENTS_TABLE, event);

        return event;
    }

    /**
     * Unmark an event as deleted.
     *
     * @param eventId Event ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if deleted, rejected if failure.
     */
    async unmarkDeleted(eventId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const conditions: SQLiteDBRecordValues = {
            id: eventId,
        };

        await site.getDb().deleteRecords(DELETED_EVENTS_TABLE, conditions);
    }

}
export const AddonCalendarOffline = makeSingleton(AddonCalendarOfflineProvider);
