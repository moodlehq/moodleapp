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

import { Component, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { IonicPage, Content, NavParams, NavController } from 'ionic-angular';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarSyncProvider } from '../../providers/calendar-sync';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursesHelperProvider } from '@core/courses/providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreEventsProvider } from '@providers/events';
import { CoreAppProvider } from '@providers/app';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import * as moment from 'moment';
import { Network } from '@ionic-native/network';
import { CoreConstants } from '@core/constants';

/**
 * Page that displays the list of calendar events.
 */
@IonicPage({ segment: 'addon-calendar-list' })
@Component({
    selector: 'page-addon-calendar-list',
    templateUrl: 'list.html',
})
export class AddonCalendarListPage implements OnDestroy {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    protected initialTime = 0;
    protected daysLoaded = 0;
    protected emptyEventsTimes = 0; // Variable to identify consecutive calls returning 0 events.
    protected categoriesRetrieved = false;
    protected getCategories = false;
    protected categories = {};
    protected siteHomeId: number;
    protected obsDefaultTimeChange: any;
    protected eventId: number;
    protected newEventObserver: any;
    protected discardedObserver: any;
    protected editEventObserver: any;
    protected deleteEventObserver: any;
    protected undeleteEventObserver: any;
    protected syncObserver: any;
    protected manualSyncObserver: any;
    protected onlineObserver: any;
    protected currentSiteId: string;
    protected onlineEvents = [];
    protected offlineEvents = [];
    protected deletedEvents = [];

    courses: any[];
    eventsLoaded = false;
    events = []; // Events (both online and offline).
    notificationsEnabled = false;
    filteredEvents = [];
    canLoadMore = false;
    loadMoreError = false;
    courseId: number;
    categoryId: number;
    canCreate = false;
    hasOffline = false;
    isOnline = false;
    syncIcon: string; // Sync icon.

    constructor(private calendarProvider: AddonCalendarProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider,
            private calendarHelper: AddonCalendarHelperProvider, sitesProvider: CoreSitesProvider, zone: NgZone,
            localNotificationsProvider: CoreLocalNotificationsProvider, private coursesHelper: CoreCoursesHelperProvider,
            private eventsProvider: CoreEventsProvider, private navCtrl: NavController, private appProvider: CoreAppProvider,
            private calendarOffline: AddonCalendarOfflineProvider, private calendarSync: AddonCalendarSyncProvider,
            network: Network, private timeUtils: CoreTimeUtilsProvider) {

        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.currentSiteId = sitesProvider.getCurrentSiteId();

        if (this.notificationsEnabled) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = eventsProvider.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                calendarProvider.scheduleEventsNotifications(this.onlineEvents);
            }, this.currentSiteId);
        }

        this.eventId = navParams.get('eventId') || false;
        this.courseId = navParams.get('courseId');

        // Listen for events added. When an event is added, reload the data.
        this.newEventObserver = eventsProvider.on(AddonCalendarProvider.NEW_EVENT_EVENT, (data) => {
            if (data && data.event) {
                if (this.splitviewCtrl.isOn()) {
                    // Discussion added, clear details page.
                    this.splitviewCtrl.emptyDetails();
                }

                this.eventsLoaded = false;
                this.refreshEvents(true, false).finally(() => {

                    // In tablet mode try to open the event (only if it's an online event).
                    if (this.splitviewCtrl.isOn() && data.event.id > 0) {
                        this.gotoEvent(data.event.id);
                    }
                });
            }
        }, this.currentSiteId);

        // Listen for new event discarded event. When it does, reload the data.
        this.discardedObserver = eventsProvider.on(AddonCalendarProvider.NEW_EVENT_DISCARDED_EVENT, () => {
            if (this.splitviewCtrl.isOn()) {
                // Discussion added, clear details page.
                this.splitviewCtrl.emptyDetails();
            }

            this.eventsLoaded = false;
            this.refreshEvents(true, false);
        }, this.currentSiteId);

        // Listen for events edited. When an event is edited, reload the data.
        this.editEventObserver = eventsProvider.on(AddonCalendarProvider.EDIT_EVENT_EVENT, (data) => {
            if (data && data.event) {
                this.eventsLoaded = false;
                this.refreshEvents(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonCalendarSyncProvider.AUTO_SYNCED, (data) => {
            this.eventsLoaded = false;
            this.refreshEvents();

            if (this.splitviewCtrl.isOn() && this.eventId && data && data.deleted && data.deleted.indexOf(this.eventId) != -1) {
                // Current selected event was deleted. Clear details.
                this.splitviewCtrl.emptyDetails();
            }
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = eventsProvider.on(AddonCalendarSyncProvider.MANUAL_SYNCED, (data) => {
            if (data && data.source != 'list') {
                this.eventsLoaded = false;
                this.refreshEvents();
            }

            if (this.splitviewCtrl.isOn() && this.eventId && data && data.deleted && data.deleted.indexOf(this.eventId) != -1) {
                // Current selected event was deleted. Clear details.
                this.splitviewCtrl.emptyDetails();
            }
        }, this.currentSiteId);

        // Update the list when an event is deleted.
        this.deleteEventObserver = eventsProvider.on(AddonCalendarProvider.DELETED_EVENT_EVENT, (data) => {
            if (data && !data.sent) {
                // Event was deleted in offline. Just mark it as deleted, no need to refresh.
                this.markAsDeleted(data.eventId, true);
                this.deletedEvents.push(data.eventId);
                this.hasOffline = true;
            } else {
                // Event deleted, clear the details if needed and refresh the view.
                if (this.splitviewCtrl.isOn()) {
                    this.splitviewCtrl.emptyDetails();
                }

                this.eventsLoaded = false;
                this.refreshEvents();
            }
        }, this.currentSiteId);

        // Listen for events "undeleted" (offline).
        this.undeleteEventObserver = eventsProvider.on(AddonCalendarProvider.UNDELETED_EVENT_EVENT, (data) => {
            if (data && data.eventId) {
                // Mark it as undeleted, no need to refresh.
                this.markAsDeleted(data.eventId, false);

                // Remove it from the list of deleted events if it's there.
                const index = this.deletedEvents.indexOf(data.eventId);
                if (index != -1) {
                    this.deletedEvents.splice(index, 1);
                }

                this.hasOffline = !!this.offlineEvents.length || !!this.deletedEvents.length;
            }
        }, this.currentSiteId);

        // Refresh online status when changes.
        this.onlineObserver = network.onchange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = this.appProvider.isOnline();
            });
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.eventId) {
            // There is an event to load, open the event in a new state.
            this.gotoEvent(this.eventId);
        }

        this.syncIcon = 'spinner';

        this.fetchData(false, true, false).then(() => {
            if (!this.eventId && this.splitviewCtrl.isOn() && this.events.length > 0) {
                // Take first online event and load it. If no online event, load the first offline.
                if (this.onlineEvents[0]) {
                    this.gotoEvent(this.onlineEvents[0].id);
                } else {
                    this.gotoEvent(this.offlineEvents[0].id);
                }
            }
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @param {boolean} [sync] Whether it should try to synchronize offline events.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(refresh?: boolean, sync?: boolean, showErrors?: boolean): Promise<any> {
        this.initialTime = this.timeUtils.timestamp();
        this.daysLoaded = 0;
        this.emptyEventsTimes = 0;
        this.isOnline = this.appProvider.isOnline();

        let promise;

        if (sync) {
            // Try to synchronize offline events.
            promise = this.calendarSync.syncEvents().then((result) => {
                if (result.warnings && result.warnings.length) {
                    this.domUtils.showErrorModal(result.warnings[0]);
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    result.source = 'list';

                    this.eventsProvider.trigger(AddonCalendarSyncProvider.MANUAL_SYNCED, result, this.currentSiteId);
                }
            }).catch((error) => {
                if (showErrors) {
                    this.domUtils.showErrorModalDefault(error, 'core.errorsync', true);
                }
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {

            const promises = [];

            this.hasOffline = false;

            promises.push(this.calendarHelper.canEditEvents(this.courseId).then((canEdit) => {
                this.canCreate = canEdit;
            }));

            // Load courses for the popover.
            promises.push(this.coursesHelper.getCoursesForPopover(this.courseId).then((result) => {
                this.courses = result.courses;
                this.categoryId = result.categoryId;

                return this.fetchEvents(refresh);
            }));

            // Get offline events.
            promises.push(this.calendarOffline.getAllEditedEvents().then((events) => {
                this.hasOffline = this.hasOffline || !!events.length;

                // Format data and sort by timestart.
                events.forEach((event) => {
                    event.offline = true;
                    this.calendarHelper.formatEventData(event);
                });
                this.offlineEvents = this.sortEvents(events);
            }));

            // Get events deleted in offline.
            promises.push(this.calendarOffline.getAllDeletedEventsIds().then((ids) => {
                this.hasOffline = this.hasOffline || !!ids.length;
                this.deletedEvents = ids;
            }));

            return Promise.all(promises);
        }).finally(() => {
            this.eventsLoaded = true;
            this.syncIcon = 'sync';
        });
    }

    /**
     * Fetches the events and updates the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchEvents(refresh?: boolean): Promise<any> {
        this.loadMoreError = false;

        return this.calendarProvider.getEventsList(this.initialTime, this.daysLoaded, AddonCalendarProvider.DAYS_INTERVAL)
                .then((onlineEvents) => {

            if (onlineEvents.length === 0) {
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
                onlineEvents.forEach(this.calendarHelper.formatEventData.bind(this.calendarHelper));

                // Get the merged events of this period.
                const events = this.mergeEvents(onlineEvents);

                this.getCategories = this.shouldLoadCategories(onlineEvents);

                if (refresh) {
                    this.onlineEvents = onlineEvents;
                    this.events = events;
                } else {
                    // Filter events with same ID. Repeated events are returned once per WS call, show them only once.
                    this.onlineEvents = this.utils.mergeArraysWithoutDuplicates(this.onlineEvents, onlineEvents, 'id');
                    this.events = this.utils.mergeArraysWithoutDuplicates(this.events, events, 'id');
                }
                this.filteredEvents = this.getFilteredEvents();

                // Calculate which evemts need to display the date.
                this.filteredEvents.forEach((event, index): any => {
                    event.showDate = this.showDate(event, this.filteredEvents[index - 1]);
                    event.endsSameDay = this.endsSameDay(event);
                });
                this.canLoadMore = true;

                // Schedule notifications for the events retrieved (might have new events).
                this.calendarProvider.scheduleEventsNotifications(this.onlineEvents);

                this.daysLoaded += AddonCalendarProvider.DAYS_INTERVAL;
            }

            // Resize the content so infinite loading is able to calculate if it should load more items or not.
            // @todo: Infinite loading is not working if content is not high enough.
            this.content.resize();
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        }).then(() => {
            // Success retrieving events. Get categories if needed.
            if (this.getCategories) {
                this.getCategories = false;

                return this.loadCategories();
            }
        });
    }

    /**
     * Function to load more events.
     *
     * @param {any} [infiniteComplete] Infinite scroll complete function. Only used from core-infinite-loading.
     * @return {Promise<any>} Resolved when done.
     */
    loadMoreEvents(infiniteComplete?: any): Promise<any> {
        return this.fetchEvents().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Get filtered events.
     *
     * @return {any[]} Filtered events.
     */
    protected getFilteredEvents(): any[] {
        if (!this.courseId) {
            // No filter, display everything.
            return this.events;
        }

        return this.events.filter((event) => {
            return this.calendarHelper.shouldDisplayEvent(event, this.courseId, this.categoryId, this.categories);
        });
    }

    /**
     * Returns if the current state should load categories or not.
     * @param {any[]} events Events to parse.
     * @return {boolean}  True if categories should be loaded.
     */
    protected shouldLoadCategories(events: any[]): boolean {
        if (this.categoriesRetrieved || this.getCategories) {
            // Use previous value
            return this.getCategories;
        }

        // Categories not loaded yet. We should get them if there's any category event.
        const found = events.some((event) => event.categoryid != 'undefined' && event.categoryid > 0);

        return found || this.getCategories;
    }

    /**
     * Load categories to be able to filter events.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadCategories(): Promise<any> {
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
     * Merge a period of online events with the offline events of that period.
     *
     * @param {any[]} onlineEvents Online events.
     * @return {any[]} Merged events.
     */
    protected mergeEvents(onlineEvents: any[]): any[] {
        if (!this.offlineEvents.length && !this.deletedEvents.length) {
            // No offline events, nothing to merge.
            return onlineEvents;
        }

        const start = this.initialTime + (CoreConstants.SECONDS_DAY * this.daysLoaded),
            end = start + (CoreConstants.SECONDS_DAY * AddonCalendarProvider.DAYS_INTERVAL) - 1;
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
                const offlineEvent = this.offlineEvents.find((ev) => {
                    return ev.id == event.id;
                });

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
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors?: boolean): Promise<any> {
        if (this.eventsLoaded) {
            return this.refreshEvents(true, showErrors).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
    }

    /**
     * Refresh the events.
     *
     * @param {boolean} [sync] Whether it should try to synchronize offline events.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshEvents(sync?: boolean, showErrors?: boolean): Promise<any> {
        this.syncIcon = 'spinner';

        const promises = [];

        promises.push(this.calendarProvider.invalidateEventsList());
        promises.push(this.calendarProvider.invalidateAllowedEventTypes());

        if (this.categoriesRetrieved) {
            promises.push(this.coursesProvider.invalidateCategories(0, true));
            this.categoriesRetrieved = false;
        }

        return Promise.all(promises).finally(() => {
            return this.fetchData(true, sync, showErrors);
        });
    }

    /**
     * Check date should be shown on event list for the current event.
     * If date has changed from previous to current event it should be shown.
     *
     * @param {any} event       Current event where to show the date.
     * @param {any} [prevEvent] Previous event where to compare the date with.
     * @return {boolean}  If date has changed and should be shown.
     */
    protected showDate(event: any, prevEvent?: any): boolean {
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
     * @param {any} event Event info.
     * @return {boolean}  If date has changed and should be shown.
     */
    protected endsSameDay(event: any): boolean {
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
     * @param {MouseEvent} event Event.
     */
    openCourseFilter(event: MouseEvent): void {
        this.coursesHelper.selectCourse(event, this.courses, this.courseId).then((result) => {
            if (typeof result.courseId != 'undefined') {
                this.courseId = result.courseId > 0 ? result.courseId : undefined;
                this.categoryId = result.courseId > 0 ? result.categoryId : undefined;

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.calendarHelper.canEditEvents(this.courseId).then((canEdit) => {
                    this.canCreate = canEdit;
                });

                this.filteredEvents = this.getFilteredEvents();

                this.domUtils.scrollToTop(this.content);
            }
        });
    }

    /**
     * Open page to create/edit an event.
     *
     * @param {number} [eventId] Event ID to edit.
     */
    openEdit(eventId?: number): void {
        this.eventId = undefined;

        const params: any = {};

        if (eventId) {
            params.eventId = eventId;
        }
        if (this.courseId) {
            params.courseId = this.courseId;
        }

        this.splitviewCtrl.push('AddonCalendarEditEventPage', params);
    }

    /**
     * Open calendar events settings.
     */
    openSettings(): void {
        this.navCtrl.push('AddonCalendarSettingsPage');
    }

    /**
     * Navigate to a particular event.
     *
     * @param {number} eventId Event to load.
     */
    gotoEvent(eventId: number): void {
        this.eventId = eventId;

        if (eventId < 0) {
            // It's an offline event, go to the edit page.
            this.openEdit(eventId);
        } else {
            this.splitviewCtrl.push('AddonCalendarEventPage', {
                id: eventId
            });
        }
    }

    /**
     * Find an event and mark it as deleted.
     *
     * @param {number} eventId Event ID.
     * @param {boolean} deleted Whether to mark it as deleted or not.
     */
    protected markAsDeleted(eventId: number, deleted: boolean): void {
        const event = this.onlineEvents.find((event) => {
            return event.id == eventId;
        });

        if (event) {
            event.deleted = deleted;
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.obsDefaultTimeChange && this.obsDefaultTimeChange.off();
        this.newEventObserver && this.newEventObserver.off();
        this.discardedObserver && this.discardedObserver.off();
        this.editEventObserver && this.editEventObserver.off();
        this.deleteEventObserver && this.deleteEventObserver.off();
        this.undeleteEventObserver && this.undeleteEventObserver.off();
        this.syncObserver && this.syncObserver.off();
        this.manualSyncObserver && this.manualSyncObserver.off();
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
