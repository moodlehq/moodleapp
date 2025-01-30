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
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { AddonCalendar } from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarSync } from '../../services/calendar-sync';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { NgZone, Translate } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreEnrolledCourseData } from '@features/courses/services/courses';
import { ActivatedRoute, Params } from '@angular/router';
import { AddonCalendarCalendarComponent } from '../../components/calendar/calendar';
import { AddonCalendarUpcomingEventsComponent } from '../../components/upcoming-events/upcoming-events';
import { CoreNavigator } from '@services/navigator';
import { CoreConstants } from '@/core/constants';
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
} from '@addons/calendar/constants';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreMainMenuComponentsModule } from '@features/mainmenu/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the calendar events.
 */
@Component({
    selector: 'page-addon-calendar-index',
    templateUrl: 'index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreMainMenuComponentsModule,
        AddonCalendarCalendarComponent,
        AddonCalendarUpcomingEventsComponent,
    ],
})
export default class AddonCalendarIndexPage implements OnInit, OnDestroy {

    @ViewChild(AddonCalendarCalendarComponent) calendarComponent?: AddonCalendarCalendarComponent;
    @ViewChild(AddonCalendarUpcomingEventsComponent) upcomingEventsComponent?: AddonCalendarUpcomingEventsComponent;

    protected currentSiteId: string;

    // Observers.
    protected newEventObserver?: CoreEventObserver;
    protected discardedObserver?: CoreEventObserver;
    protected editEventObserver?: CoreEventObserver;
    protected deleteEventObserver?: CoreEventObserver;
    protected undeleteEventObserver?: CoreEventObserver;
    protected syncObserver?: CoreEventObserver;
    protected manualSyncObserver?: CoreEventObserver;
    protected onlineObserver?: Subscription;
    protected filterChangedObserver?: CoreEventObserver;

    year?: number;
    month?: number;
    canCreate = false;
    courses: CoreEnrolledCourseData[] = [];
    loaded = false;
    hasOffline = false;
    isOnline = false;
    syncIcon = CoreConstants.ICON_LOADING;
    showCalendar = true;
    loadUpcoming = false;
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

    constructor(
        protected route: ActivatedRoute,
    ) {
        this.currentSiteId = CoreSites.getCurrentSiteId();

        // Listen for events added. When an event is added, reload the data.
        this.newEventObserver = CoreEvents.on(
            ADDON_CALENDAR_NEW_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.loaded = false;
                    this.refreshData(true, false, true);
                }
            },
            this.currentSiteId,
        );

        // Listen for new event discarded event. When it does, reload the data.
        this.discardedObserver = CoreEvents.on(ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT, () => {
            this.loaded = false;
            this.refreshData(true, false, true);
        }, this.currentSiteId);

        // Listen for events edited. When an event is edited, reload the data.
        this.editEventObserver = CoreEvents.on(
            ADDON_CALENDAR_EDIT_EVENT_EVENT,
            (data) => {
                if (data && data.eventId) {
                    this.loaded = false;
                    this.refreshData(true, false, true);
                }
            },
            this.currentSiteId,
        );

        // Refresh data if calendar events are synchronized automatically.
        this.syncObserver = CoreEvents.on(ADDON_CALENDAR_AUTO_SYNCED, () => {
            this.loaded = false;
            this.refreshData(false, false, true);
        }, this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = CoreEvents.on(ADDON_CALENDAR_MANUAL_SYNCED, (data) => {
            if (data && data.source != 'index') {
                this.loaded = false;
                this.refreshData(false, false, true);
            }
        }, this.currentSiteId);

        // Update the events when an event is deleted.
        this.deleteEventObserver = CoreEvents.on(ADDON_CALENDAR_DELETED_EVENT_EVENT, () => {
            this.loaded = false;
            this.refreshData(false, false, true);
        }, this.currentSiteId);

        // Update the "hasOffline" property if an event deleted in offline is restored.
        this.undeleteEventObserver = CoreEvents.on(ADDON_CALENDAR_UNDELETED_EVENT_EVENT, async () => {
            this.hasOffline = await AddonCalendarOffline.hasOfflineData();
        }, this.currentSiteId);

        this.filterChangedObserver = CoreEvents.on(
            ADDON_CALENDAR_FILTER_CHANGED_EVENT,
            async (filterData) => {
                this.filter = filterData;

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.canCreate = await AddonCalendarHelper.canEditEvents(this.filter.courseId);
            },
        );

        // Refresh online status when changes.
        this.onlineObserver = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.loadUpcoming = !!CoreNavigator.getRouteBooleanParam('upcoming');
        this.showCalendar = !this.loadUpcoming;

        this.route.queryParams.subscribe(async () => {
            this.filter.courseId = CoreNavigator.getRouteNumberParam('courseId');
            this.year = CoreNavigator.getRouteNumberParam('year');
            this.month = CoreNavigator.getRouteNumberParam('month');
            this.filter.filtered = !!this.filter.courseId;

            this.fetchData(true, false);

            if (this.year !== undefined && this.month !== undefined && this.calendarComponent) {
                this.calendarComponent.viewMonth(this.month, this.year);
            }
        });

        CoreSites.loginNavigationFinished();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    async fetchData(sync?: boolean, showErrors?: boolean): Promise<void> {

        this.syncIcon = CoreConstants.ICON_LOADING;
        this.isOnline = CoreNetwork.isOnline();

        if (sync) {
            // Try to synchronize offline events.
            try {
                const result = await AddonCalendarSync.syncEvents();
                if (result.warnings && result.warnings.length) {
                    CoreAlerts.show({ message: result.warnings[0] });
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    result.source = 'index';

                    CoreEvents.trigger(
                        ADDON_CALENDAR_MANUAL_SYNCED,
                        result,
                        this.currentSiteId,
                    );
                }
            } catch (error) {
                if (showErrors) {
                    CoreAlerts.showError(error, { default: Translate.instant('core.errorsync') });
                }
            }
        }

        try {
            const promises: Promise<void>[] = [];

            this.hasOffline = false;

            // Load courses for the popover.
            promises.push(CoreCoursesHelper.getCoursesForPopover(this.filter.courseId).then((data) => {
                this.courses = data.courses;

                return;
            }));

            // Check if user can create events.
            promises.push(AddonCalendarHelper.canEditEvents(this.filter.courseId).then((canEdit) => {
                this.canCreate = canEdit;

                return;
            }));

            // Check if there is offline data.
            promises.push(AddonCalendarOffline.hasOfflineData().then((hasOffline) => {
                this.hasOffline = hasOffline;

                return;
            }));

            await Promise.all(promises);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        }

        this.loaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void, showErrors?: boolean): Promise<void> {
        if (!this.loaded) {
            return;
        }

        await this.refreshData(true, showErrors).finally(() => {
            refresher?.complete();
            done && done();
        });
    }

    /**
     * Refresh the data.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @param afterChange Whether the refresh is done after an event has changed or has been synced.
     * @returns Promise resolved when done.
     */
    async refreshData(sync = false, showErrors = false, afterChange = false): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        promises.push(AddonCalendar.invalidateAllowedEventTypes());

        // Refresh the sub-component.
        if (this.showCalendar && this.calendarComponent) {
            promises.push(this.calendarComponent.refreshData(afterChange));
        } else if (!this.showCalendar && this.upcomingEventsComponent) {
            promises.push(this.upcomingEventsComponent.refreshData());
        }

        await Promise.all(promises).finally(() => this.fetchData(sync, showErrors));
    }

    /**
     * Navigate to a particular event.
     *
     * @param eventId Event to load.
     */
    gotoEvent(eventId: number): void {
        CoreNavigator.navigateToSitePath(`/calendar/event/${eventId}`);
    }

    /**
     * View a certain day.
     *
     * @param data Data with the year, month and day.
     */
    gotoDay(data: {day: number; month: number; year: number}): void {
        const params: Params = {
            day: data.day,
            month: data.month,
            year: data.year,
        };

        Object.keys(this.filter).forEach((key) => {
            params[key] = this.filter[key];
        });

        CoreNavigator.navigateToSitePath('/calendar/day', { params });
    }

    /**
     * Show the filter menu.
     */
    async openFilter(): Promise<void> {
        const { AddonCalendarFilterComponent } = await import('../../components/filter/filter');

        await CoreModals.openSideModal({
            component: AddonCalendarFilterComponent,
            componentProps: {
                courses: this.courses,
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
        eventId = eventId || 0;

        if (this.filter.courseId) {
            params.courseId = this.filter.courseId;
        }

        CoreNavigator.navigateToSitePath(`/calendar/edit/${eventId}`, { params });
    }

    /**
     * Open calendar events settings.
     */
    openSettings(): void {
        CoreNavigator.navigateToSitePath('/calendar/calendar-settings');
    }

    /**
     * Toogle display: monthly view or upcoming events.
     */
    toggleDisplay(): void {
        this.showCalendar = !this.showCalendar;

        if (!this.showCalendar) {
            this.loadUpcoming = true;
        }
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
        this.filterChangedObserver?.off();
        this.onlineObserver?.unsubscribe();
    }

}
