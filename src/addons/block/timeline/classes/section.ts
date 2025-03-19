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

import { AddonBlockTimeline } from '@addons/block/timeline/services/timeline';
import { AddonCalendarEvent } from '@addons/calendar/services/calendar';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreEnrolledCourseDataWithOptions } from '@features/courses/services/courses-helper';
import { CoreTime } from '@singletons/time';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * A collection of events displayed in the timeline block.
 */
export class AddonBlockTimelineSection {

    search: string | null;
    overdue: boolean;
    dateRange: AddonBlockTimelineDateRange;
    course?: CoreEnrolledCourseDataWithOptions;

    private dataSubject$: BehaviorSubject<AddonBlockTimelineSectionData>;

    constructor(
        search: string | null,
        overdue: boolean,
        dateRange: AddonBlockTimelineDateRange,
        course?: CoreEnrolledCourseDataWithOptions,
        courseEvents?: AddonCalendarEvent[],
        canLoadMore?: number,
    ) {
        this.search = search;
        this.overdue = overdue;
        this.dateRange = dateRange;
        this.course = course;
        this.dataSubject$ = new BehaviorSubject<AddonBlockTimelineSectionData>({
            events: [],
            lastEventId: canLoadMore,
            canLoadMore: typeof canLoadMore !== 'undefined',
            loadingMore: false,
        });

        if (courseEvents) {
            // eslint-disable-next-line promise/catch-or-return
            this.reduceEvents(courseEvents, overdue, dateRange).then(events => this.dataSubject$.next({
                ...this.dataSubject$.value,
                events,
            }));
        }
    }

    get data$(): Observable<AddonBlockTimelineSectionData> {
        return this.dataSubject$;
    }

    /**
     * Load more events.
     */
    async loadMore(): Promise<void> {
        this.dataSubject$.next({
            ...this.dataSubject$.value,
            loadingMore: true,
        });

        const lastEventId = this.dataSubject$.value.lastEventId;
        const { events, canLoadMore } = this.course
            ? await AddonBlockTimeline.getActionEventsByCourse(this.course.id, lastEventId, this.search ?? '')
            : await AddonBlockTimeline.getActionEventsByTimesort(lastEventId, this.search ?? '');

        this.dataSubject$.next({
            events: this.dataSubject$.value.events.concat(await this.reduceEvents(events, this.overdue, this.dateRange)),
            lastEventId: canLoadMore,
            canLoadMore: canLoadMore !== undefined,
            loadingMore: false,
        });
    }

    /**
     * Reduce a list of events to a list of events classified by day.
     *
     * @param events Events.
     * @param overdue Whether to filter overdue events or not.
     * @param dateRange Date range to filter events.
     * @returns Day events list.
     */
    private async reduceEvents(
        events: AddonCalendarEvent[],
        overdue: boolean,
        { from, to }: AddonBlockTimelineDateRange,
    ): Promise<AddonBlockTimelineDayEvents[]> {
        const filterDates: AddonBlockTimelineFilterDates = {
            now: CoreTime.timestamp(),
            midnight: AddonBlockTimeline.getDayStart(),
            start: AddonBlockTimeline.getDayStart(from),
            end: typeof to === 'number' ? AddonBlockTimeline.getDayStart(to) : undefined,
        };
        const timelineEvents = await Promise.all(
            events
                .filter((event) => this.filterEvent(event, overdue, filterDates))
                .map((event) => this.mapToTimelineEvent(event, filterDates.now)),
        );

        const eventsByDates = timelineEvents.reduce((filteredEvents, event) => {
            const dayTimestamp = CoreTime.getMidnightForTimestamp(event.timesort);

            filteredEvents[dayTimestamp] = filteredEvents[dayTimestamp] ?? {
                dayTimestamp,
                events: [],
            } as AddonBlockTimelineDayEvents;

            filteredEvents[dayTimestamp].events.push(event);

            return filteredEvents;
        }, {} as Record<string, AddonBlockTimelineDayEvents>);

        return Object.values(eventsByDates);
    }

    /**
     * Check whether to include an event in the section or not.
     *
     * @param event Event.
     * @param overdue Whether to filter overdue events or not.
     * @param filterDates Filter dates.
     * @returns Whetehr to include the event or not.
     */
    private filterEvent(
        event: AddonCalendarEvent,
        overdue: boolean,
        { now, midnight, start, end }: AddonBlockTimelineFilterDates,
    ): boolean {
        if (start > event.timesort || (end && event.timesort >= end)) {
            return false;
        }

        // Already calculated on 4.0 onwards but this will be live.
        if (event.eventtype === 'open' || event.eventtype === 'opensubmission') {
            const dayTimestamp = CoreTime.getMidnightForTimestamp(event.timesort);

            return dayTimestamp > midnight;
        }

        // When filtering by overdue, we fetch all events due today, in case any have elapsed already and are overdue.
        // This means if filtering by overdue, some events fetched might not be required (eg if due later today).
        return !overdue || event.timesort < now;
    }

    /**
     * Map a calendar event to a timeline event.
     *
     * @param event Calendar event.
     * @param now Current time.
     * @returns Timeline event.
     */
    private async mapToTimelineEvent(event: AddonCalendarEvent, now: number): Promise<AddonBlockTimelineEvent> {
        const modulename = event.modulename || event.icon.component;

        return {
            ...event,
            modulename,
            overdue: event.timesort < now,
            iconUrl: await CoreCourseModuleDelegate.getModuleIconSrc(event.icon.component, event.icon.iconurl),
            iconTitle: CoreCourseModuleHelper.translateModuleName(modulename),
        } as AddonBlockTimelineEvent;
    }

}

/**
 * Section data.
 */
export type AddonBlockTimelineSectionData = {
    events: AddonBlockTimelineDayEvents[];
    lastEventId?: number;
    canLoadMore: boolean;
    loadingMore: boolean;
};

/**
 * Timestamps to use during event filtering.
 */
export type AddonBlockTimelineFilterDates = {
    now: number;
    midnight: number;
    start: number;
    end?: number;
};

/**
 * Date range.
 */
export type AddonBlockTimelineDateRange = {
    from: number;
    to?: number;
};

/**
 * Timeline event.
 */
export type AddonBlockTimelineEvent = AddonCalendarEvent & {
    iconUrl?: string;
    iconTitle?: string;
};

/**
 * List of events in a day.
 */
export type AddonBlockTimelineDayEvents = {
    events: AddonBlockTimelineEvent[];
    dayTimestamp: number;
};
