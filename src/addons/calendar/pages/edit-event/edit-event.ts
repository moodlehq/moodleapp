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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CoreEvents } from '@singletons/events';
import { CoreGroup, CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@singletons/utils';
import { CoreCategoryData, CoreCourses, CoreCourseSearchedData, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreEditorRichTextEditorComponent } from '@features/editor/components/rich-text-editor/rich-text-editor';
import {
    AddonCalendarGetCalendarAccessInformationWSResponse,
    AddonCalendarEvent,
    AddonCalendar,
    AddonCalendarSubmitCreateUpdateFormDataWSParams,
} from '../../services/calendar';
import { AddonCalendarOffline } from '../../services/calendar-offline';
import { AddonCalendarEventTypeOption, AddonCalendarHelper } from '../../services/calendar-helper';
import { AddonCalendarSync } from '../../services/calendar-sync';
import { CoreSite } from '@classes/sites/site';
import { Translate } from '@singletons';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { AddonCalendarOfflineEventDBRecord } from '../../services/database/calendar-offline';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator } from '@services/navigator';
import { CanLeave } from '@guards/can-leave';
import { CoreForms } from '@singletons/form';
import { CoreReminders, CoreRemindersService } from '@features/reminders/services/reminders';
import moment from 'moment-timezone';
import {
    ADDON_CALENDAR_COMPONENT,
    ADDON_CALENDAR_EDIT_EVENT_EVENT,
    ADDON_CALENDAR_NEW_EVENT_EVENT,
    ADDON_CALENDAR_SYNC_ID,
    AddonCalendarEventType,
} from '@addons/calendar/constants';
import { ContextLevel } from '@/core/constants';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreLoadings } from '@services/overlays/loadings';
import { REMINDERS_DISABLED, CoreRemindersUnits } from '@features/reminders/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

/**
 * Page that displays a form to create/edit an event.
 */
@Component({
    selector: 'page-addon-calendar-edit-event',
    templateUrl: 'edit-event.html',
    styleUrl: 'edit-event.scss',
})
export class AddonCalendarEditEventPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild(CoreEditorRichTextEditorComponent) descriptionEditor!: CoreEditorRichTextEditorComponent;
    @ViewChild('editEventForm') formElement!: ElementRef;

    title = 'addon.calendar.newevent';
    component = ADDON_CALENDAR_COMPONENT;
    loaded = false;
    hasOffline = false;
    eventTypes: AddonCalendarEventTypeOption[] = [];
    categories: CoreCategoryData[] = [];
    courses: CoreCourseSearchedData[] | CoreEnrolledCourseData[] = [];
    groups: CoreGroup[] = [];
    loadingGroups = false;
    courseGroupSet = false;
    error = false;
    eventRepeatId?: number;
    otherEventsCount = 0;
    eventId?: number;
    maxDate: string;
    minDate: string;

    // Form variables.
    form: FormGroup;
    typeControl: FormControl<AddonCalendarEventType | null>;
    groupControl: FormControl<number | null>;
    descriptionControl: FormControl<string>;

    // Reminders.
    remindersEnabled = false;
    reminders: AddonCalendarEventCandidateReminder[] = [];

    protected courseId!: number;
    protected originalData?: AddonCalendarOfflineEventDBRecord;
    protected currentSite: CoreSite;
    protected types: { [name: string]: boolean } = {}; // Object with the supported types.
    protected showAll = false;
    protected isDestroyed = false;
    protected gotEventData = false;

    constructor(
        protected fb: FormBuilder,
    ) {
        this.currentSite = CoreSites.getRequiredCurrentSite();
        this.remindersEnabled = CoreReminders.isEnabled();

        this.form = new FormGroup({});

        // Initialize form variables.
        this.typeControl = this.fb.control(null, Validators.required);
        this.groupControl = this.fb.control(null);
        this.descriptionControl = this.fb.control('', { nonNullable: true });
        this.form.addControl('name', this.fb.control('', Validators.required));
        this.form.addControl('eventtype', this.typeControl);
        this.form.addControl('categoryid', this.fb.control(''));
        this.form.addControl('groupcourseid', this.fb.control(''));
        this.form.addControl('groupid', this.groupControl);
        this.form.addControl('description', this.descriptionControl);
        this.form.addControl('location', this.fb.control(''));
        this.form.addControl('duration', this.fb.control(0));
        this.form.addControl('timedurationminutes', this.fb.control(''));
        this.form.addControl('repeat', this.fb.control(false));
        this.form.addControl('repeats', this.fb.control({ value: '1', disabled: true }));
        this.form.addControl('repeateditall', this.fb.control(1));

        this.maxDate = CoreTimeUtils.getDatetimeDefaultMax();
        this.minDate = CoreTimeUtils.getDatetimeDefaultMin();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.eventId = CoreNavigator.getRouteNumberParam('eventId') || undefined;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || 0;
        this.title = this.eventId ? 'addon.calendar.editevent' : 'addon.calendar.newevent';

        const timestamp = CoreNavigator.getRouteNumberParam('timestamp');
        const currentDate = CoreTimeUtils.toDatetimeFormat(timestamp);
        this.form.addControl('timestart', this.fb.control(currentDate, Validators.required));
        this.form.addControl('timedurationuntil', this.fb.control(currentDate));
        this.form.addControl('courseid', this.fb.control(this.courseId));

        this.initReminders();
        this.fetchData().finally(() => {
            this.originalData = CoreUtils.clone(this.form.value);
            this.loaded = true;
        });
    }

    /**
     * Fetch the data needed to render the form.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchData(): Promise<void> {
        this.error = false;

        // Get access info.
        try {
            const [types, accessInfo] = await Promise.all([
                AddonCalendar.getAllowedEventTypes(this.courseId),
                CorePromiseUtils.ignoreErrors(AddonCalendar.getAccessInformation(this.courseId), {
                    canmanageentries: false,
                    canmanageownentries: false,
                    canmanagegroupentries: false,
                } as AddonCalendarGetCalendarAccessInformationWSResponse),
            ]);

            this.types = types;

            const promises: Promise<void>[] = [];
            const eventTypes = AddonCalendarHelper.getEventTypeOptions(this.types);

            if (!eventTypes.length) {
                throw new CoreError(Translate.instant('addon.calendar.nopermissiontoupdatecalendar'));
            }

            if (this.eventId && !this.gotEventData) {
                // Editing an event, get the event data. Wait for sync first.
                const eventId = this.eventId;

                promises.push(AddonCalendarSync.waitForSync(ADDON_CALENDAR_SYNC_ID).then(async () => {
                    // Do not block if the scope is already destroyed.
                    if (!this.isDestroyed && this.eventId) {
                        CoreSync.blockOperation(ADDON_CALENDAR_COMPONENT, eventId);
                    }

                    let eventForm: AddonCalendarEvent | AddonCalendarOfflineEventDBRecord | undefined;

                    // Get the event offline data if there's any.
                    try {
                        eventForm = await AddonCalendarOffline.getEvent(eventId);

                        this.hasOffline = true;
                    } catch {
                        // No offline data.
                        this.hasOffline = false;
                    }

                    if (eventId > 0) {
                        // It's an online event. get its data from server.
                        const event = await AddonCalendar.getEventById(eventId);

                        if (!eventForm) {
                            eventForm = event; // Use offline data first.
                        }

                        this.eventRepeatId = event?.repeatid;
                        if (this.eventRepeatId) {

                            this.otherEventsCount = event.eventcount ? event.eventcount - 1 : 0;
                        }
                    }

                    this.gotEventData = true;

                    if (eventForm) {
                        // Load the data in the form.
                        return this.loadEventData(eventForm, this.hasOffline);
                    }

                    return;
                }));
            }

            if (this.types.category) {
                // Get the categories.
                promises.push(this.fetchCategories());
            }

            this.showAll = CoreUtils.isTrueOrOne(this.currentSite.getStoredConfig('calendar_adminseesall')) &&
                accessInfo.canmanageentries;

            if (this.types.course || this.types.groups) {
                promises.push(this.fetchCourses());
            }
            await Promise.all(promises);

            if (!this.typeControl.value) {
                // Initialize event type value. If course is allowed, select it first.
                if (this.types.course) {
                    this.typeControl.setValue(AddonCalendarEventType.COURSE);
                } else {
                    this.typeControl.setValue(eventTypes[0].value);
                }
            }

            this.eventTypes = eventTypes;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting data.');
            this.error = true;
        }
    }

    protected async fetchCategories(): Promise<void> {
        this.categories = await CoreCourses.getCategories(0, true);
    }

    protected async fetchCourses(): Promise<void> {
        // Get the courses.
        let courses = await (this.showAll ? CoreCourses.getCoursesByField() : CoreCourses.getUserCourses());

        if (courses.length < 0) {
            this.courses = [];

            return;
        }

        const courseFillFullname = async (course: CoreCourseSearchedData | CoreEnrolledCourseData): Promise<void> => {
            try {
                const result = await CoreFilterHelper.getFiltersAndFormatText(course.fullname, ContextLevel.COURSE, course.id);
                course.fullname = result.text;
            } catch {
                // Ignore errors.
            }
        };

        if (this.showAll) {
            // Remove site home from the list of courses.
            const siteHomeId = CoreSites.getCurrentSiteHomeId();

            if ('contacts' in courses[0]) {
                courses = (courses as CoreCourseSearchedData[]).filter((course) => course.id != siteHomeId);
            } else {
                courses = (courses as CoreEnrolledCourseData[]).filter((course) => course.id != siteHomeId);
            }
        }

        // Format the name of the courses.
        if ('contacts' in courses[0]) {
            await Promise.all((courses as CoreCourseSearchedData[]).map(courseFillFullname));
        } else {
            await Promise.all((courses as CoreEnrolledCourseData[]).map(courseFillFullname));
        }

        // Sort courses by name.
        this.courses = courses.sort((a, b) => {
            const compareA = a.fullname.toLowerCase();
            const compareB = b.fullname.toLowerCase();

            return compareA.localeCompare(compareB);
        });

    }

    /**
     * Load an event data into the form.
     *
     * @param event Event data.
     * @param isOffline Whether the data is from offline or not.
     * @returns Promise resolved when done.
     */
    protected async loadEventData(
        event: AddonCalendarEvent | AddonCalendarOfflineEventDBRecord,
        isOffline: boolean,
    ): Promise<void> {
        if (!event) {
            return;
        }

        const offlineEvent = (event as AddonCalendarOfflineEventDBRecord);
        const onlineEvent = (event as AddonCalendarEvent);

        const courseId = isOffline ? offlineEvent.courseid : onlineEvent.course?.id;

        this.form.controls.name.setValue(event.name);
        this.form.controls.timestart.setValue(CoreTimeUtils.toDatetimeFormat(event.timestart * 1000));
        this.typeControl.setValue(event.eventtype as AddonCalendarEventType);
        this.form.controls.categoryid.setValue(event.categoryid || '');
        this.form.controls.courseid.setValue(courseId || '');
        this.form.controls.groupcourseid.setValue(courseId || '');
        this.groupControl.setValue(event.groupid || null);
        this.form.controls.description.setValue(event.description);
        this.form.controls.location.setValue(event.location);

        if (isOffline) {
            // It's an offline event, use the data as it is.
            this.form.controls.duration.setValue(offlineEvent.duration);
            this.form.controls.timedurationuntil.setValue(
                CoreTimeUtils.toDatetimeFormat(((offlineEvent.timedurationuntil || 0) * 1000) || Date.now()),
            );
            this.form.controls.timedurationminutes.setValue(offlineEvent.timedurationminutes || '');
            this.form.controls.repeat.setValue(!!offlineEvent.repeat);
            this.form.controls.repeats.setValue(offlineEvent.repeats || '1');
            this.form.controls.repeateditall.setValue(offlineEvent.repeateditall || 1);
        } else {
            // Online event, we'll have to calculate the data.

            if (onlineEvent.timeduration > 0) {
                this.form.controls.duration.setValue(1);
                this.form.controls.timedurationuntil.setValue(CoreTimeUtils.toDatetimeFormat(
                    (onlineEvent.timestart + onlineEvent.timeduration) * 1000,
                ));
            } else {
                // No duration.
                this.form.controls.duration.setValue(0);
                this.form.controls.timedurationuntil.setValue(CoreTimeUtils.toDatetimeFormat());
            }

            this.form.controls.timedurationminutes.setValue('');
            this.form.controls.repeat.setValue(!!onlineEvent.repeatid);
            this.form.controls.repeats.setValue(onlineEvent.eventcount || '1');
            this.form.controls.repeateditall.setValue(1);
        }

        if (event.eventtype === AddonCalendarEventType.GROUP && courseId) {
            await this.loadGroups(courseId);
        }
    }

    /**
     * Pull to refresh.
     *
     * @param refresher Refresher.
     */
    refreshData(refresher?: HTMLIonRefresherElement): void {
        const promises = [
            AddonCalendar.invalidateAccessInformation(this.courseId),
            AddonCalendar.invalidateAllowedEventTypes(this.courseId),
        ];

        if (this.types) {
            if (this.types.category) {
                promises.push(CoreCourses.invalidateCategories(0, true));
            }
            if (this.types.course || this.types.groups) {
                if (this.showAll) {
                    promises.push(CoreCourses.invalidateCoursesByField());
                } else {
                    promises.push(CoreCourses.invalidateUserCourses());
                }
            }
        }

        Promise.all(promises).finally(() => {
            this.fetchData().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * A course was selected, get its groups.
     */
    async groupCourseSelected(): Promise<void> {
        const courseId = this.form.controls.groupcourseid.value;
        if (!courseId) {
            return;
        }

        const modal = await CoreLoadings.show();

        try {
            await this.loadGroups(courseId);

            this.groupControl.setValue(null);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting data.');
        }

        modal.dismiss();
    }

    /**
     * Load groups of a certain course.
     *
     * @param courseId Course ID.
     * @returns Promise resolved when done.
     */
    protected async loadGroups(courseId: number): Promise<void> {
        this.loadingGroups = true;

        try {
            this.groups = await CoreGroups.getUserGroupsInCourse(courseId);
            this.courseGroupSet = true;
        } finally {
            this.loadingGroups = false;
        }
    }

    selectDuration(duration: string): void {
        this.form.controls.duration.setValue(duration);
    }

    /**
     * Create the event.
     */
    async submit(): Promise<void> {
        // Validate data.
        const formData = this.form.value;
        const timeStartDate = moment(formData.timestart).unix();
        const timeUntilDate = moment(formData.timedurationuntil).unix();
        const timeDurationMinutes = parseInt(formData.timedurationminutes || '', 10);
        let error: string | undefined;

        if (formData.eventtype === AddonCalendarEventType.COURSE && !formData.courseid) {
            error = 'core.selectacourse';
        } else if (formData.eventtype === AddonCalendarEventType.GROUP && !formData.groupcourseid) {
            error = 'core.selectacourse';
        } else if (formData.eventtype === AddonCalendarEventType.GROUP && !formData.groupid) {
            error = 'core.selectagroup';
        } else if (formData.eventtype === AddonCalendarEventType.CATEGORY && !formData.categoryid) {
            error = 'core.selectacategory';
        } else if (formData.duration === 1 && timeStartDate > timeUntilDate) {
            error = 'addon.calendar.invalidtimedurationuntil';
        } else if (formData.duration === 2 && (isNaN(timeDurationMinutes) || timeDurationMinutes < 1)) {
            error = 'addon.calendar.invalidtimedurationminutes';
        }

        if (error) {
            // Show error and stop.
            CoreDomUtils.showErrorModal(Translate.instant(error));

            return;
        }

        // Format the data to send.
        const data: AddonCalendarSubmitCreateUpdateFormDataWSParams = {
            name: formData.name,
            eventtype: formData.eventtype,
            timestart: timeStartDate,
            description: {
                text: formData.description || '',
                format: 1,
                itemid: 0, // Files not supported yet.
            },
            location: formData.location,
            duration: formData.duration,
            repeat: formData.repeat,
        };

        if (formData.eventtype === AddonCalendarEventType.COURSE) {
            data.courseid = formData.courseid;
        } else if (formData.eventtype === AddonCalendarEventType.GROUP) {
            data.groupcourseid = formData.groupcourseid;
            data.groupid = formData.groupid;
        } else if (formData.eventtype === AddonCalendarEventType.CATEGORY) {
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

        if (this.eventRepeatId) {
            data.repeatid = this.eventRepeatId;
            data.repeateditall = formData.repeateditall;
        }

        // Send the data.
        const modal = await CoreLoadings.show('core.sending', true);
        let event: AddonCalendarEvent | AddonCalendarOfflineEventDBRecord;

        try {
            const result = await AddonCalendar.submitEvent(this.eventId, data, {
                reminders: this.eventId ? [] : this.reminders, // Only allow adding reminders for new events.
            });
            event = result.event;

            CoreForms.triggerFormSubmittedEvent(this.formElement, result.sent, this.currentSite.getId());

            if (result.sent) {
                // Event created or edited, invalidate right days & months.
                const numberOfRepetitions = formData.repeat
                    ? formData.repeats
                    : (data.repeateditall && this.otherEventsCount
                        ? this.otherEventsCount + 1
                        : 1);

                try {
                    await AddonCalendarHelper.refreshAfterChangeEvent(result.event, numberOfRepetitions);
                } catch {
                    // Ignore errors.
                }
            }

            this.returnToList(event);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error sending data.');
        }

        modal.dismiss();
    }

    /**
     * Convenience function to update or return to event list depending on device.
     *
     * @param event Event.
     */
    protected returnToList(event: AddonCalendarEvent | AddonCalendarOfflineEventDBRecord): void {
        // Unblock the sync because the view will be destroyed and the sync process could be triggered before ngOnDestroy.
        this.unblockSync();

        if (this.eventId && this.eventId > 0) {
            // Editing an event.
            CoreEvents.trigger(
                ADDON_CALENDAR_EDIT_EVENT_EVENT,
                { eventId: this.eventId },
                this.currentSite.getId(),
            );
        } else {
            CoreEvents.trigger(
                ADDON_CALENDAR_NEW_EVENT_EVENT,
                {
                    eventId: event.id,
                    oldEventId: this.eventId,
                },
                this.currentSite.getId(),
            );
        }

        this.originalData = undefined; // Avoid asking for confirmation.
        CoreNavigator.back();
    }

    /**
     * Check if we can leave the page or not.
     *
     * @returns Resolved with true if we can leave it, rejected if not.
     */
    async canLeave(): Promise<boolean> {
        if (AddonCalendarHelper.hasEventDataChanged(this.form.value, this.originalData)) {
            // Show confirmation if some data has been modified.
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        CoreForms.triggerFormCancelledEvent(this.formElement, this.currentSite.getId());

        return true;
    }

    /**
     * Unblock sync.
     */
    protected unblockSync(): void {
        if (this.eventId) {
            CoreSync.unblockOperation(ADDON_CALENDAR_COMPONENT, this.eventId);
        }
    }

    /**
     * Init reminders.
     *
     * @returns Promise resolved when done.
     */
    protected async initReminders(): Promise<void> {
        // Don't init reminders when editing an event. Right now, only allow adding reminders for new events.
        if (!this.remindersEnabled || this.eventId) {
            return;
        }

        // Check if default reminders are enabled.
        const defaultTime = await CoreReminders.getDefaultNotificationTime(this.currentSite.getId());
        if (defaultTime === REMINDERS_DISABLED) {
            return;
        }

        const data = CoreRemindersService.convertSecondsToValueAndUnit(defaultTime);

        // Add default reminder.
        this.reminders.push({
            value: data.value,
            unit: data.unit,
            label: CoreReminders.getUnitValueLabel(data.value, data.unit, true),
        });
    }

    /**
     * Add a reminder.
     */
    async addReminder(): Promise<void> {
        const formData = this.form.value;
        const eventTime = moment(formData.timestart).unix();

        const { CoreRemindersSetReminderMenuComponent } =
            await import('@features/reminders/components/set-reminder-menu/set-reminder-menu');

        const reminderTime = await CorePopovers.open<{timeBefore: number}>({
            component: CoreRemindersSetReminderMenuComponent,
            componentProps: {
                eventTime,
            },
            // TODO: Add event to open the popover in place.
        });

        if (reminderTime === undefined) {
            // User canceled.
            return;
        }

        const data = CoreRemindersService.convertSecondsToValueAndUnit(reminderTime.timeBefore);

        // Add reminder.
        this.reminders.push({
            time: reminderTime.timeBefore,
            value: data.value,
            unit: data.unit,
            label: CoreReminders.getUnitValueLabel(data.value, data.unit),
        });
    }

    /**
     * Remove a reminder.
     *
     * @param reminder The reminder to remove.
     */
    removeReminder(reminder: AddonCalendarEventCandidateReminder): void {
        const index = this.reminders.indexOf(reminder);
        if (index !== -1) {
            this.reminders.splice(index, 1);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.unblockSync();
        this.isDestroyed = true;
    }

}

type AddonCalendarEventCandidateReminder =  {
    time?: number; // Undefined for default reminder.
    value: number; // Amount of time.
    unit: CoreRemindersUnits; // Units.
    label: string; // Label to represent the reminder.
};
