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
import { CoreSitesProvider } from '@providers/sites';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreCourseProvider } from '@core/course/providers/course';
import * as moment from 'moment';

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
    notificationTime: number;
    defaultTimeReadable: string;
    event: any = {};
    title: string;
    courseName: string;
    notificationsEnabled = false;

    constructor(private translate: TranslateService, private calendarProvider: AddonCalendarProvider, navParams: NavParams,
            private domUtils: CoreDomUtilsProvider, private coursesProvider: CoreCoursesProvider,
            private calendarHelper: AddonCalendarHelperProvider, sitesProvider: CoreSitesProvider,
            localNotificationsProvider: CoreLocalNotificationsProvider, private courseProvider: CoreCourseProvider) {

        this.eventId = navParams.get('id');
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
        this.siteHomeId = sitesProvider.getCurrentSite().getSiteHomeId();
        if (this.notificationsEnabled) {
            this.calendarProvider.getEventNotificationTimeOption(this.eventId).then((notificationTime) => {
                this.notificationTime = notificationTime;
            });

            this.calendarProvider.getDefaultNotificationTime().then((defaultTime) => {
                if (defaultTime === 0) {
                    // Disabled by default.
                    this.defaultTimeReadable = this.translate.instant('core.settings.disabled');
                } else {
                    this.defaultTimeReadable = moment.duration(defaultTime * 60 * 1000).humanize();
                }
            });
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

    updateNotificationTime(): void {
        if (!isNaN(this.notificationTime) && this.event && this.event.id) {
            this.calendarProvider.updateNotificationTime(this.event, this.notificationTime);
        }
    }

    /**
     * Fetches the event and updates the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchEvent(): Promise<any> {
        return this.calendarProvider.getEvent(this.eventId).then((event) => {
            this.calendarHelper.formatEventData(event);
            this.event = event;

            // Guess event title.
            let title = this.translate.instant('addon.calendar.type' + event.eventtype);
            if (event.moduleIcon) {
                // It's a module event, translate the module name to the current language.
                const name = this.courseProvider.translateModuleName(event.modulename);
                if (name.indexOf('core.mod_') === -1) {
                    event.moduleName = name;
                }
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = this.translate.instant('core.mod_' + event.modulename + '.' + event.eventtype);

                    if (title == 'core.mod_' + event.modulename + '.' + event.eventtype) {
                        title = name;
                    }
                }
            } else {
                if (title == 'addon.calendar.type' + event.eventtype) {
                    title = event.name;
                }
            }
            this.title = title;

            if (event.courseid && event.courseid != this.siteHomeId) {
                // It's a course event, retrieve the course name.
                return this.coursesProvider.getUserCourse(event.courseid, true).then((course) => {
                    this.courseName = course.fullname;
                });
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevent', true);
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
