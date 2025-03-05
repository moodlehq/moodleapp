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

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CoreNetwork } from '@services/network';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import {
    AddonCalendar,
    AddonCalendarEventToDisplay,
    AddonCalendarCalendarDay,
} from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarSync } from '../../services/calendar-sync';
import { CoreCategoryData, CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import dayjs, { Dayjs } from 'dayjs';
import { NgZone, Translate } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoreArray } from '@singletons/array';
import { CoreConstants } from '@/core/constants';
import { CoreSwipeSlidesDynamicItemsManager } from '@classes/items-management/swipe-slides-dynamic-items-manager';
import { CoreSwipeSlidesComponent } from '@components/swipe-slides/swipe-slides';
import {
    CoreSwipeSlidesDynamicItem,
    CoreSwipeSlidesDynamicItemsManagerSource,
} from '@classes/items-management/swipe-slides-dynamic-items-manager-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { AddonCalendarEventsSource } from '@addons/calendar/classes/events-source';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrl } from '@singletons/url';
import { CoreModals } from '@services/overlays/modals';
import {
    ADDON_CALENDAR_AUTO_SYNCED,
    ADDON_CALENDAR_DELETED_EVENT_EVENT,
    ADDON_CALENDAR_EDIT_EVENT_EVENT,
    ADDON_CALENDAR_FILTER_CHANGED_EVENT,
    ADDON_CALENDAR_MANUAL_SYNCED,
    ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT,
    ADDON_CALENDAR_NEW_EVENT_EVENT,
    ADDON_CALENDAR_UNDELETED_EVENT_EVENT,
    AddonCalendarEventType,
} from '@addons/calendar/constants';
import { CoreObject } from '@singletons/object';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the calendar events for a certain day.
 */
@Component({
    selector: 'page-addon-calendar-day',
    templateUrl: 'day.html',
    styleUrls: ['../../calendar-common.scss', 'day.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonCalendarDayPage implements OnInit, OnDestroy {

    @ViewChild(CoreSwipeSlidesComponent) swipeSlidesComponent?: CoreSwipeSlidesComponent<PreloadedDay>;

    protected currentSiteId: string;

    // Observers.
    protected eventObservers: CoreEventObserver[] = [];
    protected onlineObserver: Subscription;
    protected managerUnsubscribe?: () => void;
    protected logView: () => void;

    periodName?: string;
    manager?: CoreSwipeSlidesDynamicItemsManager<PreloadedDay, AddonCalendarDaySlidesItemsManagerSource>;
    loaded = false;
    isOnline = false;
    syncIcon = CoreConstants.ICON_LOADING;
    filter: AddonCalendarFilter = {
        filtered: false,
        courseId: undefined,
        categoryId: undefined,
        course: true,
        group: true,
        site: true,
        user: true,
        category: true,
    };

    constructor() {
        this.currentSiteId = CoreSites.getCurrentSiteId();

        // Listen for events added. When an event is added, reload the data.
        this.eventObservers.push(CoreEvents.on(
            ADDON_CALENDAR_NEW_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.manager?.getSource().markAllItemsUnloaded();
                    this.refreshData(true, true);
                }
            },
            this.currentSiteId,
        ));

        // Listen for new event discarded event. When it does, reload the data.
        this.eventObservers.push(CoreEvents.on(ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT, () => {
            this.manager?.getSource().markAllItemsUnloaded();
            this.refreshData(true, true);
        }, this.currentSiteId));

        // Listen for events edited. When an event is edited, reload the data.
        this.eventObservers.push(CoreEvents.on(
            ADDON_CALENDAR_EDIT_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.manager?.getSource().markAllItemsUnloaded();
                    this.refreshData(true, true);
                }
            },
            this.currentSiteId,
        ));

        // Refresh data if calendar events are synchronized automatically.
        this.eventObservers.push(CoreEvents.on(ADDON_CALENDAR_AUTO_SYNCED, () => {
            this.manager?.getSource().markAllItemsUnloaded();
            this.refreshData(false, true);
        }, this.currentSiteId));

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.eventObservers.push(CoreEvents.on(ADDON_CALENDAR_MANUAL_SYNCED, (data) => {
            const selectedDay = this.manager?.getSelectedItem();
            if (data && (data.source != 'day' || !selectedDay || !data.dayJS || !selectedDay.dayJS.isSame(data.dayJS, 'day'))) {
                this.manager?.getSource().markAllItemsUnloaded();
                this.refreshData(false, true);
            }
        }, this.currentSiteId));

        // Update the events when an event is deleted.
        this.eventObservers.push(CoreEvents.on(
            ADDON_CALENDAR_DELETED_EVENT_EVENT,
            (data) => {
                if (data && !data.sent) {
                    // Event was deleted in offline. Just mark it as deleted, no need to refresh.
                    this.manager?.getSource().markAsDeleted(data.eventId, true);
                } else {
                    this.manager?.getSource().markAllItemsUnloaded();
                    this.refreshData(false, true);
                }
            },
            this.currentSiteId,
        ));

        // Listen for events "undeleted" (offline).
        this.eventObservers.push(CoreEvents.on(
            ADDON_CALENDAR_UNDELETED_EVENT_EVENT,
            (data) => {
                if (!data || !data.eventId) {
                    return;
                }

                // Mark it as undeleted, no need to refresh.
                this.manager?.getSource().markAsDeleted(data.eventId, false);
            },
            this.currentSiteId,
        ));

        this.eventObservers.push(CoreEvents.on(
            ADDON_CALENDAR_FILTER_CHANGED_EVENT,
            async (data) => {
                this.filter = data;

                // Course viewed has changed, check if the user can create events for this course calendar.
                await this.manager?.getSource().loadCanCreate(this.filter.courseId);

                this.manager?.getSource().filterAllDayEvents(this.filter);
            },
        ));

        // Refresh online status when changes.
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });

        this.logView = CoreTime.once(() => {
            const day = this.manager?.getSelectedItem();
            if (!day) {
                return;
            }
            const params = {
                course: this.filter.courseId,
                time: day.dayJS.unix(),
            };

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_calendar_get_calendar_day_view',
                name: Translate.instant('addon.calendar.dayviewtitle', { $a: this.periodName }),
                data: {
                    ...params,
                    category: 'calendar',
                },
                url: CoreUrl.addParamsToUrl('/calendar/view.php?view=day', params),
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        const types: string[] = [];

        CoreObject.enumKeys(AddonCalendarEventType).forEach((name) => {
            const value = AddonCalendarEventType[name];
            this.filter[name] = CoreNavigator.getRouteBooleanParam(name) ?? true;
            types.push(value);
        });
        this.filter.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.filter.categoryId = CoreNavigator.getRouteNumberParam('categoryId');

        this.filter.filtered = this.filter.courseId !== undefined || types.some((name) => !this.filter[name]);

        const month = CoreNavigator.getRouteNumberParam('month');
        const source = new AddonCalendarDaySlidesItemsManagerSource(this, dayjs.tz({
            year: CoreNavigator.getRouteNumberParam('year'),
            month: month ? month - 1 : undefined,
            date: CoreNavigator.getRouteNumberParam('day'),
        }).startOf('day'));
        this.manager = new CoreSwipeSlidesDynamicItemsManager(source);
        this.managerUnsubscribe = this.manager.addListener({
            onSelectedItemUpdated: (item) => {
                this.onDayViewed(item);
            },
        });

        this.fetchData(true);
    }

    get canCreate(): boolean {
        return this.manager?.getSource().canCreate || false;
    }

    get timeFormat(): string {
        return this.manager?.getSource().timeFormat || 'core.strftimetime';
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @returns Promise resolved when done.
     */
    async fetchData(sync?: boolean): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;
        this.isOnline = CoreNetwork.isOnline();

        if (sync) {
            await this.sync();
        }

        try {
            await this.manager?.getSource().fetchData(this.filter.courseId);

            await this.manager?.getSource().load(this.manager?.getSelectedItem());

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        }

        this.loaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Update data related to day being viewed.
     *
     * @param day Day viewed.
     */
    onDayViewed(day: DayBasicData): void {
        this.periodName = CoreTime.userDate(
            day.dayJS.valueOf(),
            'core.strftimedaydate',
        );
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void): Promise<void> {
        if (!this.loaded) {
            return;
        }

        await this.refreshData(true).finally(() => {
            refresher?.complete();
            done && done();
        });
    }

    /**
     * Refresh the data.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param afterChange Whether the refresh is done after an event has changed or has been synced.
     * @returns Promise resolved when done.
     */
    async refreshData(sync?: boolean, afterChange?: boolean): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const selectedDay = this.manager?.getSelectedItem() || null;

        // Don't invalidate day events after a change, it has already been handled.
        await this.manager?.getSource().invalidateContent(selectedDay, !afterChange);

        await this.fetchData(sync);
    }

    /**
     * Try to synchronize offline events.
     *
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    protected async sync(showErrors?: boolean): Promise<void> {
        try {
            const result = await AddonCalendarSync.syncEvents();

            if (result.warnings && result.warnings.length) {
                CoreAlerts.show({ message: result.warnings[0] });
            }

            if (result.updated) {
                // Trigger a manual sync event.
                const selectedDay = this.manager?.getSelectedItem();
                result.source = 'day';
                result.dayJS = selectedDay?.dayJS;

                this.manager?.getSource().markAllItemsUnloaded();
                CoreEvents.trigger(ADDON_CALENDAR_MANUAL_SYNCED, result, this.currentSiteId);
            }
        } catch (error) {
            if (showErrors) {
                CoreAlerts.showError(error, { default: Translate.instant('core.errorsync') });
            }
        }
    }

    /**
     * Check whether selected day is current day.
     *
     * @returns If selected day is current.
     */
    selectedDayIsCurrent(): boolean {
        return !!this.manager?.getSelectedItem()?.isCurrentDay;
    }

    /**
     * Navigate to a particular event.
     *
     * @param eventId Event to load.
     * @param day Day.
     */
    gotoEvent(eventId: number, day: PreloadedDay): void {
        CoreNavigator.navigateToSitePath(`/calendar/event/${eventId}`, { params: { date: day.dayJS.format('MMDDY') } });
    }

    /**
     * Show the filter menu.
     */
    async openFilter(): Promise<void> {
        const { AddonCalendarFilterComponent } = await import('../../components/filter/filter');

        await CoreModals.openSideModal({
            component: AddonCalendarFilterComponent,
            componentProps: {
                courses: this.manager?.getSource().courses,
                filter: this.filter,
            },
        });
    }

    /**
     * Open page to create/edit an event.
     *
     * @param eventId Event ID to edit.
     */
    openEdit(eventId?: number): void {
        const params: Params = {};

        if (!eventId) {
            // It's a new event, set the time.
            eventId = 0;

            const selectedDay = this.manager?.getSelectedItem();
            if (selectedDay) {
                // Use current time but in the specified day.
                const now = dayjs.tz();
                params.timestamp = selectedDay.dayJS.clone().set({ hour: now.hour(), minute: now.minute() }).valueOf();
            }
        }

        if (this.filter.courseId) {
            params.courseId = this.filter.courseId;
        }

        CoreNavigator.navigateToSitePath(`/calendar/edit/${eventId}`, { params });
    }

    /**
     * Check whether selected day has offline data.
     *
     * @returns Whether selected day has offline data.
     */
    selectedDayHasOffline(): boolean {
        const selectedDay = this.manager?.getSelectedItem();

        return !!(selectedDay?.hasOffline);
    }

    /**
     * Go to current day.
     */
    async goToCurrentDay(): Promise<void> {
        const manager = this.manager;
        if (!manager || !this.swipeSlidesComponent) {
            return;
        }

        const currentDay = {
            dayJS: dayjs.tz(),
        };
        this.loaded = false;

        try {
            // Make sure the day is loaded.
            await manager.getSource().loadItem(currentDay);

            this.swipeSlidesComponent.slideToItem(currentDay);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Load next day.
     */
    async loadNext(): Promise<void> {
        this.swipeSlidesComponent?.slideNext();
    }

    /**
     * Load previous day.
     */
    async loadPrevious(): Promise<void> {
        this.swipeSlidesComponent?.slidePrev();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.eventObservers.forEach((observer) => observer.off());
        this.onlineObserver?.unsubscribe();
        this.manager?.getSource().forgetRelatedSources();
        this.manager?.destroy();
        this.managerUnsubscribe?.();

        delete this.manager;
    }

}

/**
 * Basic data to identify a day.
 */
type DayBasicData = {
    dayJS: Dayjs;
};

/**
 * Preloaded month.
 */
type PreloadedDay = DayBasicData & CoreSwipeSlidesDynamicItem & {
    events?: AddonCalendarEventToDisplay[]; // Events (both online and offline).
    onlineEvents?: AddonCalendarEventToDisplay[];
    filteredEvents?: AddonCalendarEventToDisplay[];
    isCurrentDay?: boolean;
    isPastDay?: boolean;
    hasOffline?: boolean; // Whether the day has offline data.
};

/**
 * Helper to manage swiping within days.
 */
class AddonCalendarDaySlidesItemsManagerSource extends CoreSwipeSlidesDynamicItemsManagerSource<PreloadedDay> {

    courses: CoreEnrolledCourseData[] = [];
    eventsSources: Set<AddonCalendarEventsSource> = new Set();
    // Offline events classified in month & day.
    offlineEvents: Record<string, Record<number, AddonCalendarEventToDisplay[]>> = {};
    offlineEditedEventsIds: number[] = []; // IDs of events edited in offline.
    categories?: { [id: number]: CoreCategoryData };
    deletedEvents?: Set<number>; // Events deleted in offline.
    timeFormat?: string;
    canCreate = false;

    protected dayPage: AddonCalendarDayPage;
    protected sendLog = true;

    constructor(page: AddonCalendarDayPage, initialDayJS: Dayjs) {
        super({ dayJS: initialDayJS });

        this.dayPage = page;
    }

    /**
     * Fetch data.
     *
     * @param courseId Current selected course id (if any).
     * @returns Promise resolved when done.
     */
    async fetchData(courseId?: number): Promise<void> {
        await Promise.all([
            this.loadCourses(courseId),
            this.loadCanCreate(courseId),
            this.loadCategories(),
            this.loadOfflineEvents(),
            this.loadOfflineDeletedEvents(),
            this.loadTimeFormat(),
        ]);
    }

    /**
     * Filter all loaded days events based on the filter popover.
     *
     * @param filter Filter to apply.
     */
    filterAllDayEvents(filter: AddonCalendarFilter): void {
        this.getItems()?.forEach(day => this.filterEvents(day, filter));
    }

    /**
     * Filter events of a certain day based on the filter popover.
     *
     * @param day Day with the events.
     * @param filter Filter to apply.
     */
    filterEvents(day: PreloadedDay, filter: AddonCalendarFilter): void {
        day.filteredEvents = AddonCalendarHelper.getFilteredEvents(day.events || [], filter, this.categories || {});

        this.rememberEventsList(day);
    }

    /**
     * Load courses.
     *
     * @param courseId Current selected course id (if any).
     * @returns Promise resolved when done.
     */
    async loadCourses(courseId?: number): Promise<void> {
        const data = await CoreCoursesHelper.getCoursesForPopover(courseId);

        this.courses = data.courses;
    }

    /**
     * Load whether user can create events.
     *
     * @param courseId Current selected course id (if any).
     * @returns Promise resolved when done.
     */
    async loadCanCreate(courseId?: number): Promise<void> {
        this.canCreate = await AddonCalendarHelper.canEditEvents(courseId);
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

        // Classify them by month & day.
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
        const deletedEventsIds = await AddonCalendarOffline.getAllDeletedEventsIds();

        this.deletedEvents = new Set(deletedEventsIds);
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
    getItemId(item: DayBasicData): string | number {
        return AddonCalendarHelper.getDayId(item.dayJS);
    }

    /**
     * @inheritdoc
     */
    getPreviousItem(item: DayBasicData): DayBasicData | null {
        return {
            dayJS: item.dayJS.clone().subtract(1, 'day'),
        };
    }

    /**
     * @inheritdoc
     */
    getNextItem(item: DayBasicData): DayBasicData | null {
        return {
            dayJS: item.dayJS.clone().add(1, 'day'),
        };
    }

    /**
     * @inheritdoc
     */
    async loadItemData(day: DayBasicData, preload = false): Promise<PreloadedDay | null> {
        const preloadedDay: PreloadedDay = {
            ...day,
            hasOffline: false,
            events: [],
            onlineEvents: [],
            filteredEvents: [],
            isCurrentDay: day.dayJS.isSame(dayjs.tz(), 'day'),
            isPastDay: day.dayJS.isBefore(dayjs.tz(), 'day'),
        };

        if (preload) {
            return preloadedDay;
        }

        let result: AddonCalendarCalendarDay;

        try {
            // Don't pass courseId and categoryId, we'll filter them locally.
            result = await AddonCalendar.getDayEvents(day.dayJS.year(), day.dayJS.month() + 1, day.dayJS.date());
            preloadedDay.onlineEvents = await Promise.all(result.events.map((event) => AddonCalendarHelper.formatEventData(event)));
        } catch (error) {
            // Allow navigating to non-cached days in offline (behave as if using emergency cache).
            if (CoreNetwork.isOnline()) {
                throw error;
            }
        }

        // Merge the online events with offline data.
        preloadedDay.events = this.mergeEvents(preloadedDay);

        // Filter events by course.
        this.filterEvents(preloadedDay, this.dayPage.filter);

        // Re-calculate the formatted time so it uses the device date.
        const dayTime = day.dayJS.valueOf();
        const currentTime = CoreTime.timestamp();

        const promises = preloadedDay.events.map(async (event) => {
            event.ispast = preloadedDay.isPastDay || (preloadedDay.isCurrentDay && this.isEventPast(event, currentTime));
            event.formattedtime = await AddonCalendar.formatEventTime(event, this.dayPage.timeFormat, true, dayTime);
        });

        await Promise.all(promises);

        return preloadedDay;
    }

    /**
     * Returns if the event is in the past or not.
     *
     * @param event Event object.
     * @param currentTime Current time.
     * @returns True if it's in the past.
     */
    isEventPast(event: AddonCalendarEventToDisplay, currentTime: number): boolean {
        return (event.timestart + event.timeduration) < currentTime;
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @param day Day with the events.
     * @returns Merged events.
     */
    mergeEvents(day: PreloadedDay): AddonCalendarEventToDisplay[] {
        day.hasOffline = false;

        if (!Object.keys(this.offlineEvents).length && !this.deletedEvents?.size) {
            // No offline events, nothing to merge.
            return day.onlineEvents || [];
        }

        const monthOfflineEvents = this.offlineEvents[AddonCalendarHelper.getMonthId(day.dayJS)];
        const dayOfflineEvents = monthOfflineEvents && monthOfflineEvents[day.dayJS.date()];
        let result = day.onlineEvents || [];

        if (this.deletedEvents?.size) {
            // Mark as deleted the events that were deleted in offline.
            result.forEach((event) => {
                event.deleted = this.deletedEvents?.has(event.id);

                if (event.deleted) {
                    day.hasOffline = true;
                }
            });
        }

        if (this.offlineEditedEventsIds.length) {
            // Remove the online events that were modified in offline.
            result = result.filter((event) => this.offlineEditedEventsIds.indexOf(event.id) == -1);

            if (result.length != day.onlineEvents?.length) {
                day.hasOffline = true;
            }
        }

        if (dayOfflineEvents && dayOfflineEvents.length) {
            // Add the offline events (either new or edited).
            day.hasOffline = true;
            result = AddonCalendarHelper.sortEvents(result.concat(dayOfflineEvents));
        }

        return result;
    }

    /**
     * Invalidate content.
     *
     * @param selectedDay The current selected day.
     * @param invalidateDayEvents Whether to invalidate selected day events.
     * @returns Promise resolved when done.
     */
    async invalidateContent(selectedDay: PreloadedDay | null, invalidateDayEvents?: boolean): Promise<void> {
        const promises: Promise<void>[] = [];

        if (invalidateDayEvents && selectedDay) {
            promises.push(AddonCalendar.invalidateDayEvents(
                selectedDay.dayJS.year(),
                selectedDay.dayJS.month() + 1,
                selectedDay.dayJS.date(),
            ));
        }
        promises.push(AddonCalendar.invalidateAllowedEventTypes());
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        this.categories = undefined; // Get categories again.
        this.sendLog = true;

        if (selectedDay) {
            selectedDay.dirty = true;
        }

        await Promise.all(promises);
    }

    /**
     * Find an event and mark it as deleted.
     *
     * @param eventId Event ID.
     * @param deleted Whether to mark it as deleted or not.
     */
    markAsDeleted(eventId: number, deleted: boolean): void {
        // Mark the event as deleted or not.
        this.getItems()?.some(day => {
            const event = day.onlineEvents?.find((event) => event.id == eventId);

            if (!event) {
                return false;
            }

            event.deleted = deleted;

            if (deleted) {
                day.hasOffline = true;
            } else {
                // Re-calculate "hasOffline".
                day.hasOffline = day.events?.length != day.onlineEvents?.length ||
                    day.events?.some((event) => event.deleted || event.offline);
            }

            return true;
        });

        // Add it or remove it from the list of deleted events.
        if (deleted) {
            this.deletedEvents?.add(eventId);
        } else {
            this.deletedEvents?.delete(eventId);
        }
    }

    /**
     * Forget other sources that where created whilst using this one.
     */
    forgetRelatedSources(): void {
        for (const source of this.eventsSources) {
            CoreRoutedItemsManagerSourcesTracker.removeReference(source, this);
        }
    }

    /**
     * Remember the list of events in a day to be used in a different context.
     *
     * @param day Day containing the events list.
     */
    private async rememberEventsList(day: PreloadedDay): Promise<void> {
        const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(AddonCalendarEventsSource, [
            day.dayJS.format('MMDDY'),
        ]);

        if (!this.eventsSources.has(source)) {
            this.eventsSources.add(source);

            CoreRoutedItemsManagerSourcesTracker.addReference(source, this);
        }

        source.setEvents(day.filteredEvents ?? []);

        await source.reload();
    }

}
