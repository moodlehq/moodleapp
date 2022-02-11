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

import { Component, OnDestroy, OnInit, Input } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
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
import { ModalController, NgZone, Platform, Translate } from '@singletons';
import { CoreCoursesSelfEnrolPasswordComponent } from '../../../courses/components/self-enrol-password/self-enrol-password';
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourseWithImageAndColor } from '@features/courses/services/courses-helper';
import { Subscription } from 'rxjs';

/**
 * Page that allows "previewing" a course and enrolling in it if enabled and not enrolled.
 */
@Component({
    selector: 'page-core-course-preview',
    templateUrl: 'preview.html',
    styleUrls: ['preview.scss'],
})
export class CoreCoursePreviewPage implements OnInit, OnDestroy {

    @Input() course?: CoreCourseSummaryData;
    @Input() courseId = 0;

    isEnrolled = false;
    canAccessCourse = true;
    selfEnrolInstances: CoreCourseEnrolmentMethod[] = [];
    paypalEnabled = false;
    dataLoaded = false;
    isModal = false;

    courseUrl = '';
    courseImageUrl?: string;
    progress?: number;

    courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[] = [];

    protected isGuestEnabled = false;
    protected useGuestAccess = false;
    protected guestInstanceId?: number;
    protected enrolmentMethods: CoreCourseEnrolmentMethod[] = [];
    protected waitStart = 0;
    protected enrolUrl = '';
    protected pageDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;
    protected appResumeSubscription: Subscription;
    protected waitingForBrowserEnrol = false;

    constructor() {
        // Refresh the view when the app is resumed.
        this.appResumeSubscription = Platform.resume.subscribe(() => {
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
        this.enrolUrl = CoreTextUtils.concatenatePaths(currentSiteUrl, 'enrol/index.php?id=' + this.courseId);
        this.courseUrl = CoreTextUtils.concatenatePaths(currentSiteUrl, 'course/view.php?id=' + this.courseId);

        await this.getCourse();
    }

    /**
     * Check if the user can access as guest.
     *
     * @return Promise resolved if can access as guest, rejected otherwise. Resolve param indicates if
     *         password is required for guest access.
     */
    protected async canAccessAsGuest(): Promise<boolean> {
        if (!this.isGuestEnabled) {
            throw Error('Guest access is not enabled.');
        }

        // Search instance ID of guest enrolment method.
        const method = this.enrolmentMethods.find((method) => method.type == 'guest');
        this.guestInstanceId = method?.id;

        if (this.guestInstanceId) {
            const info = await CoreCourses.getCourseGuestEnrolmentInfo(this.guestInstanceId);
            if (!info.status) {
                // Not active, reject.
                throw Error('Guest access is not enabled.');
            }

            return info.passwordrequired;
        }

        throw Error('Guest enrollment method not found.');
    }

    /**
     * Convenience function to get course. We use this to determine if a user can see the course or not.
     *
     * @param refresh If it's refreshing content.
     */
    protected async getCourse(refresh = false): Promise<void> {
        // Get course enrolment methods.
        this.selfEnrolInstances = [];

        try {
            this.enrolmentMethods = await CoreCourses.getCourseEnrolmentMethods(this.courseId);

            this.enrolmentMethods.forEach((method) => {
                if (method.type === 'self') {
                    this.selfEnrolInstances.push(method);
                } else if (method.type === 'guest') {
                    this.isGuestEnabled = true;
                } else if (method.type === 'paypal') {
                    this.paypalEnabled = true;
                }
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting enrolment data');
        }

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
            try {
                this.canAccessCourse = !(await this.canAccessAsGuest());
                this.useGuestAccess = this.canAccessCourse;
            } catch {
                this.canAccessCourse = false;
            }
        }

        if (this.course && 'overviewfiles' in this.course && this.course.overviewfiles?.length) {
            this.courseImageUrl = this.course.overviewfiles[0].fileurl;
        }

        try {
            const courseByField = await CoreCourses.getCourseByField('id', this.courseId);
            if (this.course) {
                this.course.customfields = courseByField.customfields;
                this.course.contacts = courseByField.contacts;
                this.course.displayname = courseByField.displayname;
                this.course.categoryname = courseByField.categoryname;
                this.course.overviewfiles = courseByField.overviewfiles;
            } else  {
                this.course = courseByField;
            }

            this.paypalEnabled = !this.isEnrolled && courseByField.enrollmentmethods?.indexOf('paypal') > -1;

        } catch {
            // Ignore errors.
        }

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
     * Load the course menu handlers.
     *
     * @param refresh If it's refreshing content.
     * @return Promise resolved when done.
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
                undefined,
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
     * User clicked in a self enrol button.
     *
     * @param instanceId The instance ID of the enrolment method.
     */
    async selfEnrolClicked(instanceId: number): Promise<void> {
        try {
            await CoreDomUtils.showConfirm(Translate.instant('core.courses.confirmselfenrol'));

            this.selfEnrolInCourse('', instanceId);
        } catch {
            // User cancelled.
        }
    }

    /**
     * Self enrol in a course.
     *
     * @param password Password to use.
     * @param instanceId The instance ID.
     * @return Promise resolved when self enrolled.
     */
    async selfEnrolInCourse(password: string, instanceId: number): Promise<void> {
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
                    this.selfEnrolInCourse(modalData, instanceId);

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
        if (this.guestInstanceId) {
            promises.push(CoreCourses.invalidateCourseGuestEnrolmentInfo(this.guestInstanceId));
        }

        await Promise.all(promises).finally(() => this.getCourse()).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Wait for the user to be enrolled in the course.
     *
     * @param first If it's the first call (true) or it's a recursive call (false).
     * @return Promise resolved when enrolled or timeout.
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
