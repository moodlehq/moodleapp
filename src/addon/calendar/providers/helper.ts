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
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseProvider } from '@core/course/providers/course';
import { AddonCalendarProvider } from './calendar';
import { CoreConstants } from '@core/constants';
import { CoreConfigProvider } from '@providers/config';
import { CoreUtilsProvider } from '@providers/utils/utils';
import * as moment from 'moment';

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable()
export class AddonCalendarHelperProvider {
    protected logger;

    protected EVENTICONS = {
        course: 'fa-university',
        group: 'people',
        site: 'globe',
        user: 'person',
        category: 'fa-cubes'
    };

    constructor(logger: CoreLoggerProvider,
            private courseProvider: CoreCourseProvider,
            private sitesProvider: CoreSitesProvider,
            private calendarProvider: AddonCalendarProvider,
            private configProvider: CoreConfigProvider,
            private utils: CoreUtilsProvider) {
        this.logger = logger.getInstance('AddonCalendarHelperProvider');
    }

    /**
     * Calculate some day data based on a list of events for that day.
     *
     * @param {any} day Day.
     * @param {any[]} events Events.
     */
    calculateDayData(day: any, events: any[]): void {
        day.hasevents = events.length > 0;
        day.haslastdayofevent = false;

        const types = {};
        events.forEach((event) => {
            types[event.formattedType || event.eventtype] = true;

            if (event.islastday) {
                day.haslastdayofevent = true;
            }
        });

        day.calendareventtypes = Object.keys(types);
    }

    /**
     * Check if current user can create/edit events.
     *
     * @param {number} [courseId] Course ID. If not defined, site calendar.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<boolean>} Promise resolved with boolean: whether the user can create events.
     */
    canEditEvents(courseId?: number, siteId?: string): Promise<boolean> {
        return this.calendarProvider.canEditEvents(siteId).then((canEdit) => {
            if (!canEdit) {
                return false;
            }

            // Site allows creating events. Check if the user has permissions to do so.
            return this.calendarProvider.getAllowedEventTypes(courseId, siteId).then((types) => {
                return Object.keys(types).length > 0;
            });
        }).catch(() => {
            return false;
        });
    }

    /**
     * Classify events into their respective months and days. If an event duration covers more than one day,
     * it will be included in all the days it lasts.
     *
     * @param {any[]} events Events to classify.
     * @return {{[monthId: string]: {[day: number]: any[]}}} Object with the classified events.
     */
    classifyIntoMonths(events: any[]): {[monthId: string]: {[day: number]: any[]}} {

        const result = {};

        events.forEach((event) => {
            const treatedDay = moment(new Date(event.timestart * 1000)),
                endDay = moment(new Date((event.timestart + (event.timeduration || 0)) * 1000));

            // Add the event to all the days it lasts.
            while (!treatedDay.isAfter(endDay, 'day')) {
                const monthId = this.getMonthId(treatedDay.year(), treatedDay.month() + 1),
                    day = treatedDay.date();

                if (!result[monthId]) {
                    result[monthId] = {};
                }
                if (!result[monthId][day]) {
                    result[monthId][day] = [];
                }
                result[monthId][day].push(event);

                treatedDay.add(1, 'day'); // Treat next day.
            }
        });

        return result;
    }

    /**
     * Convenience function to format some event data to be rendered.
     *
     * @param {any} e Event to format.
     */
    formatEventData(e: any): void {
        e.icon = this.EVENTICONS[e.eventtype] || false;
        if (!e.icon) {
            e.icon = this.courseProvider.getModuleIconSrc(e.modulename);
            e.moduleIcon = e.icon;
        }

        e.formattedType = this.calendarProvider.getEventType(e);

        if (typeof e.duration != 'undefined') {
            // It's an offline event, add some calculated data.
            e.format = 1;
            e.visible = 1;

            if (e.duration == 1) {
                e.timeduration = e.timedurationuntil - e.timestart;
            } else if (e.duration == 2) {
                e.timeduration = e.timedurationminutes * CoreConstants.SECONDS_MINUTE;
            } else {
                e.timeduration = 0;
            }
        }
    }

    /**
     * Get options (name & value) for each allowed event type.
     *
     * @param {any} eventTypes Result of getAllowedEventTypes.
     * @return {{name: string, value: string}[]} Options.
     */
    getEventTypeOptions(eventTypes: any): {name: string, value: string}[] {
        const options = [];

        if (eventTypes.user) {
            options.push({name: 'core.user', value: AddonCalendarProvider.TYPE_USER});
        }
        if (eventTypes.group) {
            options.push({name: 'core.group', value: AddonCalendarProvider.TYPE_GROUP});
        }
        if (eventTypes.course) {
            options.push({name: 'core.course', value: AddonCalendarProvider.TYPE_COURSE});
        }
        if (eventTypes.category) {
            options.push({name: 'core.category', value: AddonCalendarProvider.TYPE_CATEGORY});
        }
        if (eventTypes.site) {
            options.push({name: 'core.site', value: AddonCalendarProvider.TYPE_SITE});
        }

        return options;
    }

    /**
     * Get the month "id" (year + month).
     *
     * @param {number} year Year.
     * @param {number} month Month.
     * @return {string} The "id".
     */
    getMonthId(year: number, month: number): string {
        return year + '#' + month;
    }

    /**
     * Get weeks of a month in offline (with no events).
     *
     * The result has the same structure than getMonthlyEvents, but it only contains fields that are actually used by the app.
     *
     * @param {number} year Year to get.
     * @param {number} month Month to get.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the response.
     */
    getOfflineMonthWeeks(year: number, month: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get starting week day user preference, fallback to site configuration.
            const startWeekDay = site.getStoredConfig('calendar_startwday');

            return this.configProvider.get(AddonCalendarProvider.STARTING_WEEK_DAY, startWeekDay);
        }).then((startWeekDay) => {
            const today = moment();
            const isCurrentMonth = today.year() == year && today.month() == month - 1;
            const weeks = [];

            let date = moment({year, month: month - 1, date: 1});
            for (let mday = 1; mday <= date.daysInMonth(); mday++) {
                date = moment({year, month: month - 1, date: mday});

                // Add new week and calculate prepadding.
                if (!weeks.length || date.day() == startWeekDay) {
                    const prepaddingLength = (date.day() - startWeekDay + 7) % 7;
                    const prepadding = [];
                    for (let i = 0; i < prepaddingLength; i++) {
                        prepadding.push(i);
                    }
                    weeks.push({ prepadding, postpadding: [], days: []});
                }

                // Calculate postpadding of last week.
                if (mday == date.daysInMonth()) {
                    const postpaddingLength = (startWeekDay - date.day() + 6) % 7;
                    const postpadding = [];
                    for (let i = 0; i < postpaddingLength; i++) {
                        postpadding.push(i);
                    }
                    weeks[weeks.length - 1].postpadding = postpadding;
                }

                // Add day to current week.
                weeks[weeks.length - 1].days.push({
                    events: [],
                    hasevents: false,
                    mday: date.date(),
                    isweekend: date.day() == 0 || date.day() == 6,
                    istoday: isCurrentMonth && today.date() == date.date(),
                    calendareventtypes: [],
                });
            }

            return {weeks, daynames: [{dayno: startWeekDay}]};
        });
    }

    /**
     * Check if the data of an event has changed.
     *
     * @param {any} data Current data.
     * @param {any} [original] Original data.
     * @return {boolean} True if data has changed, false otherwise.
     */
    hasEventDataChanged(data: any, original?: any): boolean {
        if (!original) {
            // There is no original data, assume it hasn't changed.
            return false;
        }

        // Check the fields that don't depend on any other.
        if (data.name != original.name || data.timestart != original.timestart || data.eventtype != original.eventtype ||
                data.description != original.description || data.location != original.location ||
                data.duration != original.duration || data.repeat != original.repeat) {
            return true;
        }

        // Check data that depends on eventtype.
        if ((data.eventtype == AddonCalendarProvider.TYPE_CATEGORY && data.categoryid != original.categoryid) ||
                (data.eventtype == AddonCalendarProvider.TYPE_COURSE && data.courseid != original.courseid) ||
                (data.eventtype == AddonCalendarProvider.TYPE_GROUP && data.groupcourseid != original.groupcourseid &&
                    data.groupid != original.groupid)) {
            return true;
        }

        // Check data that depends on duration.
        if ((data.duration == 1 && data.timedurationuntil != original.timedurationuntil) ||
                (data.duration == 2 && data.timedurationminutes != original.timedurationminutes)) {
            return true;
        }

        if (data.repeat && data.repeats != original.repeats) {
            return true;
        }

        return false;
    }

    /**
     * Check if an event should be displayed based on the filter.
     *
     * @param {any} event Event object.
     * @param {number} courseId Course ID to filter.
     * @param {number} categoryId Category ID the course belongs to.
     * @param {any} categories Categories indexed by ID.
     * @return {boolean} Whether it should be displayed.
     */
    shouldDisplayEvent(event: any, courseId: number, categoryId: number, categories: any): boolean {
        if (event.eventtype == 'user' || event.eventtype == 'site') {
            // User or site event, display it.
            return true;
        }

        if (event.eventtype == 'category') {
            if (!event.categoryid || !Object.keys(categories).length) {
                // We can't tell if the course belongs to the category, display them all.
                return true;
            }

            if (event.categoryid == categoryId) {
                // The event is in the same category as the course, display it.
                return true;
            }

            // Check parent categories.
            let category = categories[categoryId];
            while (category) {
                if (!category.parent) {
                    // Category doesn't have parent, stop.
                    break;
                }

                if (event.categoryid == category.parent) {
                    return true;
                }
                category = categories[category.parent];
            }

            return false;
        }

        // Show the event if it is from site home or if it matches the selected course.
        return event.course && (event.course.id == this.sitesProvider.getCurrentSiteHomeId() || event.course.id == courseId);
    }

    /**
     * Refresh the month & day for several created/edited/deleted events, and invalidate the months & days
     * for their repeated events if needed.
     *
     * @param {{event: any, repeated: number}[]} events Events that have been touched and number of times each event is repeated.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Resolved when done.
     */
    refreshAfterChangeEvents(events: {event: any, repeated: number}[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const fetchTimestarts = [],
                invalidateTimestarts = [];

            // Always fetch upcoming events.
            const upcomingPromise = this.calendarProvider.getUpcomingEvents(undefined, undefined, true, site.id).catch(() => {
                // Ignore errors.
            });

            // Invalidate the events and get the timestarts so we can invalidate months & days.
            return this.utils.allPromises([upcomingPromise].concat(events.map((eventData) => {

                if (eventData.repeated > 1) {
                    if (eventData.event.repeatid) {
                        // Being edited or deleted.
                        // We need to calculate the days to invalidate because the event date could have changed.
                        // We don't know if the repeated events are before or after this one, invalidate them all.
                        fetchTimestarts.push(eventData.event.timestart);

                        for (let i = 1; i < eventData.repeated; i++) {
                            invalidateTimestarts.push(eventData.event.timestart + CoreConstants.SECONDS_DAY * 7 * i);
                            invalidateTimestarts.push(eventData.event.timestart - CoreConstants.SECONDS_DAY * 7 * i);
                        }

                        // Get the repeated events to invalidate them.
                        return this.calendarProvider.getLocalEventsByRepeatIdFromLocalDb(eventData.event.repeatid, site.id)
                                .then((events) => {

                            return this.utils.allPromises(events.map((event) => {
                                return this.calendarProvider.invalidateEvent(event.id);
                            }));
                        });
                    } else {
                        // Being added.
                        let time = eventData.event.timestart;
                        fetchTimestarts.push(time);

                        while (eventData.repeated > 1) {
                            time += CoreConstants.SECONDS_DAY * 7;
                            eventData.repeated--;
                            invalidateTimestarts.push(time);
                        }

                        return Promise.resolve();
                    }
                } else {
                    // Not repeated.
                    fetchTimestarts.push(eventData.event.timestart);

                    return this.calendarProvider.invalidateEvent(eventData.event.id);
                }

            }))).finally(() => {
                const treatedMonths = {},
                    treatedDays = {};

                return this.utils.allPromises([
                    this.calendarProvider.invalidateAllUpcomingEvents(),

                    // Fetch or invalidate months and days.
                    this.utils.allPromises(fetchTimestarts.concat(invalidateTimestarts).map((time, index) => {
                        const promises = [],
                            day = moment(new Date(time * 1000)),
                            monthId = this.getMonthId(day.year(), day.month() + 1),
                            dayId = monthId + '#' + day.date();

                        if (!treatedMonths[monthId]) {
                            // Month not treated already, do it now.
                            treatedMonths[monthId] = monthId;

                            if (index < fetchTimestarts.length) {
                                promises.push(this.calendarProvider.getMonthlyEvents(day.year(), day.month() + 1, undefined,
                                        undefined, true, site.id).catch(() => {

                                    // Ignore errors.
                                }));
                            } else {
                                promises.push(this.calendarProvider.invalidateMonthlyEvents(day.year(), day.month() + 1, site.id));
                            }
                        }

                        if (!treatedDays[dayId]) {
                            // Day not invalidated already, do it now.
                            treatedDays[dayId] = dayId;

                            if (index < fetchTimestarts.length) {
                                promises.push(this.calendarProvider.getDayEvents(day.year(), day.month() + 1, day.date(),
                                        undefined, undefined, true, site.id).catch(() => {

                                    // Ignore errors.
                                }));
                            } else {
                                promises.push(this.calendarProvider.invalidateDayEvents(day.year(), day.month() + 1, day.date(),
                                        site.id));
                            }
                        }

                        return this.utils.allPromises(promises);
                    }))
                ]);
            });
        });
    }

    /**
     * Refresh the month & day for a created/edited/deleted event, and invalidate the months & days
     * for their repeated events if needed.
     *
     * @param {any} event Event that has been touched.
     * @param {number} repeated Number of times the event is repeated.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Resolved when done.
     */
    refreshAfterChangeEvent(event: any, repeated: number, siteId?: string): Promise<any> {
        return this.refreshAfterChangeEvents([{event: event, repeated: repeated}], siteId);
    }
}
