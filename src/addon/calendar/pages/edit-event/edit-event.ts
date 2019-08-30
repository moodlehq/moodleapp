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

import { Component, OnInit, OnDestroy, Optional, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreRichTextEditorComponent } from '@components/rich-text-editor/rich-text-editor.ts';
import { AddonCalendarProvider } from '../../providers/calendar';
import { AddonCalendarOfflineProvider } from '../../providers/calendar-offline';
import { AddonCalendarHelperProvider } from '../../providers/helper';
import { AddonCalendarSyncProvider } from '../../providers/calendar-sync';
import { CoreSite } from '@classes/site';

/**
 * Page that displays a form to create/edit an event.
 */
@IonicPage({ segment: 'addon-calendar-edit-event' })
@Component({
    selector: 'page-addon-calendar-edit-event',
    templateUrl: 'edit-event.html',
})
export class AddonCalendarEditEventPage implements OnInit, OnDestroy {

    @ViewChild(CoreRichTextEditorComponent) descriptionEditor: CoreRichTextEditorComponent;

    title: string;
    dateFormat: string;
    component = AddonCalendarProvider.COMPONENT;
    loaded = false;
    hasOffline = false;
    eventTypes = [];
    categories = [];
    courses = [];
    groups = [];
    loadingGroups = false;
    courseGroupSet = false;
    advanced = false;
    errors: any;
    event: any; // The event object (when editing an event).

    // Form variables.
    eventForm: FormGroup;
    eventTypeControl: FormControl;
    groupControl: FormControl;
    descriptionControl: FormControl;

    protected eventId: number;
    protected courseId: number;
    protected originalData: any;
    protected currentSite: CoreSite;
    protected types: any; // Object with the supported types.
    protected showAll: boolean;
    protected isDestroyed = false;
    protected error = false;
    protected gotEventData = false;

    constructor(navParams: NavParams,
            private navCtrl: NavController,
            private translate: TranslateService,
            private domUtils: CoreDomUtilsProvider,
            private textUtils: CoreTextUtilsProvider,
            private timeUtils: CoreTimeUtilsProvider,
            private eventsProvider: CoreEventsProvider,
            private groupsProvider: CoreGroupsProvider,
            sitesProvider: CoreSitesProvider,
            private coursesProvider: CoreCoursesProvider,
            private utils: CoreUtilsProvider,
            private calendarProvider: AddonCalendarProvider,
            private calendarOffline: AddonCalendarOfflineProvider,
            private calendarHelper: AddonCalendarHelperProvider,
            private calendarSync: AddonCalendarSyncProvider,
            private fb: FormBuilder,
            private syncProvider: CoreSyncProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {

        this.eventId = navParams.get('eventId');
        this.courseId = navParams.get('courseId');
        this.title = this.eventId ? 'addon.calendar.editevent' : 'addon.calendar.newevent';

        const timestamp = navParams.get('timestamp');

        this.currentSite = sitesProvider.getCurrentSite();
        this.errors = {
            required: this.translate.instant('core.required')
        };

        // Calculate format to use. ion-datetime doesn't support escaping characters ([]), so we remove them.
        this.dateFormat = this.timeUtils.convertPHPToMoment(this.translate.instant('core.strftimedatetimeshort'))
            .replace(/[\[\]]/g, '');

        // Initialize form variables.
        this.eventForm = new FormGroup({});
        this.eventTypeControl = this.fb.control('', Validators.required);
        this.groupControl = this.fb.control('');
        this.descriptionControl = this.fb.control('');

        const currentDate = this.timeUtils.toDatetimeFormat(timestamp);

        this.eventForm.addControl('name', this.fb.control('', Validators.required));
        this.eventForm.addControl('timestart', this.fb.control(currentDate, Validators.required));
        this.eventForm.addControl('eventtype', this.eventTypeControl);
        this.eventForm.addControl('categoryid', this.fb.control(''));
        this.eventForm.addControl('courseid', this.fb.control(this.courseId));
        this.eventForm.addControl('groupcourseid', this.fb.control(''));
        this.eventForm.addControl('groupid', this.groupControl);
        this.eventForm.addControl('description', this.descriptionControl);
        this.eventForm.addControl('location', this.fb.control(''));
        this.eventForm.addControl('duration', this.fb.control(0));
        this.eventForm.addControl('timedurationuntil', this.fb.control(currentDate));
        this.eventForm.addControl('timedurationminutes', this.fb.control(''));
        this.eventForm.addControl('repeat', this.fb.control(false));
        this.eventForm.addControl('repeats', this.fb.control('1'));
        this.eventForm.addControl('repeateditall', this.fb.control(1));
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchData().finally(() => {
            this.originalData = this.utils.clone(this.eventForm.value);
            this.loaded = true;
        });
    }

    /**
     * Fetch the data needed to render the form.
     *
     * @param {boolean} [refresh] Whether it's refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchData(refresh?: boolean): Promise<any> {
        let accessInfo;

        this.error = false;

        // Get access info.
        return this.calendarProvider.getAccessInformation(this.courseId).then((info) => {
            accessInfo = info;

            return this.calendarProvider.getAllowedEventTypes(this.courseId);
        }).then((types) => {
            this.types = types;

            const promises = [],
                eventTypes = this.calendarHelper.getEventTypeOptions(types);

            if (!eventTypes.length) {
                return Promise.reject(this.translate.instant('addon.calendar.nopermissiontoupdatecalendar'));
            }

            if (this.eventId && !this.gotEventData) {
                // Editing an event, get the event data. Wait for sync first.

                promises.push(this.calendarSync.waitForSync(AddonCalendarSyncProvider.SYNC_ID).then(() => {
                    // Do not block if the scope is already destroyed.
                    if (!this.isDestroyed) {
                        this.syncProvider.blockOperation(AddonCalendarProvider.COMPONENT, this.eventId);
                    }

                    const promises = [];

                    // Get the event offline data if there's any.
                    promises.push(this.calendarOffline.getEvent(this.eventId).then((event) => {
                        this.hasOffline = true;

                        return event;
                    }).catch(() => {
                        // No offline data.
                        this.hasOffline = false;
                    }));

                    if (this.eventId > 0) {
                        // It's an online event. get its data from server.
                        promises.push(this.calendarProvider.getEventById(this.eventId).then((event) => {
                            this.event = event;
                            if (event && event.repeatid) {
                                event.othereventscount = event.eventcount ? event.eventcount - 1 : '';
                            }

                            return event;
                        }));
                    }

                    return Promise.all(promises).then((result) => {
                        this.gotEventData = true;

                        const event = result[0] || result[1]; // Use offline data first.

                        if (event) {
                            // Load the data in the form.
                            return this.loadEventData(event, !!result[0]);
                        }
                    });
                }));
            }

            if (types.category) {
                // Get the categories.
                promises.push(this.coursesProvider.getCategories(0, true).then((cats) => {
                    this.categories = cats;
                }));
            }

            this.showAll = this.utils.isTrueOrOne(this.currentSite.getStoredConfig('calendar_adminseesall')) &&
                    accessInfo.canmanageentries;

            if (types.course || types.groups) {
                // Get the courses.
                const promise = this.showAll ? this.coursesProvider.getCoursesByField() : this.coursesProvider.getUserCourses();

                promises.push(promise.then((courses) => {
                    if (this.showAll) {
                        // Remove site home from the list of courses.
                        const siteHomeId = this.currentSite.getSiteHomeId();
                        courses = courses.filter((course) => {
                            return course.id != siteHomeId;
                        });
                    }

                    // Format the name of the courses.
                    const subPromises = [];
                    courses.forEach((course) => {
                        subPromises.push(this.textUtils.formatText(course.fullname).then((text) => {
                            course.fullname = text;
                        }).catch(() => {
                            // Ignore errors.
                        }));
                    });

                    return Promise.all(subPromises).then(() => {
                        // Sort courses by name.
                        this.courses = courses.sort((a, b) => {
                            const compareA = a.fullname.toLowerCase(),
                                compareB = b.fullname.toLowerCase();

                            return compareA.localeCompare(compareB);
                        });
                    });
                }));
            }

            return Promise.all(promises).then(() => {
                if (!this.eventTypeControl.value) {
                    // Initialize event type value. If course is allowed, select it first.
                    if (types.course) {
                        this.eventTypeControl.setValue(AddonCalendarProvider.TYPE_COURSE);
                    } else {
                        this.eventTypeControl.setValue(eventTypes[0].value);
                    }
                }

                this.eventTypes = eventTypes;
            });

        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting data.');
            this.error = true;

            if (!this.svComponent || !this.svComponent.isOn()) {
                this.originalData = null; // Avoid asking for confirmation.
                this.navCtrl.pop();
            }
        });
    }

    /**
     * Load an event data into the form.
     *
     * @param {any} event Event data.
     * @param {boolean} isOffline Whether the data is from offline or not.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadEventData(event: any, isOffline: boolean): Promise<any> {
        const courseId = event.course ? event.course.id : event.courseid;

        this.eventForm.controls.name.setValue(event.name);
        this.eventForm.controls.timestart.setValue(this.timeUtils.toDatetimeFormat(event.timestart * 1000));
        this.eventForm.controls.eventtype.setValue(event.eventtype);
        this.eventForm.controls.categoryid.setValue(event.categoryid || '');
        this.eventForm.controls.courseid.setValue(courseId || '');
        this.eventForm.controls.groupcourseid.setValue(event.groupcourseid || courseId || '');
        this.eventForm.controls.groupid.setValue(event.groupid || '');
        this.eventForm.controls.description.setValue(event.description);
        this.eventForm.controls.location.setValue(event.location);

        if (isOffline) {
            // It's an offline event, use the data as it is.
            this.eventForm.controls.duration.setValue(event.duration);
            this.eventForm.controls.timedurationuntil.setValue(
                    this.timeUtils.toDatetimeFormat((event.timedurationuntil * 1000) || Date.now()));
            this.eventForm.controls.timedurationminutes.setValue(event.timedurationminutes || '');
            this.eventForm.controls.repeat.setValue(!!event.repeat);
            this.eventForm.controls.repeats.setValue(event.repeats || '1');
            this.eventForm.controls.repeateditall.setValue(event.repeateditall || 1);
        } else {
            // Online event, we'll have to calculate the data.

            if (event.timeduration > 0) {
                this.eventForm.controls.duration.setValue(1);
                this.eventForm.controls.timedurationuntil.setValue(this.timeUtils.toDatetimeFormat(
                        (event.timestart + event.timeduration) * 1000));
            } else {
                // No duration.
                this.eventForm.controls.duration.setValue(0);
                this.eventForm.controls.timedurationuntil.setValue(this.timeUtils.toDatetimeFormat());
            }

            this.eventForm.controls.timedurationminutes.setValue('');
            this.eventForm.controls.repeat.setValue(!!event.repeatid);
            this.eventForm.controls.repeats.setValue(event.eventcount || '1');
            this.eventForm.controls.repeateditall.setValue(1);
        }

        if (event.eventtype == 'group' && courseId) {
            return this.loadGroups(courseId);
        }

        return Promise.resolve();
    }

    /**
     * Pull to refresh.
     *
     * @param {any} refresher Refresher.
     */
    refreshData(refresher: any): void {
        const promises = [
            this.calendarProvider.invalidateAccessInformation(this.courseId),
            this.calendarProvider.invalidateAllowedEventTypes(this.courseId)
        ];

        if (this.types) {
            if (this.types.category) {
                promises.push(this.coursesProvider.invalidateCategories(0, true));
            }
            if (this.types.course || this.types.groups) {
                if (this.showAll) {
                    promises.push(this.coursesProvider.invalidateCoursesByField());
                } else {
                    promises.push(this.coursesProvider.invalidateUserCourses());
                }
            }
        }

        Promise.all(promises).finally(() => {
            this.fetchData(true).finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * A course was selected, get its groups.
     *
     * @param {number} courseId Course ID.
     */
    groupCourseSelected(courseId: number): void {
        if (!courseId) {
            return;
        }

        const modal = this.domUtils.showModalLoading();

        this.loadGroups(courseId).then(() => {
            this.groupControl.setValue('');
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting data.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Load groups of a certain course.
     *
     * @param {number} courseId Course ID.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadGroups(courseId: number): Promise<any> {
        this.loadingGroups = true;

        return this.groupsProvider.getUserGroupsInCourse(courseId).then((groups) => {
            this.groups = groups;
            this.courseGroupSet = true;
        }).finally(() => {
            this.loadingGroups = false;
        });
    }

    /**
     * Show or hide advanced form fields.
     */
    toggleAdvanced(): void {
        this.advanced = !this.advanced;
    }

    /**
     * Create the event.
     */
    submit(): void {
        // Validate data.
        const formData = this.eventForm.value,
            timeStartDate = this.timeUtils.convertToTimestamp(formData.timestart),
            timeUntilDate = this.timeUtils.convertToTimestamp(formData.timedurationuntil),
            timeDurationMinutes = parseInt(formData.timedurationminutes || '', 10);
        let error;

        if (formData.eventtype == AddonCalendarProvider.TYPE_COURSE && !formData.courseid) {
            error = 'core.selectacourse';
        } else if (formData.eventtype == AddonCalendarProvider.TYPE_GROUP && !formData.groupcourseid) {
            error = 'core.selectacourse';
        } else if (formData.eventtype == AddonCalendarProvider.TYPE_GROUP && !formData.groupid) {
            error = 'core.selectagroup';
        } else if (formData.eventtype == AddonCalendarProvider.TYPE_CATEGORY && !formData.categoryid) {
            error = 'core.selectacategory';
        } else if (formData.duration == 1 && timeStartDate > timeUntilDate) {
            error = 'addon.calendar.invalidtimedurationuntil';
        } else if (formData.duration == 2 && (isNaN(timeDurationMinutes) || timeDurationMinutes < 1)) {
            error = 'addon.calendar.invalidtimedurationminutes';
        }

        if (error) {
            // Show error and stop.
            this.domUtils.showErrorModal(this.translate.instant(error));

            return;
        }

        // Format the data to send.
        const data: any = {
            name: formData.name,
            eventtype: formData.eventtype,
            timestart: timeStartDate,
            description: {
                text: formData.description,
                format: 1
            },
            location: formData.location,
            duration: formData.duration,
            repeat: formData.repeat
        };

        if (formData.eventtype == AddonCalendarProvider.TYPE_COURSE) {
            data.courseid = formData.courseid;
        } else if (formData.eventtype == AddonCalendarProvider.TYPE_GROUP) {
            data.groupcourseid = formData.groupcourseid;
            data.groupid = formData.groupid;
        } else if (formData.eventtype == AddonCalendarProvider.TYPE_CATEGORY) {
            data.categoryid = formData.categoryid;
        }

        if (formData.duration == 1) {
            data.timedurationuntil = timeUntilDate;
        } else if (formData.duration == 2) {
            data.timedurationminutes = formData.timedurationminutes;
        }

        if (formData.repeat) {
            data.repeats = Number(formData.repeats);
        }

        if (this.event && this.event.repeatid) {
            data.repeatid = this.event.repeatid;
            data.repeateditall = formData.repeateditall;
        }

        // Send the data.
        const modal = this.domUtils.showModalLoading('core.sending', true);
        let event;

        this.calendarProvider.submitEvent(this.eventId, data).then((result) => {
            event = result.event;

            if (result.sent) {
                // Event created or edited, invalidate right days & months.
                const numberOfRepetitions = formData.repeat ? formData.repeats :
                    (data.repeateditall && this.event.othereventscount ? this.event.othereventscount + 1 : 1);

                return this.calendarHelper.refreshAfterChangeEvent(result.event, numberOfRepetitions).catch(() => {
                    // Ignore errors.
                });
            }
        }).then(() => {
            this.returnToList(event);
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error sending data.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Convenience function to update or return to event list depending on device.
     *
     * @param {number} [event] Event.
     */
    protected returnToList(event?: any): void {
        // Unblock the sync because the view will be destroyed and the sync process could be triggered before ngOnDestroy.
        this.unblockSync();

        if (this.eventId > 0) {
            // Editing an event.
            const data: any = {
                event: event
            };
            this.eventsProvider.trigger(AddonCalendarProvider.EDIT_EVENT_EVENT, data, this.currentSite.getId());
        } else {
            if (event) {
                const data: any = {
                    event: event
                };
                this.eventsProvider.trigger(AddonCalendarProvider.NEW_EVENT_EVENT, data, this.currentSite.getId());
            } else {
                this.eventsProvider.trigger(AddonCalendarProvider.NEW_EVENT_DISCARDED_EVENT, {}, this.currentSite.getId());
            }
        }

        if (this.svComponent && this.svComponent.isOn()) {
            // Empty form.
            this.hasOffline = false;
            this.eventForm.reset(this.originalData);
            this.originalData = this.utils.clone(this.eventForm.value);
        } else {
            this.originalData = null; // Avoid asking for confirmation.
            this.navCtrl.pop();
        }
    }

    /**
     * Discard an offline saved discussion.
     */
    discard(): void {
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            this.calendarOffline.deleteEvent(this.eventId).then(() => {
                this.returnToList();
            }).catch(() => {
                // Shouldn't happen.
                this.domUtils.showErrorModal('Error discarding event.');
            });
        }).catch(() => {
            // Cancelled.
        });
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {

        if (this.calendarHelper.hasEventDataChanged(this.eventForm.value, this.originalData)) {
            // Show confirmation if some data has been modified.
            return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        } else {
            return Promise.resolve();
        }
    }

    protected unblockSync(): void {
        if (this.eventId) {
            this.syncProvider.unblockOperation(AddonCalendarProvider.COMPONENT, this.eventId);
        }
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.unblockSync();
        this.isDestroyed = true;
    }
}
