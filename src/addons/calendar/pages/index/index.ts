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

import { Component, OnInit, OnDestroy, inject, viewChild } from '@angular/core';
import { CoreNetwork } from '@services/network';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreCoursesHelper } from '@features/courses/services/courses-helper';
import { AddonCalendar, AddonCalendarEventToDisplay } from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarSync } from '../../services/calendar-sync';
import { AddonCalendarFilter, AddonCalendarHelper } from '../../services/calendar-helper';
import { Translate } from '@singletons';
import { CoreEnrolledCourseData } from '@features/courses/services/courses';
import { ActivatedRoute, Params } from '@angular/router';
import { AddonCalendarCalendarComponent } from '../../components/calendar/calendar';
import { AddonCalendarUpcomingEventsComponent } from '../../components/upcoming-events/upcoming-events';
import { CoreNavigator } from '@services/navigator';
import { CoreConstants } from '@/core/constants';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreMainMenuUserButtonComponent } from '@features/mainmenu/components/user-menu-button/user-menu-button';
import moment from 'moment-timezone';
import { CoreUserParent } from '@features/user/services/parent';
import {
    ADDON_CALENDAR_NEW_EVENT_EVENT,
    ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT,
    ADDON_CALENDAR_EDIT_EVENT_EVENT,
    ADDON_CALENDAR_AUTO_SYNCED,
    ADDON_CALENDAR_MANUAL_SYNCED,
    ADDON_CALENDAR_DELETED_EVENT_EVENT,
    ADDON_CALENDAR_UNDELETED_EVENT_EVENT,
    ADDON_CALENDAR_FILTER_CHANGED_EVENT,
} from '../../constants';

/**
 * Page that displays the calendar events.
 */
@Component({
    selector: 'page-addon-calendar-index',
    templateUrl: 'index.html',
    imports: [
        CoreSharedModule,
        AddonCalendarCalendarComponent,
        AddonCalendarUpcomingEventsComponent,
        CoreMainMenuUserButtonComponent,
    ],
})
export default class AddonCalendarIndexPage implements OnInit, OnDestroy {

    readonly calendarComponent = viewChild(AddonCalendarCalendarComponent);
    readonly upcomingEventsComponent = viewChild(AddonCalendarUpcomingEventsComponent);

    protected currentSiteId: string;
    protected initialized = false;

    // Observers.
    protected newEventObserver?: CoreEventObserver;
    protected discardedObserver?: CoreEventObserver;
    protected editEventObserver?: CoreEventObserver;
    protected deleteEventObserver?: CoreEventObserver;
    protected undeleteEventObserver?: CoreEventObserver;
    protected syncObserver?: CoreEventObserver;
    protected manualSyncObserver?: CoreEventObserver;
    protected filterChangedObserver?: CoreEventObserver;
    protected route = inject(ActivatedRoute);

    year?: number;
    month?: number;
    canCreate = false;
    courses: CoreEnrolledCourseData[] = [];
    loaded = false;
    hasOffline = false;
    readonly isOnline = CoreNetwork.onlineSignal;
    syncIcon = CoreConstants.ICON_LOADING;
    showCalendar = true;
    loadUpcoming = false;
    calendarView: 'month' | 'week' = 'week'; // Default to week view for parents
    weekDays: {
        date: moment.Moment;
        dayName: string;
        displayDate: string;
        isToday: boolean;
        events: any[];
    }[] = [];
    weekPeriodName = '';
    currentWeekStart?: moment.Moment;

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
                this.filter = { ...filterData };

                // Course viewed has changed, check if the user can create events for this course calendar.
                this.canCreate = await AddonCalendarHelper.canEditEvents(this.filter.courseId);
            },
        );
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

            const calendarComponent = this.calendarComponent();
            if (this.year !== undefined && this.month !== undefined && calendarComponent) {
                calendarComponent.viewMonth(this.month, this.year);
            }

            // Load week events if in week view
            if (this.calendarView === 'week' && this.showCalendar) {
                await this.loadWeekEvents();
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

        let refreshComponent = false;

        if (sync) {
            // Try to synchronize offline events.
            try {
                const result = await AddonCalendarSync.syncEvents();
                if (result.warnings && result.warnings.length) {
                    CoreAlerts.show({ message: result.warnings[0] });
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    refreshComponent = this.initialized; // Refresh component only if it was already initialized.
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

            // Check if user can create events - but disable for parents and students
            promises.push((async () => {
                const canEdit = await AddonCalendarHelper.canEditEvents(this.filter.courseId);
                const site = CoreSites.getCurrentSite();
                if (site) {
                    const isParent = await CoreUserParent.isParentUser(site.getId());
                    // For Aspire: parents and students cannot create calendar events
                    // Only teachers/admins should be able to create events
                    this.canCreate = canEdit && !isParent;
                } else {
                    this.canCreate = canEdit;
                }
            })());

            // Check if there is offline data.
            promises.push(AddonCalendarOffline.hasOfflineData().then((hasOffline) => {
                this.hasOffline = hasOffline;

                return;
            }));

            if (refreshComponent) {
                promises.push(this.refreshComponentData(true));
            }

            await Promise.all(promises);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevents') });
        }

        this.loaded = true;
        this.initialized = true;
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

        promises.push(this.refreshComponentData(afterChange));

        await Promise.all(promises).finally(() => this.fetchData(sync, showErrors));
    }

    /**
     * Refresh the data of the component if loaded (either calendar or upcoming events).
     */
    protected async refreshComponentData(afterChange = false): Promise<void> {
        if (this.showCalendar) {
            await this.calendarComponent()?.refreshData(afterChange);
        } else {
            await this.upcomingEventsComponent()?.refreshData();
        }
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
     * Switch to week view.
     */
    async switchToWeekView(): Promise<void> {
        this.calendarView = 'week';
        await this.loadWeekEvents();
    }

    /**
     * Switch to month view.
     */
    switchToMonthView(): void {
        this.calendarView = 'month';
    }

    /**
     * Load events for the current week.
     */
    async loadWeekEvents(): Promise<void> {
        if (!this.currentWeekStart) {
            this.currentWeekStart = moment().startOf('week');
        }

        // Calculate week period name
        const weekEnd = moment(this.currentWeekStart).endOf('week');
        this.weekPeriodName = `${this.currentWeekStart.format('MMM D')} - ${weekEnd.format('MMM D, YYYY')}`;

        // Initialize week days
        this.weekDays = [];
        for (let i = 0; i < 7; i++) {
            const day = moment(this.currentWeekStart).add(i, 'days');
            this.weekDays.push({
                date: day,
                dayName: day.format('dddd'),
                displayDate: day.format('MMMM D'),
                isToday: day.isSame(moment(), 'day'),
                events: []
            });
        }

        try {
            // Calculate days from now to start of week
            const now = moment();
            const daysToStart = this.currentWeekStart.diff(now.startOf('day'), 'days');

            let allEvents: any[] = [];
            const site = CoreSites.getCurrentSite();

            if (site) {
                const isParent = await CoreUserParent.isParentUser(site.getId());
                const selectedMentee = await CoreUserParent.getSelectedMentee(site.getId());

                // If parent viewing as themselves (no child selected), get all children's events
                if (isParent && !selectedMentee) {
                    const mentees = await CoreUserParent.getMentees(site.getId());

                    for (const mentee of mentees) {
                        try {
                            // Switch to child's token to get their events
                            await CoreUserParent.setSelectedMentee(mentee.id, site.getId());
                            const menteeEvents = await AddonCalendar.getEventsList(undefined, daysToStart, 7, this.currentSiteId);

                            if (menteeEvents && menteeEvents.length > 0) {
                                for (const event of menteeEvents) {
                                    (event as any).menteeName = mentee.fullname;
                                    allEvents.push(event);
                                }
                            }
                        } catch {
                            // Silently fail for individual mentee event loads
                        }
                    }

                    // Switch back to parent view
                    await CoreUserParent.clearSelectedMentee(site.getId());

                    // Remove duplicates
                    const seen = new Set();
                    allEvents = allEvents.filter(event => {
                        if (seen.has(event.id)) {
                            return false;
                        }

                        seen.add(event.id);

                        return true;
                    });
                } else {
                    // Regular user or parent viewing as specific child
                    const events = await AddonCalendar.getEventsList(undefined, daysToStart, 7, this.currentSiteId);
                    allEvents = events || [];
                }
            } else {
                const events = await AddonCalendar.getEventsList(undefined, daysToStart, 7, this.currentSiteId);
                allEvents = events || [];
            }

            // Group events by day
            if (allEvents.length > 0) {
                for (const event of allEvents) {
                    const eventDay = moment(event.timestart * 1000).startOf('day');
                    const dayIndex = eventDay.diff(this.currentWeekStart, 'days');

                    if (dayIndex >= 0 && dayIndex < 7) {
                        // Create event to display with additional properties
                        const eventToDisplay: any = {
                            ...event,
                            formattedType: event.eventtype || 'user',
                            ispast: moment().isAfter(moment(event.timestart * 1000)),
                        };

                        // Add module icon if available
                        if (event.modulename) {
                            eventToDisplay.moduleIcon = await AddonCalendarHelper.getModuleIcon(event.modulename);
                        }

                        this.weekDays[dayIndex].events.push(eventToDisplay);
                    }
                }
            }

            // Apply filters
            this.weekDays.forEach(day => {
                day.events = AddonCalendarHelper.getFilteredEvents(day.events, this.filter, {});
            });

        } catch (error) {
            CoreAlerts.showError(error);
        }
    }

    /**
     * Load previous week.
     */
    async loadPreviousWeek(): Promise<void> {
        this.currentWeekStart = moment(this.currentWeekStart).subtract(1, 'week');
        await this.loadWeekEvents();
    }

    /**
     * Load next week.
     */
    async loadNextWeek(): Promise<void> {
        this.currentWeekStart = moment(this.currentWeekStart).add(1, 'week');
        await this.loadWeekEvents();
    }

    /**
     * Get event end time.
     *
     * @param event Event to get end time for.
     * @returns Event end time.
     */
    getEventEndTime(event: AddonCalendarEventToDisplay): number {
        return (event.timestart + event.timeduration) * 1000;
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
    }

}
