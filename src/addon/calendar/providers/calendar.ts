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
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreAppProvider } from '@providers/app';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreConstants } from '@core/constants';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreConfigProvider } from '@providers/config';
import { ILocalNotification } from '@ionic-native/local-notifications';
import { SQLiteDB } from '@classes/sqlitedb';
import { AddonCalendarOfflineProvider } from './calendar-offline';
import { CoreUserProvider } from '@core/user/providers/user';
import { TranslateService } from '@ngx-translate/core';
import { CoreWSExternalWarning, CoreWSDate } from '@providers/ws';
import * as moment from 'moment';

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
    static STARTING_WEEK_DAY = 'addon_calendar_starting_week_day';
    static NEW_EVENT_EVENT = 'addon_calendar_new_event';
    static NEW_EVENT_DISCARDED_EVENT = 'addon_calendar_new_event_discarded';
    static EDIT_EVENT_EVENT = 'addon_calendar_edit_event';
    static DELETED_EVENT_EVENT = 'addon_calendar_deleted_event';
    static UNDELETED_EVENT_EVENT = 'addon_calendar_undeleted_event';
    static FILTER_CHANGED_EVENT = 'addon_calendar_filter_changed_event';
    static TYPE_CATEGORY = 'category';
    static TYPE_COURSE = 'course';
    static TYPE_GROUP = 'group';
    static TYPE_SITE = 'site';
    static TYPE_USER = 'user';
    static ALL_TYPES = [ AddonCalendarProvider.TYPE_SITE,
        AddonCalendarProvider.TYPE_CATEGORY,
        AddonCalendarProvider.TYPE_COURSE,
        AddonCalendarProvider.TYPE_GROUP,
        AddonCalendarProvider.TYPE_USER ];

    static CALENDAR_TF_24 = '%H:%M'; // Calendar time in 24 hours format.
    static CALENDAR_TF_12 = '%I:%M %p'; // Calendar time in 12 hours format.

    protected ROOT_CACHE_KEY = 'mmaCalendar:';

    protected weekDays = [
        {
            shortname: 'addon.calendar.sun',
            fullname: 'addon.calendar.sunday'
        },
        {
            shortname: 'addon.calendar.mon',
            fullname: 'addon.calendar.monday'
        },
        {
            shortname: 'addon.calendar.tue',
            fullname: 'addon.calendar.tuesday'
        },
        {
            shortname: 'addon.calendar.wed',
            fullname: 'addon.calendar.wednesday'
        },
        {
            shortname: 'addon.calendar.thu',
            fullname: 'addon.calendar.thursday'
        },
        {
            shortname: 'addon.calendar.fri',
            fullname: 'addon.calendar.friday'
        },
        {
            shortname: 'addon.calendar.sat',
            fullname: 'addon.calendar.saturday'
        }
    ];

    // Variables for database.
    static EVENTS_TABLE = 'addon_calendar_events_3';
    static REMINDERS_TABLE = 'addon_calendar_reminders';
    protected siteSchema: CoreSiteSchema = {
        name: 'AddonCalendarProvider',
        version: 3,
        canBeCleared: [ AddonCalendarProvider.EVENTS_TABLE ],
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
                    },
                    {
                        name: 'location',
                        type: 'TEXT'
                    },
                    {
                        name: 'eventcount',
                        type: 'INTEGER'
                    },
                    {
                        name: 'timesort',
                        type: 'INTEGER'
                    },
                    {
                        name: 'category',
                        type: 'TEXT'
                    },
                    {
                        name: 'course',
                        type: 'TEXT'
                    },
                    {
                        name: 'subscription',
                        type: 'TEXT'
                    },
                    {
                        name: 'canedit',
                        type: 'INTEGER'
                    },
                    {
                        name: 'candelete',
                        type: 'INTEGER'
                    },
                    {
                        name: 'deleteurl',
                        type: 'TEXT'
                    },
                    {
                        name: 'editurl',
                        type: 'TEXT'
                    },
                    {
                        name: 'viewurl',
                        type: 'TEXT'
                    },
                    {
                        name: 'formattedtime',
                        type: 'TEXT'
                    },
                    {
                        name: 'isactionevent',
                        type: 'INTEGER'
                    },
                    {
                        name: 'url',
                        type: 'TEXT'
                    },
                    {
                        name: 'islastday',
                        type: 'INTEGER'
                    },
                    {
                        name: 'popupname',
                        type: 'TEXT'
                    },
                    {
                        name: 'mindaytimestamp',
                        type: 'INTEGER'
                    },
                    {
                        name: 'maxdaytimestamp',
                        type: 'INTEGER'
                    },
                    {
                        name: 'draggable',
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
            if (oldVersion < 3) {
                const newTable = AddonCalendarProvider.EVENTS_TABLE;
                let oldTable = 'addon_calendar_events_2';

                return db.tableExists(oldTable).catch(() => {
                    // The v2 table doesn't exist, try with v1.
                    oldTable = 'addon_calendar_events';

                    return db.tableExists(oldTable);
                }).then(() => {
                    // Move the records from the old table.
                    // Move the records from the old table.
                    return db.getAllRecords(oldTable).then((events) => {
                        const promises = [];

                        events.forEach((event) => {
                            promises.push(db.insertRecord(newTable, event));
                        });

                        return Promise.all(promises);
                    });
                }).then(() => {
                    return db.dropTable(oldTable);
                }).catch(() => {
                    // Old table does not exist, ignore.
                });
            }
        },
    };

    protected logger;

    constructor(logger: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider,
            private groupsProvider: CoreGroupsProvider,
            private coursesProvider: CoreCoursesProvider,
            private textUtils: CoreTextUtilsProvider,
            private timeUtils: CoreTimeUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private localNotificationsProvider: CoreLocalNotificationsProvider,
            private configProvider: CoreConfigProvider,
            private utils: CoreUtilsProvider,
            private calendarOffline: AddonCalendarOfflineProvider,
            private appProvider: CoreAppProvider,
            private translate: TranslateService,
            private userProvider: CoreUserProvider) {

        this.logger = logger.getInstance('AddonCalendarProvider');
        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Check if a certain site allows deleting events.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if can delete.
     * @since 3.3
     */
    canDeleteEvents(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canDeleteEventsInSite(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if a certain site allows deleting events.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether events can be deleted.
     * @since 3.3
     */
    canDeleteEventsInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_calendar_delete_calendar_events');
    }

    /**
     * Check if a certain site allows creating and editing events.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if can create/edit.
     * @since 3.7.1
     */
    canEditEvents(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canEditEventsInSite(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if a certain site allows creating and editing events.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether events can be created and edited.
     * @since 3.7.1
     */
    canEditEventsInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        // The WS to create/edit events requires a fix that was integrated in 3.7.1.
        return site.isVersionGreaterEqualThan('3.7.1');
    }

    /**
     * Check if a certain site allows viewing events in monthly view.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if monthly view is supported.
     * @since 3.4
     */
    canViewMonth(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canViewMonthInSite(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if a certain site allows viewing events in monthly view.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether monthly view is supported.
     * @since 3.4
     */
    canViewMonthInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_calendar_get_calendar_monthly_view');
    }

    /**
     * Removes expired events from local DB.
     *
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when done.
     */
    cleanExpiredEvents(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (this.canViewMonthInSite(site)) {
                // Site supports monthly view, don't clean expired events because user can see past events.
                return;
            }

            return site.getDb().getRecordsSelect(AddonCalendarProvider.EVENTS_TABLE, 'timestart + timeduration < ?',
                    [this.timeUtils.timestamp()]).then((events) => {
                return Promise.all(events.map((event) => {
                    return this.deleteLocalEvent(event.id, siteId);
                }));
            });
        });
    }

    /**
     * Delete an event.
     *
     * @param eventId Event ID to delete.
     * @param name Name of the event to delete.
     * @param deleteAll If it's a repeated event. whether to delete all events of the series.
     * @param forceOffline True to always save it in offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteEvent(eventId: number, name: string, deleteAll?: boolean, forceOffline?: boolean, siteId?: string): Promise<boolean> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Function to store the submission to be synchronized later.
        const storeOffline = (): Promise<boolean> => {
            return this.calendarOffline.markDeleted(eventId, name, deleteAll, siteId).then(() => {
                return false;
            });
        };

        if (forceOffline || !this.appProvider.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // If the event is already stored, discard it first.
        return this.calendarOffline.unmarkDeleted(eventId, siteId).then(() => {
            return this.deleteEventOnline(eventId, deleteAll, siteId).then(() => {
                return true;
            }).catch((error) => {
                if (error && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Delete an event. It will fail if offline or cannot connect.
     *
     * @param eventId Event ID to delete.
     * @param deleteAll If it's a repeated event. whether to delete all events of the series.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteEventOnline(eventId: number, deleteAll?: boolean, siteId?: string): Promise<null> {
        return this.sitesProvider.getSite(siteId).then((site) => {

            const params = {
                    events: [
                        {
                            eventid: eventId,
                            repeat: deleteAll ? 1 : 0
                        }
                    ]
                },
                preSets = {
                    responseExpected: false
                };

            return site.write('core_calendar_delete_calendar_events', params, preSets);
        });
    }

    /**
     * Delete a locally stored event cancelling all the reminders and notifications.
     *
     * @param eventId Event ID.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Resolved when done.
     */
    protected deleteLocalEvent(eventId: number, siteId?: string): Promise<any> {
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
     * Format event time. Similar to calendar_format_event_time.
     *
     * @param event Event to format.
     * @param format Calendar time format (from getCalendarTimeFormat).
     * @param useCommonWords Whether to use common words like "Today", "Yesterday", etc.
     * @param seenDay Timestamp of day currently seen. If set, the function will not add links to this day.
     * @param showTime Determine the show time GMT timestamp.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the formatted event time.
     */
    formatEventTime(event: AddonCalendarAnyEvent, format: string, useCommonWords: boolean = true, seenDay?: number,
            showTime: number = 0, siteId?: string): Promise<string> {

        const start = event.timestart * 1000,
            end = (event.timestart + event.timeduration) * 1000;
        let time;

        if (event.timeduration) {

            if (moment(start).isSame(end, 'day')) {
                // Event starts and ends the same day.
                if (event.timeduration == CoreConstants.SECONDS_DAY) {
                    time = this.translate.instant('addon.calendar.allday');
                } else {
                    time = this.timeUtils.userDate(start, format) + ' <strong>&raquo;</strong> ' +
                            this.timeUtils.userDate(end, format);
                }

            } else {
                // Event lasts more than one day.
                const timeStart = this.timeUtils.userDate(start, format),
                    timeEnd = this.timeUtils.userDate(end, format),
                    promises = [];

                // Don't use common words when the event lasts more than one day.
                let dayStart = this.getDayRepresentation(start, false) + ', ',
                    dayEnd = this.getDayRepresentation(end, false) + ', ';

                // Add links to the days if needed.
                if (dayStart && (!seenDay || !moment(seenDay).isSame(start, 'day'))) {
                    promises.push(this.getViewUrl('day', event.timestart, undefined, siteId).then((url) => {
                        dayStart = this.urlUtils.buildLink(url, dayStart);
                    }));
                }
                if (dayEnd && (!seenDay || !moment(seenDay).isSame(end, 'day'))) {
                    promises.push(this.getViewUrl('day', end / 1000, undefined, siteId).then((url) => {
                        dayEnd = this.urlUtils.buildLink(url, dayEnd);
                    }));
                }

                return Promise.all(promises).then(() => {
                    return dayStart + timeStart + ' <strong>&raquo;</strong> ' + dayEnd + timeEnd;
                });
            }
        } else {
            // There is no time duration.
            time = this.timeUtils.userDate(start, format);
        }

        if (!showTime) {
            // Display day + time.
            if (seenDay && moment(seenDay).isSame(start, 'day')) {
                // This day is currently being displayed, don't add an link.
                return Promise.resolve(this.getDayRepresentation(start, useCommonWords) + ', ' + time);
            } else {
                // Add link to view the day.
                return this.getViewUrl('day', event.timestart, undefined, siteId).then((url) => {
                    return this.urlUtils.buildLink(url, this.getDayRepresentation(start, useCommonWords)) + ', ' + time;
                });
            }
        } else {
            return Promise.resolve(time);
        }
    }

    /**
     * Get access information for a calendar (either course calendar or site calendar).
     *
     * @param courseId Course ID. If not defined, site calendar.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with object with access information.
     * @since 3.7
     */
    getAccessInformation(courseId?: number, siteId?: string): Promise<AddonCalendarGetAccessInfoResult> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {},
                preSets = {
                    cacheKey: this.getAccessInformationCacheKey(courseId)
                };

            if (courseId) {
                params.courseid = courseId;
            }

            return site.read('core_calendar_get_calendar_access_information', params, preSets);
        });
    }

    /**
     * Get cache key for calendar access information WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getAccessInformationCacheKey(courseId?: number): string {
        return this.ROOT_CACHE_KEY + 'accessInformation:' + (courseId || 0);
    }

    /**
     * Get all calendar events from local Db.
     *
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved with all the events.
     */
    getAllEventsFromLocalDb(siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getAllRecords(AddonCalendarProvider.EVENTS_TABLE);
        });
    }

    /**
     * Get the type of events a user can create (either course calendar or site calendar).
     *
     * @param courseId Course ID. If not defined, site calendar.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with an object indicating the types.
     * @since 3.7
     */
    getAllowedEventTypes(courseId?: number, siteId?: string): Promise<{[name: string]: boolean}> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params: any = {},
                preSets = {
                    cacheKey: this.getAllowedEventTypesCacheKey(courseId)
                };

            if (courseId) {
                params.courseid = courseId;
            }

            return site.read('core_calendar_get_allowed_event_types', params, preSets)
                    .then((response: AddonCalendarGetAllowedEventTypesResult) => {
                // Convert the array to an object.
                const result = {};

                if (response.allowedeventtypes) {
                    response.allowedeventtypes.map((type) => {
                        result[type] = true;
                    });
                }

                return result;
            });
        });
    }

    /**
     * Get cache key for calendar allowed event types WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getAllowedEventTypesCacheKey(courseId?: number): string {
        return this.ROOT_CACHE_KEY + 'allowedEventTypes:' + (courseId || 0);
    }

    /**
     * Get the "look ahead" for a certain user.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved with the look ahead (number of days).
     */
    getCalendarLookAhead(siteId?: string): Promise<number> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.userProvider.getUserPreference('calendar_lookahead').catch((error) => {
                // Ignore errors.
            }).then((value): any => {
                if (value != null) {
                    return value;
                }

                return site.getStoredConfig('calendar_lookahead');
            });
        });
    }

    /**
     * Get the time format to use in calendar.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved with the format.
     */
    getCalendarTimeFormat(siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.userProvider.getUserPreference('calendar_timeformat').catch((error) => {
                // Ignore errors.
            }).then((format) => {

                if (!format || format === '0') {
                    format = site.getStoredConfig('calendar_site_timeformat');
                }

                if (format === AddonCalendarProvider.CALENDAR_TF_12) {
                    format = this.translate.instant('core.strftimetime12');
                } else if (format === AddonCalendarProvider.CALENDAR_TF_24) {
                    format = this.translate.instant('core.strftimetime24');
                }

                return format && format !== '0' ? format : this.translate.instant('core.strftimetime');
            });
        });
    }

    /**
     * Return the representation day. Equivalent to Moodle's calendar_day_representation.
     *
     * @param time Timestamp to get the day from.
     * @param useCommonWords Whether to use common words like "Today", "Yesterday", etc.
     * @return The formatted date/time.
     */
    getDayRepresentation(time: number, useCommonWords: boolean = true): string {

        if (!useCommonWords) {
            // We don't want words, just a date.
            return this.timeUtils.userDate(time, 'core.strftimedayshort');
        }

        const date = moment(time),
            today = moment();

        if (date.isSame(today, 'day')) {
            return this.translate.instant('addon.calendar.today');

        } else if (date.isSame(today.clone().subtract(1, 'days'), 'day')) {
            return this.translate.instant('addon.calendar.yesterday');

        } else if (date.isSame(today.clone().add(1, 'days'), 'day')) {
            return this.translate.instant('addon.calendar.tomorrow');

        } else {
            return this.timeUtils.userDate(time, 'core.strftimedayshort');
        }
    }

    /**
     * Get the configured default notification time.
     *
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved with the default time.
     */
    getDefaultNotificationTime(siteId?: string): Promise<number> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;

        return this.configProvider.get(key, AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME);
    }

    /**
     * Get a calendar event. If the server request fails and data is not cached, try to get it from local DB.
     *
     * @param id Event ID.
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved when the event data is retrieved.
     */
    getEvent(id: number, siteId?: string): Promise<AddonCalendarGetEventsEvent> {
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

            return site.read('core_calendar_get_calendar_events', data, preSets)
                    .then((response: AddonCalendarGetEventsResult) => {
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
     * @param id Event ID.
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved when the event data is retrieved.
     * @since 3.4
     */
    getEventById(id: number, siteId?: string): Promise<AddonCalendarEvent> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const preSets = {
                    cacheKey: this.getEventCacheKey(id),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                },
                data = {
                    eventid: id
                };

            return site.read('core_calendar_get_calendar_event_by_id', data, preSets)
                    .then((response: AddonCalendarGetEventByIdResult) => {
                return response.event;
            }).catch((error) => {
                return this.getEventFromLocalDb(id).catch(() => {
                    return Promise.reject(error);
                });
            });
        });
    }

    /**
     * Get cache key for a single event WS call.
     *
     * @param id Event ID.
     * @return Cache key.
     */
    protected getEventCacheKey(id: number): string {
        return this.ROOT_CACHE_KEY + 'events:' + id;
    }

    /**
     * Get a calendar event from local Db.
     *
     * @param id Event ID.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when the event data is retrieved.
     */
    getEventFromLocalDb(id: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(AddonCalendarProvider.EVENTS_TABLE, { id: id }).then((event) => {
                if (this.isGetEventByIdAvailableInSite(site)) {
                    // Calculate data to match the new WS.
                    event.descriptionformat = event.format;
                    event.iscourseevent = event.eventtype == AddonCalendarProvider.TYPE_COURSE;
                    event.iscategoryevent = event.eventtype == AddonCalendarProvider.TYPE_CATEGORY;
                    event.normalisedeventtype = this.getEventType(event);
                    event.category = this.textUtils.parseJSON(event.category, null);
                    event.course = this.textUtils.parseJSON(event.course, null);
                    event.subscription = this.textUtils.parseJSON(event.subscription, null);
                }

                return event;
            });
        });
    }

    /**
     * Adds an event reminder and schedule a new notification.
     *
     * @param event Event to update its notification time.
     * @param time New notification setting timestamp.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when the notification is updated.
     */
    addEventReminder(event: AddonCalendarAnyEvent, time: number, siteId?: string): Promise<any> {
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
     * Return the normalised event type.
     * Activity events are normalised to be course events.
     *
     * @param event The event to get its type.
     * @return Event type.
     */
    getEventType(event: any): string {
        if (event.modulename) {
            return 'course';
        }

        return event.eventtype;
    }

    /**
     * Remove an event reminder and cancel the notification.
     *
     * @param id Reminder ID.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when the notification is updated.
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
     * Get calendar events for a certain day.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param day Day to get.
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the response.
     */
    getDayEvents(year: number, month: number, day: number, courseId?: number, categoryId?: number, ignoreCache?: boolean,
            siteId?: string): Promise<AddonCalendarCalendarDay> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data: any = {
                year: year,
                month: month,
                day: day
            };

            if (courseId) {
                data.courseid = courseId;
            }
            if (categoryId) {
                data.categoryid = categoryId;
            }

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getDayEventsCacheKey(year, month, day, courseId, categoryId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_calendar_get_calendar_day_view', data, preSets).then((response: AddonCalendarCalendarDay) => {
                this.storeEventsInLocalDB(response.events, siteId);

                return response;
            });
        });
    }

    /**
     * Get prefix cache key for day events WS calls.
     *
     * @return Prefix Cache key.
     */
    protected getDayEventsPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'day:';
    }

    /**
     * Get prefix cache key for a certain day for day events WS calls.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param day Day to get.
     * @return Prefix Cache key.
     */
    protected getDayEventsDayPrefixCacheKey(year: number, month: number, day: number): string {
        return this.getDayEventsPrefixCacheKey() + year + ':' + month + ':' + day + ':';
    }

    /**
     * Get cache key for day events WS calls.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param day Day to get.
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @return Cache key.
     */
    protected getDayEventsCacheKey(year: number, month: number, day: number, courseId?: number, categoryId?: number): string {
        return this.getDayEventsDayPrefixCacheKey(year, month, day) + (courseId ? courseId : '') + ':' +
                (categoryId ? categoryId : '');
    }

    /**
     * Get a calendar reminders from local Db.
     *
     * @param id Event ID.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when the event data is retrieved.
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
     * E.g. using provider.getEventsList(undefined, 30, 30) is going to get the events starting after 30 days from now
     * and ending before 60 days from now.
     *
     * @param initialTime Timestamp when the first fetch was done. If not defined, current time.
     * @param daysToStart Number of days from now to start getting events.
     * @param daysInterval Number of days between timestart and timeend.
     * @param siteId Site to get the events from. If not defined, use current site.
     * @return Promise to be resolved when the events are retrieved.
     */
    getEventsList(initialTime?: number, daysToStart: number = 0, daysInterval: number = AddonCalendarProvider.DAYS_INTERVAL,
            siteId?: string): Promise<AddonCalendarGetEventsEvent[]> {

        initialTime = initialTime || this.timeUtils.timestamp();

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
                const start = initialTime + (CoreConstants.SECONDS_DAY * daysToStart),
                    end = start + (CoreConstants.SECONDS_DAY * daysInterval) - 1,
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
                    uniqueCacheKey: true,
                    updateFrequency: CoreSite.FREQUENCY_SOMETIMES
                };

                return site.read('core_calendar_get_calendar_events', data, preSets)
                        .then((response: AddonCalendarGetEventsResult) => {

                    if (!this.canViewMonthInSite(site)) {
                        // Store events only in 3.1-3.3. In 3.4+ we'll use the new WS that return more info.
                        this.storeEventsInLocalDB(response.events, siteId);
                    }

                    return response.events;
                });
            });
        });
    }

    /**
     * Get prefix cache key for events list WS calls.
     *
     * @return Prefix Cache key.
     */
    protected getEventsListPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'events:';
    }

    /**
     * Get cache key for events list WS calls.
     *
     * @param daysToStart Number of days from now to start getting events.
     * @param daysInterval Number of days between timestart and timeend.
     * @return Cache key.
     */
    protected getEventsListCacheKey(daysToStart: number, daysInterval: number): string {
        return this.getEventsListPrefixCacheKey() + daysToStart + ':' + daysInterval;
    }

    /**
     * Get calendar events from local Db that have the same repeatid.
     *
     * @param repeatId Repeat Id of the event.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved with all the events.
     */
    getLocalEventsByRepeatIdFromLocalDb(repeatId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecords(AddonCalendarProvider.EVENTS_TABLE, {repeatid: repeatId});
        });
    }
    /**
     * Get monthly calendar events.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the response.
     */
    getMonthlyEvents(year: number, month: number, courseId?: number, categoryId?: number, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonCalendarMonth> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data: any = {
                year: year,
                month: month
            };

            // This parameter requires Moodle 3.5.
            if (site.isVersionGreaterEqualThan('3.5')) {
                // Set mini to 1 to prevent returning the course selector HTML.
                data.mini = 1;
            }

            if (courseId) {
                data.courseid = courseId;
            }
            if (categoryId) {
                data.categoryid = categoryId;
            }

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getMonthlyEventsCacheKey(year, month, courseId, categoryId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_calendar_get_calendar_monthly_view', data, preSets)
                    .then((response: AddonCalendarMonth) => {

                response.weeks.forEach((week) => {
                    week.days.forEach((day) => {
                        this.storeEventsInLocalDB(day.events, siteId);
                    });
                });

                // Store starting week day preference, we need it in offline to show months that are not in cache.
                if (this.appProvider.isOnline()) {
                    this.configProvider.set(AddonCalendarProvider.STARTING_WEEK_DAY, response.daynames[0].dayno);
                }

                return response;
            });
        });
    }

    /**
     * Get prefix cache key for monthly events WS calls.
     *
     * @return Prefix Cache key.
     */
    protected getMonthlyEventsPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'monthly:';
    }

    /**
     * Get prefix cache key for a certain month for monthly events WS calls.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @return Prefix Cache key.
     */
    protected getMonthlyEventsMonthPrefixCacheKey(year: number, month: number): string {
        return this.getMonthlyEventsPrefixCacheKey() + year + ':' + month + ':';
    }

    /**
     * Get cache key for monthly events WS calls.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @return Cache key.
     */
    protected getMonthlyEventsCacheKey(year: number, month: number, courseId?: number, categoryId?: number): string {
        return this.getMonthlyEventsMonthPrefixCacheKey(year, month) + (courseId ? courseId : '') + ':' +
                (categoryId ? categoryId : '');
    }

    /**
     * Get upcoming calendar events.
     *
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the response.
     */
    getUpcomingEvents(courseId?: number, categoryId?: number, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonCalendarUpcoming> {

        return this.sitesProvider.getSite(siteId).then((site) => {

            const data: any = {};

            if (courseId) {
                data.courseid = courseId;
            }
            if (categoryId) {
                data.categoryid = categoryId;
            }

            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getUpcomingEventsCacheKey(courseId, categoryId),
                updateFrequency: CoreSite.FREQUENCY_SOMETIMES
            };

            if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_calendar_get_calendar_upcoming_view', data, preSets).then((response: AddonCalendarUpcoming) => {
                this.storeEventsInLocalDB(response.events, siteId);

                return response;
            });
        });
    }

    /**
     * Get prefix cache key for upcoming events WS calls.
     *
     * @return Prefix Cache key.
     */
    protected getUpcomingEventsPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'upcoming:';
    }

    /**
     * Get cache key for upcoming events WS calls.
     *
     * @param courseId Course to get.
     * @param categoryId Category to get.
     * @return Cache key.
     */
    protected getUpcomingEventsCacheKey(courseId?: number, categoryId?: number): string {
        return this.getUpcomingEventsPrefixCacheKey() + (courseId ? courseId : '') + ':' + (categoryId ? categoryId : '');
    }

    /**
     * Get URL to view a calendar.
     *
     * @param view The view to load: 'month', 'day', 'upcoming', etc.
     * @param time Time to load. If not defined, current time.
     * @param courseId Course to load. If not defined, all courses.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the URL.x
     */
    getViewUrl(view: string, time?: number, courseId?: string, siteId?: string): Promise<string> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            let url = this.textUtils.concatenatePaths(site.getURL(), 'calendar/view.php?view=' + view);

            if (time) {
                url += '&time=' + time;
            }

            if (courseId) {
                url += '&course=' + courseId;
            }

            return url;
        });
    }

    /**
     * Get the week days, already ordered according to a specified starting day.
     *
     * @param startingDay Starting day. 0=Sunday, 1=Monday, ...
     * @return Week days.
     */
    getWeekDays(startingDay?: number): any[] {
        startingDay = startingDay || 0;

        return this.weekDays.slice(startingDay).concat(this.weekDays.slice(0, startingDay));
    }

    /**
     * Invalidates access information.
     *
     * @param courseId Course ID. If not defined, site calendar.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAccessInformation(courseId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAccessInformationCacheKey(courseId));
        });
    }

    /**
     * Invalidates allowed event types.
     *
     * @param courseId Course ID. If not defined, site calendar.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllowedEventTypes(courseId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAllowedEventTypesCacheKey(courseId));
        });
    }

    /**
     * Invalidates day events for all days.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllDayEvents(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDayEventsPrefixCacheKey());
        });
    }

    /**
     * Invalidates day events for a certain day.
     *
     * @param year Year.
     * @param month Month.
     * @param day Day.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateDayEvents(year: number, month: number, day: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getDayEventsDayPrefixCacheKey(year, month, day));
        });
    }

    /**
     * Invalidates events list and all the single events and related info.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the list is invalidated.
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
     * @param eventId List of courses or course ids.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the list is invalidated.
     */
    invalidateEvent(eventId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getEventCacheKey(eventId));
        });
    }

    /**
     * Invalidates monthly events for all months.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllMonthlyEvents(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getMonthlyEventsPrefixCacheKey());
        });
    }

    /**
     * Invalidates monthly events for a certain months.
     *
     * @param year Year.
     * @param month Month.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateMonthlyEvents(year: number, month: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getMonthlyEventsMonthPrefixCacheKey(year, month));
        });
    }

    /**
     * Invalidates upcoming events for all courses and categories.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllUpcomingEvents(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUpcomingEventsPrefixCacheKey());
        });
    }

    /**
     * Invalidates upcoming events for a certain course or category.
     *
     * @param courseId Course ID.
     * @param categoryId Category ID.
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateUpcomingEvents(courseId?: number, categoryId?: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getUpcomingEventsCacheKey(courseId, categoryId));
        });
    }

    /**
     * Invalidates look ahead setting.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateLookAhead(siteId?: string): Promise<any> {
        return this.userProvider.invalidateUserPreference('calendar_lookahead', siteId);
    }

    /**
     * Invalidates time format setting.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateTimeFormat(siteId?: string): Promise<any> {
        return this.userProvider.invalidateUserPreference('calendar_timeformat', siteId);
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's disabled.
     */
    isCalendarDisabledInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isFeatureDisabled('CoreMainMenuDelegate_AddonCalendar');
    }

    /**
     * Check if Calendar is disabled in a certain site.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if disabled, rejected or resolved with false otherwise.
     */
    isDisabled(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isCalendarDisabledInSite(site);
        });
    }

    /**
     * Check if the get event by ID WS is available.
     *
     * @param siteId Site Id. If not defined, use current site.
     * @return Promise resolved with true if available.
     * @since 3.4
     */
    isGetEventByIdAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.isGetEventByIdAvailableInSite(site);
        }).catch(() => {
            return false;
        });
    }

    /**
     * Check if the get event by ID WS is available in a certain site.
     *
     * @param site Site. If not defined, use current site.
     * @return Whether it's available.
     * @since 3.4
     */
    isGetEventByIdAvailableInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_calendar_get_calendar_event_by_id');
    }

    /**
     * Get the next events for all the sites and schedules their notifications.
     * If an event notification time is 0, cancel its scheduled notification (if any).
     * If local notification plugin is not enabled, resolve the promise.
     *
     * @return Promise resolved when all the notifications have been scheduled.
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
                                return this.getEventsList(undefined, undefined, undefined, siteId).then((events) => {
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
     * @param event Event to schedule.
     * @param reminderId The reminder ID.
     * @param time Notification setting time (in minutes). E.g. 10 means "notificate 10 minutes before start".
     * @param siteId Site ID the event belongs to. If not defined, use current site.
     * @return Promise resolved when the notification is scheduled.
     */
    protected scheduleEventNotification(event: AddonCalendarAnyEvent, reminderId: number, time: number, siteId?: string)
            : Promise<void> {

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
     * @param events Events to schedule.
     * @param siteId ID of the site the events belong to. If not defined, use current site.
     * @return Promise resolved when all the notifications have been scheduled.
     */
    scheduleEventsNotifications(events: AddonCalendarAnyEvent[], siteId?: string): Promise<any[]> {

        if (this.localNotificationsProvider.isAvailable()) {
            siteId = siteId || this.sitesProvider.getCurrentSiteId();

            return Promise.all(events.map((event) => {
                const timeEnd = (event.timestart + event.timeduration) * 1000;

                if (timeEnd <= new Date().getTime()) {
                    // The event has finished already, don't schedule it.
                    return this.deleteLocalEvent(event.id, siteId);
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
     * @param time New default time.
     * @param siteId ID of the site. If not defined, use current site.
     * @return Promise resolved when stored.
     */
    setDefaultNotificationTime(time: number, siteId?: string): Promise<any[]> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const key = AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_SETTING + '#' + siteId;

        return this.configProvider.set(key, time);
    }

    /**
     * Store an event in local DB as it is.
     *
     * @param event Event to store.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when stored.
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
                // Don't store data that can be calculated like formattedtime, iscategoryevent, etc.
                const eventRecord = {
                    id: event.id,
                    name: event.name,
                    description: event.description,
                    format: event.descriptionformat || event.format,
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
                    subscriptionid: event.subscriptionid,
                    location: event.location,
                    eventcount: event.eventcount,
                    timesort: event.timesort,
                    category: event.category ? JSON.stringify(event.category) : undefined,
                    course: event.course ? JSON.stringify(event.course) : undefined,
                    subscription: event.subscription ? JSON.stringify(event.subscription) : undefined,
                    canedit: event.canedit ? 1 : 0,
                    candelete: event.candelete ? 1 : 0,
                    deleteurl: event.deleteurl,
                    editurl: event.editurl,
                    viewurl: event.viewurl,
                    isactionevent: event.isactionevent ? 1 : 0,
                    url: event.url,
                    islastday: event.islastday ? 1 : 0,
                    popupname: event.popupname,
                    mindaytimestamp: event.mindaytimestamp,
                    maxdaytimestamp: event.maxdaytimestamp,
                    draggable: event.draggable,
                };

                return site.getDb().insertRecord(AddonCalendarProvider.EVENTS_TABLE, eventRecord);
            });
        });
    }

    /**
     * Store events in local DB.
     *
     * @param events Events to store.
     * @param siteId ID of the site the event belongs to. If not defined, use current site.
     * @return Promise resolved when the events are stored.
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

    /**
     * Submit a calendar event.
     *
     * @param eventId ID of the event. If undefined/null, create a new event.
     * @param formData Form data.
     * @param timeCreated The time the event was created. Only if modifying a new offline event.
     * @param forceOffline True to always save it in offline.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the event and a boolean indicating if data was sent to server or stored in offline.
     */
    submitEvent(eventId: number, formData: any, timeCreated?: number, forceOffline?: boolean, siteId?: string):
            Promise<{sent: boolean, event: AddonCalendarEvent}> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Function to store the event to be synchronized later.
        const storeOffline = (): Promise<{sent: boolean, event: any}> => {
            return this.calendarOffline.saveEvent(eventId, formData, timeCreated, siteId).then((event) => {
                return {sent: false, event: event};
            });
        };

        if (forceOffline || !this.appProvider.isOnline()) {
            // App is offline, store the event.
            return storeOffline();
        }

        // If the event is already stored, discard it first.
        return this.calendarOffline.deleteEvent(eventId, siteId).then(() => {
            return this.submitEventOnline(eventId, formData, siteId).then((event) => {
                return {sent: true, event: event};
            }).catch((error) => {
                if (error && !this.utils.isWebServiceError(error)) {
                    // Couldn't connect to server, store in offline.
                    return storeOffline();
                } else {
                    // The WebService has thrown an error, reject.
                    return Promise.reject(error);
                }
            });
        });
    }

    /**
     * Submit an event, either to create it or to edit it. It will fail if offline or cannot connect.
     *
     * @param eventId ID of the event. If undefined/null, create a new event.
     * @param formData Form data.
     * @param siteId Site ID. If not provided, current site.
     * @return Promise resolved when done.
     */
    submitEventOnline(eventId: number, formData: any, siteId?: string): Promise<AddonCalendarEvent> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Add data that is "hidden" in web.
            formData.id = eventId || 0;
            formData.userid = site.getUserId();
            formData.visible = 1;
            formData.instance = 0;

            if (eventId > 0) {
                formData['_qf__core_calendar_local_event_forms_update'] = 1;
            } else {
                formData['_qf__core_calendar_local_event_forms_create'] = 1;
            }

            const params = {
                formdata: this.utils.objectToGetParams(formData)
            };

            return site.write('core_calendar_submit_create_update_form', params)
                    .then((result: AddonCalendarSubmitCreateUpdateFormResult): AddonCalendarEvent => {

                if (result.validationerror) {
                    // Simulate a WS error.
                    return <any> Promise.reject({
                        message: this.translate.instant('core.invalidformdata'),
                        errorcode: 'validationerror'
                    });
                }

                return result.event;
            });
        });
    }
}

/**
 * Data returned by calendar's events_exporter.
 */
export type AddonCalendarEvents = {
    events: AddonCalendarEvent[]; // Events.
    firstid: number; // Firstid.
    lastid: number; // Lastid.
};

/**
 * Data returned by calendar's events_grouped_by_course_exporter.
 */
export type AddonCalendarEventsGroupedByCourse = {
    groupedbycourse: AddonCalendarEventsSameCourse[]; // Groupped by course.
};

/**
 * Data returned by calendar's events_same_course_exporter.
 */
export type AddonCalendarEventsSameCourse = AddonCalendarEvents & {
    courseid: number; // Courseid.
};

/**
 * Data returned by calendar's event_exporter_base.
 */
export type AddonCalendarEventBase = {
    id: number; // Id.
    name: string; // Name.
    description?: string; // Description.
    descriptionformat: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    location?: string; // @since 3.6. Location.
    categoryid?: number; // Categoryid.
    groupid?: number; // Groupid.
    userid?: number; // Userid.
    repeatid?: number; // Repeatid.
    eventcount?: number; // Eventcount.
    modulename?: string; // Modulename.
    instance?: number; // Instance.
    eventtype: string; // Eventtype.
    timestart: number; // Timestart.
    timeduration: number; // Timeduration.
    timesort: number; // Timesort.
    visible: number; // Visible.
    timemodified: number; // Timemodified.
    icon: {
        key: string; // Key.
        component: string; // Component.
        alttext: string; // Alttext.
    };
    category?: {
        id: number; // Id.
        name: string; // Name.
        idnumber: string; // Idnumber.
        description?: string; // Description.
        parent: number; // Parent.
        coursecount: number; // Coursecount.
        visible: number; // Visible.
        timemodified: number; // Timemodified.
        depth: number; // Depth.
        nestedname: string; // Nestedname.
        url: string; // Url.
    };
    course?: {
        id: number; // Id.
        fullname: string; // Fullname.
        shortname: string; // Shortname.
        idnumber: string; // Idnumber.
        summary: string; // Summary.
        summaryformat: number; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
        startdate: number; // Startdate.
        enddate: number; // Enddate.
        visible: boolean; // @since 3.8. Visible.
        fullnamedisplay: string; // Fullnamedisplay.
        viewurl: string; // Viewurl.
        courseimage: string; // @since 3.6. Courseimage.
        progress?: number; // @since 3.6. Progress.
        hasprogress: boolean; // @since 3.6. Hasprogress.
        isfavourite: boolean; // @since 3.6. Isfavourite.
        hidden: boolean; // @since 3.6. Hidden.
        timeaccess?: number; // @since 3.6. Timeaccess.
        showshortname: boolean; // @since 3.6. Showshortname.
        coursecategory: string; // @since 3.7. Coursecategory.
    };
    subscription?: {
        displayeventsource: boolean; // Displayeventsource.
        subscriptionname?: string; // Subscriptionname.
        subscriptionurl?: string; // Subscriptionurl.
    };
    canedit: boolean; // Canedit.
    candelete: boolean; // Candelete.
    deleteurl: string; // Deleteurl.
    editurl: string; // Editurl.
    viewurl: string; // Viewurl.
    formattedtime: string; // Formattedtime.
    isactionevent: boolean; // Isactionevent.
    iscourseevent: boolean; // Iscourseevent.
    iscategoryevent: boolean; // Iscategoryevent.
    groupname?: string; // Groupname.
    normalisedeventtype: string; // @since 3.7. Normalisedeventtype.
    normalisedeventtypetext: string; // @since 3.7. Normalisedeventtypetext.
};

/**
 * Data returned by calendar's event_exporter.  Don't confuse it with AddonCalendarCalendarEvent.
 */
export type AddonCalendarEvent = AddonCalendarEventBase & {
    url: string; // Url.
    action?: {
        name: string; // Name.
        url: string; // Url.
        itemcount: number; // Itemcount.
        actionable: boolean; // Actionable.
        showitemcount: boolean; // Showitemcount.
    };
};

/**
 * Data returned by calendar's calendar_event_exporter. Don't confuse it with AddonCalendarEvent.
 */
export type AddonCalendarCalendarEvent = AddonCalendarEventBase & {
    url: string; // Url.
    islastday: boolean; // Islastday.
    popupname: string; // Popupname.
    mindaytimestamp?: number; // Mindaytimestamp.
    mindayerror?: string; // Mindayerror.
    maxdaytimestamp?: number; // Maxdaytimestamp.
    maxdayerror?: string; // Maxdayerror.
    draggable: boolean; // Draggable.
} & AddonCalendarCalendarEventCalculatedData;

/**
 * Any of the possible types of events.
 */
export type AddonCalendarAnyEvent = AddonCalendarGetEventsEvent | AddonCalendarEvent | AddonCalendarCalendarEvent;

/**
 * Data returned by calendar's calendar_day_exporter. Don't confuse it with AddonCalendarDay.
 */
export type AddonCalendarCalendarDay = {
    events: AddonCalendarCalendarEvent[]; // Events.
    defaulteventcontext: number; // Defaulteventcontext.
    filter_selector: string; // Filter_selector.
    courseid: number; // Courseid.
    categoryid?: number; // Categoryid.
    neweventtimestamp: number; // Neweventtimestamp.
    date: CoreWSDate;
    periodname: string; // Periodname.
    previousperiod: CoreWSDate;
    previousperiodlink: string; // Previousperiodlink.
    previousperiodname: string; // Previousperiodname.
    nextperiod: CoreWSDate;
    nextperiodname: string; // Nextperiodname.
    nextperiodlink: string; // Nextperiodlink.
    larrow: string; // Larrow.
    rarrow: string; // Rarrow.
};

/**
 * Data returned by calendar's month_exporter.
 */
export type AddonCalendarMonth = {
    url: string; // Url.
    courseid: number; // Courseid.
    categoryid?: number; // Categoryid.
    filter_selector?: string; // Filter_selector.
    weeks: AddonCalendarWeek[]; // Weeks.
    daynames: AddonCalendarDayName[]; // Daynames.
    view: string; // View.
    date: CoreWSDate;
    periodname: string; // Periodname.
    includenavigation: boolean; // Includenavigation.
    initialeventsloaded: boolean; // @since 3.5. Initialeventsloaded.
    previousperiod: CoreWSDate;
    previousperiodlink: string; // Previousperiodlink.
    previousperiodname: string; // Previousperiodname.
    nextperiod: CoreWSDate;
    nextperiodname: string; // Nextperiodname.
    nextperiodlink: string; // Nextperiodlink.
    larrow: string; // Larrow.
    rarrow: string; // Rarrow.
    defaulteventcontext: number; // Defaulteventcontext.
};

/**
 * Data returned by calendar's week_exporter.
 */
export type AddonCalendarWeek = {
    prepadding: number[]; // Prepadding.
    postpadding: number[]; // Postpadding.
    days: AddonCalendarWeekDay[]; // Days.
};

/**
 * Data returned by calendar's week_day_exporter.
 */
export type AddonCalendarWeekDay = AddonCalendarDay & {
    istoday: boolean; // Istoday.
    isweekend: boolean; // Isweekend.
    popovertitle: string; // Popovertitle.
    ispast?: boolean; // Calculated in the app. Whether the day is in the past.
    filteredEvents?: AddonCalendarCalendarEvent[]; // Calculated in the app. Filtered events.
};

/**
 * Data returned by calendar's day_exporter. Don't confuse it with AddonCalendarCalendarDay.
 */
export type AddonCalendarDay = {
    seconds: number; // Seconds.
    minutes: number; // Minutes.
    hours: number; // Hours.
    mday: number; // Mday.
    wday: number; // Wday.
    year: number; // Year.
    yday: number; // Yday.
    timestamp: number; // Timestamp.
    neweventtimestamp: number; // Neweventtimestamp.
    viewdaylink?: string; // Viewdaylink.
    events: AddonCalendarCalendarEvent[]; // Events.
    hasevents: boolean; // Hasevents.
    calendareventtypes: string[]; // Calendareventtypes.
    previousperiod: number; // Previousperiod.
    nextperiod: number; // Nextperiod.
    navigation: string; // Navigation.
    haslastdayofevent: boolean; // Haslastdayofevent.
};

/**
 * Data returned by calendar's day_name_exporter.
 */
export type AddonCalendarDayName = {
    dayno: number; // Dayno.
    shortname: string; // Shortname.
    fullname: string; // Fullname.
};

/**
 * Data returned by calendar's calendar_upcoming_exporter.
 */
export type AddonCalendarUpcoming = {
    events: AddonCalendarCalendarEvent[]; // Events.
    defaulteventcontext: number; // Defaulteventcontext.
    filter_selector: string; // Filter_selector.
    courseid: number; // Courseid.
    categoryid?: number; // Categoryid.
    isloggedin: boolean; // Isloggedin.
    date: CoreWSDate; // @since 3.8. Date.
};

/**
 * Result of WS core_calendar_get_calendar_access_information.
 */
export type AddonCalendarGetAccessInfoResult = {
    canmanageentries: boolean; // Whether the user can manage entries.
    canmanageownentries: boolean; // Whether the user can manage its own entries.
    canmanagegroupentries: boolean; // Whether the user can manage group entries.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_calendar_get_allowed_event_types.
 */
export type AddonCalendarGetAllowedEventTypesResult = {
    allowedeventtypes: string[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_calendar_get_calendar_events.
 */
export type AddonCalendarGetEventsResult = {
    events: AddonCalendarGetEventsEvent[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Event data returned by WS core_calendar_get_calendar_events.
 */
export type AddonCalendarGetEventsEvent = {
    id: number; // Event id.
    name: string; // Event name.
    description?: string; // Description.
    format: number; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    courseid: number; // Course id.
    categoryid?: number; // @since 3.4. Category id (only for category events).
    groupid: number; // Group id.
    userid: number; // User id.
    repeatid: number; // Repeat id.
    modulename?: string; // Module name.
    instance: number; // Instance id.
    eventtype: string; // Event type.
    timestart: number; // Timestart.
    timeduration: number; // Time duration.
    visible: number; // Visible.
    uuid?: string; // Unique id of ical events.
    sequence: number; // Sequence.
    timemodified: number; // Time modified.
    subscriptionid?: number; // Subscription id.
    showDate?: boolean; // Calculated in the app. Whether date should be shown before this event.
    endsSameDay?: boolean; // Calculated in the app. Whether the event finishes the same day it starts.
    deleted?: boolean; // Calculated in the app. Whether it has been deleted in offline.
};

/**
 * Result of WS core_calendar_get_calendar_event_by_id.
 */
export type AddonCalendarGetEventByIdResult = {
    event: AddonCalendarEvent; // Event.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_calendar_submit_create_update_form.
 */
export type AddonCalendarSubmitCreateUpdateFormResult = {
    event?: AddonCalendarEvent; // Event.
    validationerror: boolean; // Invalid form data.
};

/**
 * Calculated data for AddonCalendarCalendarEvent.
 */
export type AddonCalendarCalendarEventCalculatedData = {
    eventIcon?: string; // Calculated in the app. Event icon.
    moduleIcon?: string; // Calculated in the app. Module icon.
    formattedType?: string; // Calculated in the app. Formatted type.
    duration?: number; // Calculated in the app. Duration of offline event.
    format?: number; // Calculated in the app. Format of offline event.
    timedurationuntil?: number; // Calculated in the app. Time duration until of offline event.
    timedurationminutes?: number; // Calculated in the app. Time duration in minutes of offline event.
    deleted?: boolean; // Calculated in the app. Whether it has been deleted in offline.
    ispast?: boolean; // Calculated in the app. Whether the event is in the past.
};
