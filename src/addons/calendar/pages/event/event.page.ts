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

import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { AlertOptions } from '@ionic/core';
import {
    AddonCalendar,
    AddonCalendarEvent,
    AddonCalendarEventBase,
    AddonCalendarEventToDisplay,
    AddonCalendarGetEventsEvent,
    AddonCalendarProvider,
    AddonCalendarUpdatedEventEvent,
} from '../../services/calendar';
import { AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarSync, AddonCalendarSyncEvents, AddonCalendarSyncProvider } from '../../services/calendar-sync';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreApp } from '@services/app';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreSites } from '@services/sites';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreCourse } from '@features/course/services/course';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreGroups } from '@services/groups';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { Network, NgZone, Translate } from '@singletons';
import { Subscription } from 'rxjs';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { AddonCalendarReminderDBRecord } from '../../services/database/calendar';
import { ActivatedRoute } from '@angular/router';
import { CoreScreen } from '@services/screen';
import { CoreConstants } from '@/core/constants';

/**
 * Page that displays a single calendar event.
 */
@Component({
    selector: 'page-addon-calendar-event',
    templateUrl: 'event.html',
    styleUrls: ['event.scss'],
})
export class AddonCalendarEventPage implements OnInit, OnDestroy {

    protected eventId!: number;
    protected siteHomeId: number;
    protected editEventObserver: CoreEventObserver;
    protected syncObserver: CoreEventObserver;
    protected manualSyncObserver: CoreEventObserver;
    protected onlineObserver: Subscription;
    protected currentSiteId: string;

    eventLoaded = false;
    notificationFormat?: string;
    notificationMin?: string;
    notificationMax?: string;
    notificationTimeText?: string;
    event?: AddonCalendarEventToDisplay;
    courseId?: number;
    courseName = '';
    groupName?: string;
    courseUrl = '';
    notificationsEnabled = false;
    moduleUrl = '';
    categoryPath = '';
    currentTime?: number;
    defaultTime = 0;
    reminders: AddonCalendarReminderDBRecord[] = [];
    canEdit = false;
    canDelete = false;
    hasOffline = false;
    isOnline = false;
    syncIcon = CoreConstants.ICON_LOADING; // Sync icon.
    isSplitViewOn = false;

    constructor(
        @Optional() protected svComponent: CoreSplitViewComponent,
        protected route: ActivatedRoute,
    ) {

        this.notificationsEnabled = CoreLocalNotifications.instance.isAvailable();
        this.siteHomeId = CoreSites.instance.getCurrentSiteHomeId();
        this.currentSiteId = CoreSites.instance.getCurrentSiteId();
        this.isSplitViewOn = this.svComponent?.outletActivated;

        // Check if site supports editing and deleting. No need to check allowed types, event.canedit already does it.
        this.canEdit = AddonCalendar.instance.canEditEventsInSite();
        this.canDelete = AddonCalendar.instance.canDeleteEventsInSite();

        this.asyncConstructor();

        // Listen for event edited. If current event is edited, reload the data.
        this.editEventObserver = CoreEvents.on(AddonCalendarProvider.EDIT_EVENT_EVENT, (data: AddonCalendarUpdatedEventEvent) => {
            if (data && data.eventId == this.eventId) {
                this.eventLoaded = false;
                this.refreshEvent(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if this calendar event is synchronized automatically.
        this.syncObserver = CoreEvents.on(
            AddonCalendarSyncProvider.AUTO_SYNCED,
            this.checkSyncResult.bind(this, false),
            this.currentSiteId,
        );

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = CoreEvents.on(
            AddonCalendarSyncProvider.MANUAL_SYNCED,
            this.checkSyncResult.bind(this, true),
            this.currentSiteId,
        );

        // Refresh online status when changes.
        this.onlineObserver = Network.instance.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.instance.run(() => {
                this.isOnline = CoreApp.instance.isOnline();
            });
        });
    }

    protected async asyncConstructor(): Promise<void> {
        if (this.notificationsEnabled) {
            this.reminders = await AddonCalendar.instance.getEventReminders(this.eventId);
            this.defaultTime = await AddonCalendar.instance.getDefaultNotificationTime() * 60;

            // Calculate format to use.
            this.notificationFormat =
                CoreTimeUtils.instance.fixFormatForDatetime(CoreTimeUtils.instance.convertPHPToMoment(
                    Translate.instance.instant('core.strftimedatetime'),
                ));
        }
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.route.queryParams.subscribe(() => {
            this.eventLoaded = false;

            const eventId = CoreNavigator.instance.getRouteNumberParam('id');
            if (!eventId) {
                CoreDomUtils.instance.showErrorModal('Event ID not supplied.');
                CoreNavigator.instance.back();

                return;
            }

            this.eventId = eventId;
            this.syncIcon = CoreConstants.ICON_LOADING;

            this.fetchEvent();
        });
    }

    /**
     * Fetches the event and updates the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async fetchEvent(sync = false, showErrors = false): Promise<void> {
        const currentSite = CoreSites.instance.getCurrentSite();
        const canGetById = AddonCalendar.instance.isGetEventByIdAvailableInSite();
        let deleted = false;

        this.isOnline = CoreApp.instance.isOnline();

        if (sync) {
            // Try to synchronize offline events.
            try {
                const result = await AddonCalendarSync.instance.syncEvents();
                if (result.warnings && result.warnings.length) {
                    CoreDomUtils.instance.showErrorModal(result.warnings[0]);
                }

                if (result.deleted && result.deleted.indexOf(this.eventId) != -1) {
                    // This event was deleted during the sync.
                    deleted = true;
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    result.source = 'event';

                    CoreEvents.trigger<AddonCalendarSyncEvents>(
                        AddonCalendarSyncProvider.MANUAL_SYNCED,
                        result,
                        this.currentSiteId,
                    );
                }
            } catch (error) {
                if (showErrors) {
                    CoreDomUtils.instance.showErrorModalDefault(error, 'core.errorsync', true);
                }
            }
        }

        if (deleted) {
            return;
        }

        try {
            let event: AddonCalendarEvent | AddonCalendarEventBase | AddonCalendarGetEventsEvent;
            // Get the event data.
            if (canGetById) {
                event = await AddonCalendar.instance.getEventById(this.eventId);
            } else {
                event = await AddonCalendar.instance.getEvent(this.eventId);
            }
            this.event = AddonCalendarHelper.instance.formatEventData(event);

            try {
                const offlineEvent = AddonCalendarHelper.instance.formatOfflineEventData(
                    await AddonCalendarOffline.instance.getEvent(this.eventId),
                );

                // There is offline data, apply it.
                this.hasOffline = true;

                this.event = Object.assign(this.event, offlineEvent);
            } catch {
                // No offline data.
                this.hasOffline = false;
            }

            this.currentTime = CoreTimeUtils.instance.timestamp();
            this.notificationMin = CoreTimeUtils.instance.userDate(this.currentTime * 1000, 'YYYY-MM-DDTHH:mm', false);
            this.notificationMax = CoreTimeUtils.instance.userDate(
                (this.event!.timestart + this.event!.timeduration) * 1000,
                'YYYY-MM-DDTHH:mm',
                false,
            );

            // Reset some of the calculated data.
            this.categoryPath = '';
            this.courseName = '';
            this.courseUrl = '';
            this.moduleUrl = '';

            if (this.event!.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                const name = CoreCourse.instance.translateModuleName(this.event!.modulename || '');
                if (name.indexOf('core.mod_') === -1) {
                    this.event!.modulename = name;
                }

                // Get the module URL.
                if (canGetById) {
                    this.moduleUrl = this.event!.url || '';
                }
            }

            const promises: Promise<void>[] = [];

            const courseId = this.event.courseid;
            if (courseId != this.siteHomeId) {
                // If the event belongs to a course, get the course name and the URL to view it.
                if (canGetById && this.event.course) {
                    this.courseId = this.event.course.id;
                    this.courseName = this.event.course.fullname;
                    this.courseUrl = this.event.course.viewurl;
                } else if (!canGetById && this.event.courseid ) {
                    // Retrieve the course.
                    promises.push(CoreCourses.instance.getUserCourse(this.event.courseid, true).then((course) => {
                        this.courseId = course.id;
                        this.courseName = course.fullname;
                        this.courseUrl = currentSite ? CoreTextUtils.instance.concatenatePaths(
                            currentSite.siteUrl,
                            '/course/view.php?id=' + this.courseId,
                        ) : '';

                        return;
                    }).catch(() => {
                        // Error getting course, just don't show the course name.
                    }));
                }
            }

            // If it's a group event, get the name of the group.
            if (courseId && this.event.groupid) {
                promises.push(CoreGroups.instance.getUserGroupsInCourse(courseId).then((groups) => {
                    const group = groups.find((group) => group.id == this.event!.groupid);

                    this.groupName = group ? group.name : '';

                    return;
                }).catch(() => {
                    // Error getting groups, just don't show the group name.
                    this.groupName = '';
                }));
            }

            if (canGetById && this.event.iscategoryevent && this.event.category) {
                this.categoryPath = this.event.category.nestedname;
            }

            if (this.event.location) {
                // Build a link to open the address in maps.
                this.event.location = CoreTextUtils.instance.decodeHTML(this.event.location);
                this.event.encodedLocation = CoreTextUtils.instance.buildAddressURL(this.event.location);
            }

            // Check if event was deleted in offine.
            promises.push(AddonCalendarOffline.instance.isEventDeleted(this.eventId).then((deleted) => {
                this.event!.deleted = deleted;

                return;
            }));

            // Re-calculate the formatted time so it uses the device date.
            promises.push(AddonCalendar.instance.getCalendarTimeFormat().then(async (timeFormat) => {
                this.event!.formattedtime = await AddonCalendar.instance.formatEventTime(this.event!, timeFormat);

                return;
            }));

            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'addon.calendar.errorloadevent', true);
        }

        this.eventLoaded = true;
        this.syncIcon = CoreConstants.ICON_SYNC;
    }

    /**
     * Add a reminder for this event.
     */
    async addNotificationTime(): Promise<void> {
        if (this.notificationTimeText && this.event && this.event.id) {
            let notificationTime = CoreTimeUtils.instance.convertToTimestamp(this.notificationTimeText);

            const currentTime = CoreTimeUtils.instance.timestamp();
            const minute = Math.floor(currentTime / 60) * 60;

            // Check if the notification time is in the same minute as we are, so the notification is triggered.
            if (notificationTime >=  minute && notificationTime < minute + 60) {
                notificationTime  = currentTime + 1;
            }

            await AddonCalendar.instance.addEventReminder(this.event, notificationTime);
            this.reminders = await AddonCalendar.instance.getEventReminders(this.eventId);
            this.notificationTimeText = undefined;
        }
    }

    /**
     * Cancel the selected notification.
     *
     * @param id Reminder ID.
     * @param e Click event.
     */
    async cancelNotification(id: number, e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        try {
            await CoreDomUtils.instance.showDeleteConfirm();

            const modal = await CoreDomUtils.instance.showModalLoading('core.deleting', true);

            try {
                await AddonCalendar.instance.deleteEventReminder(id);
                this.reminders = await AddonCalendar.instance.getEventReminders(this.eventId);
            } catch (error) {
                CoreDomUtils.instance.showErrorModalDefault(error, 'Error deleting reminder');
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
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: CustomEvent<IonRefresher>, done?: () => void, showErrors= false): Promise<void> {
        if (!this.eventLoaded) {
            return;
        }

        await this.refreshEvent(true, showErrors).finally(() => {
            refresher?.detail.complete();
            done && done();
        });
    }

    /**
     * Refresh the event.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    async refreshEvent(sync = false, showErrors = false): Promise<void> {
        this.syncIcon = CoreConstants.ICON_LOADING;

        const promises: Promise<void>[] = [];

        promises.push(AddonCalendar.instance.invalidateEvent(this.eventId));
        promises.push(AddonCalendar.instance.invalidateTimeFormat());

        await CoreUtils.instance.allPromisesIgnoringErrors(promises);

        await this.fetchEvent(sync, showErrors);
    }

    /**
     * Open the page to edit the event.
     */
    openEdit(): void {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        // @todo const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        CoreNavigator.instance.navigateToSitePath('/calendar/edit', { params: { eventId: this.eventId } });
    }

    /**
     * Delete the event.
     */
    async deleteEvent(): Promise<void> {
        if (!this.event) {
            return;
        }

        const title = Translate.instance.instant('addon.calendar.deleteevent');
        const options: AlertOptions = {};
        let message: string;

        if (this.event.eventcount > 1) {
            // It's a repeated event.
            message = Translate.instance.instant(
                'addon.calendar.confirmeventseriesdelete',
                { $a: { name: this.event.name, count: this.event.eventcount } },
            );

            options.inputs = [
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: true,
                    value: false,
                    label: Translate.instance.instant('addon.calendar.deleteoneevent'),
                },
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: false,
                    value: true,
                    label: Translate.instance.instant('addon.calendar.deleteallevents'),
                },
            ];
        } else {
            // Not repeated, display a simple confirm.
            message = Translate.instance.instant('addon.calendar.confirmeventdelete', { $a: this.event.name });
        }

        let deleteAll = false;
        try {
            deleteAll = await CoreDomUtils.instance.showConfirm(message, title, undefined, undefined, options);
        } catch {

            // User canceled.
            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

        try {
            const sent = await AddonCalendar.instance.deleteEvent(this.event.id, this.event.name, deleteAll);

            if (sent) {
                // Event deleted, invalidate right days & months.
                try {
                    await AddonCalendarHelper.instance.refreshAfterChangeEvent(this.event, deleteAll ? this.event.eventcount : 1);
                } catch {
                    // Ignore errors.
                }
            }

            // Trigger an event.
            CoreEvents.trigger<AddonCalendarUpdatedEventEvent>(AddonCalendarProvider.DELETED_EVENT_EVENT, {
                eventId: this.eventId,
                sent: sent,
            }, CoreSites.instance.getCurrentSiteId());

            if (sent) {
                CoreDomUtils.instance.showToast('addon.calendar.eventcalendareventdeleted', true, 3000);

                // Event deleted, close the view.
                if (CoreScreen.instance.isMobile) {
                    CoreNavigator.instance.back();
                }
            } else {
                // Event deleted in offline, just mark it as deleted.
                this.event.deleted = true;
            }
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error deleting event.');
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

        const modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

        try {

            await AddonCalendarOffline.instance.unmarkDeleted(this.event.id);

            // Trigger an event.
            CoreEvents.trigger<AddonCalendarUpdatedEventEvent>(AddonCalendarProvider.UNDELETED_EVENT_EVENT, {
                eventId: this.eventId,
            }, CoreSites.instance.getCurrentSiteId());

            this.event.deleted = false;

        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'Error undeleting event.');
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
            CoreDomUtils.instance.showToast('addon.calendar.eventcalendareventdeleted', true, 3000);

            // Event was deleted, close the view.
            if (CoreScreen.instance.isMobile) {
                CoreNavigator.instance.back();
            }
        } else if (data.events && (!isManual || data.source != 'event')) {
            const event = data.events.find((ev) => ev.id == this.eventId);

            if (event) {
                this.eventLoaded = false;
                this.refreshEvent();
            }
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.editEventObserver?.off();
        this.syncObserver?.off();
        this.manualSyncObserver?.off();
        this.onlineObserver?.unsubscribe();
    }

}
