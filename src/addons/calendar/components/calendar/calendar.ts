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

import {
    Component,
    OnDestroy,
    OnInit,
    Input,
    DoCheck,
    Output,
    EventEmitter,
    KeyValueDiffers,
    KeyValueDiffer,
} from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import {
    AddonCalendar,
    AddonCalendarProvider,
    AddonCalendarWeek,
    AddonCalendarWeekDaysTranslationKeys,
    AddonCalendarEventToDisplay,
    AddonCalendarDayName,
} from '../../services/calendar';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { CoreCategoryData, CoreCourses } from '@features/courses/services/courses';
import { CoreApp } from '@services/app';
import { CoreLocalNotifications } from '@services/local-notifications';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
    styleUrls: ['calendar.scss'],
})
export class AddonCalendarCalendarComponent implements OnInit, DoCheck, OnDestroy {

    @Input() initialYear?: number; // Initial year to load.
    @Input() initialMonth?: number; // Initial month to load.
    @Input() filter?: AddonCalendarFilter; // Filter to apply.
    @Input() canNavigate?: string | boolean; // Whether to include arrows to change the month. Defaults to true.
    @Input() displayNavButtons?: string | boolean; // Whether to display nav buttons created by this component. Defaults to true.
    @Output() onEventClicked = new EventEmitter<number>();
    @Output() onDayClicked = new EventEmitter<{day: number; month: number; year: number}>();

    periodName?: string;
    weekDays: AddonCalendarWeekDaysTranslationKeys[] = [];
    weeks: AddonCalendarWeek[] = [];
    loaded = false;
    timeFormat?: string;
    isCurrentMonth = false;
    isPastMonth = false;

    protected year?: number;
    protected month?: number;
    protected categoriesRetrieved = false;
    protected categories: { [id: number]: CoreCategoryData } = {};
    protected currentSiteId: string;
    protected offlineEvents: { [monthId: string]: { [day: number]: AddonCalendarEventToDisplay[] } } =
        {}; // Offline events classified in month & day.

    protected offlineEditedEventsIds: number[] = []; // IDs of events edited in offline.
    protected deletedEvents: number[] = []; // Events deleted in offline.
    protected currentTime?: number;
    protected differ: KeyValueDiffer<unknown, unknown>; // To detect changes in the data input.
    // Observers.
    protected undeleteEventObserver: CoreEventObserver;
    protected obsDefaultTimeChange?: CoreEventObserver;

    constructor(
        differs: KeyValueDiffers,
    ) {
        this.currentSiteId = CoreSites.getCurrentSiteId();

        if (CoreLocalNotifications.isAvailable()) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = CoreEvents.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                this.weeks.forEach((week) => {
                    week.days.forEach((day) => {
                        AddonCalendar.scheduleEventsNotifications(day.eventsFormated!);
                    });
                });
            }, this.currentSiteId);
        }

        // Listen for events "undeleted" (offline).
        this.undeleteEventObserver = CoreEvents.on(
            AddonCalendarProvider.UNDELETED_EVENT_EVENT,
            (data) => {
                if (!data || !data.eventId) {
                    return;
                }

                // Mark it as undeleted, no need to refresh.
                this.undeleteEvent(data.eventId);

                // Remove it from the list of deleted events if it's there.
                const index = this.deletedEvents.indexOf(data.eventId);
                if (index != -1) {
                    this.deletedEvents.splice(index, 1);
                }
            },
            this.currentSiteId,
        );

        this.differ = differs.find([]).create();
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        const now = new Date();

        this.year = this.initialYear ? this.initialYear : now.getFullYear();
        this.month = this.initialMonth ? this.initialMonth : now.getMonth() + 1;

        this.calculateIsCurrentMonth();

        this.fetchData();
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        this.canNavigate = typeof this.canNavigate == 'undefined' ? true : CoreUtils.isTrueOrOne(this.canNavigate);
        this.displayNavButtons = typeof this.displayNavButtons == 'undefined' ? true :
            CoreUtils.isTrueOrOne(this.displayNavButtons);

        if (this.weeks) {
            // Check if there's any change in the filter object.
            const changes = this.differ.diff(this.filter!);
            if (changes) {
                this.filterEvents();
            }
        }
    }

    /**
     * Fetch contacts.
     *
     * @return Promise resolved when done.
     */
    async fetchData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(this.loadCategories());

        // Get offline events.
        promises.push(AddonCalendarOffline.getAllEditedEvents().then((events) => {
            // Classify them by month.
            this.offlineEvents = AddonCalendarHelper.classifyIntoMonths(events);

            // Get the IDs of events edited in offline.
            const filtered = events.filter((event) => event.id! > 0);
            this.offlineEditedEventsIds = filtered.map((event) => event.id!);

            return;
        }));

        // Get events deleted in offline.
        promises.push(AddonCalendarOffline.getAllDeletedEventsIds().then((ids) => {
            this.deletedEvents = ids;

            return;
        }));

        // Get time format to use.
        promises.push(AddonCalendar.getCalendarTimeFormat().then((value) => {
            this.timeFormat = value;

            return;
        }));

        try {
            await Promise.all(promises);

            await this.fetchEvents();

        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }

        this.loaded = true;
    }

    /**
     * Fetch the events for current month.
     *
     * @return Promise resolved when done.
     */
    async fetchEvents(): Promise<void> {
        // Don't pass courseId and categoryId, we'll filter them locally.
        let result: { daynames: Partial<AddonCalendarDayName>[]; weeks: Partial<AddonCalendarWeek>[] };
        try {
            result = await AddonCalendar.getMonthlyEvents(this.year!, this.month!);
        } catch (error) {
            if (!CoreApp.isOnline()) {
                // Allow navigating to non-cached months in offline (behave as if using emergency cache).
                result = await AddonCalendarHelper.getOfflineMonthWeeks(this.year!, this.month!);
            } else {
                throw error;
            }
        }

        // Calculate the period name. We don't use the one in result because it's in server's language.
        this.periodName = CoreTimeUtils.userDate(
            new Date(this.year!, this.month! - 1).getTime(),
            'core.strftimemonthyear',
        );
        this.weekDays = AddonCalendar.getWeekDays(result.daynames[0].dayno);
        this.weeks = result.weeks as AddonCalendarWeek[];
        this.calculateIsCurrentMonth();

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                day.periodName = CoreTimeUtils.userDate(
                    new Date(this.year!, this.month! - 1, day.mday).getTime(),
                    'core.strftimedaydate',
                );
                day.eventsFormated = day.eventsFormated || [];
                day.filteredEvents = day.filteredEvents || [];
                day.events.forEach((event) => {
                    /// Format online events.
                    day.eventsFormated!.push(AddonCalendarHelper.formatEventData(event));
                });
            });
        });

        if (this.isCurrentMonth) {
            const currentDay = new Date().getDate();
            let isPast = true;

            this.weeks.forEach((week) => {
                week.days.forEach((day) => {
                    day.istoday = day.mday == currentDay;
                    day.ispast = isPast && !day.istoday;
                    isPast = day.ispast;

                    if (day.istoday) {
                        day.eventsFormated!.forEach((event) => {
                            event.ispast = this.isEventPast(event);
                        });
                    }
                });
            });
        }
        // Merge the online events with offline data.
        this.mergeEvents();
        // Filter events by course.
        this.filterEvents();
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return Promise resolved when done.
     */
    protected async loadCategories(): Promise<void> {
        if (this.categoriesRetrieved) {
            // Already retrieved, stop.
            return;
        }

        try {
            const cats = await CoreCourses.getCategories(0, true);
            this.categoriesRetrieved = true;
            this.categories = {};

            // Index categories by ID.
            cats.forEach((category) => {
                this.categories[category.id] = category;
            });
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Filter events based on the filter popover.
     */
    filterEvents(): void {
        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                day.filteredEvents = AddonCalendarHelper.getFilteredEvents(
                    day.eventsFormated!,
                    this.filter!,
                    this.categories,
                );

                // Re-calculate some properties.
                AddonCalendarHelper.calculateDayData(day, day.filteredEvents);
            });
        });
    }

    /**
     * Refresh events.
     *
     * @param afterChange Whether the refresh is done after an event has changed or has been synced.
     * @return Promise resolved when done.
     */
    async refreshData(afterChange?: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        // Don't invalidate monthly events after a change, it has already been handled.
        if (!afterChange) {
            promises.push(AddonCalendar.invalidateMonthlyEvents(this.year!, this.month!));
        }
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        this.categoriesRetrieved = false; // Get categories again.

        await Promise.all(promises);

        this.fetchData();
    }

    /**
     * Load next month.
     */
    async loadNext(): Promise<void> {
        this.increaseMonth();

        this.loaded = false;

        try {
            await this.fetchEvents();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.decreaseMonth();
        }
        this.loaded = true;
    }

    /**
     * Load previous month.
     */
    async loadPrevious(): Promise<void> {
        this.decreaseMonth();

        this.loaded = false;

        try {
            await this.fetchEvents();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.increaseMonth();
        }
        this.loaded = true;
    }

    /**
     * An event was clicked.
     *
     * @param calendarEvent Calendar event..
     * @param event Mouse event.
     */
    eventClicked(calendarEvent: AddonCalendarEventToDisplay, event: Event): void {
        this.onEventClicked.emit(calendarEvent.id);
        event.stopPropagation();
    }

    /**
     * A day was clicked.
     *
     * @param day Day.
     */
    dayClicked(day: number): void {
        this.onDayClicked.emit({ day: day, month: this.month!, year: this.year! });
    }

    /**
     * Check if user is viewing the current month.
     */
    calculateIsCurrentMonth(): void {
        const now = new Date();

        this.currentTime = CoreTimeUtils.timestamp();

        this.isCurrentMonth = this.year == now.getFullYear() && this.month == now.getMonth() + 1;
        this.isPastMonth = this.year! < now.getFullYear() || (this.year == now.getFullYear() && this.month! < now.getMonth() + 1);
    }

    /**
     * Go to current month.
     */
    async goToCurrentMonth(): Promise<void> {
        const now = new Date();
        const initialMonth = this.month;
        const initialYear = this.year;

        this.month = now.getMonth() + 1;
        this.year = now.getFullYear();

        this.loaded = false;

        try {
            await this.fetchEvents();
            this.isCurrentMonth = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.year = initialYear;
            this.month = initialMonth;
        }

        this.loaded = true;
    }

    /**
     * Decrease the current month.
     */
    protected decreaseMonth(): void {
        if (this.month === 1) {
            this.month = 12;
            this.year!--;
        } else {
            this.month!--;
        }
    }

    /**
     * Increase the current month.
     */
    protected increaseMonth(): void {
        if (this.month === 12) {
            this.month = 1;
            this.year!++;
        } else {
            this.month!++;
        }
    }

    /**
     * Merge online events with the offline events of that period.
     */
    protected mergeEvents(): void {
        const monthOfflineEvents: { [day: number]: AddonCalendarEventToDisplay[] } =
            this.offlineEvents[AddonCalendarHelper.getMonthId(this.year!, this.month!)];

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {

                // Schedule notifications for the events retrieved (only future events will be scheduled).
                AddonCalendar.scheduleEventsNotifications(day.eventsFormated!);

                if (monthOfflineEvents || this.deletedEvents.length) {
                    // There is offline data, merge it.

                    if (this.deletedEvents.length) {
                        // Mark as deleted the events that were deleted in offline.
                        day.eventsFormated!.forEach((event) => {
                            event.deleted = this.deletedEvents.indexOf(event.id) != -1;
                        });
                    }

                    if (this.offlineEditedEventsIds.length) {
                        // Remove the online events that were modified in offline.
                        day.events = day.events.filter((event) => this.offlineEditedEventsIds.indexOf(event.id) == -1);
                    }

                    if (monthOfflineEvents && monthOfflineEvents[day.mday]) {
                        // Add the offline events (either new or edited).
                        day.eventsFormated =
                            AddonCalendarHelper.sortEvents(day.eventsFormated!.concat(monthOfflineEvents[day.mday]));
                    }
                }
            });
        });
    }

    /**
     * Undelete a certain event.
     *
     * @param eventId Event ID.
     */
    protected undeleteEvent(eventId: number): void {
        if (!this.weeks) {
            return;
        }

        this.weeks.forEach((week) => {
            week.days.forEach((day) => {
                const event = day.eventsFormated!.find((event) => event.id == eventId);

                if (event) {
                    event.deleted = false;
                }
            });
        });
    }

    /**
     * Returns if the event is in the past or not.
     *
     * @param event Event object.
     * @return True if it's in the past.
     */
    protected isEventPast(event: { timestart: number; timeduration: number}): boolean {
        return (event.timestart + event.timeduration) < this.currentTime!;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.undeleteEventObserver?.off();
        this.obsDefaultTimeChange?.off();
    }

}
