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

import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController, PopoverController } from 'ionic-angular';
import { CoreLocalNotificationsProvider } from '@providers/local-notifications';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarCalendarComponent } from '../../components/calendar/calendar';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCoursePickerMenuPopoverComponent } from '@components/course-picker-menu/course-picker-menu-popover';
import { TranslateService } from '@ngx-translate/core';

/**
 * Page that displays the calendar events.
 */
@IonicPage({ segment: 'addon-calendar-index' })
@Component({
    selector: 'page-addon-calendar-index',
    templateUrl: 'index.html',
})
export class AddonCalendarIndexPage implements OnInit {
    @ViewChild(AddonCalendarCalendarComponent) calendarComponent: AddonCalendarCalendarComponent;

    protected allCourses = {
        id: -1,
        fullname: this.translate.instant('core.fulllistofcourses'),
        category: -1
    };

    courseId: number;
    categoryId: number;
    canCreate = false;
    courses: any[];
    notificationsEnabled = false;
    loaded = false;

    constructor(localNotificationsProvider: CoreLocalNotificationsProvider,
            navParams: NavParams,
            private navCtrl: NavController,
            private domUtils: CoreDomUtilsProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarHelper: AddonCalendarHelperProvider,
            private translate: TranslateService,
            private coursesProvider: CoreCoursesProvider,
            private popoverCtrl: PopoverController) {

        this.courseId = navParams.get('courseId');
        this.notificationsEnabled = localNotificationsProvider.isAvailable();
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        this.fetchData();
    }

    /**
     * Fetch all the data required for the view.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    fetchData(): Promise<any> {
        const promises = [];

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

        return Promise.all(promises).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.calendar.errorloadevents', true);
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any): void {
        if (!this.loaded) {
            return;
        }

        const promises = [];

        promises.push(this.calendarProvider.invalidateAllowedEventTypes().then(() => {
            return this.fetchData();
        }));

        // Refresh the sub-component.
        promises.push(this.calendarComponent.refreshData());

        Promise.all(promises).finally(() => {
            refresher && refresher.complete();
        });
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
}
