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
    ViewChild,
} from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils, YearAndMonth } from '@services/utils/time';
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
import { IonSlides } from '@ionic/angular';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
    styleUrls: ['calendar.scss'],
})
export class AddonCalendarCalendarComponent implements OnInit, DoCheck, OnDestroy {

    @ViewChild(IonSlides) slides?: IonSlides;

    @Input() initialYear?: number; // Initial year to load.
    @Input() initialMonth?: number; // Initial month to load.
    @Input() filter?: AddonCalendarFilter; // Filter to apply.
    @Input() canNavigate?: string | boolean; // Whether to include arrows to change the month. Defaults to true.
    @Input() displayNavButtons?: string | boolean; // Whether to display nav buttons created by this component. Defaults to true.
    @Output() onEventClicked = new EventEmitter<number>();
    @Output() onDayClicked = new EventEmitter<{day: number; month: number; year: number}>();

    periodName?: string;
    preloadedMonths: PreloadedMonth[] = [];
    loaded = false;
    monthLoaded = false;
    timeFormat?: string;
    isCurrentMonth = false;
    isPastMonth = false;

    protected visibleMonth: YearAndMonth;
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
                this.preloadedMonths.forEach((month) => {
                    if (!month.loaded) {
                        return;
                    }

                    month.weeks.forEach((week) => {
                        week.days.forEach((day) => {
                            AddonCalendar.scheduleEventsNotifications(day.eventsFormated || []);
                        });
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

        const now = new Date();

        this.visibleMonth = {
            year: now.getFullYear(),
            monthNumber: now.getMonth() + 1,
        };
    }

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        this.visibleMonth.year = this.initialYear ?? this.visibleMonth.year;
        this.visibleMonth.monthNumber = this.initialMonth ?? this.visibleMonth.monthNumber;

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

        if (this.preloadedMonths.length) {
            // Check if there's any change in the filter object.
            const changes = this.differ.diff(this.filter || {});
            if (changes) {
                this.preloadedMonths.forEach((month) => {
                    if (month.loaded) {
                        this.filterEvents(month.weeks);
                    }
                });
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
            const filtered = events.filter((event) => event.id > 0);
            this.offlineEditedEventsIds = filtered.map((event) => event.id);

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

            await this.viewMonth();

        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }

        this.loaded = true;
    }

    /**
     * Load or preload a month.
     *
     * @param year Year.
     * @param monthNumber Month number.
     * @param preload Whether to "preload" the month. When preloading, no events will be fetched.
     * @return Promise resolved when done.
     */
    async loadMonth(month: YearAndMonth, preload = false): Promise<void> {
        // Check if it's already loaded.
        const existingMonth = this.findPreloadedMonth(month);
        if (existingMonth && ((existingMonth.loaded && !existingMonth.needsRefresh) || preload)) {
            return;
        }

        if (!preload) {
            this.monthLoaded = false;
        }

        try {
            // Load or preload the weeks.
            let result: { daynames: Partial<AddonCalendarDayName>[]; weeks: Partial<AddonCalendarWeek>[] };
            if (preload) {
                result = await AddonCalendarHelper.getOfflineMonthWeeks(month.year, month.monthNumber);
            } else {
                try {
                    // Don't pass courseId and categoryId, we'll filter them locally.
                    result = await AddonCalendar.getMonthlyEvents(month.year, month.monthNumber);
                } catch (error) {
                    if (!CoreApp.isOnline()) {
                        // Allow navigating to non-cached months in offline (behave as if using emergency cache).
                        result = await AddonCalendarHelper.getOfflineMonthWeeks(month.year, month.monthNumber);
                    } else {
                        throw error;
                    }
                }
            }

            const weekDays = AddonCalendar.getWeekDays(result.daynames[0].dayno);
            const weeks = result.weeks as AddonCalendarWeek[];
            const isCurrentMonth = CoreTimeUtils.isCurrentMonth(month);
            const currentDay = new Date().getDate();
            let isPast = true;

            await Promise.all(weeks.map(async (week) => {
                await Promise.all(week.days.map(async (day) => {
                    day.periodName = CoreTimeUtils.userDate(
                        new Date(month.year, month.monthNumber - 1, day.mday).getTime(),
                        'core.strftimedaydate',
                    );
                    day.eventsFormated = day.eventsFormated || [];
                    day.filteredEvents = day.filteredEvents || [];
                    // Format online events.
                    const onlineEventsFormatted = await Promise.all(
                        day.events.map(async (event) => AddonCalendarHelper.formatEventData(event)),
                    );

                    day.eventsFormated = day.eventsFormated.concat(onlineEventsFormatted);

                    if (isCurrentMonth) {
                        day.istoday = day.mday == currentDay;
                        day.ispast = isPast && !day.istoday;
                        isPast = day.ispast;

                        if (day.istoday) {
                            day.eventsFormated?.forEach((event) => {
                                event.ispast = this.isEventPast(event);
                            });
                        }
                    }
                }));
            }));

            if (!preload) {
                // Merge the online events with offline data.
                this.mergeEvents(month, weeks);
                // Filter events by course.
                this.filterEvents(weeks);
            }

            if (existingMonth) {
                // Month already exists, update it.
                existingMonth.loaded = !preload;
                existingMonth.weeks = weeks;
                existingMonth.weekDays = weekDays;

                return;
            }

            // Add the preloaded month at the right position.
            const preloadedMonth: PreloadedMonth = {
                ...month,
                loaded: !preload,
                weeks,
                weekDays,
            };
            const previousMonth = CoreTimeUtils.getPreviousMonth(month);
            const nextMonth = CoreTimeUtils.getNextMonth(month);
            const activeIndex = await this.slides?.getActiveIndex();

            const added = this.preloadedMonths.some((month, index) => {
                let positionToInsert = -1;
                if (CoreTimeUtils.isSameMonth(month, previousMonth)) {
                    // Previous month found, add the month after it.
                    positionToInsert = index + 1;
                }

                if (CoreTimeUtils.isSameMonth(month, nextMonth)) {
                    // Next month found, add the month before it.
                    positionToInsert = index;
                }

                if (positionToInsert > -1) {
                    this.preloadedMonths.splice(positionToInsert, 0, preloadedMonth);
                    if (activeIndex !== undefined && positionToInsert <= activeIndex) {
                        // Added a slide before the active one, keep current slide.
                        this.slides?.slideTo(activeIndex + 1, 0, false);
                    }

                    return true;
                }
            });

            if (!added) {
                // Previous and next months not found, this probably means the array is still empty. Add it at the end.
                this.preloadedMonths.push(preloadedMonth);
            }
        } finally {
            if (!preload) {
                this.monthLoaded = true;
            }
        }
    }

    /**
     * Load current month and preload next and previous ones.
     *
     * @return Promise resolved when done.
     */
    async viewMonth(): Promise<void> {
        // Calculate the period name. We don't use the one in result because it's in server's language.
        this.periodName = CoreTimeUtils.userDate(
            new Date(this.visibleMonth.year, this.visibleMonth.monthNumber - 1).getTime(),
            'core.strftimemonthyear',
        );
        this.calculateIsCurrentMonth();

        try {
            // Load current month, and preload next and previous ones.
            await Promise.all([
                this.loadMonth(this.visibleMonth, false),
                this.loadMonth(CoreTimeUtils.getPreviousMonth(this.visibleMonth), true),
                this.loadMonth(CoreTimeUtils.getNextMonth(this.visibleMonth), true),
            ]);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }
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
     *
     * @param weeks Weeks with the events to filter.
     */
    filterEvents(weeks: AddonCalendarWeek[]): void {
        weeks.forEach((week) => {
            week.days.forEach((day) => {
                day.filteredEvents = AddonCalendarHelper.getFilteredEvents(
                    day.eventsFormated || [],
                    this.filter,
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
    async refreshData(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonCalendar.invalidateMonthlyEvents(this.visibleMonth.year, this.visibleMonth.monthNumber));
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        this.categoriesRetrieved = false; // Get categories again.

        const preloadedMonth = this.findPreloadedMonth(this.visibleMonth);
        if (preloadedMonth) {
            preloadedMonth.needsRefresh = true;
        }

        await Promise.all(promises);

        this.fetchData();
    }

    /**
     * Load next month.
     */
    loadNext(): void {
        this.slides?.slideNext();
    }

    /**
     * Load previous month.
     */
    loadPrevious(): void {
        this.slides?.slidePrev();
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
        this.onDayClicked.emit({ day: day, month: this.visibleMonth.monthNumber, year: this.visibleMonth.year });
    }

    /**
     * Check if user is viewing the current month.
     */
    calculateIsCurrentMonth(): void {
        this.currentTime = CoreTimeUtils.timestamp();
        this.isCurrentMonth = CoreTimeUtils.isCurrentMonth(this.visibleMonth);
        this.isPastMonth = CoreTimeUtils.isCurrentMonth(this.visibleMonth);
    }

    /**
     * Go to current month.
     */
    async goToCurrentMonth(): Promise<void> {

        const now = new Date();
        const currentMonth = {
            monthNumber: now.getMonth() + 1,
            year: now.getFullYear(),
        };

        const index = this.preloadedMonths.findIndex((month) => CoreTimeUtils.isSameMonth(month, currentMonth));
        if (index > -1) {
            this.slides?.slideTo(index);
        }
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @param month Month.
     * @param weeks Weeks with the events to filter.
     */
    protected mergeEvents(month: YearAndMonth, weeks: AddonCalendarWeek[]): void {
        const monthOfflineEvents: { [day: number]: AddonCalendarEventToDisplay[] } =
            this.offlineEvents[AddonCalendarHelper.getMonthId(month.year, month.monthNumber)];

        weeks.forEach((week) => {
            week.days.forEach((day) => {

                // Schedule notifications for the events retrieved (only future events will be scheduled).
                AddonCalendar.scheduleEventsNotifications(day.eventsFormated || []);

                if (monthOfflineEvents || this.deletedEvents.length) {
                    // There is offline data, merge it.

                    if (this.deletedEvents.length) {
                        // Mark as deleted the events that were deleted in offline.
                        day.eventsFormated?.forEach((event) => {
                            event.deleted = this.deletedEvents.indexOf(event.id) != -1;
                        });
                    }

                    if (this.offlineEditedEventsIds.length) {
                        // Remove the online events that were modified in offline.
                        day.events = day.events.filter((event) => this.offlineEditedEventsIds.indexOf(event.id) == -1);
                    }

                    if (monthOfflineEvents && monthOfflineEvents[day.mday] && day.eventsFormated) {
                        // Add the offline events (either new or edited).
                        day.eventsFormated =
                            AddonCalendarHelper.sortEvents(day.eventsFormated.concat(monthOfflineEvents[day.mday]));
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
    protected async undeleteEvent(eventId: number): Promise<void> {
        this.preloadedMonths.forEach((month) => {
            if (!month.loaded) {
                return;
            }

            month.weeks.forEach((week) => {
                week.days.forEach((day) => {
                    const event = day.eventsFormated?.find((event) => event.id == eventId);

                    if (event) {
                        event.deleted = false;
                    }
                });
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
        return (event.timestart + event.timeduration) < (this.currentTime || CoreTimeUtils.timestamp());
    }

    /**
     * Slide has changed.
     *
     * @return Promise resolved when done.
     */
    async slideChanged(): Promise<void> {
        if (!this.slides) {
            return;
        }

        const index = await this.slides.getActiveIndex();
        const preloadedMonth = this.preloadedMonths[index];
        if (!preloadedMonth) {
            return;
        }

        this.visibleMonth.year = preloadedMonth.year;
        this.visibleMonth.monthNumber = preloadedMonth.monthNumber;

        await this.viewMonth();
    }

    /**
     * Find a certain preloaded month.
     *
     * @param month Month to search.
     * @return Preloaded month, undefined if not found.
     */
    protected findPreloadedMonth(month: YearAndMonth): PreloadedMonth | undefined {
        return this.preloadedMonths.find(preloadedMonth => CoreTimeUtils.isSameMonth(month, preloadedMonth));
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.undeleteEventObserver?.off();
        this.obsDefaultTimeChange?.off();
    }

}

/**
 * Preloaded month.
 */
type PreloadedMonth = YearAndMonth & {
    loaded: boolean; // Whether the events have been loaded.
    weekDays: AddonCalendarWeekDaysTranslationKeys[];
    weeks: AddonCalendarWeek[];
    needsRefresh?: boolean; // Whether the events needs to be re-loaded.
};
