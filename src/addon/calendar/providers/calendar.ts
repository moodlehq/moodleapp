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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreConstants } from '@core/constants';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreConfigProvider } from '@providers/config';
import { ILocalNotification } from '@ionic-native/local-notifications';
import { SQLiteDB } from '@classes/sqlitedb';

/**
 * Service to handle calendar events.
 */
@Injectable()
export class AddonCalendarProvider {
    static DAYS_INTERVAL = 30;
    static COMPONENT = 'AddonCalendarEvents';
    static DEFAULT_NOTIFICATION_TIME_CHANGED = 'AddonCalendarDefaultNotificationTimeChangedEvent';
    static DEFAULT_NOTIFICATION_TIME_SETTING = 'mmaCalendarDefaultNotifTime';
    static DEFAULT_NOTIFICATION_TIME = 60;
    protected ROOT_CACHE_KEY = 'mmaCalendar:';

    // Variables for database.
    static EVENTS_TABLE = 'addon_calendar_events_2';
    static REMINDERS_TABLE = 'addon_calendar_reminders';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonCalendarProvider',
        version: 2,
        tables: [
            {
                name: AddonCalendarProvider.EVENTS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'name',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'description',
                        type: 'TEXT'
                    },
                    {
                        name: 'format',
                        type: 'INTEGER'
                    },
                    {
                        name: 'eventtype',
                        type: 'TEXT'
                    },
                    {
                        name: 'courseid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timestart',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timeduration',
                        type: 'INTEGER'
                    },
                    {
                        name: 'categoryid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'groupid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'userid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'instance',
                        type: 'INTEGER'
                    },
                    {
                        name: 'modulename',
                        type: 'TEXT'
                    },
                    {
                        name: 'timemodified',
                        type: 'INTEGER'
                    },
                    {
                        name: 'repeatid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'visible',
                        type: 'INTEGER'
                    },
                    {
                        name: 'uuid',
                        type: 'TEXT'
                    },
                    {
                        name: 'sequence',
                        type: 'INTEGER'
                    },
                    {
                        name: 'subscriptionid',
                        type: 'INTEGER'
                    }
                ]
            },
            {
                name: AddonCalendarProvider.REMINDERS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'eventid',
                        type: 'INTEGER'
                    },
                    {
                        name: 'time',
                        type: 'INTEGER'
                    }
                ],
                uniqueKeys: [
                    ['eventid', 'time']
                ]
            }
        ],
        migrate(db: SQLiteDB, oldVersion: number, siteId: string): Promise<any> | void {
            if (oldVersion < 2) {
                const newTable = AddonCalendarProvider.EVENTS_TABLE;
                const oldTable = 'addon_calendar_events';

                return db.tableExists(oldTable).then(() => {
                    return db.getAllRecords(oldTable).then((events) => {
                        const now = Math.round(Date.now() / 1000);

                        return Promise.all(events.map((event) => {
                            if (event.notificationtime == 0) {
                                // No reminders.
                                return Promise.resolve();
                            }

                            let time;

                            if (event.notificationtime == -1) {
                                time = -1;
                            } else {
                                time = event.timestart - event.notificationtime * 60;

                                if (time < now) {
                                    // Old reminder, just not add this.
                                    return Promise.resolve();
                                }
                            }

                            const reminder = {
                                eventid: event.id,
                                time: time
                            };

                            // Cancel old notification.
                            this.localNotificationsProvider.cancel(event.id, AddonCalendarProvider.COMPONENT, siteId);

                            return db.insertRecord(AddonCalendarProvider.REMINDERS_TABLE, reminder);
                        })).then(() => {
                            // Move the records from the old table.
                            return db.insertRecordsFrom(newTable, oldTable, undefined, 'id, name, description, format, eventtype,\
                                courseid, timestart, timeduration, categoryid, groupid, userid, instance, modulename, timemodified,\
                                repeatid, visible, uuid, sequence, subscriptionid');
                        }).then(() => {
                            return db.dropTable(oldTable);
                        });
                    });
                }).catch(() => {
                    // Old table does not exist, ignore.
                });
            }
        }
    };

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private groupsProvider: CoreGroupsProvider,
            private coursesProvider: CoreCoursesProvider, private timeUtils: CoreTimeUtilsProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private configProvider: CoreConfigProvider) {
        this.logger = logger.getInstance('AddonCalendarProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Removes expired events from local DB.
     *
     * @param {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when done.
     */
    cleanExpiredEvents(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecordsSelect(AddonCalendarProvider.EVENTS_TABLE, 'timestart + timeduration < ?',
                    [this.timeUtils.timestamp()]).then((events) => {
                return Promise.all(events.map((event) => {
                    return this.deleteEvent(event.id, siteId);
                }));
            });
        });
    }

    /**
     * Delete event cancelling all the reminders and notifications.
     *
     * @param  {number}       eventId Event ID.
     * @param  {string}       [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>}         Resolved when done.
     */
    protected deleteEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            const promises = [];

            promises.push(site.getDb().deleteRecords(AddonCalendarProvider.EVENTS_TABLE, {id: eventId}));

            promises.push(site.getDb().getRecords(AddonCalendarProvider.REMINDERS_TABLE, {eventid: eventId}).then((reminders) => {
                return Promise.all(reminders.map((reminder) => {
                    return this.deleteEventReminder(reminder.id, siteId);
                }));
            }));

            return Promise.all(promises).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Get all calendar events from local Db.
     *
     * @param {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any[]>} Promise resolved with all the events.
     */
    getAllEventsFromLocalDb(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonCalendarProvider.EVENTS_TABLE);
        });
    }

    /**
     * Get the configured default notification time.
     *
     * @param  {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<number>}  Promise resolved with the default time.
     */
    getDefaultNotificationTime(siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;

        return this.configProvider.get(key, AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME);
    }

    /**
     * Get a calendar event. If the server request fails and data is not cached, try to get it from local DB.
     *
     * @param {number}  id        Event ID.
     * @param {boolean} [refresh] True when we should update the event data.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the event data is retrieved.
     */
    getEvent(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                    cacheKey: this.getEventCacheKey(id),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                },
                data = {
                    options: {
                        userevents: 0,
                        siteevents: 0,
                    },
                    events: {
                        eventids: [
                            id
                        ]
                    }
                };

            return site.read('core_calendar_get_calendar_events', data, preSets).then((response) => {
                // The WebService returns all category events. Check the response to search for the event we want.
                const event = response.events.find((e) => { return e.id == id; });

                return event || this.getEventFromLocalDb(id);
            }).catch(() => {
                return this.getEventFromLocalDb(id);
            });
        });
    }

    /**
     * Get a calendar event by ID. This function returns more data than getEvent, but it isn't available in all Moodles.
     *
     * @param {number} id Event ID.
     * @param {boolean} [refresh] True when we should update the event data.
     * @param {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the event data is retrieved.
     * @since 3.4
     */
    getEventById(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                    cacheKey: this.getEventCacheKey(id),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                },
                data = {
                    eventid: id
                };

            return site.read('core_calendar_get_calendar_event_by_id', data, preSets).then((response) => {
                return response.event;
            });
        });
    }

    /**
     * Get cache key for a single event WS call.
     *
     * @param {number} id Event ID.
     * @return {string} Cache key.
     */
    protected getEventCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'events:' + id;
    }

    /**
     * Get a calendar event from local Db.
     *
     * @param  {number} id       Event ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>}    Promise resolved when the event data is retrieved.
     */
    getEventFromLocalDb(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonCalendarProvider.EVENTS_TABLE, { id: id });
        });
    }

    /**
     * Adds an event reminder and schedule a new notification.
     *
     * @param  {any} event       Event to update its notification time.
     * @param  {number} time     New notification setting timestamp.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the notification is updated.
     */
    addEventReminder(event: any, time: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const reminder = {
                eventid: event.id,
                time: time
            };

            return site.getDb().insertRecord(AddonCalendarProvider.REMINDERS_TABLE, reminder).then((reminderId) => {
                return this.scheduleEventNotification(event, reminderId, time, site.getId());
            });
        });
    }

    /**
     * Remove an event reminder and cancel the notification.
     *
     * @param  {number} id       Reminder ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the notification is updated.
     */
    deleteEventReminder(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (this.localNotificationsProvider.isAvailable()) {
                this.localNotificationsProvider.cancel(id, AddonCalendarProvider.COMPONENT, site.getId());
            }

            return site.getDb().deleteRecords(AddonCalendarProvider.REMINDERS_TABLE, {id: id});
        });
    }

    /**
     * Get a calendar reminders from local Db.
     *
     * @param  {number} id       Event ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>}    Promise resolved when the event data is retrieved.
     */
    getEventReminders(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonCalendarProvider.REMINDERS_TABLE, {eventid: id}, 'time ASC');
        });
    }

    /**
     * Get the events in a certain period. The period is calculated like this:
     *     start time: now + daysToStart
     *     end time: start time + daysInterval
     * E.g. using provider.getEventsList(30, 30) is going to get the events starting after 30 days from now
     * and ending before 60 days from now.
     *
     * @param {number} [daysToStart=0]   Number of days from now to start getting events.
     * @param {number} [daysInterval=30] Number of days between timestart and timeend.
     * @param {string} [siteId]          Site to get the events from. If not defined, use current site.
     * @return {Promise<any[]>}          Promise to be resolved when the participants are retrieved.
     */
    getEventsList(daysToStart: number = 0, daysInterval: number = AddonCalendarProvider.DAYS_INTERVAL, siteId?: string)
            : Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();
            const promises = [];
            let courses, groups;

            promises.push(this.coursesProvider.getUserCourses(false, siteId).then((data) => {
                courses = data;
                courses.push({ id: site.getSiteHomeId() }); // Add front page.
            }));
            promises.push(this.groupsProvider.getAllUserGroups(siteId).then((data) => {
                groups = data;
            }));

            return Promise.all(promises).then(() => {
                const now = this.timeUtils.timestamp(),
                    start = now + (CoreConstants.SECONDS_DAY * daysToStart),
                    end = start + (CoreConstants.SECONDS_DAY * daysInterval),
                    data = {
                        options: {
                            userevents: 1,
                            siteevents: 1,
                            timestart: start,
                            timeend: end
                        },
                        events: {
                            courseids: [],
                            groupids: []
                        }
                    };

                data.events.courseids = courses.map((course) => {
                    return course.id;
                });
                data.events.groupids = groups.map((group) => {
                    return group.id;
                });

                // We need to retrieve cached data using cache key because we have timestamp in the params.
                const preSets = {
                    cacheKey: this.getEventsListCacheKey(daysToStart, daysInterval),
                    getCacheUsingCacheKey: true,
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

                return site.read('core_calendar_get_calendar_events', data, preSets).then((response) => {
                    this.storeEventsInLocalDB(response.events, siteId);

                    return response.events;
                });
            });
        });
    }

    /**
     * Get prefix cache key for events list WS calls.
     *
     * @return {string} Prefix Cache key.
     */
    protected getEventsListPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'events:';
    }

    /**
     * Get cache key for events list WS calls.
     *
     * @param {number} daysToStart  Number of days from now to start getting events.
     * @param {number} daysInterval Number of days between timestart and timeend.
     * @return {string} Cache key.
     */
    protected getEventsListCacheKey(daysToStart: number, daysInterval: number): string {
        return this.getEventsListPrefixCacheKey() + daysToStart + ':' + daysInterval;
    }

    /**
     * Invalidates events list and all the single events and related info.
     *
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any[]>} Promise resolved when the list is invalidated.
     */
    invalidateEventsList(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            const promises = [];

            promises.push(this.coursesProvider.invalidateUserCourses(siteId));
            promises.push(this.groupsProvider.invalidateAllUserGroups(siteId));
            promises.push(site.invalidateWsCacheForKeyStartingWith(this.getEventsListPrefixCacheKey()));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates a single event.
     *
     * @param {number} eventId List of courses or course ids.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the list is invalidated.
     */
    invalidateEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEventCacheKey(eventId));
        });
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isCalendarDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_AddonCalendar');
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param  {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<boolean>}     Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isCalendarDisabledInSite(site);
        });
    }

    /**
     * Check if the get event by ID WS is available.
     *
     * @return {boolean} Whether it's available.
     * @since 3.4
     */
    isGetEventByIdAvailable(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_calendar_get_calendar_event_by_id');
    }

    /**
     * Get the next events for all the sites and schedules their notifications.
     * If an event notification time is 0, cancel its scheduled notification (if any).
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @return {Promise}         Promise resolved when all the notifications have been scheduled.
     */
    scheduleAllSitesEventsNotifications(): Promise<any[]> {
        const notificationsEnabled = this.localNotificationsProvider.isAvailable();

        return this.sitesProvider.getSitesIds().then((siteIds) => {
            const promises = [];

            siteIds.forEach((siteId) => {
                promises.push(this.cleanExpiredEvents(siteId).then(() => {
                    if (notificationsEnabled) {
                        // Check if calendar is disabled for the site.
                        return this.isDisabled(siteId).then((disabled) => {
                            if (!disabled) {
                                // Get first events.
                                return this.getEventsList(undefined, undefined, siteId).then((events) => {
                                    return this.scheduleEventsNotifications(events, siteId);
                                });
                            }
                        });
                    }
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Schedules an event notification. If time is 0, cancel scheduled notification if any.
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @param  {any} event    Event to schedule.
     * @param  {number} time     Notification setting time (in minutes). E.g. 10 means "notificate 10 minutes before start".
     * @param  {string} [siteId] Site ID the event belongs to. If not defined, use current site.
     * @return {Promise<void>}    Promise resolved when the notification is scheduled.
     */
    protected scheduleEventNotification(event: any, reminderId: number, time: number, siteId?: string): Promise<void> {
        if (this.localNotificationsProvider.isAvailable()) {
            siteId = siteId || this.sitesProvider.getCurrentSiteId();

            if (time === 0) {
                // Cancel if it was scheduled.
                return this.localNotificationsProvider.cancel(reminderId, AddonCalendarProvider.COMPONENT, siteId);
            }

            let promise;
            if (time == -1) {
                // If time is -1, get event default time to calculate the notification time.
                promise = this.getDefaultNotificationTime(siteId).then((time) => {
                    if (time == 0) {
                        // Default notification time is disabled, do not show.
                        return this.localNotificationsProvider.cancel(reminderId, AddonCalendarProvider.COMPONENT, siteId);
                    }

                    return event.timestart - (time * 60);
                });
            } else {
                promise = Promise.resolve(time);
            }

            return promise.then((time) => {
                time = time * 1000;

                if (time <= new Date().getTime()) {
                    // This reminder is over, don't schedule. Cancel if it was scheduled.
                    return this.localNotificationsProvider.cancel(reminderId, AddonCalendarProvider.COMPONENT, siteId);
                }

                const notification: ILocalNotification = {
                        id: reminderId,
                        title: event.name,
                        text: this.timeUtils.userDate(event.timestart * 1000, 'core.strftimedaydatetime', true),
                        icon: 'file://assets/img/icons/calendar.png',
                        trigger: {
                            at: new Date(time)
                        },
                        data: {
                            eventid: event.id,
                            reminderid: reminderId,
                            siteid: siteId
                        }
                    };

                return this.localNotificationsProvider.schedule(notification, AddonCalendarProvider.COMPONENT, siteId);
            });

        } else {
            return Promise.resolve();
        }
    }

    /**
     * Schedules the notifications for a list of events.
     * If an event notification time is 0, cancel its scheduled notification (if any).
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @param  {any[]} events Events to schedule.
     * @param  {string} [siteId] ID of the site the events belong to. If not defined, use current site.
     * @return {Promise<any[]>}         Promise resolved when all the notifications have been scheduled.
     */
    scheduleEventsNotifications(events: any[], siteId?: string): Promise<any[]> {

        if (this.localNotificationsProvider.isAvailable()) {
            siteId = siteId || this.sitesProvider.getCurrentSiteId();

            return Promise.all(events.map((event) => {
                const timeEnd = (event.timestart + event.timeduration) * 1000;

                if (timeEnd <= new Date().getTime()) {
                    // The event has finished already, don't schedule it.
                    return this.deleteEvent(event.id, siteId);
                }

                return this.getEventReminders(event.id, siteId).then((reminders) => {
                    return Promise.all(reminders.map((reminder) => {
                        return this.scheduleEventNotification(event, reminder.id, reminder.time, siteId);
                    }));
                });
            }));
        }

        return Promise.resolve([]);
    }

    /**
     * Set the default notification time.
     *
     * @param  {number} time     New default time.
     * @param  {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<any[]>}    Promise resolved when stored.
     */
    setDefaultNotificationTime(time: number, siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;

        return this.configProvider.set(key, time);
    }

    /**
     * Store an event in local DB as it is.
     *
     * @param {any} event Event to store.
     * @param {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when stored.
     */
    storeEventInLocalDb(event: any, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            // If event does not exist on the DB, schedule the reminder.
            return this.getEventFromLocalDb(event.id, site.id).catch(() => {
                // Event does not exist. Check if any reminder exists first.
                return this.getEventReminders(event.id, siteId).then((reminders) => {
                    if (reminders.length == 0) {
                        this.addEventReminder(event, -1, siteId);
                    }
                });
            }).then(() => {
                const eventRecord = {
                    id: event.id,
                    name: event.name,
                    description: event.description,
                    format: event.format,
                    eventtype: event.eventtype,
                    courseid: event.courseid,
                    timestart: event.timestart,
                    timeduration: event.timeduration,
                    categoryid: event.categoryid,
                    groupid: event.groupid,
                    userid: event.userid,
                    instance: event.instance,
                    modulename: event.modulename,
                    timemodified: event.timemodified,
                    repeatid: event.repeatid,
                    visible: event.visible,
                    uuid: event.uuid,
                    sequence: event.sequence,
                    subscriptionid: event.subscriptionid
                };

                return site.getDb().insertRecord(AddonCalendarProvider.EVENTS_TABLE, eventRecord);
            });
        });
    }

    /**
     * Store events in local DB.
     *
     * @param {any[]} events  Events to store.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any[]>}         Promise resolved when the events are stored.
     */
    protected storeEventsInLocalDB(events: any[], siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            return Promise.all(events.map((event) => {
                // If event does not exist on the DB, schedule the reminder.
                return this.storeEventInLocalDb(event, siteId);
            }));
        });
    }
}
