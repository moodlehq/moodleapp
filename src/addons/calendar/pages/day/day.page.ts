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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import {
    AddonCalendarProvider,
    AddonCalendar,
    AddonCalendarEventToDisplay,
    AddonCalendarCalendarDay,
    AddonCalendarEventType,
} from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarSync, AddonCalendarSyncProvider } from '../../services/calendar-sync';
import { CoreCategoryData, CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { AddonCalendarFilterPopoverComponent } from '../../components/filter/filter';
import moment from 'moment';
import { Network, NgZone } from '@singletons';
import { CoreNavigator } from '@services/navigator';
import { Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { CoreUtils } from '@services/utils/utils';
import { CoreConstants } from '@/core/constants';

/**
 * Page that displays the calendar events for a certain day.
 */
@Component({
    selector: 'page-addon-calendar-day',
    templateUrl: 'day.html',
    styleUrls: ['../../calendar-common.scss', 'day.scss'],
})
export class AddonCalendarDayPage implements OnInit, OnDestroy {

    protected currentSiteId: string;
    protected year!: number;
    protected month!: number;
    protected day!: number;
    protected categories: { [id: number]: CoreCategoryData } = {};
    protected events: AddonCalendarEventToDisplay[] = []; // Events (both online and offline).
    protected onlineEvents: AddonCalendarEventToDisplay[] = [];
    protected offlineEvents: { [monthId: string]: { [day: number]: AddonCalendarEventToDisplay[] } } =
        {}; // Offline events classified in month & day.

    protected offlineEditedEventsIds: number[] = []; // IDs of events edited in offline.
    protected deletedEvents: number[] = []; // Events deleted in offline.
    protected timeFormat?: string;
    protected currentTime!: number;

    // Observers.
    protected newEventObserver: CoreEventObserver;
    protected discardedObserver: CoreEventObserver;
    protected editEventObserver: CoreEventObserver;
    protected deleteEventObserver: CoreEventObserver;
    protected undeleteEventObserver: CoreEventObserver;
    protected syncObserver: CoreEventObserver;
    protected manualSyncObserver: CoreEventObserver;
    protected onlineObserver: Subscription;
    protected obsDefaultTimeChange?: CoreEventObserver;
    protected filterChangedObserver: CoreEventObserver;

    periodName?: string;
    filteredEvents: AddonCalendarEventToDisplay [] = [];
    canCreate = false;
    courses: Partial<CoreEnrolledCourseData>[] = [];
    loaded = false;
    hasOffline = false;
    isOnline = false;
    syncIcon = CoreConstants.ICON_LOADING;
    isCurrentDay = false;
    isPastDay = false;
    currentMoment!: moment.Moment;
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

        if (CoreLocalNotifications.isAvailable()) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = CoreEvents.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                AddonCalendar.scheduleEventsNotifications(this.onlineEvents);
            }, this.currentSiteId);
        }

        // Listen for events added. When an event is added, reload the data.
        this.newEventObserver = CoreEvents.on(
            AddonCalendarProvider.NEW_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.loaded = false;
                    this.refreshData(true, true);
                }
            },
            this.currentSiteId,
        );

        // Listen for new event discarded event. When it does, reload the data.
        this.discardedObserver = CoreEvents.on(AddonCalendarProvider.NEW_EVENT_DISCARDED_EVENT, () => {
            this.loaded = false;
            this.refreshData(true, true);
        }, this.currentSiteId);

        // Listen for events edited. When an event is edited, reload the data.
        this.editEventObserver = CoreEvents.on(
            AddonCalendarProvider.EDIT_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.loaded = false;
                    this.refreshData(true, true);
                }
            },
            this.currentSiteId,
        );

        // Refresh data if calendar events are synchronized automatically.
        this.syncObserver = CoreEvents.on(AddonCalendarSyncProvider.AUTO_SYNCED, () => {
            this.loaded = false;
            this.refreshData(false, true);
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = CoreEvents.on(AddonCalendarSyncProvider.MANUAL_SYNCED, (data) => {
            if (data && (data.source != 'day' || data.year != this.year || data.month != this.month || data.day != this.day)) {
                this.loaded = false;
                this.refreshData(false, true);
            }
        }, this.currentSiteId);

        // Update the events when an event is deleted.
        this.deleteEventObserver = CoreEvents.on(
            AddonCalendarProvider.DELETED_EVENT_EVENT,
            (data) => {
                if (data && !data.sent) {
                    // Event was deleted in offline. Just mark it as deleted, no need to refresh.
                    this.hasOffline = this.markAsDeleted(data.eventId, true) || this.hasOffline;
                    this.deletedEvents.push(data.eventId);
                } else {
                    this.loaded = false;
                    this.refreshData(false, true);
                }
            },
            this.currentSiteId,
        );

        // Listen for events "undeleted" (offline).
        this.undeleteEventObserver = CoreEvents.on(
            AddonCalendarProvider.UNDELETED_EVENT_EVENT,
            (data) => {
                if (!data || !data.eventId) {
                    return;
                }

                // Mark it as undeleted, no need to refresh.
                const found = this.markAsDeleted(data.eventId, false);

                // Remove it from the list of deleted events if it's there.
                const index = this.deletedEvents.indexOf(data.eventId);
                if (index != -1) {
                    this.deletedEvents.splice(index, 1);
                }

                if (found) {
                // The deleted event belongs to current list. Re-calculate "hasOffline".
                    this.hasOffline = false;

                    if (this.events.length != this.onlineEvents.length) {
                        this.hasOffline = true;
                    } else {
                        const event = this.events.find((event) => event.deleted || event.offline);

                        this.hasOffline = !!event;
                    }
                }
            },
            this.currentSiteId,
        );

        this.filterChangedObserver = CoreEvents.on(
            AddonCalendarProvider.FILTER_CHANGED_EVENT,
            async (data) => {
                this.filter = data;

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.canCreate = await AddonCalendarHelper.canEditEvents(this.filter.courseId);

                this.filterEvents();
            },
        );

        // Refresh online status when changes.
        this.onlineObserver = Network.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreApp.isOnline();
            });
        });
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        const types: string[] = [];

        CoreUtils.enumKeys(AddonCalendarEventType).forEach((name) => {
            const value = AddonCalendarEventType[name];
            this.filter[name] = CoreNavigator.getRouteBooleanParam(name) ?? true;
            types.push(value);
        });
        this.filter.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.filter.categoryId = CoreNavigator.getRouteNumberParam('categoryId');

        this.filter.filtered = typeof this.filter.courseId != 'undefined' || types.some((name) => !this.filter[name]);

        const now = new Date();
        this.year = CoreNavigator.getRouteNumberParam('year') || now.getFullYear();
        this.month = CoreNavigator.getRouteNumberParam('month') || (now.getMonth() + 1);
        this.day = CoreNavigator.getRouteNumberParam('day') || now.getDate();

        this.calculateCurrentMoment();
        this.calculateIsCurrentDay();

        this.fetchData(true);
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async fetchData(sync?: boolean): Promise<void> {

        this.syncIcon = CoreConstants.ICON_LOADING;
        this.isOnline = CoreApp.isOnline();

        if (sync) {
            await this.sync();
        }

        try {
            const promises: Promise<void>[] = [];

            // Load courses for the popover.
            promises.push(CoreCoursesHelper.getCoursesForPopover(this.filter.courseId).then((data) => {
                this.courses = data.courses;

                return;
            }));

            // Get categories.
            promises.push(this.loadCategories());

            // Get offline events.
            promises.push(AddonCalendarOffline.getAllEditedEvents().then((offlineEvents) => {
                // Classify them by month & day.
                this.offlineEvents = AddonCalendarHelper.classifyIntoMonths(offlineEvents);

                // Get the IDs of events edited in offline.
                this.offlineEditedEventsIds = offlineEvents.filter((event) => event.id! > 0).map((event) => event.id!);

                return;
            }));

            // Get events deleted in offline.
            promises.push(AddonCalendarOffline.getAllDeletedEventsIds().then((ids) => {
                this.deletedEvents = ids;

                return;
            }));

            // Check if user can create events.
            promises.push(AddonCalendarHelper.canEditEvents(this.filter.courseId).then((canEdit) => {
                this.canCreate = canEdit;

                return;
            }));

            // Get user preferences.
            promises.push(AddonCalendar.getCalendarTimeFormat().then((value) => {
                this.timeFormat = value;

                return;
            }));

            await Promise.all(promises);

            await this.fetchEvents();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }

        this.loaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Fetch the events for current day.
     *
     * @return Promise resolved when done.
     */
    async fetchEvents(): Promise<void> {
        let result: AddonCalendarCalendarDay;
        try {
            // Don't pass courseId and categoryId, we'll filter them locally.
            result = await AddonCalendar.getDayEvents(this.year, this.month, this.day);
            this.onlineEvents = result.events.map((event) => AddonCalendarHelper.formatEventData(event));
        } catch (error) {
            if (CoreApp.isOnline()) {
                throw error;
            }
            // Allow navigating to non-cached days in offline (behave as if using emergency cache).
            this.onlineEvents = [];
        }

        // Calculate the period name. We don't use the one in result because it's in server's language.
        this.periodName = CoreTimeUtils.userDate(
            new Date(this.year, this.month - 1, this.day).getTime(),
            'core.strftimedaydate',
        );

        // Schedule notifications for the events retrieved (only future events will be scheduled).
        AddonCalendar.scheduleEventsNotifications(this.onlineEvents);
        // Merge the online events with offline data.
        this.events = this.mergeEvents();
        // Filter events by course.
        this.filterEvents();
        this.calculateIsCurrentDay();
        // Re-calculate the formatted time so it uses the device date.
        const dayTime = this.currentMoment.unix() * 1000;

        const promises = this.events.map((event) => {
            event.ispast = this.isPastDay || (this.isCurrentDay && this.isEventPast(event));

            return AddonCalendar.formatEventTime(event, this.timeFormat!, true, dayTime).then((time) => {
                event.formattedtime = time;

                return;
            });
        });

        await Promise.all(promises);
    }

    /**
     * Merge online events with the offline events of that period.
     *
     * @return Merged events.
     */
    protected mergeEvents(): AddonCalendarEventToDisplay[] {
        this.hasOffline = false;

        if (!Object.keys(this.offlineEvents).length && !this.deletedEvents.length) {
            // No offline events, nothing to merge.
            return this.onlineEvents;
        }

        const monthOfflineEvents = this.offlineEvents[AddonCalendarHelper.getMonthId(this.year, this.month)];
        const dayOfflineEvents = monthOfflineEvents && monthOfflineEvents[this.day];
        let result = this.onlineEvents;

        if (this.deletedEvents.length) {
            // Mark as deleted the events that were deleted in offline.
            result.forEach((event) => {
                event.deleted = this.deletedEvents.indexOf(event.id) != -1;

                if (event.deleted) {
                    this.hasOffline = true;
                }
            });
        }

        if (this.offlineEditedEventsIds.length) {
            // Remove the online events that were modified in offline.
            result = result.filter((event) => this.offlineEditedEventsIds.indexOf(event.id) == -1);

            if (result.length != this.onlineEvents.length) {
                this.hasOffline = true;
            }
        }

        if (dayOfflineEvents && dayOfflineEvents.length) {
            // Add the offline events (either new or edited).
            this.hasOffline = true;
            result = AddonCalendarHelper.sortEvents(result.concat(dayOfflineEvents));
        }

        return result;
    }

    /**
     * Filter events based on the filter popover.
     */
    protected filterEvents(): void {
        this.filteredEvents = AddonCalendarHelper.getFilteredEvents(this.events, this.filter, this.categories);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher, done?: () => void): Promise<void> {
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
     * @return Promise resolved when done.
     */
    async refreshData(sync?: boolean, afterChange?: boolean): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        // Don't invalidate day events after a change, it has already been handled.
        if (!afterChange) {
            promises.push(AddonCalendar.invalidateDayEvents(this.year, this.month, this.day));
        }
        promises.push(AddonCalendar.invalidateAllowedEventTypes());
        promises.push(CoreCourses.invalidateCategories(0, true));
        promises.push(AddonCalendar.invalidateTimeFormat());

        await Promise.all(promises).finally(() =>
            this.fetchData(sync));
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return Promise resolved when done.
     */
    protected async loadCategories(): Promise<void> {
        try {
            const cats = await CoreCourses.getCategories(0, true);
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
     * Try to synchronize offline events.
     *
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    protected async sync(showErrors?: boolean): Promise<void> {
        try {
            const result = await AddonCalendarSync.syncEvents();

            if (result.warnings && result.warnings.length) {
                CoreDomUtils.showErrorModal(result.warnings[0]);
            }

            if (result.updated) {
                // Trigger a manual sync event.
                result.source = 'day';
                result.day = this.day;
                result.month = this.month;
                result.year = this.year;

                CoreEvents.trigger(AddonCalendarSyncProvider.MANUAL_SYNCED, result, this.currentSiteId);
            }
        } catch (error) {
            if (showErrors) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errorsync', true);
            }
        }
    }

    /**
     * Navigate to a particular event.
     *
     * @param eventId Event to load.
     */
    gotoEvent(eventId: number): void {
        if (eventId < 0) {
            // It's an offline event, go to the edit page.
            this.openEdit(eventId);
        } else {
            CoreNavigator.navigateToSitePath(`/calendar/event/${eventId}`);
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Event.
     */
    async openFilter(event: MouseEvent): Promise<void> {
        await CoreDomUtils.openPopover({
            component: AddonCalendarFilterPopoverComponent,
            componentProps: {
                courses: this.courses,
                filter: this.filter,
            },
            event,
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
            params.timestamp = moment().year(this.year).month(this.month - 1).date(this.day).unix() * 1000;
        }

        if (this.filter.courseId) {
            params.courseId = this.filter.courseId;
        }

        CoreNavigator.navigateToSitePath(`/calendar/edit/${eventId}`, { params });
    }

    /**
     * Calculate current moment.
     */
    calculateCurrentMoment(): void {
        this.currentMoment = moment().year(this.year).month(this.month - 1).date(this.day);
    }

    /**
     * Check if user is viewing the current day.
     */
    calculateIsCurrentDay(): void {
        const now = new Date();

        this.currentTime = CoreTimeUtils.timestamp();

        this.isCurrentDay = this.year == now.getFullYear() && this.month == now.getMonth() + 1 && this.day == now.getDate();
        this.isPastDay = this.year < now.getFullYear() || (this.year == now.getFullYear() && this.month < now.getMonth()) ||
            (this.year == now.getFullYear() && this.month == now.getMonth() + 1 && this.day < now.getDate());
    }

    /**
     * Go to current day.
     */
    async goToCurrentDay(): Promise<void> {
        const now = new Date();
        const initialDay = this.day;
        const initialMonth = this.month;
        const initialYear = this.year;

        this.day = now.getDate();
        this.month = now.getMonth() + 1;
        this.year = now.getFullYear();
        this.calculateCurrentMoment();

        this.loaded = false;

        try {
            await this.fetchEvents();

            this.isCurrentDay = true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);

            this.year = initialYear;
            this.month = initialMonth;
            this.day = initialDay;
            this.calculateCurrentMoment();
        }

        this.loaded = true;
    }

    /**
     * Load next day.
     */
    async loadNext(): Promise<void> {
        this.increaseDay();

        this.loaded = false;

        try {
            await this.fetchEvents();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.decreaseDay();
        }
        this.loaded = true;
    }

    /**
     * Load previous day.
     */
    async loadPrevious(): Promise<void> {
        this.decreaseDay();

        this.loaded = false;

        try {
            await this.fetchEvents();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.increaseDay();
        }
        this.loaded = true;
    }

    /**
     * Decrease the current day.
     */
    protected decreaseDay(): void {
        this.currentMoment.subtract(1, 'day');

        this.year = this.currentMoment.year();
        this.month = this.currentMoment.month() + 1;
        this.day = this.currentMoment.date();
    }

    /**
     * Increase the current day.
     */
    protected increaseDay(): void {
        this.currentMoment.add(1, 'day');

        this.year = this.currentMoment.year();
        this.month = this.currentMoment.month() + 1;
        this.day = this.currentMoment.date();
    }

    /**
     * Find an event and mark it as deleted.
     *
     * @param eventId Event ID.
     * @param deleted Whether to mark it as deleted or not.
     * @return Whether the event was found.
     */
    protected markAsDeleted(eventId: number, deleted: boolean): boolean {
        const event = this.onlineEvents.find((event) => event.id == eventId);

        if (event) {
            event.deleted = deleted;

            return true;
        }

        return false;
    }

    /**
     * Returns if the event is in the past or not.
     *
     * @param event Event object.
     * @return True if it's in the past.
     */
    isEventPast(event: AddonCalendarEventToDisplay): boolean {
        return (event.timestart + event.timeduration) < this.currentTime;
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.newEventObserver?.off();
        this.discardedObserver?.off();
        this.editEventObserver?.off();
        this.deleteEventObserver?.off();
        this.undeleteEventObserver?.off();
        this.syncObserver?.off();
        this.manualSyncObserver?.off();
        this.onlineObserver?.unsubscribe();
        this.filterChangedObserver?.off();
        this.obsDefaultTimeChange?.off();
    }

}
