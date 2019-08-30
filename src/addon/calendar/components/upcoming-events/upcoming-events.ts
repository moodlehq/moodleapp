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

import { Component, OnDestroy, OnInit, Input, OnChanges, SimpleChange, Output, EventEmitter } from '@angular/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreConstants } from '@core/constants';

/**
 * Component that displays upcoming events.
 */
@Component({
    selector: 'addon-calendar-upcoming-events',
    templateUrl: 'addon-calendar-upcoming-events.html',
})
export class AddonCalendarUpcomingEventsComponent implements OnInit, OnChanges, OnDestroy {
    @Input() courseId: number | string;
    @Input() categoryId: number | string; // Category ID the course belongs to.
    @Output() onEventClicked = new EventEmitter<number>();

    filteredEvents = [];
    loaded = false;

    protected year: number;
    protected month: number;
    protected categoriesRetrieved = false;
    protected categories = {};
    protected currentSiteId: string;
    protected events = []; // Events (both online and offline).
    protected onlineEvents = [];
    protected offlineEvents = []; // Offline events.
    protected deletedEvents = []; // Events deleted in offline.
    protected lookAhead: number;
    protected timeFormat: string;

    // Observers.
    protected undeleteEventObserver: any;
    protected obsDefaultTimeChange: any;

    constructor(eventsProvider: CoreEventsProvider,
            sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarHelper: AddonCalendarHelperProvider,
            private calendarOffline: AddonCalendarOfflineProvider,
            private domUtils: CoreDomUtilsProvider,
            private coursesProvider: CoreCoursesProvider) {

        this.currentSiteId = sitesProvider.getCurrentSiteId();

        if (localNotificationsProvider.isAvailable()) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = eventsProvider.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                calendarProvider.scheduleEventsNotifications(this.onlineEvents);
            }, this.currentSiteId);
        }

        // Listen for events "undeleted" (offline).
        this.undeleteEventObserver = eventsProvider.on(AddonCalendarProvider.UNDELETED_EVENT_EVENT, (data) => {
            if (data && data.eventId) {
                // Mark it as undeleted, no need to refresh.
                this.undeleteEvent(data.eventId);

                // Remove it from the list of deleted events if it's there.
                const index = this.deletedEvents.indexOf(data.eventId);
                if (index != -1) {
                    this.deletedEvents.splice(index, 1);
                }
            }
        }, this.currentSiteId);
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        this.fetchData();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        if (changes.courseId || changes.categoryId) {
            this.filterEvents();
        }
    }

    /**
     * Fetch data.
     *
     * @param {boolean} [refresh=false] True if we are refreshing events.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        const promises = [];

        promises.push(this.loadCategories());

        // Get offline events.
        promises.push(this.calendarOffline.getAllEditedEvents().then((events) => {
            // Format data.
            events.forEach((event) => {
                event.offline = true;
                this.calendarHelper.formatEventData(event);
            });

           this.offlineEvents = this.sortEvents(events);
        }));

        // Get events deleted in offline.
        promises.push(this.calendarOffline.getAllDeletedEventsIds().then((ids) => {
            this.deletedEvents = ids;
        }));

        // Get user preferences.
        promises.push(this.calendarProvider.getCalendarLookAhead().then((value) => {
            this.lookAhead = value;
        }));

        promises.push(this.calendarProvider.getCalendarTimeFormat().then((value) => {
            this.timeFormat = value;
        }));

        return Promise.all(promises).then(() => {
            return this.fetchEvents();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Fetch upcoming events.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchEvents(): Promise<any> {
        // Don't pass courseId and categoryId, we'll filter them locally.
        return this.calendarProvider.getUpcomingEvents().then((result) => {
            const promises = [];

            this.onlineEvents = result.events;

            this.onlineEvents.forEach(this.calendarHelper.formatEventData.bind(this.calendarHelper));

            // Schedule notifications for the events retrieved.
            this.calendarProvider.scheduleEventsNotifications(this.onlineEvents);

            // Merge the online events with offline data.
            this.events = this.mergeEvents();

            // Filter events by course.
            this.filterEvents();

            // Re-calculate the formatted time so it uses the device date.
            this.events.forEach((event) => {
                promises.push(this.calendarProvider.formatEventTime(event, this.timeFormat).then((time) => {
                    event.formattedtime = time;
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadCategories(): Promise<any> {
        if (this.categoriesRetrieved) {
            // Already retrieved, stop.
            return Promise.resolve();
        }

        return this.coursesProvider.getCategories(0, true).then((cats) => {
            this.categoriesRetrieved = true;
            this.categories = {};

            // Index categories by ID.
            cats.forEach((category) => {
                this.categories[category.id] = category;
            });
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Filter events to only display events belonging to a certain course.
     */
    filterEvents(): void {
        const courseId = this.courseId ? Number(this.courseId) : undefined,
            categoryId = this.categoryId ? Number(this.categoryId) : undefined;

        if (!courseId || courseId < 0) {
            this.filteredEvents = this.events;
        } else {
            this.filteredEvents = this.events.filter((event) => {
                return this.calendarHelper.shouldDisplayEvent(event, courseId, categoryId, this.categories);
            });
        }
    }

    /**
     * Refresh events.
     *
     * @param {boolean} [afterChange] Whether the refresh is done after an event has changed or has been synced.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(afterChange?: boolean): Promise<any> {
        const promises = [];

        // Don't invalidate upcoming events after a change, it has already been handled.
        if (!afterChange) {
            promises.push(this.calendarProvider.invalidateAllUpcomingEvents());
        }
        promises.push(this.coursesProvider.invalidateCategories(0, true));
        promises.push(this.calendarProvider.invalidateLookAhead());
        promises.push(this.calendarProvider.invalidateTimeFormat());

        this.categoriesRetrieved = false; // Get categories again.

        return Promise.all(promises).then(() => {
            return this.fetchData(true);
        });
    }

    /**
     * An event was clicked.
     *
     * @param {any} event Event.
     */
    eventClicked(event: any): void {
        this.onEventClicked.emit(event.id);
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @return {any[]} Merged events.
     */
    protected mergeEvents(): any[] {
        if (!this.offlineEvents.length && !this.deletedEvents.length) {
            // No offline events, nothing to merge.
            return this.onlineEvents;
        }

        const start = Date.now() / 1000,
            end = start + (CoreConstants.SECONDS_DAY * this.lookAhead);
        let result = this.onlineEvents;

        if (this.deletedEvents.length) {
            // Mark as deleted the events that were deleted in offline.
            result.forEach((event) => {
                event.deleted = this.deletedEvents.indexOf(event.id) != -1;
            });
        }

        if (this.offlineEvents.length) {
            // Remove the online events that were modified in offline.
            result = result.filter((event) => {
                const offlineEvent = this.offlineEvents.find((ev) => {
                    return ev.id == event.id;
                });

                return !offlineEvent;
            });
        }

        // Now get the offline events that belong to this period.
        const periodOfflineEvents = this.offlineEvents.filter((event) => {
            return (event.timestart >= start || event.timestart + event.timeduration >= start) && event.timestart <= end;
        });

        // Merge both arrays and sort them.
        result = result.concat(periodOfflineEvents);

        return this.sortEvents(result);
    }

    /**
     * Sort events by timestart.
     *
     * @param {any[]} events List to sort.
     */
    protected sortEvents(events: any[]): any[] {
        return events.sort((a, b) => {
            if (a.timestart == b.timestart) {
                return a.timeduration - b.timeduration;
            }

            return a.timestart - b.timestart;
        });
    }

    /**
     * Undelete a certain event.
     *
     * @param {number} eventId Event ID.
     */
    protected undeleteEvent(eventId: number): void {
        const event = this.onlineEvents.find((event) => {
            return event.id == eventId;
        });

        if (event) {
            event.deleted = false;
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.undeleteEventObserver && this.undeleteEventObserver.off();
        this.obsDefaultTimeChange && this.obsDefaultTimeChange.off();
    }
}
