// (C) Copyright 2015 Martin Dougiamas
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
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Service to handle offline calendar events.
 */
@Injectable()
export class AddonCalendarOfflineProvider {

    // Variables for database.
    static EVENTS_TABLE = 'addon_calendar_offline_events';
    static DELETED_EVENTS_TABLE = 'addon_calendar_deleted_events';

    protected siteSchema: CoreSiteSchema = {
        name: 'AddonCalendarOfflineProvider',
        version: 1,
        tables: [
            {
                name: AddonCalendarOfflineProvider.EVENTS_TABLE,
                columns: [
                    {
                        name: 'id', // Negative for offline entries.
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'name',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'timestart',
                        type: 'INTEGER',
                        notNull: true
                    },
                    {
                        name: 'eventtype',
                        type: 'TEXT',
                        notNull: true
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
                        type: 'TEXT',
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
                    }
                ]
            },
            {
                name: AddonCalendarOfflineProvider.DELETED_EVENTS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'name', // Save the name to be able to notify the user.
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'repeat',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER',
                    }
                ]
            }
        ]
    };

    constructor(private sitesProvider: CoreSitesProvider, private utils: CoreUtilsProvider) {
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Delete an offline event.
     *
     * @param {number} eventId Event ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    deleteEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions: any = {
                id: eventId
            };

            return site.getDb().deleteRecords(AddonCalendarOfflineProvider.EVENTS_TABLE, conditions);
        });
    }

    /**
     * Get the IDs of all the events created/edited/deleted in offline.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number[]>} Promise resolved with the IDs.
     */
    getAllEventsIds(siteId?: string): Promise<number[]> {
        const promises = [];

        promises.push(this.getAllDeletedEventsIds(siteId));
        promises.push(this.getAllEditedEventsIds(siteId));

        return Promise.all(promises).then((result) => {
            return this.utils.mergeArraysWithoutDuplicates(result[0], result[1]);
        });
    }

    /**
     * Get all the events deleted in offline.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with all the events deleted in offline.
     */
    getAllDeletedEvents(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonCalendarOfflineProvider.DELETED_EVENTS_TABLE);
        });
    }

    /**
     * Get the IDs of all the events deleted in offline.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number[]>} Promise resolved with the IDs of all the events deleted in offline.
     */
    getAllDeletedEventsIds(siteId?: string): Promise<number[]> {
        return this.getAllDeletedEvents(siteId).then((events) => {
            return events.map((event) => {
                return event.id;
            });
        });
    }

    /**
     * Get all the events created/edited in offline.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with events.
     */
    getAllEditedEvents(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonCalendarOfflineProvider.EVENTS_TABLE);
        });
    }

    /**
     * Get the IDs of all the events created/edited in offline.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number[]>} Promise resolved with events IDs.
     */
    getAllEditedEventsIds(siteId?: string): Promise<number[]> {
        return this.getAllEditedEvents(siteId).then((events) => {
            return events.map((event) => {
                return event.id;
            });
        });
    }

    /**
     * Get an event deleted in offline.
     *
     * @param {number} eventId Event ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the deleted event.
     */
    getDeletedEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions: any = {
                id: eventId
            };

            return site.getDb().getRecord(AddonCalendarOfflineProvider.DELETED_EVENTS_TABLE, conditions);
        });
    }

    /**
     * Get an offline event.
     *
     * @param {number} eventId Event ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the event.
     */
    getEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions: any = {
                id: eventId
            };

            return site.getDb().getRecord(AddonCalendarOfflineProvider.EVENTS_TABLE, conditions);
        });
    }

    /**
     * Check if there are offline events to send.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline events, false otherwise.
     */
    hasEditedEvents(siteId?: string): Promise<boolean> {
        return this.getAllEditedEvents(siteId).then((events) => {
            return !!events.length;
        }).catch(() => {
            // No offline data found, return false.
            return false;
        });
    }

    /**
     * Check whether there's offline data for a site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: true if has offline data, false otherwise.
     */
    hasOfflineData(siteId?: string): Promise<boolean> {
        return this.getAllEventsIds(siteId).then((ids) => {
            return ids.length > 0;
        });
    }

    /**
     * Check if an event is deleted.
     *
     * @param {number} eventId Event ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether the event is deleted.
     */
    isEventDeleted(eventId: number, siteId?: string): Promise<boolean> {
        return this.getDeletedEvent(eventId, siteId).then((event) => {
            return !!event;
        }).catch(() => {
            return false;
        });
    }

    /**
     * Mark an event as deleted.
     *
     * @param {number} eventId Event ID to delete.
     * @param {number} name Name of the event to delete.
     * @param {boolean} [deleteAll] If it's a repeated event. whether to delete all events of the series.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    markDeleted(eventId: number, name: string, deleteAll?: boolean, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const event = {
                id: eventId,
                name: name || '',
                repeat: deleteAll ? 1 : 0,
                timemodified: Date.now()
            };

            return site.getDb().insertRecord(AddonCalendarOfflineProvider.DELETED_EVENTS_TABLE, event);
        });
    }

    /**
     * Offline version for adding a new discussion to a forum.
     *
     * @param {number} eventId Event ID. If it's a new event, set it to undefined/null.
     * @param {any} data Event data.
     * @param {number} [timeCreated] The time the event was created. If not defined, current time.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the stored event.
     */
    saveEvent(eventId: number, data: any, timeCreated?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            timeCreated = timeCreated || Date.now();

            const event = {
                id: eventId || -timeCreated,
                name: data.name,
                timestart: data.timestart,
                eventtype: data.eventtype,
                categoryid: data.categoryid || null,
                courseid: data.courseid || null,
                groupcourseid: data.groupcourseid || null,
                groupid: data.groupid || null,
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
                userid: site.getUserId()
            };

            return site.getDb().insertRecord(AddonCalendarOfflineProvider.EVENTS_TABLE, event).then(() => {
                return event;
            });
        });
    }

    /**
     * Unmark an event as deleted.
     *
     * @param {number} eventId Event ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved if deleted, rejected if failure.
     */
    unmarkDeleted(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const conditions: any = {
                id: eventId
            };

            return site.getDb().deleteRecords(AddonCalendarOfflineProvider.DELETED_EVENTS_TABLE, conditions);
        });
    }
}
