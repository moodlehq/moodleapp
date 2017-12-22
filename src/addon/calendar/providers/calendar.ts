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
import { CoreLoggerProvider } from '../../../providers/logger';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreSite } from '../../../classes/site';
import { CoreCoursesProvider } from '../../../core/courses/providers/courses';
import { CoreTimeUtilsProvider } from '../../../providers/utils/time';
import { CoreGroupsProvider } from '../../../providers/groups';
import { CoreConstants } from '../../../core/constants';
import { CoreLocalNotificationsProvider } from '../../../providers/local-notifications';
import { CoreConfigProvider } from '../../../providers/config';

/**
 * Service to handle calendar events.
 */
@Injectable()
export class AddonCalendarProvider {
    public static DAYS_INTERVAL = 30;
    public static DEFAULT_NOTIFICATION_TIME_CHANGED = 'AddonCalendarDefaultNotificationTimeChangedEvent';
    protected static DEFAULT_NOTIFICATION_TIME_SETTING = 'AddonCalendarDefaultNotifTime';
    protected static DEFAULT_NOTIFICATION_TIME = 60;
    protected static COMPONENT = 'AddonCalendarEvents';

    // Variables for database.
    protected static EVENTS_TABLE = 'calendar_events'; // Queue of files to download.
    protected static tablesSchema = [
        {
            name: AddonCalendarProvider.EVENTS_TABLE,
            columns: [
                {
                    name: 'id',
                    type: 'INTEGER',
                    primaryKey: true
                },
                {
                    name: 'notificationtime',
                    type: 'INTEGER'
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
                }
            ]
        }
    ];

    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private groupsProvider: CoreGroupsProvider,
            private coursesProvider: CoreCoursesProvider, private timeUtils: CoreTimeUtilsProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider, private configProvider: CoreConfigProvider) {
        this.logger = logger.getInstance('AddonCalendarProvider');
        this.sitesProvider.createTablesFromSchema(AddonCalendarProvider.tablesSchema);
    }

    /**
     * Get the configured default notification time.
     *
     * @param  {string} [siteId] ID of the site. If not defined, use current site.
     * @return {Promise<number>}  Promise resolved with the default time.
     */
    getDefaultNotificationTime(siteId?: string) : Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;
        return this.configProvider.get(key, AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME);
    }

    /**
     * Get a calendar event from local Db.
     *
     * @param  {number} id       Event ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any>}    Promise resolved when the event data is retrieved.
     */
    getEventFromLocalDb(id: number, siteId?: string) : Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonCalendarProvider.EVENTS_TABLE, {id: id});
        });
    }

    /**
     * Get event notification time. Always returns number of minutes (0 if disabled).
     *
     * @param  {number} id       Event ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<number>}  Event notification time in minutes. 0 if disabled.
     */
    getEventNotificationTime(id: number, siteId?: string) : Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.getEventNotificationTimeOption(id, siteId).then((time: number) => {
            if (time == -1) {
                return this.getDefaultNotificationTime(siteId);
            }
            return time;
        });
    }

    /**
     * Get event notification time for options. Returns -1 for default time.
     *
     * @param  {number} id       Event ID.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<number>}  Promise with wvent notification time in minutes. 0 if disabled, -1 if default time.
     */
    getEventNotificationTimeOption(id: number, siteId?: string) : Promise<number> {
        return this.getEventFromLocalDb(id, siteId).then((e) => {
            return e.notificationtime || -1;
        }).catch(() => {
            return -1;
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
    getEventsList(daysToStart = 0, daysInterval=AddonCalendarProvider.DAYS_INTERVAL, siteId?: string) : Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            return this.coursesProvider.getUserCourses(false, siteId).then((courses) => {
                courses.push({id: site.getSiteHomeId()}); // Add front page.

                return this.groupsProvider.getUserGroups(courses, siteId).then((groups) => {
                    let now = this.timeUtils.timestamp(),
                        start = now + (CoreConstants.secondsDay * daysToStart),
                        end = start + (CoreConstants.secondsDay * daysInterval);

                    // The core_calendar_get_calendar_events needs all the current user courses and groups.
                    let data = {
                        "options[userevents]": 1,
                        "options[siteevents]": 1,
                        "options[timestart]": start,
                        "options[timeend]": end
                    };

                    courses.forEach((course, index) => {
                        data["events[courseids][" + index + "]"] = course.id;
                    });

                    groups.forEach((group, index) => {
                        data["events[groupids][" + index + "]"] = group.id;
                    });

                    // We need to retrieve cached data using cache key because we have timestamp in the params.
                    let preSets = {
                        cacheKey: this.getEventsListCacheKey(daysToStart, daysInterval),
                        getCacheUsingCacheKey: true
                    };

                    return site.read('core_calendar_get_calendar_events', data, preSets).then((response) => {
                        this.storeEventsInLocalDB(response.events, siteId);
                        return response.events;
                    });
                });
            });
        });
    }

    /**
     * Get cache key for events list WS calls.
     *
     * @param {number} daysToStart  Number of days from now to start getting events.
     * @param {number} daysInterval Number of days between timestart and timeend.
     * @return {string} Cache key.
     */
    protected getEventsListCacheKey(daysToStart: number, daysInterval: number) : string {
        return this.getRootCacheKey() + 'eventslist:' + daysToStart + ':' + daysInterval;
    }

    /**
     * Get the root cache key for the WS calls related to this provider.
     *
     * @return {string} Root cache key.
     */
    protected getRootCacheKey() : string {
        return 'mmaCalendar:';
    }

     /**
     * Invalidates events list and all the single events and related info.
     *
     * @param {any[]} courses List of courses or course ids.
     * @param {string} [siteId] Site Id. If not defined, use current site.
     * @return {Promise<any>} Promise resolved when the list is invalidated.
     */
    invalidateEventsList(courses: any[], siteId?: string) {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            let promises = [];

            promises.push(this.coursesProvider.invalidateUserCourses(siteId));
            promises.push(this.groupsProvider.invalidateUserGroups(courses, siteId));
            promises.push(site.invalidateWsCacheForKeyStartingWith(this.getRootCacheKey()));
            return Promise.all(promises);
        });
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param {CoreSite} [site] Site. If not defined, use current site.
     * @return {boolean} Whether it's disabled.
     */
    isCalendarDisabledInSite(site?: CoreSite) : boolean {
        site = site || this.sitesProvider.getCurrentSite();
        return site.isFeatureDisabled('$mmSideMenuDelegate_mmaCalendar');
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
    scheduleEventNotification(event: any, time: number, siteId?: string) : Promise<void> {
        if (this.localNotificationsProvider.isAvailable()) {
            siteId = siteId || this.sitesProvider.getCurrentSiteId();

            if (time === 0) {
                // Cancel if it was scheduled.
                return this.localNotificationsProvider.cancel(event.id, AddonCalendarProvider.COMPONENT, siteId);
            }

            // If time is -1, get event default time.
            let promise = time == -1 ? this.getDefaultNotificationTime(siteId) : Promise.resolve(time);

            return promise.then((time) => {
                let timeend = (event.timestart + event.timeduration) * 1000;
                if (timeend <= new Date().getTime()) {
                    // The event has finished already, don't schedule it.
                    return Promise.resolve();
                }

                let dateTriggered = new Date((event.timestart - (time * 60)) * 1000),
                    startDate = new Date(event.timestart * 1000),
                    notification = {
                        id: event.id,
                        title: event.name,
                        text: startDate.toLocaleString(),
                        at: dateTriggered,
                        data: {
                            eventid: event.id,
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
    scheduleEventsNotifications(events: any[], siteId?: string) : Promise<any[]> {
        var promises = [];

        if (this.localNotificationsProvider.isAvailable()) {
            siteId = siteId || this.sitesProvider.getCurrentSiteId();
            events.forEach((e) => {
                promises.push(this.getEventNotificationTime(e.id, siteId).then((time) => {
                    return this.scheduleEventNotification(e, time, siteId);
                }));
            });
        }

        return Promise.all(promises);
    }

    /**
     * Store events in local DB.
     *
     * @param {any[]} events  Events to store.
     * @param  {string} [siteId] ID of the site the event belongs to. If not defined, use current site.
     * @return {Promise<any[]>}         Promise resolved when the events are stored.
     */
    protected storeEventsInLocalDB(events: any[], siteId?: string) : Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            let promises = [],
                db = site.getDb();

            events.forEach((event) => {
                // Don't override event notification time if the user configured it.
                promises.push(this.getEventFromLocalDb(event.id, siteId).catch(() => {
                    // Event not stored, return empty object.
                    return {};
                }).then((e) => {
                    let eventRecord = {
                        id: event.id,
                        name: event.name,
                        description: event.description,
                        eventtype: event.eventtype,
                        courseid: event.courseid,
                        timestart: event.timestart,
                        timeduration: event.timeduration,
                        categoryid: event.categoryid,
                        groupid: event.groupid,
                        instance: event.instance,
                        modulename: event.modulename,
                        timemodified: event.timemodified,
                        repeatid: event.repeatid,
                        notificationtime: e.notificationtime || -1
                    };

                    return db.insertOrUpdateRecord(AddonCalendarProvider.EVENTS_TABLE, eventRecord, {id: eventRecord.id});
                }));
            });

            return Promise.all(promises);
        });
    }
}
