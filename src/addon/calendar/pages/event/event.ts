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

import { Component, ViewChild, Optional, OnDestroy, NgZone } from '@angular/core';
import { IonicPage, Content, NavParams, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { AddonCalendarSyncProvider } from '../../providers/calendar-sync';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { Network } from '@ionic-native/network';

/**
 * Page that displays a single calendar event.
 */
@IonicPage({ segment: 'addon-calendar-event' })
@Component({
    selector: 'page-addon-calendar-event',
    templateUrl: 'event.html',
})
export class AddonCalendarEventPage implements OnDestroy {
    @ViewChild(Content) content: Content;

    protected eventId;
    protected siteHomeId: number;
    protected editEventObserver: any;
    protected syncObserver: any;
    protected manualSyncObserver: any;
    protected onlineObserver: any;
    protected currentSiteId: string;

    eventLoaded: boolean;
    notificationFormat: string;
    notificationMin: string;
    notificationMax: string;
    notificationTimeText: string;
    event: any = {};
    courseId: number;
    courseName: string;
    groupName: string;
    courseUrl = '';
    notificationsEnabled = false;
    moduleUrl = '';
    categoryPath = '';
    currentTime: number;
    defaultTime: number;
    reminders: any[];
    canEdit = false;
    canDelete = false;
    hasOffline = false;
    isOnline = false;
    syncIcon: string; // Sync icon.
    isSplitViewOn = false;

    constructor(private translate: TranslateService, private calendarProvider: AddonCalendarProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider,
            private calendarHelper: AddonCalendarHelperProvider, private sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider, private courseProvider: CoreCourseProvider,
            private textUtils: CoreTextUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            private groupsProvider: CoreGroupsProvider, @Optional() private svComponent: CoreSplitViewComponent,
            private navCtrl: NavController, private eventsProvider: CoreEventsProvider, network: Network, zone: NgZone,
            private calendarSync: AddonCalendarSyncProvider, private appProvider: CoreAppProvider,
            private calendarOffline: AddonCalendarOfflineProvider) {

        this.eventId = navParams.get('id');
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        this.currentSiteId = sitesProvider.getCurrentSiteId();
        this.isSplitViewOn = this.svComponent && this.svComponent.isOn();

        // Check if site supports editing and deleting. No need to check allowed types, event.canedit already does it.
        this.canEdit = this.calendarProvider.canEditEventsInSite();
        this.canDelete = this.calendarProvider.canDeleteEventsInSite();

        if (this.notificationsEnabled) {
            this.calendarProvider.getEventReminders(this.eventId).then((reminders) => {
                this.reminders = reminders;
            });

            this.calendarProvider.getDefaultNotificationTime().then((defaultTime) => {
                this.defaultTime = defaultTime * 60;
            });

            // Calculate format to use.
            this.notificationFormat = this.timeUtils.fixFormatForDatetime(this.timeUtils.convertPHPToMoment(
                    this.translate.instant('core.strftimedatetime')));
        }

        // Listen for event edited. If current event is edited, reload the data.
        this.editEventObserver = eventsProvider.on(AddonCalendarProvider.EDIT_EVENT_EVENT, (data) => {
            if (data && data.event && data.event.id == this.eventId) {
                this.eventLoaded = false;
                this.refreshEvent(true, false);
            }
        }, this.currentSiteId);

        // Refresh data if this calendar event is synchronized automatically.
        this.syncObserver = eventsProvider.on(AddonCalendarSyncProvider.AUTO_SYNCED, this.checkSyncResult.bind(this, false),
                this.currentSiteId);

        // Refresh data if calendar events are synchronized manually but not by this page.
        this.manualSyncObserver = eventsProvider.on(AddonCalendarSyncProvider.MANUAL_SYNCED, this.checkSyncResult.bind(this, true),
                this.currentSiteId);

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
        this.syncIcon = 'spinner';

        this.fetchEvent();
    }

    /**
     * Fetches the event and updates the view.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    fetchEvent(sync?: boolean, showErrors?: boolean): Promise<any> {
        const currentSite = this.sitesProvider.getCurrentSite(),
            canGetById = this.calendarProvider.isGetEventByIdAvailableInSite();
        let promise,
            deleted = false;

        this.isOnline = this.appProvider.isOnline();

        if (sync) {
            // Try to synchronize offline events.
            promise = this.calendarSync.syncEvents().then((result) => {
                if (result.warnings && result.warnings.length) {
                    this.domUtils.showErrorModal(result.warnings[0]);
                }

                if (result.deleted && result.deleted.indexOf(this.eventId) != -1) {
                    // This event was deleted during the sync.
                    deleted = true;
                }

                if (result.updated) {
                    // Trigger a manual sync event.
                    result.source = 'event';

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
            if (deleted) {
                return;
            }

            const promises = [];

            // Get the event data.
            if (canGetById) {
                promises.push(this.calendarProvider.getEventById(this.eventId));
            } else {
                promises.push(this.calendarProvider.getEvent(this.eventId));
            }

            // Get offline data.
            promises.push(this.calendarOffline.getEvent(this.eventId).catch(() => {
                // No offline data.
            }));

            return Promise.all(promises).then((results) => {
                if (results[1]) {
                    // There is offline data, apply it.
                    this.hasOffline = true;
                    Object.assign(results[0], results[1]);
                } else {
                    this.hasOffline = false;
                }

                return results[0];
            });

        }).then((event) => {
            if (deleted) {
                return;
            }

            const promises = [];

            this.calendarHelper.formatEventData(event);
            this.event = event;

            this.currentTime = this.timeUtils.timestamp();
            this.notificationMin = this.timeUtils.userDate(this.currentTime * 1000, 'YYYY-MM-DDTHH:mm', false);
            this.notificationMax = this.timeUtils.userDate((event.timestart + event.timeduration) * 1000,
                'YYYY-MM-DDTHH:mm', false);

            // Reset some of the calculated data.
            this.categoryPath = '';
            this.courseName = '';
            this.courseUrl = '';
            this.moduleUrl = '';

            if (event.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                const name = this.courseProvider.translateModuleName(event.modulename);
                if (name.indexOf('core.mod_') === -1) {
                    event.moduleName = name;
                }

                // Get the module URL.
                if (canGetById) {
                    this.moduleUrl = event.url;
                }
            }

            // If the event belongs to a course, get the course name and the URL to view it.
            if (canGetById && event.course && event.course.id != this.siteHomeId) {
                this.courseId = event.course.id;
                this.courseName = event.course.fullname;
                this.courseUrl = event.course.viewurl;
            } else if (event.courseid && event.courseid != this.siteHomeId) {
                // Retrieve the course.
                promises.push(this.coursesProvider.getUserCourse(event.courseid, true).then((course) => {
                    this.courseId = course.id;
                    this.courseName = course.fullname;
                    this.courseUrl = currentSite ? this.textUtils.concatenatePaths(currentSite.siteUrl,
                            '/course/view.php?id=' + event.courseid) : '';
                }).catch(() => {
                    // Error getting course, just don't show the course name.
                }));
            }

            // If it's a group event, get the name of the group.
            const courseId = canGetById && event.course ? event.course.id : event.courseid;
            if (courseId && event.groupid) {
                promises.push(this.groupsProvider.getUserGroupsInCourse(event.courseid).then((groups) => {
                    const group = groups.find((group) => {
                        return group.id == event.groupid;
                    });

                    this.groupName = group ? group.name : '';
                }).catch(() => {
                    // Error getting groups, just don't show the group name.
                    this.groupName = '';
                }));
            }

            if (canGetById && event.iscategoryevent && event.category) {
                this.categoryPath = event.category.nestedname;
            }

            if (event.location) {
                // Build a link to open the address in maps.
                event.location = this.textUtils.decodeHTML(event.location);
                event.encodedLocation = this.textUtils.buildAddressURL(event.location);
            }

            // Check if event was deleted in offine.
            promises.push(this.calendarOffline.isEventDeleted(this.eventId).then((deleted) => {
                event.deleted = deleted;
            }));

            // Re-calculate the formatted time so it uses the device date.
            promises.push(this.calendarProvider.getCalendarTimeFormat().then((timeFormat) => {
                this.calendarProvider.formatEventTime(event, timeFormat).then((time) => {
                    event.formattedtime = time;
                });
            }));

            return Promise.all(promises);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevent', true);
        }).finally(() => {
            this.eventLoaded = true;
            this.syncIcon = 'sync';
        });
    }

    /**
     * Add a reminder for this event.
     */
    addNotificationTime(): void {
        if (this.notificationTimeText && this.event && this.event.id) {
            let notificationTime = this.timeUtils.convertToTimestamp(this.notificationTimeText);

            const currentTime = this.timeUtils.timestamp(),
                minute = Math.floor(currentTime / 60) * 60;

            // Check if the notification time is in the same minute as we are, so the notification is triggered.
            if (notificationTime >=  minute && notificationTime < minute + 60) {
                notificationTime  = currentTime + 1;
            }

            this.calendarProvider.addEventReminder(this.event, notificationTime).then(() => {
                this.calendarProvider.getEventReminders(this.eventId).then((reminders) => {
                    this.reminders = reminders;
                });

                this.notificationTimeText = null;
            });
        }
    }

    /**
     * Cancel the selected notification.
     *
     * @param id Reminder ID.
     * @param e Click event.
     */
    cancelNotification(id: number, e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.domUtils.showDeleteConfirm().then(() => {
            const modal = this.domUtils.showModalLoading('core.deleting', true);
            this.calendarProvider.deleteEventReminder(id).then(() => {
                this.calendarProvider.getEventReminders(this.eventId).then((reminders) => {
                    this.reminders = reminders;
                });
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Error deleting reminder');
            }).finally(() => {
                modal.dismiss();
            });
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors?: boolean): Promise<any> {
        if (this.eventLoaded) {
            return this.refreshEvent(true, showErrors).finally(() => {
                refresher && refresher.complete();
                done && done();
            });
        }

        return Promise.resolve();
    }

    /**
     * Refresh the event.
     *
     * @param sync Whether it should try to synchronize offline events.
     * @param showErrors Whether to show sync errors to the user.
     * @return Promise resolved when done.
     */
    refreshEvent(sync?: boolean, showErrors?: boolean): Promise<any> {
        this.syncIcon = 'spinner';

        const promises = [];

        promises.push(this.calendarProvider.invalidateEvent(this.eventId));
        promises.push(this.calendarProvider.invalidateTimeFormat());

        return Promise.all(promises).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchEvent(sync, showErrors);
        });
    }

    /**
     * Open the page to edit the event.
     */
    openEdit(): void {
        // Decide which navCtrl to use. If this page is inside a split view, use the split view's master nav.
        const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
        navCtrl.push('AddonCalendarEditEventPage', {eventId: this.eventId});
    }

    /**
     * Delete the event.
     */
    deleteEvent(): void {
        const title = this.translate.instant('addon.calendar.deleteevent'),
            options: any = {};
        let message: string;

        if (this.event.eventcount > 1) {
            // It's a repeated event.
            message = this.translate.instant('addon.calendar.confirmeventseriesdelete',
                            {$a: {name: this.event.name, count: this.event.eventcount}});

            options.inputs = [
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: true,
                    value: false,
                    label: this.translate.instant('addon.calendar.deleteoneevent')
                },
                {
                    type: 'radio',
                    name: 'deleteall',
                    checked: false,
                    value: true,
                    label: this.translate.instant('addon.calendar.deleteallevents')
                }
            ];
        } else {
            // Not repeated, display a simple confirm.
            message = this.translate.instant('addon.calendar.confirmeventdelete', {$a: this.event.name});
        }

        this.domUtils.showConfirm(message, title, undefined, undefined, options).then((deleteAll) => {

            const modal = this.domUtils.showModalLoading('core.sending', true);

            this.calendarProvider.deleteEvent(this.event.id, this.event.name, deleteAll).then((sent) => {
                let promise;

                if (sent) {
                    // Event deleted, invalidate right days & months.
                    promise = this.calendarHelper.refreshAfterChangeEvent(this.event, deleteAll ? this.event.eventcount : 1)
                            .catch(() => {
                        // Ignore errors.
                    });
                } else {
                    promise = Promise.resolve();
                }

                return promise.then(() => {
                    // Trigger an event.
                    this.eventsProvider.trigger(AddonCalendarProvider.DELETED_EVENT_EVENT, {
                        eventId: this.eventId,
                        sent: sent
                    }, this.sitesProvider.getCurrentSiteId());

                    if (sent) {
                        this.domUtils.showToast('addon.calendar.eventcalendareventdeleted', true, 3000, undefined, false);

                        // Event deleted, close the view.
                        if (!this.svComponent || !this.svComponent.isOn()) {
                            this.navCtrl.pop();
                        }
                    } else {
                        // Event deleted in offline, just mark it as deleted.
                        this.event.deleted = true;
                    }
                });
            }).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'Error deleting event.');
            }).finally(() => {
                modal.dismiss();
            });
        }, () => {
            // User canceled.
        });
    }

    /**
     * Undo delete the event.
     */
    undoDelete(): void {
        const modal = this.domUtils.showModalLoading('core.sending', true);

        this.calendarOffline.unmarkDeleted(this.event.id).then(() => {

            // Trigger an event.
            this.eventsProvider.trigger(AddonCalendarProvider.UNDELETED_EVENT_EVENT, {
                eventId: this.eventId
            }, this.sitesProvider.getCurrentSiteId());

            this.event.deleted = false;

        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error undeleting event.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Check the result of an automatic sync or a manual sync not done by this page.
     *
     * @param isManual Whether it's a manual sync.
     * @param data Sync result.
     */
    protected checkSyncResult(isManual: boolean, data: any): void {
        if (!data) {
            return;
        }

        if (data.deleted && data.deleted.indexOf(this.eventId) != -1) {
            this.domUtils.showToast('addon.calendar.eventcalendareventdeleted', true, 3000, undefined, false);

            // Event was deleted, close the view.
            if (!this.svComponent || !this.svComponent.isOn()) {
                this.navCtrl.pop();
            }
        } else if (data.events && (!isManual || data.source != 'event')) {
            const event = data.events.find((ev) => {
                return ev.id == this.eventId;
            });

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
        this.editEventObserver && this.editEventObserver.off();
        this.syncObserver && this.syncObserver.off();
        this.manualSyncObserver && this.manualSyncObserver.off();
        this.onlineObserver && this.onlineObserver.unsubscribe();
    }
}
