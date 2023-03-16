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

import { Component, OnDestroy, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { ActionSheetButton, IonRefresher } from '@ionic/angular';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import {
    CoreCourseCustomField,
    CoreCourseEnrolmentMethod,
    CoreCourses,
    CoreCourseSearchedData,
    CoreCoursesProvider,
    CoreEnrolledCourseData,
} from '@features/courses/services/courses';
import {
    CoreCourseOptionsDelegate,
    CoreCourseOptionsMenuHandlerToDisplay,
} from '@features/course/services/course-options-delegate';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { ActionSheetController, ModalController, NgZone, Translate } from '@singletons';
import { CoreCoursesSelfEnrolPasswordComponent } from '../../../courses/components/self-enrol-password/self-enrol-password';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { CoreCoursesHelper, CoreCourseWithImageAndColor } from '@features/courses/services/courses-helper';
import { Subscription } from 'rxjs';
import { CoreColors } from '@singletons/colors';
import { CorePath } from '@singletons/path';
import { CorePromisedValue } from '@classes/promised-value';
import { CorePlatform } from '@services/platform';

const ENROL_BROWSER_METHODS = ['fee', 'paypal'];

/**
 * Page that shows the summary of a course including buttons to enrol and other available options.
 */
@Component({
    selector: 'page-core-course-summary',
    templateUrl: 'course-summary.html',
    styleUrls: ['course-summary.scss'],
})
export class CoreCourseSummaryPage implements OnInit, OnDestroy {

    @Input() course?: CoreCourseSummaryData;
    @Input() courseId = 0;

    @ViewChild('courseThumb') courseThumb?: ElementRef;

    isEnrolled = false;
    canAccessCourse = true;
    selfEnrolInstances: CoreCourseEnrolmentMethod[] = [];
    otherEnrolments = false;
    dataLoaded = false;
    isModal = false;
    contactsExpanded = false;

    courseUrl = '';
    progress?: number;

    protected actionSheet?: HTMLIonActionSheetElement;

    courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[] = [];

    protected useGuestAccess = false;
    protected guestInstanceId = new CorePromisedValue<number | undefined>();
    protected courseData = new CorePromisedValue<CoreCourseSummaryData | undefined>();
    protected waitStart = 0;
    protected enrolUrl = '';
    protected pageDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;
    protected appResumeSubscription: Subscription;
    protected waitingForBrowserEnrol = false;

    constructor() {
        // Refresh the view when the app is resumed.
        this.appResumeSubscription = CorePlatform.resume.subscribe(() => {
            if (!this.waitingForBrowserEnrol || !this.dataLoaded) {
                return;
            }

            NgZone.run(async () => {
                this.waitingForBrowserEnrol = false;
                this.dataLoaded = false;

                await this.refreshData();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.courseId) {
            // Opened as a page.
            try {
                this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            } catch (error) {
                CoreDomUtils.showErrorModal(error);
                CoreNavigator.back();
                this.closeModal(); // Just in case.

                return;
            }

            this.course = CoreNavigator.getRouteParam('course');
        } else {
            // Opened as a modal.
            this.isModal = true;
        }

        const currentSiteUrl = CoreSites.getRequiredCurrentSite().getURL();
        this.enrolUrl = CorePath.concatenatePaths(currentSiteUrl, 'enrol/index.php?id=' + this.courseId);
        this.courseUrl = CorePath.concatenatePaths(currentSiteUrl, 'course/view.php?id=' + this.courseId);

        await this.getCourse();
    }

    /**
     * Check if the user can access as guest.
     *
     * @returns Promise resolved if can access as guest, rejected otherwise. Resolve param indicates if
     *         password is required for guest access.
     */
    protected async canAccessAsGuest(): Promise<boolean> {
        const guestInstanceId = await this.guestInstanceId;
        if (guestInstanceId === undefined) {
            return false;
        }

        const info = await CoreCourses.getCourseGuestEnrolmentInfo(guestInstanceId);

        // Guest access with password is not supported by the app.
        return !!info.status && !info.passwordrequired;
    }

    /**
     * Convenience function to get course. We use this to determine if a user can see the course or not.
     *
     * @param refresh If it's refreshing content.
     */
    protected async getCourse(refresh = false): Promise<void> {
        this.otherEnrolments = false;

        try {
            await Promise.all([
                this.getEnrolmentMethods(),
                this.getCourseData(),
                this.loadCourseExtraData(),
            ]);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting enrolment data');
        }

        await this.setCourseColor();

        if (!this.course ||
            !('progress' in this.course) ||
            typeof this.course.progress !== 'number' ||
            this.course.progress < 0 ||
            this.course.completionusertracked === false
        ) {
            this.progress = undefined;
        } else {
            this.progress = this.course.progress;
        }

        await this.loadMenuHandlers(refresh);

        this.dataLoaded = true;
    }

    /**
     * Get course enrolment methods.
     */
    protected async getEnrolmentMethods(): Promise<void> {
        this.selfEnrolInstances = [];
        this.guestInstanceId.reset();

        const enrolmentMethods = await CoreCourses.getCourseEnrolmentMethods(this.courseId);

        enrolmentMethods.forEach((method) => {
            if (!method.status) {
                return;
            }

            if (method.type === 'self') {
                this.selfEnrolInstances.push(method);
            } else if (method.type === 'guest') {
                this.guestInstanceId.resolve(method.id);
            } else {
                // Other enrolments that comes from that WS should need user action.
                this.otherEnrolments = true;
            }
        });

        if (!this.guestInstanceId.isSettled()) {
            // No guest instance found.
            this.guestInstanceId.resolve(undefined);
        }
    }

    /**
     * Get course data.
     */
    protected async getCourseData(): Promise<void> {
        try {
            // Check if user is enrolled in the course.
            try {
                this.course = await CoreCourses.getUserCourse(this.courseId);
                this.isEnrolled = true;
            } catch {
                // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
                this.isEnrolled = false;
                this.course = await CoreCourses.getCourse(this.courseId);
            }

            // Success retrieving the course, we can assume the user has permissions to view it.
            this.canAccessCourse = true;
            this.useGuestAccess = false;
        } catch {
            // The user is not an admin/manager. Check if we can provide guest access to the course.
            this.canAccessCourse = await this.canAccessAsGuest();
            this.useGuestAccess = this.canAccessCourse;
        }

        this.courseData.resolve(this.course);
    }

    /**
     * Load some extra data for the course.
     */
    protected async loadCourseExtraData(): Promise<void> {
        try {
            const courseByField = await CoreCourses.getCourseByField('id', this.courseId);
            const courseData = await this.courseData;

            if (courseData) {
                courseData.customfields = courseByField.customfields;
                courseData.contacts = courseByField.contacts;
                courseData.displayname = courseByField.displayname;
                courseData.categoryname = courseByField.categoryname;
                courseData.overviewfiles = courseByField.overviewfiles;
            } else  {
                this.course = courseByField;
                this.courseData.resolve(courseByField);
            }

            // enrollmentmethods contains ALL enrolment methods including manual.
            if (!this.isEnrolled && courseByField.enrollmentmethods?.some((method) => ENROL_BROWSER_METHODS.includes(method))) {
                this.otherEnrolments = true;
            }

        } catch {
            // Ignore errors.
        }
    }

    /**
     * Load the course menu handlers.
     *
     * @param refresh If it's refreshing content.
     * @returns Promise resolved when done.
     */
    protected async loadMenuHandlers(refresh?: boolean): Promise<void> {
        if (!this.course) {
            return;
        }

        this.courseMenuHandlers =
            await CoreCourseOptionsDelegate.getMenuHandlersToDisplay(this.course, refresh, this.useGuestAccess);
    }

    /**
     * Open the course.
     *
     * @param replaceCurrentPage If current place should be replaced in the navigation stack.
     */
    openCourse(replaceCurrentPage = false): void {
        if (!this.canAccessCourse || !this.course || this.isModal) {
            return;
        }

        CoreCourseHelper.openCourse(this.course, { params: { isGuest: this.useGuestAccess }, replace: replaceCurrentPage });
    }

    /**
     * Enrol in browser.
     */
    async browserEnrol(): Promise<void> {
        // Send user to browser to enrol. Warn the user first.
        try {
            await CoreDomUtils.showConfirm(
                Translate.instant('core.courses.browserenrolinstructions'),
                Translate.instant('core.courses.completeenrolmentbrowser'),
                Translate.instant('core.openinbrowser'),
            );
        } catch {
            // User canceled.
            return;
        }

        this.waitingForBrowserEnrol = true;

        await CoreSites.getRequiredCurrentSite().openInBrowserWithAutoLogin(
            this.enrolUrl,
            undefined,
            {
                showBrowserWarning: false,
            },
        );
    }

    /**
     * Confirm user to Self enrol in course.
     *
     * @param enrolMethod The enrolment method.
     */
    async selfEnrolConfirm(enrolMethod: CoreCourseEnrolmentMethod): Promise<void> {
        try {
            await CoreDomUtils.showConfirm(Translate.instant('core.courses.confirmselfenrol'), enrolMethod.name);

            this.selfEnrolInCourse(enrolMethod.id);
        } catch {
            // User cancelled.
        }
    }

    /**
     * Self enrol in a course.
     *
     * @param instanceId The instance ID.
     * @param password Password to use.
     * @returns Promise resolved when self enrolled.
     */
    async selfEnrolInCourse(instanceId: number, password = ''): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading('core.loading', true);

        try {
            await CoreCourses.selfEnrol(this.courseId, password, instanceId);

            // Close modal and refresh data.
            this.isEnrolled = true;
            this.dataLoaded = false;

            // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
            await this.waitForEnrolled(true);

            await this.refreshData().finally(() => {
                // My courses have been updated, trigger event.
                CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {
                    courseId: this.courseId,
                    course: this.course,
                    action: CoreCoursesProvider.ACTION_ENROL,
                }, CoreSites.getCurrentSiteId());
            });

            this.openCourse(true);

            modal?.dismiss();
        } catch (error) {
            modal?.dismiss();

            if (error && error.errorcode === CoreCoursesProvider.ENROL_INVALID_KEY) {
                // Initialize the self enrol modal.
                // Invalid password, show the modal to enter the password.
                const modalData = await CoreDomUtils.openModal<string>(
                    {
                        component: CoreCoursesSelfEnrolPasswordComponent,
                        componentProps: { password },
                    },
                );

                if (modalData !== undefined) {
                    this.selfEnrolInCourse(instanceId, modalData);

                    return;
                }

                if (!password) {
                    // No password entered, don't show error.
                    return;
                }
            }

            CoreDomUtils.showErrorModalDefault(error, 'core.courses.errorselfenrol', true);
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher The refresher if this was triggered by a Pull To Refresh.
     */
    async refreshData(refresher?: IonRefresher): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourses.invalidateCourse(this.courseId));
        promises.push(CoreCourses.invalidateCourseEnrolmentMethods(this.courseId));
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(this.courseId));
        promises.push(CoreCourses.invalidateCoursesByField('id', this.courseId));
        if (this.guestInstanceId.value) {
            promises.push(CoreCourses.invalidateCourseGuestEnrolmentInfo(this.guestInstanceId.value));
        }

        await Promise.all(promises).finally(() => this.getCourse()).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Wait for the user to be enrolled in the course.
     *
     * @param first If it's the first call (true) or it's a recursive call (false).
     * @returns Promise resolved when enrolled or timeout.
     */
    protected async waitForEnrolled(first?: boolean): Promise<void> {
        if (first) {
            this.waitStart = Date.now();
        }

        // Check if user is enrolled in the course.
        await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());

        try {
            await CoreCourses.getUserCourse(this.courseId);
        } catch {
            // Not enrolled, wait a bit and try again.
            if (this.pageDestroyed || (Date.now() - this.waitStart > 60000)) {
                // Max time reached or the user left the view, stop.
                return;
            }

            return new Promise((resolve): void => {
                setTimeout(async () => {
                    if (!this.pageDestroyed) {
                        // Wait again.
                        await this.waitForEnrolled();
                    }
                    resolve();
                }, 5000);
            });
        }
    }

    /**
     * Opens a menu item registered to the delegate.
     *
     * @param item Item to open
     */
    openMenuItem(item: CoreCourseOptionsMenuHandlerToDisplay): void {
        const params = Object.assign({ course: this.course }, item.data.pageParams);
        CoreNavigator.navigateToSitePath(item.data.page, { params });
    }

    /**
     * Set course color.
     */
    protected async setCourseColor(): Promise<void> {
        if (!this.course) {
            return;
        }

        await CoreCoursesHelper.loadCourseColorAndImage(this.course);

        if (!this.courseThumb) {
            return;
        }

        if (this.course.color) {
            this.courseThumb.nativeElement.style.setProperty('--course-color', this.course.color);

            const tint = CoreColors.lighter(this.course.color, 50);
            this.courseThumb.nativeElement.style.setProperty('--course-color-tint', tint);
        } else if(this.course.colorNumber !== undefined) {
            this.courseThumb.nativeElement.classList.add('course-color-' + this.course.colorNumber);
        }
    }

    /**
     * Open enrol action sheet.
     */
    async enrolMe(): Promise<void> {
        if (this.selfEnrolInstances.length == 1 && !this.otherEnrolments) {
            this.selfEnrolConfirm(this.selfEnrolInstances[0]);

            return;
        }

        if (this.selfEnrolInstances.length == 0 && this.otherEnrolments) {
            this.browserEnrol();

            return;
        }

        const buttons: ActionSheetButton[] = this.selfEnrolInstances.map((enrolMethod) => ({
            text: enrolMethod.name,
            handler: (): void => {
                this.selfEnrolConfirm(enrolMethod);
            },
        }));

        if (this.otherEnrolments) {
            buttons.push({
                text: Translate.instant('core.courses.completeenrolmentbrowser'),
                handler: (): void => {
                    this.browserEnrol();
                },
            });
        }

        buttons.push({
            text: Translate.instant('core.cancel'),
            role: 'cancel',
        });

        this.actionSheet = await ActionSheetController.create({
            header:  Translate.instant('core.courses.enrolme'),
            buttons: buttons,
        });

        await this.actionSheet.present();
    }

    /**
     * Toggle list of contacts.
     */
    toggleContacts(): void {
        this.contactsExpanded = !this.contactsExpanded;
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.pageDestroyed = true;
        this.courseStatusObserver?.off();
        this.appResumeSubscription.unsubscribe();
    }

}

type CoreCourseSummaryData = CoreCourseWithImageAndColor & (CoreEnrolledCourseData | CoreCourseSearchedData) & {
    contacts?: { // Contact users.
        id: number; // Contact user id.
        fullname: string; // Contact user fullname.
    }[];
    customfields?: CoreCourseCustomField[]; // Custom fields and associated values.
    categoryname?: string; // Category name.
};
