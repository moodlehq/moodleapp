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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreTimeUtilsProvider } from '@providers/utils/time';

/**
 * Page that displays a single calendar event.
 */
@IonicPage({ segment: 'addon-calendar-event' })
@Component({
    selector: 'page-addon-calendar-event',
    templateUrl: 'event.html',
})
export class AddonCalendarEventPage {
    @ViewChild(Content) content: Content;

    protected eventId;
    protected siteHomeId: number;
    eventLoaded: boolean;
    notificationFormat: string;
    notificationMin: string;
    notificationMax: string;
    notificationTimeText: string;
    event: any = {};
    title: string;
    courseName: string;
    courseUrl = '';
    notificationsEnabled = false;
    moduleUrl = '';
    categoryPath = '';
    currentTime: number;
    defaultTime: number;
    reminders: any[];

    constructor(private translate: TranslateService, private calendarProvider: AddonCalendarProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider,
            private calendarHelper: AddonCalendarHelperProvider, private sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider, private courseProvider: CoreCourseProvider,
            private textUtils: CoreTextUtilsProvider, private timeUtils: CoreTimeUtilsProvider) {

        this.eventId = navParams.get('id');
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        if (this.notificationsEnabled) {
            this.calendarProvider.getEventReminders(this.eventId).then((reminders) => {
                this.reminders = reminders;
            });

            this.calendarProvider.getDefaultNotificationTime().then((defaultTime) => {
                this.defaultTime = defaultTime * 60;
            });

        // Calculate format to use. ion-datetime doesn't support escaping characters ([]), so we remove them.
        this.notificationFormat = this.timeUtils.convertPHPToMoment(this.translate.instant('core.strftimedatetimeshort'))
            .replace(/[\[\]]/g, '');
        }
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchEvent().finally(() => {
            this.eventLoaded = true;
        });
    }

    /**
     * Fetches the event and updates the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchEvent(): Promise<any> {
        const currentSite = this.sitesProvider.getCurrentSite(),
            canGetById = this.calendarProvider.isGetEventByIdAvailable();
        let promise;

        if (canGetById) {
            promise = this.calendarProvider.getEventById(this.eventId);
        } else {
            promise = this.calendarProvider.getEvent(this.eventId);
        }

        return promise.then((event) => {
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

            // Guess event title.
            let title = this.translate.instant('addon.calendar.type' + event.eventtype);
            if (event.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                const name = this.courseProvider.translateModuleName(event.modulename);
                if (name.indexOf('core.mod_') === -1) {
                    event.moduleName = name;
                }

                // Calculate the title of the page;
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = this.translate.instant('core.mod_' + event.modulename + '.' + event.eventtype);

                    if (title == 'core.mod_' + event.modulename + '.' + event.eventtype) {
                        title = name;
                    }
                }

                // Get the module URL.
                if (canGetById) {
                    this.moduleUrl = event.url;
                }
            } else {
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = event.name;
                }
            }

            this.title = title;

            // If the event belongs to a course, get the course name and the URL to view it.
            if (canGetById && event.course) {
                this.courseName = event.course.fullname;
                this.courseUrl = event.course.viewurl;
            } else if (event.courseid && event.courseid != this.siteHomeId) {
                // Retrieve the course.
                promises.push(this.coursesProvider.getUserCourse(event.courseid, true).then((course) => {
                    this.courseName = course.fullname;
                    this.courseUrl = currentSite ? this.textUtils.concatenatePaths(currentSite.siteUrl,
                            '/course/view.php?id=' + event.courseid) : '';
                }).catch(() => {
                    // Error getting course, just don't show the course name.
                }));
            }

            if (canGetById && event.iscategoryevent) {
                this.categoryPath = event.category.nestedname;
            }

            if (event.location) {
                // Build a link to open the address in maps.
                event.location = this.textUtils.decodeHTML(event.location);
                event.encodedLocation = this.textUtils.buildAddressURL(event.location);
            }

            return Promise.all(promises);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevent', true);
        });
    }

    /**
     * Add a reminder for this event.
     *
     * @param {Event} e    Click event.
     */
    addNotificationTime(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

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
     * @param {number} id  Reminder ID.
     * @param {Event} e    Click event.
     */
    cancelNotification(id: number, e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.calendarProvider.deleteEventReminder(id).then(() => {
            this.calendarProvider.getEventReminders(this.eventId).then((reminders) => {
                this.reminders = reminders;
            });
        });
    }

    /**
     * Refresh the event.
     *
     * @param {any} refresher Refresher.
     */
    refreshEvent(refresher: any): void {
        this.calendarProvider.invalidateEvent(this.eventId).finally(() => {
            this.fetchEvent().finally(() => {
                refresher.complete();
            });
        });
    }
}
