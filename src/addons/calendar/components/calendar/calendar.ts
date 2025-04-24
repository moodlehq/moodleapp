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
    HostBinding,
} from '@angular/core';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { CoreArray } from '@singletons/array';
import {
    AddonCalendar,
    AddonCalendarWeek,
    AddonCalendarWeekDaysTranslationKeys,
    AddonCalendarEventToDisplay,
    AddonCalendarDayName,
} from '../../services/calendar';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { CoreCategoryData, CoreCourses } from '@features/courses/services/courses';
import { CoreNetwork } from '@services/network';
import { CoreSwipeSlidesComponent } from '@components/swipe-slides/swipe-slides';
import {
    CoreSwipeSlidesDynamicItem,
    CoreSwipeSlidesDynamicItemsManagerSource,
} from '@classes/items-management/swipe-slides-dynamic-items-manager-source';
import { CoreSwipeSlidesDynamicItemsManager } from '@classes/items-management/swipe-slides-dynamic-items-manager';
import dayjs, { Dayjs } from 'dayjs';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrl } from '@singletons/url';
import { Translate } from '@singletons';
import { toBoolean } from '@/core/transforms/boolean';
import { ADDON_CALENDAR_UNDELETED_EVENT_EVENT } from '@addons/calendar/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a calendar.
 */
@Component({
    selector: 'addon-calendar-calendar',
    templateUrl: 'addon-calendar-calendar.html',
    styleUrl: 'calendar.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonCalendarCalendarComponent implements OnInit, DoCheck, OnDestroy {

    @ViewChild(CoreSwipeSlidesComponent) swipeSlidesComponent?: CoreSwipeSlidesComponent<PreloadedMonth>;

    @Input() initialYear?: number; // Initial year to load.
    @Input() initialMonth?: number; // Initial month to load.
    @Input() filter?: AddonCalendarFilter; // Filter to apply.
    @Input({ transform: toBoolean }) hidden = false; // Whether the component is hidden.
    @Input({ transform: toBoolean }) canNavigate = true; // Whether to include arrows to change the month
    @Input({ transform: toBoolean }) displayNavButtons = true; // Whether to display nav buttons created by this component.
    @Output() onEventClicked = new EventEmitter<number>();
    @Output() onDayClicked = new EventEmitter<{day: number; month: number; year: number}>();

    periodName?: string;
    manager?: CoreSwipeSlidesDynamicItemsManager<PreloadedMonth, AddonCalendarMonthSlidesItemsManagerSource>;
    loaded = false;

    protected currentSiteId: string;
    protected hiddenDiffer?: boolean; // To detect changes in the hidden input.
    protected filterDiffer: KeyValueDiffer<unknown, unknown>; // To detect changes in the filters input.
    // Observers and listeners.
    protected undeleteEventObserver: CoreEventObserver;
    protected managerUnsubscribe?: () => void;
    protected logView: () => void;

    constructor(differs: KeyValueDiffers) {
        this.currentSiteId = CoreSites.getCurrentSiteId();

        // Listen for events "undeleted" (offline).
        this.undeleteEventObserver = CoreEvents.on(
            ADDON_CALENDAR_UNDELETED_EVENT_EVENT,
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

        this.hiddenDiffer = this.hidden;
        this.filterDiffer = differs.find(this.filter ?? {}).create();

        this.logView = CoreTime.once(() => {
            const month = this.manager?.getSelectedItem();
            if (!month) {
                return;
            }

            const params = {
                course: this.filter?.courseId,
                time: CoreTime.timestamp(),
            };

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_calendar_get_calendar_monthly_view',
                name: Translate.instant('addon.calendar.detailedmonthviewtitle', { $a: this.periodName }),
                data: {
                    ...params,
                    category: 'calendar',
                },
                url: CoreUrl.addParamsToUrl('/calendar/view.php?view=month', params),
            });
        });
    }

    @HostBinding('attr.hidden') get hiddenAttribute(): string | null {
        return this.hidden ? 'hidden' : null;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const source = new AddonCalendarMonthSlidesItemsManagerSource(this, dayjs.tz({
            year: this.initialYear,
            month: this.initialMonth ? this.initialMonth - 1 : undefined,
        }).startOf('month'));
        this.manager = new CoreSwipeSlidesDynamicItemsManager(source);
        this.managerUnsubscribe = this.manager.addListener({
            onSelectedItemUpdated: (item) => {
                this.onMonthViewed(item);
            },
        });

        this.fetchData();
    }

    /**
     * @inheritdoc
     */
    ngDoCheck(): void {
        const items = this.manager?.getSource().getItems();

        if (items?.length) {
            // Check if there's any change in the filter object.
            const changes = this.filterDiffer.diff(this.filter ?? {});
            if (changes) {
                items.forEach((month) => {
                    if (month.loaded && month.weeks) {
                        this.manager?.getSource().filterEvents(month.weeks, this.filter);
                    }
                });
            }
        }

        if (this.hiddenDiffer !== this.hidden) {
            this.hiddenDiffer = this.hidden;

            if (!this.hidden) {
                this.swipeSlidesComponent?.updateSlidesComponent();
            }
        }
    }

    get timeFormat(): string {
        return this.manager?.getSource().timeFormat || 'core.strftimetime';
    }

    /**
     * Fetch contacts.
     *
     * @returns Promise resolved when done.
     */
    async fetchData(): Promise<void> {
        try {
            await this.manager?.getSource().fetchData();

            await this.manager?.getSource().load(this.manager?.getSelectedItem());

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        }

        this.loaded = true;
    }

    /**
     * Update data related to month being viewed.
     *
     * @param month Month being viewed.
     */
    onMonthViewed(month: MonthBasicData): void {
        // Calculate the period name. We don't use the one in result because it's in server's language.
        this.periodName = CoreTime.userDate(
            month.dayJS.valueOf(),
            'core.strftimemonthyear',
        );
    }

    /**
     * Refresh events.
     *
     * @param afterChange Whether the refresh is done after an event has changed or has been synced.
     * @returns Promise resolved when done.
     */
    async refreshData(afterChange = false): Promise<void> {
        const selectedMonth = this.manager?.getSelectedItem() || null;

        if (afterChange) {
            this.manager?.getSource().markAllItemsDirty();
        }

        await this.manager?.getSource().invalidateContent(selectedMonth);

        await this.fetchData();
    }

    /**
     * Load next month.
     */
    loadNext(): void {
        this.swipeSlidesComponent?.slideNext();
    }

    /**
     * Load previous month.
     */
    loadPrevious(): void {
        this.swipeSlidesComponent?.slidePrev();
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
        const selectedMonth = this.manager?.getSelectedItem();
        if (!selectedMonth) {
            return;
        }

        this.onDayClicked.emit({ day: day, month: selectedMonth.dayJS.month() + 1, year: selectedMonth.dayJS.year() });
    }

    /**
     * Go to current month.
     */
    async goToCurrentMonth(): Promise<void> {
        const current = dayjs.tz();

        await this.viewMonth(current.month() + 1, current.year());
    }

    /**
     * Check whether selected month is loaded.
     *
     * @returns If selected month has been loaded.
     */
    selectedMonthLoaded(): boolean {
        return !!this.manager?.getSelectedItem()?.loaded;
    }

    /**
     * Check whether selected month is current month.
     *
     * @returns If selected month is the current.
     */
    selectedMonthIsCurrent(): boolean {
        return !!this.manager?.getSelectedItem()?.isCurrentMonth;
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

            return month.weeks?.some((week) => week.days.some((day) => {
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
     * View a certain month and year.
     *
     * @param month Month.
     * @param year Year.
     */
    async viewMonth(month: number, year: number): Promise<void> {
        const manager = this.manager;
        if (!manager || !this.swipeSlidesComponent) {
            return;
        }

        this.loaded = false;
        const item = {
            dayJS: dayjs.tz({
                year,
                month: month - 1,
            }),
        };

        try {
            // Make sure the day is loaded.
            await manager.getSource().loadItem(item);

            this.swipeSlidesComponent.slideToItem(item);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.undeleteEventObserver?.off();
        this.manager?.destroy();
        this.managerUnsubscribe?.();

        delete this.manager;
    }

}

/**
 * Basic data to identify a month.
 */
type MonthBasicData = {
    dayJS: Dayjs;
};

/**
 * Preloaded month.
 */
type PreloadedMonth = MonthBasicData & CoreSwipeSlidesDynamicItem & {
    weekDays?: AddonCalendarWeekDaysTranslationKeys[];
    weeks?: AddonCalendarWeek[];
    isCurrentMonth?: boolean;
    isPastMonth?: boolean;
};

/**
 * Helper to manage swiping within months.
 */
class AddonCalendarMonthSlidesItemsManagerSource extends CoreSwipeSlidesDynamicItemsManagerSource<PreloadedMonth> {

    categories?: { [id: number]: CoreCategoryData };
    // Offline events classified in month & day.
    offlineEvents: { [monthId: string]: { [day: number]: AddonCalendarEventToDisplay[] } } = {};
    offlineEditedEventsIds: number[] = []; // IDs of events edited in offline.
    deletedEvents: number[] = []; // Events deleted in offline.
    timeFormat?: string;

    protected calendarComponent: AddonCalendarCalendarComponent;

    constructor(component: AddonCalendarCalendarComponent, initialDayJS: Dayjs) {
        super({ dayJS: initialDayJS });

        this.calendarComponent = component;
    }

    /**
     * Fetch data.
     *
     * @returns Promise resolved when done.
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
                    this.categories || {},
                );

                // Re-calculate some properties.
                AddonCalendarHelper.calculateDayData(day, day.filteredEvents);
            });
        });
    }

    /**
     * Load categories to be able to filter events.
     *
     * @returns Promise resolved when done.
     */
    async loadCategories(): Promise<void> {
        if (this.categories) {
            // Already retrieved, stop.
            return;
        }

        try {
            const categories = await CoreCourses.getCategories(0, true);

            // Index categories by ID.
            this.categories = CoreArray.toObject(categories, 'id');
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Load events created or edited in offline.
     *
     * @returns Promise resolved when done.
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
     * @returns Promise resolved when done.
     */
    async loadOfflineDeletedEvents(): Promise<void> {
        this.deletedEvents = await AddonCalendarOffline.getAllDeletedEventsIds();
    }

    /**
     * Load time format.
     *
     * @returns Promise resolved when done.
     */
    async loadTimeFormat(): Promise<void> {
        this.timeFormat = await AddonCalendar.getCalendarTimeFormat();
    }

    /**
     * @inheritdoc
     */
    getItemId(item: MonthBasicData): string | number {
        return AddonCalendarHelper.getMonthId(item.dayJS);
    }

    /**
     * @inheritdoc
     */
    getPreviousItem(item: MonthBasicData): MonthBasicData | null {
        return {
            dayJS: item.dayJS.subtract(1, 'month'),
        };
    }

    /**
     * @inheritdoc
     */
    getNextItem(item: MonthBasicData): MonthBasicData | null {
        return {
            dayJS: item.dayJS.add(1, 'month'),
        };
    }

    /**
     * @inheritdoc
     */
    async loadItemData(month: MonthBasicData, preload = false): Promise<PreloadedMonth | null> {
        // Load or preload the weeks.
        let result: { daynames: Partial<AddonCalendarDayName>[]; weeks: Partial<AddonCalendarWeek>[] };
        const year = month.dayJS.year();
        const monthNumber = month.dayJS.month() + 1;

        if (preload) {
            result = await AddonCalendarHelper.getOfflineMonthWeeks(year, monthNumber);
        } else {
            try {
                // Don't pass courseId and categoryId, we'll filter them locally.
                result = await AddonCalendar.getMonthlyEvents(year, monthNumber);
            } catch (error) {
                if (!CoreNetwork.isOnline()) {
                    // Allow navigating to non-cached months in offline (behave as if using emergency cache).
                    result = await AddonCalendarHelper.getOfflineMonthWeeks(year, monthNumber);
                } else {
                    throw error;
                }
            }
        }

        const weekDays = AddonCalendar.getWeekDays(result.daynames[0].dayno);
        const weeks = result.weeks as AddonCalendarWeek[];
        const currentDay = dayjs.tz().date();
        const currentTime = CoreTime.timestamp();
        const dayMoment = dayjs.tz(month.dayJS);

        const preloadedMonth: PreloadedMonth = {
            ...month,
            weeks,
            weekDays,
            isCurrentMonth: month.dayJS.isSame(dayjs.tz(), 'month'),
            isPastMonth: month.dayJS.isBefore(dayjs.tz(), 'month'),
        };

        await Promise.all(weeks.map(async (week) => {
            await Promise.all(week.days.map(async (day) => {
                day.periodName = CoreTime.userDate(
                    dayMoment.date(day.mday).valueOf(),
                    'core.strftimedaydate',
                );
                day.eventsFormated = day.eventsFormated || [];
                day.filteredEvents = day.filteredEvents || [];
                // Format online events.
                const onlineEventsFormatted = await Promise.all(
                    day.events.map((event) => AddonCalendarHelper.formatEventData(event)),
                );

                day.eventsFormated = day.eventsFormated.concat(onlineEventsFormatted);

                if (preloadedMonth.isCurrentMonth) {
                    day.istoday = day.mday == currentDay;
                    day.ispast = preloadedMonth.isPastMonth || day.mday < currentDay;

                    if (day.istoday) {
                        day.eventsFormated?.forEach((event) => {
                            event.ispast = this.isEventPast(event, currentTime);
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

        return preloadedMonth;
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @param month Month.
     * @param weeks Weeks with the events to filter.
     */
    mergeEvents(month: MonthBasicData, weeks: AddonCalendarWeek[]): void {
        const monthOfflineEvents: { [day: number]: AddonCalendarEventToDisplay[] } =
            this.offlineEvents[AddonCalendarHelper.getMonthId(month.dayJS)];

        weeks.forEach((week) => {
            week.days.forEach((day) => {
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
            });
        });
    }

    /**
     * Returns if the event is in the past or not.
     *
     * @param event Event object.
     * @param currentTime Current time.
     * @returns True if it's in the past.
     */
    isEventPast(event: { timestart: number; timeduration: number}, currentTime: number): boolean {
        return (event.timestart + event.timeduration) < currentTime;
    }

    /**
     * Invalidate content.
     *
     * @param selectedMonth The current selected month.
     * @returns Promise resolved when done.
     */
    async invalidateContent(selectedMonth: PreloadedMonth | null): Promise<void> {
        const promises: Promise<void>[] = [];

        if (selectedMonth) {
            promises.push(AddonCalendar.invalidateMonthlyEvents(selectedMonth.dayJS.year(), selectedMonth.dayJS.month() + 1));
        }
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        this.categories = undefined; // Get categories again.

        if (selectedMonth) {
            selectedMonth.dirty = true;
        }

        await Promise.all(promises);
    }

}
