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
    AddonCalendarEvent,
} from '@addons/calendar/services/calendar';
import dayjs from 'dayjs';
import { makeSingleton } from '@singletons';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable({ providedIn: 'root' })
export class AddonBlockTimelineProvider {

    // Cache key was maintained from block myoverview when blocks were splitted.
    protected static readonly ROOT_CACHE_KEY = 'myoverview:';

    static readonly EVENTS_LIMIT = 20;
    static readonly EVENTS_LIMIT_PER_COURSE = 10;

    /**
     * Get calendar action events for the given course.
     *
     * @param courseId Only events in this course.
     * @param afterEventId The last seen event id.
     * @param searchValue The value a user wishes to search against.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getActionEventsByCourse(
        courseId: number,
        afterEventId?: number,
        searchValue = '',
        siteId?: string,
    ): Promise<{ events: AddonCalendarEvent[]; canLoadMore?: number }> {
        const site = await CoreSites.getSite(siteId);

        const time = this.getDayStart(-14); // Check two weeks ago.

        const data: AddonBlockTimelineGetActionEventsByCourseWSParams = {
            timesortfrom: time,
            courseid: courseId,
            limitnum: AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE,
        };
        if (afterEventId) {
            data.aftereventid = afterEventId;
        }

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActionEventsByCourseCacheKey(courseId),
        };

        if (searchValue != '') {
            data.searchvalue = searchValue;
            preSets.getFromCache = false;
        }

        const courseEvents = await site.read<AddonBlockTimelineGetActionEventsByCourseWSResponse>(
            'core_calendar_get_action_events_by_course',
            data,
            preSets,
        );

        return this.treatCourseEvents(courseEvents, time);
    }

    /**
     * Get cache key for get calendar action events for the given course value WS call.
     *
     * @param courseId Only events in this course.
     * @returns Cache key.
     */
    protected getActionEventsByCourseCacheKey(courseId: number): string {
        return `${this.getActionEventsByCoursesCacheKey()}:${courseId}`;
    }

    /**
     * Get calendar action events for a given list of courses.
     *
     * @param courseIds Course IDs.
     * @param searchValue The value a user wishes to search against.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getActionEventsByCourses(
        courseIds: number[],
        searchValue = '',
        siteId?: string,
    ): Promise<{[courseId: string]: { events: AddonCalendarEvent[]; canLoadMore?: number } }> {
        if (courseIds.length === 0) {
            return {};
        }

        const site = await CoreSites.getSite(siteId);

        const time = this.getDayStart(-14); // Check two weeks ago.

        const data: AddonBlockTimelineGetActionEventsByCoursesWSParams = {
            timesortfrom: time,
            courseids: courseIds,
            limitnum: AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActionEventsByCoursesCacheKey(),
        };

        if (searchValue != '') {
            data.searchvalue = searchValue;
            preSets.getFromCache = false;
        }

        const events = await site.read<AddonBlockTimelineGetActionEventsByCoursesWSResponse>(
            'core_calendar_get_action_events_by_courses',
            data,
            preSets,
        );

        const courseEvents: {[courseId: string]: { events: AddonCalendarEvent[]; canLoadMore?: number } } = {};

        events.groupedbycourse.forEach((course) => {
            courseEvents[course.courseid] = this.treatCourseEvents(course, time);
        });

        return courseEvents;
    }

    /**
     * Get cache key for get calendar action events for a given list of courses value WS call.
     *
     * @returns Cache key.
     */
    protected getActionEventsByCoursesCacheKey(): string {
        return `${AddonBlockTimelineProvider.ROOT_CACHE_KEY}bycourse`;
    }

    /**
     * Get calendar action events based on the timesort value.
     *
     * @param afterEventId The last seen event id.
     * @param searchValue The value a user wishes to search against.
     * @param siteId Site ID. If not defined, use current site.
     * @returns Promise resolved when the info is retrieved.
     */
    async getActionEventsByTimesort(
        afterEventId?: number,
        searchValue = '',
        siteId?: string,
    ): Promise<{ events: AddonCalendarEvent[]; canLoadMore?: number }> {
        const site = await CoreSites.getSite(siteId);

        const timesortfrom = this.getDayStart(-14); // Check two weeks ago.
        const limitnum = AddonBlockTimelineProvider.EVENTS_LIMIT;

        const data: AddonBlockTimelineGetActionEventsByTimesortWSParams = {
            timesortfrom,
            limitnum,
            limittononsuspendedevents: true,
        };
        if (afterEventId) {
            data.aftereventid = afterEventId;
        }

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActionEventsByTimesortCacheKey(afterEventId, limitnum),
            getCacheUsingCacheKey: true,
            uniqueCacheKey: true,
        };

        if (searchValue != '') {
            data.searchvalue = searchValue;
            preSets.getFromCache = false;
            preSets.cacheKey += `:${searchValue}`;
        }

        const result = await site.read<AddonBlockTimelineGetActionEventsByTimesortWSResponse>(
            'core_calendar_get_action_events_by_timesort',
            data,
            preSets,
        );

        const canLoadMore = result.events.length >= limitnum ? result.lastid : undefined;

        // Filter events by time in case it uses cache.
        const events = result.events.filter((element) => element.timesort >= timesortfrom);

        return {
            events,
            canLoadMore,
        };
    }

    /**
     * Get prefix cache key for calendar action events based on the timesort value WS calls.
     *
     * @returns Cache key.
     */
    protected getActionEventsByTimesortPrefixCacheKey(): string {
        return `${AddonBlockTimelineProvider.ROOT_CACHE_KEY}bytimesort:`;
    }

    /**
     * Get cache key for get calendar action events based on the timesort value WS call.
     *
     * @param afterEventId The last seen event id.
     * @param limit Limit num of the call.
     * @returns Cache key.
     */
    protected getActionEventsByTimesortCacheKey(afterEventId?: number, limit?: number): string {
        afterEventId = afterEventId || 0;
        limit = limit || 0;

        return `${this.getActionEventsByTimesortPrefixCacheKey() + afterEventId  }:${limit}`;
    }

    /**
     * Invalidates get calendar action events for a given list of courses WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateActionEventsByCourses(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getActionEventsByCoursesCacheKey());
    }

    /**
     * Invalidates get calendar action events based on the timesort value WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     */
    async invalidateActionEventsByTimesort(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getActionEventsByTimesortPrefixCacheKey());
    }

    /**
     * Handles course events, filtering and treating if more can be loaded.
     *
     * @param course Object containing response course events info.
     * @param timeFrom Current time to filter events from.
     * @returns Object with course events and last loaded event id if more can be loaded.
     */
    protected treatCourseEvents(
        course: AddonBlockTimelineEvents,
        timeFrom: number,
    ): { events: AddonCalendarEvent[]; canLoadMore?: number } {

        const canLoadMore: number | undefined =
            course.events.length >= AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE ? course.lastid : undefined;

        // Filter events by time in case it uses cache.
        course.events = course.events.filter((element) => element.timesort >= timeFrom);

        return {
            events: course.events,
            canLoadMore,
        };
    }

    /**
     * Returns the timestamp at the start of the day with an optional offset.
     *
     * @param daysOffset Offset days to add or substract.
     * @returns timestamp.
     */
    getDayStart(daysOffset = 0): number {
        return dayjs.tz().startOf('day').add(daysOffset, 'days').unix();
    }

}

export const AddonBlockTimeline = makeSingleton(AddonBlockTimelineProvider);

/**
 * Params of core_calendar_get_action_events_by_timesort WS.
 */
type AddonBlockTimelineGetActionEventsByTimesortWSParams = {
    timesortfrom?: number; // Time sort from.
    timesortto?: number; // Time sort to.
    aftereventid?: number; // The last seen event id.
    limitnum?: number; // Limit number.
    limittononsuspendedevents?: boolean; // Limit the events to courses the user is not suspended in.
    userid?: number; // The user id.
    searchvalue?: string; // The value a user wishes to search against.
};

/**
 * Data returned by core_calendar_get_action_events_by_timesort WS.
 *
 * WS Description: Get calendar action events by tiemsort
 */
type AddonBlockTimelineGetActionEventsByTimesortWSResponse = AddonBlockTimelineEvents;

/**
 * Params of core_calendar_get_action_events_by_course WS.
 */
type AddonBlockTimelineGetActionEventsByCourseWSParams = {
    courseid: number; // Course id.
    timesortfrom?: number; // Time sort from.
    timesortto?: number; // Time sort to.
    aftereventid?: number; // The last seen event id.
    limitnum?: number; // Limit number.
    searchvalue?: string; // The value a user wishes to search against.
};

/**
 * Params of core_calendar_get_action_events_by_courses WS.
 */
type AddonBlockTimelineGetActionEventsByCoursesWSParams = {
    courseids: number[];
    timesortfrom?: number; // Time sort from.
    timesortto?: number; // Time sort to.
    limitnum?: number; // Limit number.
    searchvalue?: string; // The value a user wishes to search against.
};

/**
 * Data returned by calendar's events_grouped_by_course_exporter.
 * Data returned by core_calendar_get_action_events_by_courses WS.
 */
type AddonBlockTimelineGetActionEventsByCoursesWSResponse = {
    groupedbycourse: AddonBlockTimelineEventsSameCourse[]; // Groupped by course.
};

/**
 * Data returned by calendar's events_same_course_exporter.
 */
type AddonBlockTimelineEventsSameCourse = AddonBlockTimelineEvents & {
    courseid: number; // Courseid.
};

/**
 * Data returned by core_calendar_get_action_events_by_course WS.
 *
 * WS Description: Get calendar action events by course
 */
type AddonBlockTimelineGetActionEventsByCourseWSResponse = AddonBlockTimelineEvents;

/**
 * Data returned by calendar's events_exporter.
 */
export type AddonBlockTimelineEvents = {
    events: AddonCalendarEvent[]; // Events.
    firstid: number; // Firstid.
    lastid: number; // Lastid.
};
