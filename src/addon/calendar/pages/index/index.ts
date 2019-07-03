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
// WITHOUT WARRANTIES OR CONDITIONS OFx ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core';
import { IonicPage, NavParams, NavController, PopoverController } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarCalendarComponent } from '../../components/calendar/calendar';
import { AddonCalendarSyncProvider } from '../../providers/calendar-sync';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursePickerMenuPopoverComponent } from '@components/course-picker-menu/course-picker-menu-popover';
import { TranslateService } from '@ngx-translate/core';
import { Network } from '@ionic-native/network';

/**
 * Page that displays the calendar events.
 */
@IonicPage({ segment: 'addon-calendar-index' })
@Component({
    selector: 'page-addon-calendar-index',
    templateUrl: 'index.html',
})
export class AddonCalendarIndexPage implements OnInit, OnDestroy {
    @ViewChild(AddonCalendarCalendarComponent) calendarComponent: AddonCalendarCalendarComponent;

    protected allCourses = {
        id: -1,
        fullname: this.translate.instant('core.fulllistofcourses'),
        category: -1
    };
    protected eventId: number;
    protected currentSiteId: string;

    // Observers.
    protected newEventObserver: any;
    protected discardedObserver: any;
    protected editEventObserver: any;
    protected deleteEventObserver: any;
    protected undeleteEventObserver: any;
    protected syncObserver: any;
    protected manualSyncObserver: any;
    protected onlineObserver: any;

    courseId: number;
    categoryId: number;
    canCreate = false;
    courses: any[];
    notificationsEnabled = false;
    loaded = false;
    hasOffline = false;
    isOnline = false;
    syncIcon: string;

    constructor(localNotificationsProvider: CoreLocalNotificationsProvider,
            navParams: NavParams,
            network: Network,
            zone: NgZone,
            sitesProvider: CoreSitesProvider,
            private navCtrl: NavController,
            private domUtils: CoreDomUtilsProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarOffline: AddonCalendarOfflineProvider,
            private calendarHelper: AddonCalendarHelperProvider,
            private calendarSync: AddonCalendarSyncProvider,
            private translate: TranslateService,
            private eventsProvider: CoreEventsProvider,
            private coursesProvider: CoreCoursesProvider,
            private popoverCtrl: PopoverController,
            private appProvider: CoreAppProvider) {

        this.courseId = navParams.get('courseId');
        this.eventId = navParams.get('eventId') || false;
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.currentSiteId = sitesProvider.getCurrentSiteId();

        // Listen for events added. When an event is added, reload the data.
        this.newEventObserver = eventsProvider.on(AddonCalendarProvider.NEW_EVENT_EVENT, (data) => {
            if (data && data.event) {
                this.loaded = false;
                this.refreshData(true, false);
            }
        }, this.currentSiteId);

        // Listen for new event discarded event. When it does, reload the data.
        this.discardedObserver = eventsProvider.on(AddonCalendarProvider.NEW_EVENT_DISCARDED_EVENT, () => {
            this.loaded = false;
            this.refreshData(true, false);
        }, this.currentSiteId);

        // Listen for events edited. When an event is edited, reload the data.
        this.editEventObserver = eventsProvider.on(AddonCalendarProvider.EDIT_EVENT_EVENT, (data) => {
            if (data && data.event) {
                this.loaded = false;
                this.refreshData(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonCalendarSyncProvider.AUTO_SYNCED, (data) => {
            this.loaded = false;
            this.refreshData();
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = eventsProvider.on(AddonCalendarSyncProvider.MANUAL_SYNCED, (data) => {
            if (data && data.source != 'index') {
                this.loaded = false;
                this.refreshData();
            }
        }, this.currentSiteId);

        // Update the events when an event is deleted.
        this.deleteEventObserver = eventsProvider.on(AddonCalendarProvider.DELETED_EVENT_EVENT, (data) => {
            this.loaded = false;
            this.refreshData();
        }, this.currentSiteId);

        // Update the "hasOffline" property if an event deleted in offline is restored.
        this.undeleteEventObserver = eventsProvider.on(AddonCalendarProvider.UNDELETED_EVENT_EVENT, (data) => {
            this.calendarOffline.hasOfflineData().then((hasOffline) => {
                this.hasOffline = hasOffline;
            });
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
    ngOnInit(): void {
        if (this.eventId) {
            // There is an event to load, open the event in a new state.
            this.gotoEvent(this.eventId);
        }

        this.fetchData(true, false);
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [sync] Whether it should try to synchronize offline events.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(sync?: boolean, showErrors?: boolean): Promise<any> {

        this.syncIcon = 'spinner';
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
                    result.source = 'index';

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

            // Load courses for the popover.
            promises.push(this.coursesProvider.getUserCourses(false).then((courses) => {
                // Add "All courses".
                courses.unshift(this.allCourses);
                this.courses = courses;

                if (this.courseId) {
                    // Search the course to get the category.
                    const course = this.courses.find((course) => {
                        return course.id == this.courseId;
                    });

                    if (course) {
                        this.categoryId = course.category;
                    }
                }
            }));

            // Check if user can create events.
            promises.push(this.calendarHelper.canEditEvents(this.courseId).then((canEdit) => {
                this.canCreate = canEdit;
            }));

            // Check if there is offline data.
            promises.push(this.calendarOffline.hasOfflineData().then((hasOffline) => {
                this.hasOffline = hasOffline;
            }));

            return Promise.all(promises);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }).finally(() => {
            this.loaded = true;
            this.syncIcon = 'sync';
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
        if (this.loaded) {
            return this.refreshData(true, showErrors).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
    }

    /**
     * Refresh the data.
     *
     * @param {boolean} [sync] Whether it should try to synchronize offline events.
     * @param {boolean} [showErrors] Whether to show sync errors to the user.
     * @return {Promise<any>} Promise resolved when done.
     */
    refreshData(sync?: boolean, showErrors?: boolean): Promise<any> {
        this.syncIcon = 'spinner';

        const promises = [];

        promises.push(this.calendarProvider.invalidateAllowedEventTypes().then(() => {
            return this.fetchData();
        }));

        // Refresh the sub-component.
        promises.push(this.calendarComponent.refreshData());

        return Promise.all(promises).finally(() => {
            return this.fetchData(sync, showErrors);
        });
    }

    /**
     * Navigate to a particular event.
     *
     * @param {number} eventId Event to load.
     */
    gotoEvent(eventId: number): void {
        if (eventId < 0) {
            // It's an offline event, go to the edit page.
            this.openEdit(eventId);
        } else {
            this.navCtrl.push('AddonCalendarEventPage', {
                id: eventId
            });
        }
    }

    /**
     * Show the context menu.
     *
     * @param {MouseEvent} event Event.
     */
    openCourseFilter(event: MouseEvent): void {
        const popover = this.popoverCtrl.create(CoreCoursePickerMenuPopoverComponent, {
            courses: this.courses,
            courseId: this.courseId
        });

        popover.onDidDismiss((course) => {
            if (course) {
                this.courseId = course.id > 0 ? course.id : undefined;
                this.categoryId = course.id > 0 ? course.category : undefined;

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.calendarHelper.canEditEvents(this.courseId).then((canEdit) => {
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
        const params: any = {};

        if (eventId) {
            params.eventId = eventId;
        }
        if (this.courseId) {
            params.courseId = this.courseId;
        }

        this.navCtrl.push('AddonCalendarEditEventPage', params);
    }

    /**
     * Open calendar events settings.
     */
    openSettings(): void {
        this.navCtrl.push('AddonCalendarSettingsPage');
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
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
