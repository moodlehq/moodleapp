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
import { CoreSitesProvider } from '@providers/sites';
import { CoreCoursesDashboardProvider } from '@core/courses/providers/dashboard';
import { AddonCalendarEvents, AddonCalendarEventsGroupedByCourse, AddonCalendarEvent } from '@addon/calendar/providers/calendar';
import * as moment from 'moment';

/**
 * Service that provides some features regarding course overview.
 */
@Injectable()
export class AddonBlockTimelineProvider {
    static EVENTS_LIMIT = 20;
    static EVENTS_LIMIT_PER_COURSE = 10;
    // Cache key was maintained when moving the functions to this file. It comes from core myoverview.
    protected ROOT_CACHE_KEY = 'myoverview:';

    constructor(private sitesProvider: CoreSitesProvider, private dashboardProvider: CoreCoursesDashboardProvider) { }

    /**
     * Get calendar action events for the given course.
     *
     * @param courseId Only events in this course.
     * @param afterEventId The last seen event id.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the info is retrieved.
     */
    getActionEventsByCourse(courseId: number, afterEventId?: number, siteId?: string):
            Promise<{ events: AddonCalendarEvent[], canLoadMore: number }> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data: any = {
                    timesortfrom: time,
                    courseid: courseId,
                    limitnum: AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE
                },
                preSets = {
                    cacheKey: this.getActionEventsByCourseCacheKey(courseId)
                };

            if (afterEventId) {
                data.aftereventid = afterEventId;
            }

            return site.read('core_calendar_get_action_events_by_course', data, preSets)
                    .then((courseEvents: AddonCalendarEvents): any => {

                if (courseEvents && courseEvents.events) {
                    return this.treatCourseEvents(courseEvents, time);
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get calendar action events for the given course value WS call.
     *
     * @param courseId Only events in this course.
     * @return Cache key.
     */
    protected getActionEventsByCourseCacheKey(courseId: number): string {
        return this.getActionEventsByCoursesCacheKey() + ':' + courseId;
    }

    /**
     * Get calendar action events for a given list of courses.
     *
     * @param courseIds Course IDs.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the info is retrieved.
     */
    getActionEventsByCourses(courseIds: number[], siteId?: string): Promise<{ [courseId: string]:
            { events: AddonCalendarEvent[], canLoadMore: number } }> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data = {
                    timesortfrom: time,
                    courseids: courseIds,
                    limitnum: AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE
                },
                preSets = {
                    cacheKey: this.getActionEventsByCoursesCacheKey()
                };

            return site.read('core_calendar_get_action_events_by_courses', data, preSets)
                    .then((events: AddonCalendarEventsGroupedByCourse): any => {

                if (events && events.groupedbycourse) {
                    const courseEvents = {};

                    events.groupedbycourse.forEach((course) => {
                        courseEvents[course.courseid] = this.treatCourseEvents(course, time);
                    });

                    return courseEvents;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get calendar action events for a given list of courses value WS call.
     *
     * @return Cache key.
     */
    protected getActionEventsByCoursesCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'bycourse';
    }

    /**
     * Get calendar action events based on the timesort value.
     *
     * @param afterEventId The last seen event id.
     * @param siteId Site ID. If not defined, use current site.
     * @return Promise resolved when the info is retrieved.
     */
    getActionEventsByTimesort(afterEventId: number, siteId?: string):
            Promise<{ events: AddonCalendarEvent[], canLoadMore: number }> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            const time = moment().subtract(14, 'days').unix(), // Check two weeks ago.
                data: any = {
                    timesortfrom: time,
                    limitnum: AddonBlockTimelineProvider.EVENTS_LIMIT
                },
                preSets = {
                    cacheKey: this.getActionEventsByTimesortCacheKey(afterEventId, data.limitnum),
                    getCacheUsingCacheKey: true,
                    uniqueCacheKey: true
                };

            if (afterEventId) {
                data.aftereventid = afterEventId;
            }

            return site.read('core_calendar_get_action_events_by_timesort', data, preSets)
                    .then((result: AddonCalendarEvents): any => {

                if (result && result.events) {
                    const canLoadMore = result.events.length >= data.limitnum ? result.lastid : undefined;

                    // Filter events by time in case it uses cache.
                    const events = result.events.filter((element) => {
                        return element.timesort >= time;
                    });

                    return {
                        events: events,
                        canLoadMore: canLoadMore
                    };
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get prefix cache key for calendar action events based on the timesort value WS calls.
     *
     * @return Cache key.
     */
    protected getActionEventsByTimesortPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'bytimesort:';
    }

    /**
     * Get cache key for get calendar action events based on the timesort value WS call.
     *
     * @param afterEventId The last seen event id.
     * @param limit Limit num of the call.
     * @return Cache key.
     */
    protected getActionEventsByTimesortCacheKey(afterEventId?: number, limit?: number): string {
        afterEventId = afterEventId || 0;
        limit = limit || 0;

        return this.getActionEventsByTimesortPrefixCacheKey() + afterEventId + ':' + limit;
    }

    /**
     * Invalidates get calendar action events for a given list of courses WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateActionEventsByCourses(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getActionEventsByCoursesCacheKey());
        });
    }

    /**
     * Invalidates get calendar action events based on the timesort value WS call.
     *
     * @param siteId Site ID to invalidate. If not defined, use current site.
     * @return Promise resolved when the data is invalidated.
     */
    invalidateActionEventsByTimesort(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getActionEventsByTimesortPrefixCacheKey());
        });
    }

    /**
     * Returns whether or not My Overview is available for a certain site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if available, resolved with false or rejected otherwise.
     */
    isAvailable(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            // First check if dashboard is disabled.
            if (this.dashboardProvider.isDisabledInSite(site)) {
                return false;
            }

            return site.wsAvailable('core_calendar_get_action_events_by_courses') &&
                site.wsAvailable('core_calendar_get_action_events_by_timesort');
        });
    }

    /**
     * Handles course events, filtering and treating if more can be loaded.
     *
     * @param course Object containing response course events info.
     * @param timeFrom Current time to filter events from.
     * @return Object with course events and last loaded event id if more can be loaded.
     */
    protected treatCourseEvents(course: AddonCalendarEvents, timeFrom: number):
            { events: AddonCalendarEvent[], canLoadMore: number } {

        const canLoadMore: number =
            course.events.length >= AddonBlockTimelineProvider.EVENTS_LIMIT_PER_COURSE ? course.lastid : undefined;

        // Filter events by time in case it uses cache.
        course.events = course.events.filter((element) => {
            return element.timesort >= timeFrom;
        });

        return {
            events: course.events,
            canLoadMore: canLoadMore
        };
    }
}
