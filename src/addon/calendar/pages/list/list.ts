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
import { IonicPage, Content, PopoverController, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarSyncProvider } from '../../providers/calendar-sync';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreCoursePickerMenuPopoverComponent } from '@components/course-picker-menu/course-picker-menu-popover';
import { CoreEventsProvider } from '@providers/events';
import { CoreAppProvider } from '@providers/app';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import * as moment from 'moment';
import { Network } from '@ionic-native/network';

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

    protected daysLoaded = 0;
    protected emptyEventsTimes = 0; // Variable to identify consecutive calls returning 0 events.
    protected categoriesRetrieved = false;
    protected getCategories = false;
    protected allCourses = {
        id: -1,
        fullname: this.translate.instant('core.fulllistofcourses'),
        category: -1
    };
    protected categories = {};
    protected siteHomeId: number;
    protected obsDefaultTimeChange: any;
    protected eventId: number;
    protected preSelectedCourseId: number;
    protected newEventObserver: any;
    protected discardedObserver: any;
    protected editEventObserver: any;
    protected syncObserver: any;
    protected manualSyncObserver: any;
    protected onlineObserver: any;
    protected currentSiteId: string;

    courses: any[];
    eventsLoaded = false;
    events = [];
    offlineEvents = [];
    notificationsEnabled = false;
    filteredEvents = [];
    canLoadMore = false;
    loadMoreError = false;
    filter = {
        course: this.allCourses
    };
    canCreate = false;
    hasOffline = false;
    isOnline = false;
    syncIcon: string; // Sync icon.

    constructor(private translate: TranslateService, private calendarProvider: AddonCalendarProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider, private utils: CoreUtilsProvider,
            private calendarHelper: AddonCalendarHelperProvider, sitesProvider: CoreSitesProvider, zone: NgZone,
            localNotificationsProvider: CoreLocalNotificationsProvider, private popoverCtrl: PopoverController,
            private eventsProvider: CoreEventsProvider, private navCtrl: NavController, private appProvider: CoreAppProvider,
            private calendarOffline: AddonCalendarOfflineProvider, private calendarSync: AddonCalendarSyncProvider,
            network: Network) {

        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.currentSiteId = sitesProvider.getCurrentSiteId();

        if (this.notificationsEnabled) {
            // Re-schedule events if default time changes.
            this.obsDefaultTimeChange = eventsProvider.on(AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
                calendarProvider.scheduleEventsNotifications(this.events);
            }, this.currentSiteId);
        }

        this.eventId = navParams.get('eventId') || false;
        this.preSelectedCourseId = navParams.get('courseId') || null;

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
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = eventsProvider.on(AddonCalendarSyncProvider.MANUAL_SYNCED, (data) => {
            if (data && data.source != 'list') {
                this.eventsLoaded = false;
                this.refreshEvents();
            }
        }, this.currentSiteId);

        // Refresh online status when changes.
        this.onlineObserver = network.onchange().subscribe((online) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            zone.run(() => {
                this.isOnline = online;
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
                // Take first and load it.
                this.gotoEvent(this.events[0].id);
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
            const courseId = this.filter.course.id != this.allCourses.id ? this.filter.course.id : undefined;

            promises.push(this.calendarHelper.canEditEvents(courseId).then((canEdit) => {
                this.canCreate = canEdit;
            }));

            // Load courses for the popover.
            promises.push(this.coursesProvider.getUserCourses(false).then((courses) => {
                // Add "All courses".
                courses.unshift(this.allCourses);
                this.courses = courses;

                if (this.preSelectedCourseId) {
                    this.filter.course = courses.find((course) => {
                        return course.id == this.preSelectedCourseId;
                    });
                }

                return this.fetchEvents(refresh);
            }));

            // Get offline events.
            promises.push(this.calendarOffline.getAllEvents().then((events) => {
                this.hasOffline = !!events.length;

                // Format data and sort by timestart.
                events.forEach(this.calendarHelper.formatEventData.bind(this.calendarHelper));
                this.offlineEvents = events.sort((a, b) => a.timestart - b.timestart);
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

        return this.calendarProvider.getEventsList(this.daysLoaded, AddonCalendarProvider.DAYS_INTERVAL).then((events) => {
            this.daysLoaded += AddonCalendarProvider.DAYS_INTERVAL;
            if (events.length === 0) {
                this.emptyEventsTimes++;
                if (this.emptyEventsTimes > 5) { // Stop execution if we retrieve empty list 6 consecutive times.
                    this.canLoadMore = false;
                    if (refresh) {
                        this.events = [];
                        this.filteredEvents = [];
                    }
                } else {
                    // No events returned, load next events.
                    return this.fetchEvents();
                }
            } else {
                events.forEach(this.calendarHelper.formatEventData.bind(this.calendarHelper));

                // Sort the events by timestart, they're ordered by id.
                events.sort((a, b) => {
                    if (a.timestart == b.timestart) {
                        return a.timeduration - b.timeduration;
                    }

                    return a.timestart - b.timestart;
                });

                this.getCategories = this.shouldLoadCategories(events);

                if (refresh) {
                    this.events = events;
                } else {
                    // Filter events with same ID. Repeated events are returned once per WS call, show them only once.
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
                this.calendarProvider.scheduleEventsNotifications(this.events);
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
        if (this.filter.course.id == -1) {
            // No filter, display everything.
            return this.events;
        }

        return this.events.filter(this.shouldDisplayEvent.bind(this));
    }

    /**
     * Check if an event should be displayed based on the filter.
     *
     * @param {any} event Event object.
     * @return {boolean} Whether it should be displayed.
     */
    protected shouldDisplayEvent(event: any): boolean {
        if (event.eventtype == 'user' || event.eventtype == 'site') {
            // User or site event, display it.
            return true;
        }

        if (event.eventtype == 'category') {
            if (!event.categoryid || !Object.keys(this.categories).length) {
                // We can't tell if the course belongs to the category, display them all.
                return true;
            }
            if (event.categoryid == this.filter.course.category) {
                // The event is in the same category as the course, display it.
                return true;
            }

            // Check parent categories.
            let category = this.categories[this.filter.course.category];
            while (category) {
                if (!category.parent) {
                    // Category doesn't have parent, stop.
                    break;
                }

                if (event.categoryid == category.parent) {
                    return true;
                }
                category = this.categories[category.parent];
            }

            return false;
        }

        // Show the event if it is from site home or if it matches the selected course.
        return event.courseid === this.siteHomeId || event.courseid == this.filter.course.id;
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
        const popover = this.popoverCtrl.create(CoreCoursePickerMenuPopoverComponent, {
            courses: this.courses,
            courseId: this.filter.course.id
        });
        popover.onDidDismiss((course) => {
            if (course) {
                this.filter.course = course;
                this.domUtils.scrollToTop(this.content);

                this.filteredEvents = this.getFilteredEvents();

                // Course viewed has changed, check if the user can create events for this course calendar.
                const courseId = this.filter.course.id != this.allCourses.id ? this.filter.course.id : undefined;

                this.calendarHelper.canEditEvents(courseId).then((canEdit) => {
                    this.canCreate = canEdit;
                });
            }
        });
        popover.present({
            ev: event
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
        if (this.filter.course.id != this.allCourses.id) {
            params.courseId = this.filter.course.id;
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
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.obsDefaultTimeChange && this.obsDefaultTimeChange.off();
        this.newEventObserver && this.newEventObserver.off();
        this.discardedObserver && this.discardedObserver.off();
        this.editEventObserver && this.editEventObserver.off();
        this.syncObserver && this.syncObserver.off();
        this.manualSyncObserver && this.manualSyncObserver.off();
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
