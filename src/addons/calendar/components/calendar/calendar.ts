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
import { CoreSwipeCurrentItemData, CoreSwipeSlidesComponent } from '@components/swipe-slides/swipe-slides';
import {
    CoreSwipeSlidesDynamicItem,
    CoreSwipeSlidesDynamicItemsManagerSource,
} from '@classes/items-management/slides-dynamic-items-manager-source';
import { CoreSwipeSlidesDynamicItemsManager } from '@classes/items-management/slides-dynamic-items-manager';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
    styleUrls: ['calendar.scss'],
})
export class AddonCalendarCalendarComponent implements OnInit, DoCheck, OnDestroy {

    @ViewChild(CoreSwipeSlidesComponent) slides?: CoreSwipeSlidesComponent<PreloadedMonth>;

    @Input() initialYear?: number; // Initial year to load.
    @Input() initialMonth?: number; // Initial month to load.
    @Input() filter?: AddonCalendarFilter; // Filter to apply.
    @Input() canNavigate?: string | boolean; // Whether to include arrows to change the month. Defaults to true.
    @Input() displayNavButtons?: string | boolean; // Whether to display nav buttons created by this component. Defaults to true.
    @Output() onEventClicked = new EventEmitter<number>();
    @Output() onDayClicked = new EventEmitter<{day: number; month: number; year: number}>();

    periodName?: string;
    manager?: CoreSwipeSlidesDynamicItemsManager<PreloadedMonth, AddonCalendarMonthSlidesItemsManagerSource>;
    loaded = false;
    isCurrentMonth = false;
    isPastMonth = false;

    protected currentSiteId: string;
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
                this.manager?.getSource().getItems()?.forEach((month) => {
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
                const index = this.manager?.getSource().deletedEvents.indexOf(data.eventId) ?? -1;
                if (index != -1) {
                    this.manager?.getSource().deletedEvents.splice(index, 1);
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
        const currentMonth = CoreTimeUtils.getCurrentMonth();

        this.canNavigate = typeof this.canNavigate == 'undefined' ? true : CoreUtils.isTrueOrOne(this.canNavigate);
        this.displayNavButtons = typeof this.displayNavButtons == 'undefined' ? true :
            CoreUtils.isTrueOrOne(this.displayNavButtons);

        const source = new AddonCalendarMonthSlidesItemsManagerSource(this, {
            year: this.initialYear ?? currentMonth.year,
            monthNumber: this.initialMonth ?? currentMonth.monthNumber,
        });
        this.manager = new CoreSwipeSlidesDynamicItemsManager(source);

        this.calculateIsCurrentMonth();

        this.fetchData();
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        const items = this.manager?.getSource().getItems();

        if (items?.length) {
            // Check if there's any change in the filter object.
            const changes = this.differ.diff(this.filter || {});
            if (changes) {
                items.forEach((month) => {
                    if (month.loaded) {
                        this.manager?.getSource().filterEvents(month.weeks, this.filter);
                    }
                });
            }
        }
    }

    get timeFormat(): string {
        return this.manager?.getSource().timeFormat || 'core.strftimetime';
    }

    /**
     * Fetch contacts.
     *
     * @return Promise resolved when done.
     */
    async fetchData(): Promise<void> {
        try {
            await this.manager?.getSource().fetchData();

            await this.manager?.getSource().load(this.manager?.getSelectedItem());
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }

        this.loaded = true;
    }

    /**
     * Update data related to month being viewed.
     */
    viewMonth(month: YearAndMonth): void {
        // Calculate the period name. We don't use the one in result because it's in server's language.
        this.periodName = CoreTimeUtils.userDate(
            new Date(month.year, month.monthNumber - 1).getTime(),
            'core.strftimemonthyear',
        );
        this.calculateIsCurrentMonth();
    }

    /**
     * Refresh events.
     *
     * @param afterChange Whether the refresh is done after an event has changed or has been synced.
     * @return Promise resolved when done.
     */
    async refreshData(afterChange = false): Promise<void> {
        const visibleMonth = this.slides?.getCurrentItem() || null;

        if (afterChange) {
            this.manager?.getSource().markAllItemsDirty();
        }

        await this.manager?.getSource().invalidateContent(visibleMonth);

        await this.fetchData();
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
        const visibleMonth = this.slides?.getCurrentItem();
        if (!visibleMonth) {
            return;
        }

        this.onDayClicked.emit({ day: day, month: visibleMonth.monthNumber, year: visibleMonth.year });
    }

    /**
     * Check if user is viewing the current month.
     */
    calculateIsCurrentMonth(): void {
        const visibleMonth = this.slides?.getCurrentItem();
        if (!visibleMonth) {
            return;
        }

        this.currentTime = CoreTimeUtils.timestamp();
        this.isCurrentMonth = CoreTimeUtils.isSameMonth(visibleMonth, CoreTimeUtils.getCurrentMonth());
        this.isPastMonth = CoreTimeUtils.isPastMonth(visibleMonth);
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

        this.slides?.slideToItem(currentMonth);
    }

    /**
     * Undelete a certain event.
     *
     * @param eventId Event ID.
     */
    protected async undeleteEvent(eventId: number): Promise<void> {
        this.manager?.getSource().getItems()?.some((month) => {
            if (!month.loaded) {
                return false;
            }

            return month.weeks.some((week) => week.days.some((day) => {
                const event = day.eventsFormated?.find((event) => event.id == eventId);

                if (event) {
                    event.deleted = false;

                    return true;
                }

                return false;
            }));
        });
    }

    /**
     * Returns if the event is in the past or not.
     *
     * @param event Event object.
     * @return True if it's in the past.
     */
    isEventPast(event: { timestart: number; timeduration: number}): boolean {
        return (event.timestart + event.timeduration) < (this.currentTime || CoreTimeUtils.timestamp());
    }

    /**
     * Slide has changed.
     *
     * @param data Data about new item.
     */
    slideChanged(data: CoreSwipeCurrentItemData<PreloadedMonth>): void {
        this.viewMonth(data.item);
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
type PreloadedMonth = YearAndMonth & CoreSwipeSlidesDynamicItem & {
    weekDays: AddonCalendarWeekDaysTranslationKeys[];
    weeks: AddonCalendarWeek[];
};

/**
 * Helper to manage swiping within months.
 */
class AddonCalendarMonthSlidesItemsManagerSource extends CoreSwipeSlidesDynamicItemsManagerSource<PreloadedMonth> {

    monthLoaded = false;
    categories: { [id: number]: CoreCategoryData } = {};
    // Offline events classified in month & day.
    offlineEvents: { [monthId: string]: { [day: number]: AddonCalendarEventToDisplay[] } } = {};
    offlineEditedEventsIds: number[] = []; // IDs of events edited in offline.
    deletedEvents: number[] = []; // Events deleted in offline.
    timeFormat?: string;

    protected calendarComponent: AddonCalendarCalendarComponent;
    protected categoriesRetrieved = false;

    constructor(component: AddonCalendarCalendarComponent, initialMonth: YearAndMonth) {
        super(initialMonth);

        this.calendarComponent = component;
    }

    /**
     * Fetch data.
     *
     * @return Promise resolved when done.
     */
    async fetchData(): Promise<void> {
        await Promise.all([
            this.loadCategories(),
            this.loadOfflineEvents(),
            this.loadOfflineDeletedEvents(),
            this.loadTimeFormat(),
        ]);
    }

    /**
     * Filter events based on the filter popover.
     *
     * @param weeks Weeks with the events to filter.
     * @param filter Filter to apply.
     */
    filterEvents(weeks: AddonCalendarWeek[], filter?: AddonCalendarFilter): void {
        weeks.forEach((week) => {
            week.days.forEach((day) => {
                day.filteredEvents = AddonCalendarHelper.getFilteredEvents(
                    day.eventsFormated || [],
                    filter,
                    this.categories,
                );

                // Re-calculate some properties.
                AddonCalendarHelper.calculateDayData(day, day.filteredEvents);
            });
        });
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return Promise resolved when done.
     */
    async loadCategories(): Promise<void> {
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
     * Load events created or edited in offline.
     *
     * @return Promise resolved when done.
     */
    async loadOfflineEvents(): Promise<void> {
        // Get offline events.
        const events = await AddonCalendarOffline.getAllEditedEvents();

        // Classify them by month.
        this.offlineEvents = AddonCalendarHelper.classifyIntoMonths(events);

        // Get the IDs of events edited in offline.
        this.offlineEditedEventsIds = events.filter((event) => event.id > 0).map((event) => event.id);
    }

    /**
     * Load events deleted in offline.
     *
     * @return Promise resolved when done.
     */
    async loadOfflineDeletedEvents(): Promise<void> {
        this.deletedEvents = await AddonCalendarOffline.getAllDeletedEventsIds();
    }

    /**
     * Load time format.
     *
     * @return Promise resolved when done.
     */
    async loadTimeFormat(): Promise<void> {
        this.timeFormat = await AddonCalendar.getCalendarTimeFormat();
    }

    /**
     * @inheritdoc
     */
    getItemId(item: YearAndMonth): string | number {
        return AddonCalendarHelper.getMonthId(item);
    }

    /**
     * @inheritdoc
     */
    getPreviousItem(item: YearAndMonth): YearAndMonth | null {
        return CoreTimeUtils.getPreviousMonth(item);
    }

    /**
     * @inheritdoc
     */
    getNextItem(item: YearAndMonth): YearAndMonth | null {
        return CoreTimeUtils.getNextMonth(item);
    }

    /**
     * @inheritdoc
     */
    async loadItemData(month: YearAndMonth, preload = false): Promise<PreloadedMonth | null> {
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
            const isCurrentMonth = CoreTimeUtils.isSameMonth(month, CoreTimeUtils.getCurrentMonth());
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
                                event.ispast = this.calendarComponent.isEventPast(event);
                            });
                        }
                    }
                }));
            }));

            if (!preload) {
                // Merge the online events with offline data.
                this.mergeEvents(month, weeks);
                // Filter events by course.
                this.filterEvents(weeks, this.calendarComponent.filter);
            }

            return {
                ...month,
                weeks,
                weekDays,
            };
        } finally {
            if (!preload) {
                this.monthLoaded = true;
            }
        }
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @param month Month.
     * @param weeks Weeks with the events to filter.
     */
    mergeEvents(month: YearAndMonth, weeks: AddonCalendarWeek[]): void {
        const monthOfflineEvents: { [day: number]: AddonCalendarEventToDisplay[] } =
            this.offlineEvents[AddonCalendarHelper.getMonthId(month)];

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
     * Invalidate content.
     *
     * @param visibleMonth The current visible month.
     * @return Promise resolved when done.
     */
    async invalidateContent(visibleMonth: PreloadedMonth | null): Promise<void> {
        const promises: Promise<void>[] = [];

        if (visibleMonth) {
            promises.push(AddonCalendar.invalidateMonthlyEvents(visibleMonth.year, visibleMonth.monthNumber));
        }
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        this.categoriesRetrieved = false; // Get categories again.

        if (visibleMonth) {
            visibleMonth.dirty = true;
        }

        await Promise.all(promises);
    }

}
