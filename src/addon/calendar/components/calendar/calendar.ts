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
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { CoreCoursesProvider } from '@core/courses/providers/courses';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
})
export class AddonCalendarCalendarComponent implements OnInit, OnChanges, OnDestroy {
    @Input() initialYear: number | string; // Initial year to load.
    @Input() initialMonth: number | string; // Initial month to load.
    @Input() courseId: number | string;
    @Input() categoryId: number | string; // Category ID the course belongs to.
    @Input() canNavigate?: string | boolean; // Whether to include arrows to change the month. Defaults to true.
    @Input() displayNavButtons?: string | boolean; // Whether to display nav buttons created by this component. Defaults to true.
    @Output() onEventClicked = new EventEmitter<number>();
    @Output() onDayClicked = new EventEmitter<{day: number, month: number, year: number}>();

    periodName: string;
    weekDays: any[];
    weeks: any[];
    loaded = false;
    timeFormat: string;
    isCurrentMonth: boolean;

    protected year: number;
    protected month: number;
    protected categoriesRetrieved = false;
    protected categories = {};
    protected currentSiteId: string;
    protected offlineEvents: {[monthId: string]: {[day: number]: any[]}} = {}; // Offline events classified in month & day.
    protected offlineEditedEventsIds = []; // IDs of events edited in offline.
    protected deletedEvents = []; // Events deleted in offline.

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
            private timeUtils: CoreTimeUtilsProvider,
            private utils: CoreUtilsProvider,
            private coursesProvider: CoreCoursesProvider) {

        this.currentSiteId = sitesProvider.getCurrentSiteId();

        if (localNotificationsProvider.isAvailable()) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = eventsProvider.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                this.weeks.forEach((week) => {
                    week.days.forEach((day) => {
                        calendarProvider.scheduleEventsNotifications(day.events);
                    });
                });
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
        const now = new Date();

        this.year = this.initialYear ? Number(this.initialYear) : now.getFullYear();
        this.month = this.initialMonth ? Number(this.initialMonth) : now.getMonth() + 1;

        this.calculateIsCurrentMonth();

        this.fetchData();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: {[name: string]: SimpleChange}): void {
        this.canNavigate = typeof this.canNavigate == 'undefined' ? true : this.utils.isTrueOrOne(this.canNavigate);
        this.displayNavButtons = typeof this.displayNavButtons == 'undefined' ? true :
                this.utils.isTrueOrOne(this.displayNavButtons);

        if ((changes.courseId || changes.categoryId) && this.weeks) {
            this.filterEvents();
        }
    }

    /**
     * Fetch contacts.
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

            // Classify them by month.
            this.offlineEvents = this.calendarHelper.classifyIntoMonths(events);

            // Get the IDs of events edited in offline.
            const filtered = events.filter((event) => {
                return event.id > 0;
            });
            this.offlineEditedEventsIds = filtered.map((event) => {
                return event.id;
            });
        }));

        // Get events deleted in offline.
        promises.push(this.calendarOffline.getAllDeletedEventsIds().then((ids) => {
            this.deletedEvents = ids;
        }));

        // Get time format to use.
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
     * Fetch the events for current month.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchEvents(): Promise<any> {
        // Don't pass courseId and categoryId, we'll filter them locally.
        return this.calendarProvider.getMonthlyEvents(this.year, this.month).then((result) => {

            // Calculate the period name. We don't use the one in result because it's in server's language.
            this.periodName = this.timeUtils.userDate(new Date(this.year, this.month - 1).getTime(), 'core.strftimemonthyear');

            this.weekDays = this.calendarProvider.getWeekDays(result.daynames[0].dayno);
            this.weeks = result.weeks;

            // Merge the online events with offline data.
            this.mergeEvents();

            // Filter events by course.
            this.filterEvents();
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

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                if (!courseId || courseId < 0) {
                    day.filteredEvents = day.events;
                } else {
                    day.filteredEvents = day.events.filter((event) => {
                        return this.calendarHelper.shouldDisplayEvent(event, courseId, categoryId, this.categories);
                    });
                }

                // Re-calculate some properties.
                this.calendarHelper.calculateDayData(day, day.filteredEvents);
            });
        });
    }

    /**
     * Refresh events.
     *
     * @param {boolean} [sync] Whether it should try to synchronize offline events.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(sync?: boolean, showErrors?: boolean): Promise<any> {
        const promises = [];

        promises.push(this.calendarProvider.invalidateMonthlyEvents(this.year, this.month));
        promises.push(this.coursesProvider.invalidateCategories(0, true));
        promises.push(this.calendarProvider.invalidateTimeFormat());

        this.categoriesRetrieved = false; // Get categories again.

        return Promise.all(promises).then(() => {
            return this.fetchData(true);
        });
    }

    /**
     * Load next month.
     */
    loadNext(): void {
        this.increaseMonth();

        this.loaded = false;

        this.fetchEvents().catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.decreaseMonth();
        }).finally(() => {
            this.calculateIsCurrentMonth();
            this.loaded = true;
        });
    }

    /**
     * Load previous month.
     */
    loadPrevious(): void {
        this.decreaseMonth();

        this.loaded = false;

        this.fetchEvents().catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.increaseMonth();
        }).finally(() => {
            this.calculateIsCurrentMonth();
            this.loaded = true;
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
     * A day was clicked.
     *
     * @param {number} day Day.
     */
    dayClicked(day: number): void {
        this.onDayClicked.emit({day: day, month: this.month, year: this.year});
    }

    /**
     * Check if user is viewing the current month.
     */
    calculateIsCurrentMonth(): void {
        const now = new Date();

        this.isCurrentMonth = this.year == now.getFullYear() && this.month == now.getMonth() + 1;
    }

    /**
     * Go to current month.
     */
    goToCurrentMonth(): void {
        const now = new Date(),
            initialMonth = this.month,
            initialYear = this.year;

        this.month = now.getMonth() + 1;
        this.year = now.getFullYear();

        this.loaded = false;

        this.fetchEvents().then(() => {
            this.isCurrentMonth = true;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.year = initialYear;
            this.month = initialMonth;
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Decrease the current month.
     */
    protected decreaseMonth(): void {
        if (this.month === 1) {
            this.month = 12;
            this.year--;
        } else {
            this.month--;
        }
    }

    /**
     * Increase the current month.
     */
    protected increaseMonth(): void {
        if (this.month === 12) {
            this.month = 1;
            this.year++;
        } else {
            this.month++;
        }
    }

    /**
     * Merge online events with the offline events of that period.
     */
    protected mergeEvents(): void {
        const monthOfflineEvents = this.offlineEvents[this.calendarHelper.getMonthId(this.year, this.month)];

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {

                // Format online events.
                day.events.forEach(this.calendarHelper.formatEventData.bind(this.calendarHelper));

                // Schedule notifications for the events retrieved (only future events will be scheduled).
                this.calendarProvider.scheduleEventsNotifications(day.events);

                if (monthOfflineEvents || this.deletedEvents.length) {
                    // There is offline data, merge it.

                    if (this.deletedEvents.length) {
                        // Mark as deleted the events that were deleted in offline.
                        day.events.forEach((event) => {
                            event.deleted = this.deletedEvents.indexOf(event.id) != -1;
                        });
                    }

                    if (this.offlineEditedEventsIds.length) {
                        // Remove the online events that were modified in offline.
                        day.events = day.events.filter((event) => {
                            return this.offlineEditedEventsIds.indexOf(event.id) == -1;
                        });
                    }

                    if (monthOfflineEvents && monthOfflineEvents[day.mday]) {
                        // Add the offline events (either new or edited).
                        day.events = this.sortEvents(day.events.concat(monthOfflineEvents[day.mday]));
                    }
                }
            });
        });
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
        if (!this.weeks) {
            return;
        }

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                const event = day.events.find((event) => {
                    return event.id == eventId;
                });

                if (event) {
                    event.deleted = false;
                }
            });
        });
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.undeleteEventObserver && this.undeleteEventObserver.off();
        this.obsDefaultTimeChange && this.obsDefaultTimeChange.off();
    }
}
