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

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
    AddonCalendar,
    AddonCalendarEventToDisplay,
} from '../../services/calendar';
import { AddonCalendarEventReminder, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarSync, AddonCalendarSyncEvents } from '../../services/calendar-sync';
import { CoreNetwork } from '@services/network';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreText } from '@singletons/text';
import { CoreSites } from '@services/sites';
import { CoreCourseModuleHelper } from '@features/course/services/course-module-helper';
import { CoreTime } from '@singletons/time';
import { DomSanitizer, Translate } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { CoreConstants } from '@/core/constants';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { AddonCalendarEventsSource } from '@addons/calendar/classes/events-source';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreReminders } from '@features/reminders/services/reminders';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CorePlatform } from '@services/platform';
import { CoreConfig } from '@services/config';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreUrl } from '@singletons/url';
import {
    ADDON_CALENDAR_AUTO_SYNCED,
    ADDON_CALENDAR_DELETED_EVENT_EVENT,
    ADDON_CALENDAR_EDIT_EVENT_EVENT,
    ADDON_CALENDAR_MANUAL_SYNCED,
    ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT,
    ADDON_CALENDAR_NEW_EVENT_EVENT,
    ADDON_CALENDAR_UNDELETED_EVENT_EVENT,
} from '@addons/calendar/constants';
import { REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED } from '@features/reminders/constants';
import { CoreAlerts, CoreAlertsConfirmOptions } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreUserPreferences } from '@features/user/services/user-preferences';

/**
 * Page that displays a single calendar event.
 */
@Component({
    selector: 'page-addon-calendar-event',
    templateUrl: 'event.html',
    styleUrls: ['../../calendar-common.scss', 'event.scss'],
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonCalendarEventPage implements OnInit, OnDestroy {

    protected eventId!: number;
    protected siteHomeId: number;
    protected newEventObserver: CoreEventObserver;
    protected editEventObserver: CoreEventObserver;
    protected syncObserver: CoreEventObserver;
    protected manualSyncObserver: CoreEventObserver;
    protected defaultTimeChangedObserver: CoreEventObserver;
    protected currentSiteId: string;
    protected updateCurrentTime?: number;
    protected appResumeSubscription: Subscription;
    protected route = inject(ActivatedRoute);

    eventLoaded = false;
    event?: AddonCalendarEventToDisplay;
    events?: CoreSwipeNavigationItemsManager;
    courseId?: number;
    courseName = '';
    groupName?: string;
    courseUrl = '';
    remindersEnabled = false;
    moduleUrl = '';
    categoryPath = '';
    currentTime = -1;
    reminders: AddonCalendarEventReminder[] = [];
    canEdit = false;
    hasOffline = false;
    readonly isOnline = CoreNetwork.onlineSignal;
    syncIcon = CoreConstants.ICON_LOADING; // Sync icon.
    canScheduleExactAlarms = true;
    scheduleExactWarningHidden = false;

    constructor() {
        this.remindersEnabled = CoreReminders.isEnabled();
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();
        this.currentSiteId = CoreSites.getCurrentSiteId();

        // Check if site supports editing. No need to check allowed types, event.canedit already does it.
        this.canEdit = AddonCalendar.canEditEventsInSite();

        // Listen for event edited. If current event is edited, reload the data.
        this.editEventObserver = CoreEvents.on(ADDON_CALENDAR_EDIT_EVENT_EVENT, (data) => {
            if (data && data.eventId === this.eventId) {
                this.eventLoaded = false;
                this.refreshEvent(true, false);
            }
        }, this.currentSiteId);

        // Listen for event created. If user edits the data of a new offline event or it's sent to server, this event is triggered.
        this.newEventObserver = CoreEvents.on(ADDON_CALENDAR_NEW_EVENT_EVENT, (data) => {
            if (this.eventId < 0 && data && (data.eventId === this.eventId || data.oldEventId === this.eventId)) {
                this.eventId = data.eventId;
                this.eventLoaded = false;
                this.refreshEvent(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if this calendar event is synchronized automatically.
        this.syncObserver = CoreEvents.on(
            ADDON_CALENDAR_AUTO_SYNCED,
            (data) => this.checkSyncResult(false, data),
            this.currentSiteId,
        );

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = CoreEvents.on(
            ADDON_CALENDAR_MANUAL_SYNCED,
            (data) => this.checkSyncResult(true, data),
            this.currentSiteId,
        );

        // Reload reminders if default notification time changes.
        this.defaultTimeChangedObserver = CoreEvents.on(REMINDERS_DEFAULT_NOTIFICATION_TIME_CHANGED, () => {
            this.loadReminders();
        }, this.currentSiteId);

        // Set and update current time. Use a 5 seconds error margin.
        this.currentTime = CoreTime.timestamp();
        this.updateCurrentTime = window.setInterval(() => {
            this.currentTime = CoreTime.timestamp();
        }, 5000);

        this.checkExactAlarms();
        this.appResumeSubscription = CorePlatform.resume.subscribe(() => {
            this.checkExactAlarms();
        });
    }

    /**
     * Load reminders.
     *
     * @returns Promise resolved when done.
     */
    protected async loadReminders(): Promise<void> {
        if (!this.remindersEnabled || !this.event) {
            return;
        }

        this.reminders = await AddonCalendarHelper.getEventReminders(this.eventId, this.event.timestart, this.currentSiteId);
    }

    /**
     * Check if the app can schedule exact alarms.
     */
    protected async checkExactAlarms(): Promise<void> {
        this.scheduleExactWarningHidden = !!(await CoreConfig.get(CoreConstants.DONT_SHOW_EXACT_ALARMS_WARNING, 0));
        this.canScheduleExactAlarms = await CoreLocalNotifications.canScheduleExactAlarms();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.eventId = CoreNavigator.getRequiredRouteNumberParam('id');
        } catch (error) {
            CoreAlerts.showError(error);

            CoreNavigator.back();

            return;
        }

        this.syncIcon = CoreConstants.ICON_LOADING;

        await this.initializeSwipeManager();
        await this.fetchEvent();
    }

    /**
     * Fetches the event and updates the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    async fetchEvent(sync = false, showErrors = false): Promise<void> {

        if (sync) {
            const deleted = await this.syncEvents(showErrors);

            if (deleted) {
                return;
            }
        }

        try {
            // Get the event data.
            if (this.eventId >= 0) {
                const event = await AddonCalendar.getEventById(this.eventId);
                this.event = await AddonCalendarHelper.formatEventData(event);
            }

            try {
                const offlineEvent = AddonCalendarHelper.formatOfflineEventData(
                    await AddonCalendarOffline.getEvent(this.eventId),
                );

                // There is offline data, apply it.
                this.hasOffline = true;
                this.event = Object.assign(this.event || {}, offlineEvent);
            } catch {
                // No offline data.
                this.hasOffline = false;

                if (this.eventId < 0) {
                    // It's an offline event, but it wasn't found. Shouldn't happen.
                    CoreAlerts.showError('Event not found.');
                    CoreNavigator.back();

                    return;
                }
            }

            if (!this.event) {
                return; // At this point we should always have the event, adding this check to avoid TS errors.
            }

            // Load reminders.
            this.loadReminders();

            // Reset some of the calculated data.
            this.categoryPath = '';
            this.courseName = '';
            this.courseUrl = '';
            this.moduleUrl = '';

            if (this.event.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                const name = CoreCourseModuleHelper.translateModuleName(this.event.modulename || '');
                if (name.indexOf('core.mod_') === -1) {
                    this.event.modulename = name;
                }

                // Get the module URL.
                this.moduleUrl = this.event.url || '';
            }

            const promises: Promise<void>[] = [];
            const event = this.event;

            const courseId = this.event.courseid;
            if (courseId != this.siteHomeId) {
                // If the event belongs to a course, get the course name and the URL to view it.
                if (this.event.course) {
                    this.courseId = this.event.course.id;
                    this.courseName = this.event.course.fullname;
                    this.courseUrl = this.event.course.viewurl;
                }
            }

            // If it's a group event, get the name of the group.
            if (courseId && this.event.groupid) {
                this.groupName = event.groupname;
            }

            if (this.event.iscategoryevent && this.event.category) {
                this.categoryPath = this.event.category.nestedname;
            }

            if (this.event.location) {
                // Build a link to open the address in maps.
                this.event.location = CoreText.decodeHTML(this.event.location);
                this.event.encodedLocation = DomSanitizer.bypassSecurityTrustUrl(CoreUrl.buildMapsURL({
                    query: this.event.location,
                }));
            }

            // Check if event was deleted in offine.
            promises.push(AddonCalendarOffline.isEventDeleted(this.eventId).then((deleted) => {
                event.deleted = deleted;

                return;
            }));

            // Re-calculate the formatted time so it uses the device date.
            promises.push(CoreUserPreferences.getTimeFormat().then(async (timeFormat) => {
                event.formattedtime = await AddonCalendar.formatEventTime(event, timeFormat);

                return;
            }));

            await Promise.all(promises);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.calendar.errorloadevent') });
        }

        this.eventLoaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Initialize swipe manager if enabled.
     */
    protected async initializeSwipeManager(): Promise<void> {
        const date = CoreNavigator.getRouteParam('date');
        const source = date && CoreRoutedItemsManagerSourcesTracker.getSource(
            AddonCalendarEventsSource,
            [date],
        );

        if (!source) {
            return;
        }

        this.events = new AddonCalendarEventsSwipeItemsManager(source);

        await this.events.start();
    }

    /**
     * Sync offline events.
     *
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved with boolean: whether event was deleted on sync.
     */
    protected async syncEvents(showErrors = false): Promise<boolean> {
        let deleted = false;

        // Try to synchronize offline events.
        try {
            const result = await AddonCalendarSync.syncEvents();
            if (result.warnings && result.warnings.length) {
                CoreAlerts.show({ message: result.warnings[0] });
            }

            if (result.deleted && result.deleted.indexOf(this.eventId) != -1) {
                // This event was deleted during the sync.
                deleted = true;
            } else if (this.eventId < 0 && result.offlineIdMap[this.eventId]) {
                // Event was created, use the online ID.
                this.eventId = result.offlineIdMap[this.eventId];
            }

            if (result.updated) {
                // Trigger a manual sync event.
                result.source = 'event';

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

        return deleted;
    }

    /**
     * Add a reminder for this event.
     */
    async addReminder(): Promise<void> {
        if (!this.event || !this.event.id) {
            return;
        }

        const { CoreRemindersSetReminderMenuComponent } =
            await import('@features/reminders/components/set-reminder-menu/set-reminder-menu');

        const reminderTime = await CorePopovers.open<{timeBefore: number}>({
            component: CoreRemindersSetReminderMenuComponent,
            componentProps: {
                eventTime: this.event.timestart,
            },
            // TODO: Add event to open the popover in place.
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        await AddonCalendar.addEventReminder(this.event, reminderTime.timeBefore, this.currentSiteId);

        await this.loadReminders();
    }

    /**
     * Delete the selected reminder.
     *
     * @param id Reminder ID.
     * @param e Click event.
     */
    async deleteReminder(id: number, e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        try {
            await CoreAlerts.confirmDelete(Translate.instant('core.areyousure'));

            const modal = await CoreLoadings.show('core.deleting', true);

            try {
                await CoreReminders.removeReminder(id);
                await this.loadReminders();
            } catch (error) {
                CoreAlerts.showError(error, { default: 'Error deleting reminder' });
            } finally {
                modal.dismiss();
            }
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement, done?: () => void, showErrors= false): Promise<void> {
        if (!this.eventLoaded) {
            return;
        }

        await this.refreshEvent(true, showErrors).finally(() => {
            refresher?.complete();
            done && done();
        });
    }

    /**
     * Refresh the event.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @returns Promise resolved when done.
     */
    async refreshEvent(sync = false, showErrors = false): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        if (this.eventId > 0) {
            promises.push(AddonCalendar.invalidateEvent(this.eventId));
        }
        promises.push(AddonCalendar.invalidateTimeFormat());

        await CorePromiseUtils.allPromisesIgnoringErrors(promises);

        await this.fetchEvent(sync, showErrors);
    }

    /**
     * Open the page to edit the event.
     */
    openEdit(): void {
        CoreNavigator.navigateToSitePath(`/calendar/edit/${this.eventId}`);
    }

    /**
     * Delete the event.
     */
    async deleteEvent(): Promise<void> {
        if (!this.event) {
            return;
        }

        let message: string;
        const options: CoreAlertsConfirmOptions = {
            header: Translate.instant('addon.calendar.deleteevent'),
        };

        if (this.event.eventcount > 1) {
            // It's a repeated event.
            message = Translate.instant(
                'addon.calendar.confirmeventseriesdelete',
                { $a: { name: this.event.name, count: this.event.eventcount } },
            );

            options.inputs = [
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: true,
                    value: false,
                    label: Translate.instant('addon.calendar.deleteoneevent'),
                },
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: false,
                    value: true,
                    label: Translate.instant('addon.calendar.deleteallevents'),
                },
            ];
        } else {
            // Not repeated, display a simple confirm.
            message = Translate.instant('addon.calendar.confirmeventdelete', { $a: this.event.name });
        }

        let deleteAll = false;
        try {
            deleteAll = await CoreAlerts.confirm(message, options);
        } catch {
            // User canceled.
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {
            let onlineEventDeleted = false;
            if (this.event.id < 0) {
                await AddonCalendarOffline.deleteEvent(this.event.id);
            } else {
                onlineEventDeleted = await AddonCalendar.deleteEvent(this.event.id, this.event.name, deleteAll);
            }

            if (onlineEventDeleted) {
                // Event deleted, invalidate right days & months.
                try {
                    await AddonCalendarHelper.refreshAfterChangeEvent(this.event, deleteAll ? this.event.eventcount : 1);
                } catch {
                    // Ignore errors.
                }
            }

            // Trigger an event.
            if (this.event.id < 0) {
                CoreEvents.trigger(ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT, {}, CoreSites.getCurrentSiteId());
            } else {
                CoreEvents.trigger(ADDON_CALENDAR_DELETED_EVENT_EVENT, {
                    eventId: this.eventId,
                    sent: onlineEventDeleted,
                }, CoreSites.getCurrentSiteId());
            }

            if (onlineEventDeleted || this.event.id < 0) {
                CoreToasts.show({
                    message: 'addon.calendar.eventcalendareventdeleted',
                    translateMessage: true,
                    duration: ToastDuration.LONG,
                });

                // Event deleted, close the view.
                CoreNavigator.back();
            } else {
                // Event deleted in offline, just mark it as deleted.
                this.event.deleted = true;
            }
        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error deleting event.' });
        }

        modal.dismiss();
    }

    /**
     * Undo delete the event.
     */
    async undoDelete(): Promise<void> {
        if (!this.event) {
            return;
        }

        const modal = await CoreLoadings.show('core.sending', true);

        try {

            await AddonCalendarOffline.unmarkDeleted(this.event.id);

            // Trigger an event.
            CoreEvents.trigger(ADDON_CALENDAR_UNDELETED_EVENT_EVENT, {
                eventId: this.eventId,
            }, CoreSites.getCurrentSiteId());

            this.event.deleted = false;

        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error undeleting event.' });
        }

        modal.dismiss();
    }

    /**
     * Check the result of an automatic sync or a manual sync not done by this page.
     *
     * @param isManual Whether it's a manual sync.
     * @param data Sync result.
     */
    protected checkSyncResult(isManual: boolean, data: AddonCalendarSyncEvents): void {
        if (!data) {
            return;
        }

        if (data.deleted && data.deleted.indexOf(this.eventId) != -1) {
            CoreToasts.show({
                message: 'addon.calendar.eventcalendareventdeleted',
                translateMessage: true,
                duration: ToastDuration.LONG,
            });

            // Event was deleted, close the view.
            CoreNavigator.back();
        } else if (data.events && (!isManual || data.source != 'event')) {
            if (this.eventId < 0) {
                if (data.offlineIdMap[this.eventId]) {
                    // Event was created, use the online ID.
                    this.eventId = data.offlineIdMap[this.eventId];

                    this.eventLoaded = false;
                    this.refreshEvent();
                }
            } else {
                const event = data.events.find((ev) => ev.id == this.eventId);

                if (event) {
                    this.eventLoaded = false;
                    this.refreshEvent();
                }
            }
        }
    }

    /**
     * Open alarm settings.
     */
    openAlarmSettings(): void {
        CoreLocalNotifications.openAlarmSettings();
    }

    /**
     * Hide alarm warning.
     */
    hideAlarmWarning(): void {
        CoreConfig.set(CoreConstants.DONT_SHOW_EXACT_ALARMS_WARNING, 1);
        this.scheduleExactWarningHidden = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.editEventObserver.off();
        this.syncObserver.off();
        this.manualSyncObserver.off();
        this.newEventObserver.off();
        this.events?.destroy();
        this.appResumeSubscription.unsubscribe();
        clearInterval(this.updateCurrentTime);
    }

}

/**
 * Helper to manage swiping within a collection of events.
 */
class AddonCalendarEventsSwipeItemsManager extends CoreSwipeNavigationItemsManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        return CoreNavigator.getRouteParams(route).id;
    }

}
