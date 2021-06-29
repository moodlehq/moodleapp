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

import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { IonContent, IonRefresher } from '@ionic/angular';
import {
    AddonCalendarProvider,
    AddonCalendar,
    AddonCalendarEventToDisplay,
} from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarSync, AddonCalendarSyncProvider } from '../../services/calendar-sync';
import { CoreCategoryData, CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreSites } from '@services/sites';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreApp } from '@services/app';
import moment from 'moment';
import { CoreConstants } from '@/core/constants';
import { AddonCalendarFilterPopoverComponent } from '../../components/filter/filter';
import { Params } from '@angular/router';
import { Subscription } from 'rxjs';
import { Network, NgZone } from '@singletons';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the list of calendar events.
 */
@Component({
    selector: 'page-addon-calendar-list',
    templateUrl: 'list.html',
    styleUrls: ['../../calendar-common.scss', 'list.scss'],
})
export class AddonCalendarListPage implements OnInit, OnDestroy {

    @ViewChild(IonContent) content?: IonContent;

    protected initialTime = 0;
    protected daysLoaded = 0;
    protected emptyEventsTimes = 0; // Variable to identify consecutive calls returning 0 events.
    protected categoriesRetrieved = false;
    protected getCategories = false;
    protected categories: { [id: number]: CoreCategoryData } = {};
    protected siteHomeId: number;
    protected currentSiteId: string;
    protected onlineEvents: AddonCalendarEventToDisplay[] = [];
    protected offlineEvents: AddonCalendarEventToDisplay[] = [];
    protected deletedEvents: number [] = [];

    // Observers.
    protected obsDefaultTimeChange?: CoreEventObserver;
    protected newEventObserver: CoreEventObserver;
    protected discardedObserver: CoreEventObserver;
    protected editEventObserver: CoreEventObserver;
    protected deleteEventObserver: CoreEventObserver;
    protected undeleteEventObserver: CoreEventObserver;
    protected syncObserver: CoreEventObserver;
    protected manualSyncObserver: CoreEventObserver;
    protected filterChangedObserver: CoreEventObserver;
    protected onlineObserver: Subscription;

    eventId?: number; // Selected EventId on list
    courses: Partial<CoreEnrolledCourseData>[] = [];
    eventsLoaded = false;
    events: AddonCalendarEventToDisplay[] = []; // Events (both online and offline).
    notificationsEnabled = false;
    filteredEvents: AddonCalendarEventToDisplay[] = [];
    canLoadMore = false;
    loadMoreError = false;
    canCreate = false;
    hasOffline = false;
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

        this.siteHomeId = CoreSites.getCurrentSiteHomeId();
        this.notificationsEnabled = CoreLocalNotifications.isAvailable();
        this.currentSiteId = CoreSites.getCurrentSiteId();

        if (this.notificationsEnabled) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = CoreEvents.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                AddonCalendar.scheduleEventsNotifications(this.onlineEvents);
            }, this.currentSiteId);
        }

        // Listen for events added. When an event is added, reload the data.
        this.newEventObserver = CoreEvents.on(AddonCalendarProvider.NEW_EVENT_EVENT, (data) => {
            if (data && data.eventId) {
                this.eventsLoaded = false;
                this.refreshEvents(true, false);
            }
        }, this.currentSiteId);

        // Listen for new event discarded event. When it does, reload the data.
        this.discardedObserver = CoreEvents.on(AddonCalendarProvider.NEW_EVENT_DISCARDED_EVENT, () => {
            this.eventsLoaded = false;
            this.refreshEvents(true, false);
        }, this.currentSiteId);

        // Listen for events edited. When an event is edited, reload the data.
        this.editEventObserver = CoreEvents.on(AddonCalendarProvider.EDIT_EVENT_EVENT, (data) => {
            if (data && data.eventId) {
                this.eventsLoaded = false;
                this.refreshEvents(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized automatically.
        this.syncObserver = CoreEvents.on(AddonCalendarSyncProvider.AUTO_SYNCED, () => {
            this.eventsLoaded = false;
            this.refreshEvents();
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = CoreEvents.on(AddonCalendarSyncProvider.MANUAL_SYNCED, (data) => {
            if (data && data.source != 'list') {
                this.eventsLoaded = false;
                this.refreshEvents();
            }
        }, this.currentSiteId);

        // Update the list when an event is deleted.
        this.deleteEventObserver = CoreEvents.on(
            AddonCalendarProvider.DELETED_EVENT_EVENT,
            (data) => {
                if (data && !data.sent) {
                    // Event was deleted in offline. Just mark it as deleted, no need to refresh.
                    this.markAsDeleted(data.eventId, true);
                    this.deletedEvents.push(data.eventId);
                    this.hasOffline = true;
                } else {
                    // Event deleted, refresh the view.
                    this.eventsLoaded = false;
                    this.refreshEvents();
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
                this.markAsDeleted(data.eventId, false);

                // Remove it from the list of deleted events if it's there.
                const index = this.deletedEvents.indexOf(data.eventId);
                if (index != -1) {
                    this.deletedEvents.splice(index, 1);
                }

                this.hasOffline = !!this.offlineEvents.length || !!this.deletedEvents.length;
            },
            this.currentSiteId,
        );

        this.filterChangedObserver =
            CoreEvents.on(AddonCalendarProvider.FILTER_CHANGED_EVENT, async (data) => {
                this.filter = data;

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.canCreate = await AddonCalendarHelper.canEditEvents(this.filter.courseId);

                this.filterEvents();

                this.content?.scrollToTop();
            });

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
    async ngOnInit(): Promise<void> {
        this.filter.courseId = CoreNavigator.getRouteNumberParam('courseId');
        this.syncIcon = CoreConstants.ICON_LOADING;

        await this.fetchData(false, true, false);
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param refresh Empty events array first.
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async fetchData(refresh = false, sync = false, showErrors = false): Promise<void> {
        this.initialTime = CoreTimeUtils.timestamp();
        this.daysLoaded = 0;
        this.emptyEventsTimes = 0;
        this.isOnline = CoreApp.isOnline();

        if (sync) {
            // Try to synchronize offline events.
            try {
                const result = await AddonCalendarSync.syncEvents();
                if (result.warnings && result.warnings.length) {
                    CoreDomUtils.showErrorModal(result.warnings[0]);
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    result.source = 'list';

                    CoreEvents.trigger(
                        AddonCalendarSyncProvider.MANUAL_SYNCED,
                        result,
                        this.currentSiteId,
                    );
                }
            } catch (error) {
                if (showErrors) {
                    CoreDomUtils.showErrorModalDefault(error, 'core.errorsync', true);
                }
            }
        }

        try {
            const promises: Promise<void>[] = [];

            this.hasOffline = false;

            promises.push(AddonCalendarHelper.canEditEvents(this.filter.courseId).then((canEdit) => {
                this.canCreate = canEdit;

                return;
            }));

            // Load courses for the popover.
            promises.push(CoreCoursesHelper.getCoursesForPopover(this.filter.courseId).then((result) => {
                this.courses = result.courses;

                return this.fetchEvents(refresh);
            }));

            // Get offline events.
            promises.push(AddonCalendarOffline.getAllEditedEvents().then((offlineEvents) => {
                this.hasOffline = this.hasOffline || !!offlineEvents.length;

                // Format data and sort by timestart.
                const events: AddonCalendarEventToDisplay[] = offlineEvents.map((event) =>
                    AddonCalendarHelper.formatOfflineEventData(event));

                this.offlineEvents = AddonCalendarHelper.sortEvents(events);

                return;
            }));

            // Get events deleted in offline.
            promises.push(AddonCalendarOffline.getAllDeletedEventsIds().then((ids) => {
                this.hasOffline = this.hasOffline || !!ids.length;
                this.deletedEvents = ids;

                return;
            }));

            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }

        this.eventsLoaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Fetches the events and updates the view.
     *
     * @param refresh Empty events array first.
     * @return Promise resolved when done.
     */
    async fetchEvents(refresh = false): Promise<void> {
        this.loadMoreError = false;

        try {
            const onlineEventsTemp =
                await AddonCalendar.getEventsList(this.initialTime, this.daysLoaded, AddonCalendarProvider.DAYS_INTERVAL);

            if (onlineEventsTemp.length === 0) {
                this.emptyEventsTimes++;
                if (this.emptyEventsTimes > 5) { // Stop execution if we retrieve empty list 6 consecutive times.
                    this.canLoadMore = false;
                    if (refresh) {
                        this.onlineEvents = [];
                        this.filteredEvents = [];
                        this.events = this.offlineEvents;
                    }
                } else {
                    // No events returned, load next events.
                    this.daysLoaded += AddonCalendarProvider.DAYS_INTERVAL;

                    return this.fetchEvents();
                }
            } else {
                const onlineEvents = onlineEventsTemp.map((event) => AddonCalendarHelper.formatEventData(event));

                // Get the merged events of this period.
                const events = this.mergeEvents(onlineEvents);

                this.getCategories = this.shouldLoadCategories(onlineEvents);

                if (refresh) {
                    this.onlineEvents = onlineEvents;
                    this.events = events;
                } else {
                    // Filter events with same ID. Repeated events are returned once per WS call, show them only once.
                    this.onlineEvents = CoreUtils.mergeArraysWithoutDuplicates(this.onlineEvents, onlineEvents, 'id');
                    this.events = CoreUtils.mergeArraysWithoutDuplicates(this.events, events, 'id');
                }
                this.filterEvents();

                // Calculate which evemts need to display the date.
                this.filteredEvents.forEach((event, index) => {
                    event.showDate = this.showDate(event, this.filteredEvents[index - 1]);
                    event.endsSameDay = this.endsSameDay(event);
                });
                this.canLoadMore = true;

                // Schedule notifications for the events retrieved (might have new events).
                AddonCalendar.scheduleEventsNotifications(this.onlineEvents);

                this.daysLoaded += AddonCalendarProvider.DAYS_INTERVAL;
            }

            // Resize the content so infinite loading is able to calculate if it should load more items or not.
            // @todo: Infinite loading is not working if content is not high enough.
            // this.content.resize();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }

        // Success retrieving events. Get categories if needed.
        if (this.getCategories) {
            this.getCategories = false;

            return this.loadCategories();
        }
    }

    /**
     * Function to load more events.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @return Resolved when done.
     */
    loadMoreEvents(infiniteComplete?: () => void ): void {
        this.fetchEvents().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    protected filterEvents(): void {
        this.filteredEvents = AddonCalendarHelper.getFilteredEvents(this.events, this.filter, this.categories);
    }

    /**
     * Returns if the current state should load categories or not.
     *
     * @param events Events to parse.
     * @return True if categories should be loaded.
     */
    protected shouldLoadCategories(events: AddonCalendarEventToDisplay[]): boolean {
        if (this.categoriesRetrieved || this.getCategories) {
            // Use previous value
            return this.getCategories;
        }

        // Categories not loaded yet. We should get them if there's any category event.
        const found = events.some((event) => typeof event.categoryid != 'undefined' && event.categoryid > 0);

        return found || this.getCategories;
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return Promise resolved when done.
     */
    protected async loadCategories(): Promise<void> {
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
     * Merge a period of online events with the offline events of that period.
     *
     * @param onlineEvents Online events.
     * @return Merged events.
     */
    protected mergeEvents(onlineEvents: AddonCalendarEventToDisplay[]): AddonCalendarEventToDisplay[] {
        if (!this.offlineEvents.length && !this.deletedEvents.length) {
            // No offline events, nothing to merge.
            return onlineEvents;
        }

        const start = this.initialTime + (CoreConstants.SECONDS_DAY * this.daysLoaded);
        const end = start + (CoreConstants.SECONDS_DAY * AddonCalendarProvider.DAYS_INTERVAL) - 1;
        let result = onlineEvents;

        if (this.deletedEvents.length) {
            // Mark as deleted the events that were deleted in offline.
            result.forEach((event) => {
                event.deleted = this.deletedEvents.indexOf(event.id) != -1;
            });
        }

        if (this.offlineEvents.length) {
            // Remove the online events that were modified in offline.
            result = result.filter((event) => {
                const offlineEvent = this.offlineEvents.find((ev) => ev.id == event.id);

                return !offlineEvent;
            });
        }

        // Now get the offline events that belong to this period.
        const periodOfflineEvents = this.offlineEvents.filter((event) => {
            if (this.daysLoaded == 0 && event.timestart < start) {
                // Display offline events that are previous to current time to allow editing them.
                return true;
            }

            return (event.timestart >= start || event.timestart + event.timeduration >= start) && event.timestart <= end;
        });

        // Merge both arrays and sort them.
        result = result.concat(periodOfflineEvents);

        return AddonCalendarHelper.sortEvents(result);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher, done?: () => void, showErrors?: boolean): Promise<void> {
        if (!this.eventsLoaded) {
            return;
        }

        await this.refreshEvents(true, showErrors).finally(() => {
            refresher?.complete();
            done && done();
        });
    }

    /**
     * Refresh the events.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async refreshEvents(sync?: boolean, showErrors?: boolean): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        promises.push(AddonCalendar.invalidateEventsList());
        promises.push(AddonCalendar.invalidateAllowedEventTypes());

        if (this.categoriesRetrieved) {
            promises.push(CoreCourses.invalidateCategories(0, true));
            this.categoriesRetrieved = false;
        }

        await Promise.all(promises).finally(() => this.fetchData(true, sync, showErrors));
    }

    /**
     * Check date should be shown on event list for the current event.
     * If date has changed from previous to current event it should be shown.
     *
     * @param event Current event where to show the date.
     * @param prevEvent Previous event where to compare the date with.
     * @return If date has changed and should be shown.
     */
    protected showDate(event: AddonCalendarEventToDisplay, prevEvent?: AddonCalendarEventToDisplay): boolean {
        if (!prevEvent) {
            // First event, show it.
            return true;
        }

        // Check if day has changed.
        return !moment(event.timestart * 1000).isSame(prevEvent.timestart * 1000, 'day');
    }

    /**
     * Check if event ends the same date or not.
     *
     * @param event Event info.
     * @return If date has changed and should be shown.
     */
    protected endsSameDay(event: AddonCalendarEventToDisplay): boolean {
        if (!event.timeduration) {
            // No duration.
            return true;
        }

        // Check if day has changed.
        return moment(event.timestart * 1000).isSame((event.timestart + event.timeduration) * 1000, 'day');
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
        this.eventId = undefined;
        eventId = eventId || 0;

        const params: Params = {};

        if (this.filter.courseId) {
            params.courseId = this.filter.courseId;
        }

        CoreNavigator.navigateToSitePath(`calendar/edit/${eventId}`, { params });
    }

    /**
     * Open calendar events settings.
     */
    openSettings(): void {
        CoreNavigator.navigateToSitePath('/calendar/settings');
    }

    /**
     * Navigate to a particular event.
     *
     * @param eventId Event to load.
     */
    gotoEvent(eventId: number): void {
        this.eventId = eventId;

        if (eventId <= 0) {
            // It's an offline event, go to the edit page.
            this.openEdit(eventId);
        } else {
            CoreNavigator.navigateToSitePath(`/calendar/event/${eventId}`);
        }
    }

    /**
     * Find an event and mark it as deleted.
     *
     * @param eventId Event ID.
     * @param deleted Whether to mark it as deleted or not.
     */
    protected markAsDeleted(eventId: number, deleted: boolean): void {
        const event = this.onlineEvents.find((event) => event.id == eventId);

        if (event) {
            event.deleted = deleted;
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.obsDefaultTimeChange?.off();
        this.newEventObserver?.off();
        this.discardedObserver?.off();
        this.editEventObserver?.off();
        this.deleteEventObserver?.off();
        this.undeleteEventObserver?.off();
        this.syncObserver?.off();
        this.manualSyncObserver?.off();
        this.filterChangedObserver?.off();
        this.onlineObserver?.unsubscribe();
    }

}
