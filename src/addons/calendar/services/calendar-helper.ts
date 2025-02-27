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
import { CoreSites } from '@services/sites';
import {
    AddonCalendar,
    AddonCalendarDayName,
    AddonCalendarEvent,
    AddonCalendarEventBase,
    AddonCalendarEventToDisplay,
    AddonCalendarGetEventsEvent,
    AddonCalendarWeek,
    AddonCalendarWeekDay,
} from './calendar';
import { CoreConfig } from '@services/config';
import { CoreObject } from '@singletons/object';
import { CoreCourse } from '@features/course/services/course';
import { ContextLevel, CoreConstants } from '@/core/constants';
import moment from 'moment-timezone';
import { makeSingleton } from '@singletons';
import { AddonCalendarOfflineEventDBRecord } from './database/calendar-offline';
import { CoreCategoryData } from '@features/courses/services/courses';
import { CoreTime } from '@singletons/time';
import { CoreReminders, CoreRemindersService } from '@features/reminders/services/reminders';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import {
    ADDON_CALENDAR_COMPONENT,
    ADDON_CALENDAR_STARTING_WEEK_DAY,
    AddonCalendarEventIcons,
    AddonCalendarEventType,
} from '../constants';
import { AddonCalendarSyncInvalidateEvent } from './calendar-sync';
import { REMINDERS_DISABLED, REMINDERS_DEFAULT_REMINDER_TIMEBEFORE } from '@features/reminders/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Service that provides some features regarding lists of courses and categories.
 */
@Injectable({ providedIn: 'root' })
export class AddonCalendarHelperProvider {

    protected eventTypeIcons: string[] = [];

    /**
     * Returns event icon based on event type.
     *
     * @param eventType Type of the event.
     * @returns Event icon.
     */
    getEventIcon(eventType: AddonCalendarEventType | string): string {
        if (this.eventTypeIcons.length == 0) {
            CoreObject.enumKeys(AddonCalendarEventType).forEach((name) => {
                const value = AddonCalendarEventType[name];
                this.eventTypeIcons[value] = AddonCalendarEventIcons[name];
            });
        }

        return this.eventTypeIcons[eventType] || '';
    }

    /**
     * Calculate some day data based on a list of events for that day.
     *
     * @param day Day.
     * @param events Events.
     */
    calculateDayData(day: AddonCalendarWeekDay, events: AddonCalendarEventToDisplay[]): void {
        day.hasevents = events.length > 0;
        day.haslastdayofevent = false;

        const types = {};
        events.forEach((event) => {
            types[event.formattedType || event.eventtype] = true;

            if (event.islastday) {
                day.haslastdayofevent = true;
            }
        });

        day.calendareventtypes = Object.keys(types) as AddonCalendarEventType[];
    }

    /**
     * Check if current user can create/edit events.
     *
     * @param courseId Course ID. If not defined, site calendar.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether the user can create events.
     */
    async canEditEvents(courseId?: number, siteId?: string): Promise<boolean> {
        try {
            const canEdit = await AddonCalendar.canEditEvents(siteId);
            if (!canEdit) {
                return false;
            }

            const types = await AddonCalendar.getAllowedEventTypes(courseId, siteId);

            return Object.keys(types).length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Classify events into their respective months and days. If an event duration covers more than one day,
     * it will be included in all the days it lasts.
     *
     * @param offlineEvents Events to classify.
     * @returns Object with the classified events.
     */
    classifyIntoMonths(
        offlineEvents: AddonCalendarOfflineEventDBRecord[],
    ): { [monthId: string]: { [day: number]: AddonCalendarEventToDisplay[] } } {
        // Format data.
        const events: AddonCalendarEventToDisplay[] = offlineEvents.map((event) =>
            AddonCalendarHelper.formatOfflineEventData(event));

        const result = {};

        events.forEach((event) => {
            const treatedDay = moment(event.timestart * 1000);
            const endDay = moment((event.timestart + event.timeduration) * 1000);

            // Add the event to all the days it lasts.
            while (!treatedDay.isAfter(endDay, 'day')) {
                const monthId = this.getMonthId(treatedDay);
                const day = treatedDay.date();

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
     * @param event Event to format.
     * @returns The formatted event to display.
     */
    async formatEventData(
        event: AddonCalendarEvent | AddonCalendarEventBase | AddonCalendarGetEventsEvent,
    ): Promise<AddonCalendarEventToDisplay> {

        const eventFormatted: AddonCalendarEventToDisplay = {
            ...event,
            location: 'location' in event ? event.location : undefined,
            eventcount: 'eventcount' in event ? event.eventcount || 0 : 0,
            repeatid: event.repeatid || 0,
            eventIcon: this.getEventIcon(event.eventtype),
            formattedType: AddonCalendar.getEventType(event),
            format: 1,
            visible: 1,
            offline: false,
            purpose: 'purpose' in event ? event.purpose : undefined,
        };

        if (event.modulename) {
            eventFormatted.eventIcon = await CoreCourseModuleDelegate.getModuleIconSrc(
                event.modulename,
                'icon' in event ? event.icon.iconurl : undefined,
            );
            eventFormatted.moduleIcon = eventFormatted.eventIcon;
            eventFormatted.iconTitle = CoreCourse.translateModuleName(event.modulename);
        }

        eventFormatted.formattedType = AddonCalendar.getEventType(event);

        // Calculate context.
        if ('course' in event) {
            eventFormatted.courseid = event.course?.id;
        } else if ('courseid' in event) {
            eventFormatted.courseid = event.courseid;
        }

        // Calculate context.
        if ('category' in event) {
            eventFormatted.categoryid = event.category?.id;
        } else if ('categoryid' in event) {
            eventFormatted.categoryid = event.categoryid;
        }

        if ('canedit' in event) {
            eventFormatted.canedit = event.canedit;
        }

        if ('candelete' in event) {
            eventFormatted.candelete = event.candelete;
        }

        this.formatEventContext(eventFormatted, eventFormatted.courseid, eventFormatted.categoryid);

        return eventFormatted;
    }

    /**
     * Convenience function to format some event data to be rendered.
     *
     * @param event Event to format.
     * @returns The formatted offline event to display.
     */
    formatOfflineEventData(event: AddonCalendarOfflineEventDBRecord): AddonCalendarEventToDisplay {

        const eventFormatted: AddonCalendarEventToDisplay = {
            id: event.id,
            name: event.name,
            timestart: event.timestart,
            eventtype: event.eventtype,
            categoryid: event.categoryid,
            courseid: event.courseid || event.groupcourseid,
            groupid: event.groupid,
            description: event.description,
            location: event.location,
            duration: event.duration,
            timedurationuntil: event.timedurationuntil,
            timedurationminutes: event.timedurationminutes,
            // repeat: event.repeat,
            eventcount: event.repeats || 0,
            repeatid: event.repeatid || 0,
            // repeateditall: event.repeateditall,
            userid: event.userid,
            timemodified: event.timecreated || 0,
            eventIcon: this.getEventIcon(event.eventtype),
            formattedType: event.eventtype,
            format: 1,
            visible: 1,
            offline: true,
            canedit: event.id < 0,
            candelete: event.id < 0,
            timeduration: 0,
        };

        // Calculate context.
        const categoryId = event.categoryid;
        const courseId = event.courseid || event.groupcourseid;
        this.formatEventContext(eventFormatted, courseId, categoryId);

        if (eventFormatted.duration == 1) {
            eventFormatted.timeduration = (event.timedurationuntil || 0) - event.timestart;
        } else if (eventFormatted.duration == 2) {
            eventFormatted.timeduration = (event.timedurationminutes || 0) * CoreConstants.SECONDS_MINUTE;
        } else {
            eventFormatted.timeduration = 0;
        }

        return eventFormatted;
    }

    /**
     * Modifies event data with the context information.
     *
     * @param eventFormatted Event formatted to be displayed.
     * @param courseId Course Id if any.
     * @param categoryId Category Id if any.
     */
    protected formatEventContext(eventFormatted: AddonCalendarEventToDisplay, courseId?: number, categoryId?: number): void {
        if (categoryId && categoryId > 0) {
            eventFormatted.contextLevel = ContextLevel.COURSECAT;
            eventFormatted.contextInstanceId = categoryId;
        } else if (courseId && courseId > 0) {
            eventFormatted.contextLevel = ContextLevel.COURSE;
            eventFormatted.contextInstanceId = courseId;
        } else {
            eventFormatted.contextLevel = ContextLevel.USER;
            eventFormatted.contextInstanceId = eventFormatted.userid;
        }
    }

    /**
     * Format reminders, adding calculated data.
     *
     * @param eventId Event Id.
     * @param eventTimestart Event timestart.
     * @param siteId Site ID.
     * @returns Formatted reminders.
     */
    async getEventReminders(
        eventId: number,
        eventTimestart: number,
        siteId?: string,
    ): Promise<AddonCalendarEventReminder[]> {
        const reminders = await CoreReminders.getReminders(
            {
                instanceId: eventId,
                component: ADDON_CALENDAR_COMPONENT,
            },
            siteId,
        );

        if (!reminders.length) {
            return [];
        }

        const defaultTime = await CoreReminders.getDefaultNotificationTime(siteId);
        let defaultLabel: string | undefined;

        if (defaultTime > REMINDERS_DISABLED) {
            const data = CoreRemindersService.convertSecondsToValueAndUnit(defaultTime);
            defaultLabel = CoreReminders.getUnitValueLabel(data.value, data.unit, true);
        }

        return reminders.map((reminder) => {
            const formatted: AddonCalendarEventReminder = {
                id: reminder.id,
            };

            if (reminder.timebefore === REMINDERS_DEFAULT_REMINDER_TIMEBEFORE) {
                // Default time. Check if default notifications are disabled.
                if (defaultLabel !== undefined) {
                    formatted.label = defaultLabel;
                    formatted.timestamp = eventTimestart - defaultTime;
                }
            } else {
                const data = CoreRemindersService.convertSecondsToValueAndUnit(reminder.timebefore);
                formatted.label = CoreReminders.getUnitValueLabel(data.value, data.unit, false);
                formatted.timestamp = eventTimestart - reminder.timebefore;
            }

            if (formatted.timestamp) {
                formatted.sublabel = CoreTime.userDate(formatted.timestamp * 1000, 'core.strftimedatetime');
            }

            return formatted;
        });
    }

    /**
     * Get options (name & value) for each allowed event type.
     *
     * @param eventTypes Result of getAllowedEventTypes.
     * @returns Options.
     */
    getEventTypeOptions(eventTypes: {[name: string]: boolean}): AddonCalendarEventTypeOption[] {
        const options: AddonCalendarEventTypeOption[] = [];

        if (eventTypes.user) {
            options.push({ name: 'core.user', value: AddonCalendarEventType.USER });
        }
        if (eventTypes.group) {
            options.push({ name: 'core.group', value: AddonCalendarEventType.GROUP });
        }
        if (eventTypes.course) {
            options.push({ name: 'core.course', value: AddonCalendarEventType.COURSE });
        }
        if (eventTypes.category) {
            options.push({ name: 'core.category', value: AddonCalendarEventType.CATEGORY });
        }
        if (eventTypes.site) {
            options.push({ name: 'core.site', value: AddonCalendarEventType.SITE });
        }

        return options;
    }

    /**
     * Get the month "id".
     *
     * @param moment Month moment.
     * @returns The "id".
     */
    getMonthId(moment: moment.Moment): string {
        return `${moment.year()}#${moment.month() + 1}`;
    }

    /**
     * Get the day "id".
     *
     * @param moment Day moment.
     * @returns The "id".
     */
    getDayId(moment: moment.Moment): string {
        return `${this.getMonthId(moment)}#${moment.date()}`;
    }

    /**
     * Get weeks of a month in offline (with no events).
     *
     * The result has the same structure than getMonthlyEvents, but it only contains fields that are actually used by the app.
     *
     * @param year Year to get.
     * @param month Month to get.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the response.
     */
    async getOfflineMonthWeeks(
        year: number,
        month: number,
        siteId?: string,
    ): Promise<{ daynames: Partial<AddonCalendarDayName>[]; weeks: AddonCalendarWeek[] }> {
        const site = await CoreSites.getSite(siteId);
        // Get starting week day user preference, fallback to site configuration.
        let startWeekDayStr = site.getStoredConfig('calendar_startwday') || '1';
        startWeekDayStr = await CoreConfig.get(ADDON_CALENDAR_STARTING_WEEK_DAY, startWeekDayStr);
        const startWeekDay = parseInt(startWeekDayStr, 10);

        const today = moment();
        const isCurrentMonth = today.year() == year && today.month() == month - 1;
        const weeks: AddonCalendarWeek[] = [];

        let date = moment({ year, month: month - 1, date: 1 });
        for (let mday = 1; mday <= date.daysInMonth(); mday++) {
            date = moment({ year, month: month - 1, date: mday });

            // Add new week and calculate prepadding.
            if (!weeks.length || date.day() == startWeekDay) {
                const prepaddingLength = (date.day() - startWeekDay + 7) % 7;
                const prepadding: number[] = [];
                for (let i = 0; i < prepaddingLength; i++) {
                    prepadding.push(i);
                }
                weeks.push({ prepadding, postpadding: [], days: [] });
            }

            // Calculate postpadding of last week.
            if (mday == date.daysInMonth()) {
                const postpaddingLength = (startWeekDay - date.day() + 6) % 7;
                const postpadding: number[] = [];
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
                // Added to match the type. And possibly unused.
                popovertitle: '',
                ispast: today.date() > date.date(),
                seconds: date.seconds(),
                minutes: date.minutes(),
                hours: date.hours(),
                wday: date.weekday(),
                year: year,
                yday: date.dayOfYear(),
                timestamp: date.date(),
                haslastdayofevent: false,
                neweventtimestamp: 0,
                previousperiod: 0, // Previousperiod.
                nextperiod: 0, // Nextperiod.
                navigation: '', // Navigation.
            });
        }

        return { weeks, daynames: [{ dayno: startWeekDay }] };
    }

    /**
     * Check if the data of an event has changed.
     *
     * @param data Current data.
     * @param original Original data.
     * @returns True if data has changed, false otherwise.
     */
    hasEventDataChanged(data: AddonCalendarOfflineEventDBRecord, original?: AddonCalendarOfflineEventDBRecord): boolean {
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
        if ((data.eventtype == AddonCalendarEventType.CATEGORY && data.categoryid != original.categoryid) ||
                (data.eventtype == AddonCalendarEventType.COURSE && data.courseid != original.courseid) ||
                (data.eventtype == AddonCalendarEventType.GROUP && data.groupcourseid != original.groupcourseid &&
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
     * Filter events to be shown on the events list.
     *
     * @param events Events without filtering.
     * @param filter Filter from popover.
     * @param categories Categories indexed by ID.
     * @returns Filtered events.
     */
    getFilteredEvents(
        events: AddonCalendarEventToDisplay[],
        filter: AddonCalendarFilter | undefined,
        categories: { [id: number]: CoreCategoryData },
    ): AddonCalendarEventToDisplay[] {
        // Do not filter.
        if (!filter || !filter.filtered) {
            return events;
        }

        const courseId = filter.courseId ? Number(filter.courseId) : undefined;

        if (!courseId || courseId < 0) {
            // Filter only by type.
            return events.filter((event) => filter[event.formattedType]);
        }

        const categoryId = filter.categoryId ? Number(filter.categoryId) : undefined;

        return events.filter((event) => filter[event.formattedType] &&
                this.shouldDisplayEvent(event, categories, courseId, categoryId));
    }

    /**
     * Check if an event should be displayed based on the filter.
     *
     * @param event Event object.
     * @param categories Categories indexed by ID.
     * @param courseId Course ID to filter.
     * @param categoryId Category ID the course belongs to.
     * @returns Whether it should be displayed.
     */
    protected shouldDisplayEvent(
        event: AddonCalendarEventToDisplay,
        categories: { [id: number]: CoreCategoryData },
        courseId: number,
        categoryId?: number,
    ): boolean {
        if (event.eventtype === 'user' || event.eventtype === 'site') {
            // User or site event, display it.
            return true;
        }

        if (event.eventtype === 'category' && categories) {
            if (!event.categoryid || !Object.keys(categories).length || !categoryId) {
                // We can't tell if the course belongs to the category, display them all.
                return true;
            }

            if (event.categoryid === categoryId) {
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

                if (event.categoryid === category.parent) {
                    return true;
                }
                category = categories[category.parent];
            }

            return false;
        }

        const eventCourse = (event.course && event.course.id) || event.courseid;

        // Show the event if it is from site home or if it matches the selected course.
        return !eventCourse || (eventCourse === CoreSites.getCurrentSiteHomeId() || eventCourse === courseId);
    }

    /**
     * Refresh the month & day for several created/edited/deleted events, and invalidate the months & days
     * for their repeated events if needed.
     *
     * @param events Events that have been touched and number of times each event is repeated.
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    async refreshAfterChangeEvents(events: AddonCalendarSyncInvalidateEvent[], siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const fetchTimestarts: number[] = [];
        const invalidateTimestarts: number[] = [];
        let promises: Promise<unknown>[] = [];

        // Always fetch upcoming events.
        promises.push(AddonCalendar.getUpcomingEvents(undefined, undefined, true, site.id));

        promises = promises.concat(events.map(async (eventData) => {

            if (eventData.repeated <= 1) {
                // Not repeated.
                fetchTimestarts.push(eventData.timestart);

                return AddonCalendar.invalidateEvent(eventData.id);
            }

            if (eventData.repeatid) {
                // Being edited or deleted.
                // We need to calculate the days to invalidate because the event date could have changed.
                // We don't know if the repeated events are before or after this one, invalidate them all.
                fetchTimestarts.push(eventData.timestart);

                for (let i = 1; i < eventData.repeated; i++) {
                    invalidateTimestarts.push(eventData.timestart + CoreConstants.SECONDS_DAY * 7 * i);
                    invalidateTimestarts.push(eventData.timestart - CoreConstants.SECONDS_DAY * 7 * i);
                }

                // Get the repeated events to invalidate them.
                const repeatedEvents =
                    await AddonCalendar.getLocalEventsByRepeatIdFromLocalDb(eventData.repeatid, site.id);

                await CorePromiseUtils.allPromises(repeatedEvents.map((event) =>
                    AddonCalendar.invalidateEvent(event.id)));

                return;
            }

            // Being added.
            let time = eventData.timestart;
            fetchTimestarts.push(time);

            while (eventData.repeated > 1) {
                time += CoreConstants.SECONDS_DAY * 7;
                eventData.repeated--;
                invalidateTimestarts.push(time);
            }

            return;

        }));

        try {
            await CorePromiseUtils.allPromisesIgnoringErrors(promises);
        } finally {
            const treatedMonths = {};
            const treatedDays = {};
            const finalPromises: Promise<unknown>[] =[AddonCalendar.invalidateAllUpcomingEvents()];

            // Fetch months and days.
            fetchTimestarts.forEach((fetchTime) => {
                const day = moment(fetchTime * 1000);

                const monthId = this.getMonthId(day);
                if (!treatedMonths[monthId]) {
                    // Month not refetch or invalidated already, do it now.
                    treatedMonths[monthId] = true;

                    finalPromises.push(AddonCalendar.getMonthlyEvents(
                        day.year(),
                        day.month() + 1,
                        undefined,
                        undefined,
                        true,
                        site.id,
                    ));
                }

                const dayId = monthId + '#' + day.date();
                if (!treatedDays[dayId]) {
                    // Dat not refetch or invalidated already, do it now.
                    treatedDays[dayId] = true;

                    finalPromises.push(AddonCalendar.getDayEvents(
                        day.year(),
                        day.month() + 1,
                        day.date(),
                        undefined,
                        undefined,
                        true,
                        site.id,
                    ));
                }
            });

            // Invalidate months and days.
            invalidateTimestarts.forEach((fetchTime) => {
                const day = moment(fetchTime * 1000);

                const monthId = this.getMonthId(day);
                if (!treatedMonths[monthId]) {
                    // Month not refetch or invalidated already, do it now.
                    treatedMonths[monthId] = true;

                    finalPromises.push(AddonCalendar.invalidateMonthlyEvents(day.year(), day.month() + 1, site.id));
                }

                const dayId = monthId + '#' + day.date();
                if (!treatedDays[dayId]) {
                    // Dat not refetch or invalidated already, do it now.
                    treatedDays[dayId] = true;

                    finalPromises.push(AddonCalendar.invalidateDayEvents(
                        day.year(),
                        day.month() + 1,
                        day.date(),
                        site.id,
                    ));
                }
            });

            await CorePromiseUtils.allPromisesIgnoringErrors(finalPromises);
        }
    }

    /**
     * Refresh the month & day for a created/edited/deleted event, and invalidate the months & days
     * for their repeated events if needed.
     *
     * @param event Event that has been touched.
     * @param repeated Number of times the event is repeated.
     * @param siteId Site ID. If not defined, current site.
     * @returns Resolved when done.
     */
    refreshAfterChangeEvent(
        event: {
            id: number;
            repeatid?: number;
            timestart: number;
        },
        repeated: number,
        siteId?: string,
    ): Promise<void> {
        return this.refreshAfterChangeEvents(
            [{
                id: event.id,
                repeatid: event.repeatid,
                timestart: event.timestart,
                repeated: repeated,
            }],
            siteId,
        );
    }

    /**
     * Sort events by timestart.
     *
     * @param events List to sort.
     * @returns Events sorted.
     */
    sortEvents(events: (AddonCalendarEventToDisplay)[]): (AddonCalendarEventToDisplay)[] {
        return events.sort((a, b) => {
            if (a.timestart == b.timestart) {
                return a.timeduration - b.timeduration;
            }

            return a.timestart - b.timestart;
        });
    }

}
export const AddonCalendarHelper = makeSingleton(AddonCalendarHelperProvider);

/**
 * Calculated data for Calendar filtering.
 */
export type AddonCalendarFilter = {
    filtered: boolean; // If filter enabled (some filters applied).
    courseId: number | undefined; // Course Id to filter.
    categoryId?: number; // Category Id to filter.
    course: boolean; // Filter to show course events.
    group: boolean; // Filter to show group events.
    site: boolean; // Filter to show show site events.
    user: boolean; // Filter to show user events.
    category: boolean; // Filter to show category events.
};

export type AddonCalendarEventTypeOption = {
    name: string;
    value: AddonCalendarEventType;
};

/**
 * Formatted event reminder.
 */
export type AddonCalendarEventReminder = {
    id: number;
    timestamp?: number; // Timestamp (in seconds).
    label?: string; // Label to represent the reminder.
    sublabel?: string; // Sub label.
};
