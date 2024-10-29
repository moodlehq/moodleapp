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
import { ActionSheetButton } from '@ionic/angular';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import {
    CoreCourseCustomField,
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
import { CoreNavigator } from '@services/navigator';
import { CoreUtils } from '@services/utils/utils';
import { CoreCoursesHelper, CoreCourseWithImageAndColor } from '@features/courses/services/courses-helper';
import { Subscription } from 'rxjs';
import { CoreColors } from '@singletons/colors';
import { CorePath } from '@singletons/path';
import { CorePlatform } from '@services/platform';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreEnrolHelper } from '@features/enrol/services/enrol-helper';
import { CoreEnrolDelegate } from '@features/enrol/services/enrol-delegate';
import { CoreEnrol, CoreEnrolEnrolmentMethod } from '@features/enrol/services/enrol';

/**
 * Page that shows the summary of a course including buttons to enrol and other available options.
 */
@Component({
    selector: 'page-core-course-summary',
    templateUrl: 'course-summary.html',
    styleUrl: 'course-summary.scss',
})
export class CoreCourseSummaryPage implements OnInit, OnDestroy {

    @Input() course?: CoreCourseSummaryData;
    @Input() courseId = 0;

    @ViewChild('courseThumb') courseThumb?: ElementRef;

    isEnrolled = false;

    canAccessCourse = true;
    useGuestAccess = false;

    selfEnrolInstances: CoreEnrolEnrolmentMethod[] = [];
    guestEnrolInstances: CoreEnrolEnrolmentMethod[] = [];
    hasBrowserEnrolments = false;
    dataLoaded = false;
    isModal = false;
    contactsExpanded = false;
    courseUrl = '';
    progress?: number;
    courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[] = [];
    displayOpenInBrowser = false;
    isTeacher = false;

    protected actionSheet?: HTMLIonActionSheetElement;
    protected waitStart = 0;
    protected enrolUrl = '';
    protected pageDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;
    protected appResumeSubscription: Subscription;
    protected waitingForBrowserEnrol = false;
    protected logView: () => void;

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

        this.logView = CoreTime.once(async () => {
            if (!this.course || this.isModal) {
                return;
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_course_get_courses',
                name: this.course.fullname,
                data: { id: this.course.id, category: 'course' },
                url: `/enrol/index.php?id=${this.course.id}`,
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
        this.displayOpenInBrowser = CoreSites.getRequiredCurrentSite().shouldDisplayInformativeLinks();

        await this.getCourse();
    }

    /**
     * Convenience function to get course. We use this to determine if a user can see the course or not.
     *
     * @param refresh If it's refreshing content.
     */
    protected async getCourse(refresh = false): Promise<void> {
        try {
            await this.getCourseData();

            this.logView();
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

        // After loading menu handlers, admOptions should be available.
        this.isTeacher = await CoreUtils.ignoreErrors(CoreCourseHelper.guessIsTeacher(this.courseId, this.course), false);

        this.dataLoaded = true;
    }

    /**
     * Get course data.
     */
    protected async getCourseData(): Promise<void> {
        this.canAccessCourse = false;
        this.useGuestAccess = false;

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
            // Ignore errors.
        }

        const courseByField = await CoreUtils.ignoreErrors(CoreCourses.getCourseByField('id', this.courseId));
        if (courseByField) {
            if (this.course) {
                this.course.customfields = courseByField.customfields;
                this.course.contacts = courseByField.contacts;
                this.course.displayname = courseByField.displayname;
                this.course.categoryname = courseByField.categoryname;
                this.course.overviewfiles = courseByField.overviewfiles;
            } else  {
                this.course = courseByField;
            }
        }

        await this.getEnrolmentInfo(courseByField?.enrollmentmethods);
    }

    /**
     * Get course enrolment info.
     *
     * @param enrolmentMethods Enrolment methods.
     */
    protected async getEnrolmentInfo(enrolmentMethods?: string[]): Promise<void> {
        if (this.isEnrolled) {
            return;
        }

        const enrolByType = await CoreEnrolHelper.getEnrolmentsByType(this.courseId, enrolmentMethods);

        this.hasBrowserEnrolments = enrolByType.hasBrowser;
        this.selfEnrolInstances = enrolByType.self;
        this.guestEnrolInstances = enrolByType.guest;

        if (!this.canAccessCourse) {
            // The user is not an admin/manager. Check if we can provide guest access to the course.
            const promises = this.guestEnrolInstances.map(async (method) => {
                const { canAccess } = await CoreEnrolDelegate.canAccess(method);
                if (canAccess) {
                    this.canAccessCourse = true;
                }
            });

            await Promise.all(promises);

            this.useGuestAccess = this.canAccessCourse;
        }
    }

    /**
     * Load the course menu handlers.
     *
     * @param refresh If it's refreshing content.
     * @returns Promise resolved when done.
     */
    protected async loadMenuHandlers(refresh?: boolean): Promise<void> {
        if (!this.course || !this.canAccessCourse) {
            return;
        }

        this.courseMenuHandlers =
            await CoreCourseOptionsDelegate.getMenuHandlersToDisplay(this.course, refresh, this.useGuestAccess);
    }

    /**
     * Validates if the user has access to the course and opens it.
     *
     * @param enrolMethod The enrolment method.
     * @param replaceCurrentPage If current place should be replaced in the navigation stack.
     */
    async validateAccessAndOpen(enrolMethod: CoreEnrolEnrolmentMethod, replaceCurrentPage: boolean): Promise<void> {
        if (!this.canAccessCourse || !this.course || this.isModal) {
            return;
        }

        let validated = false;
        try {
            validated = await CoreEnrolDelegate.validateAccess(enrolMethod);
        } catch {
            this.refreshData();

            return;
        }

        if (!validated) {
            return;
        }

        CoreCourseHelper.openCourse(this.course, { params: { isGuest: this.useGuestAccess }, replace: replaceCurrentPage });
    }

    /**
     * Open the course.
     *
     * @param replaceCurrentPage If current place should be replaced in the navigation stack.
     */
    async openCourse(replaceCurrentPage = false): Promise<void> {
        if (!this.canAccessCourse || !this.course || this.isModal) {
            return;
        }

        const hasAccess = await CoreCourseHelper.userHasAccessToCourse(this.courseId);
        if (!hasAccess && this.guestEnrolInstances.length) {
            if (this.guestEnrolInstances.length == 1) {
                this.validateAccessAndOpen(this.guestEnrolInstances[0], replaceCurrentPage);

                return;
            }

            const buttons: ActionSheetButton[] = this.guestEnrolInstances.map((enrolMethod) => ({
                text: enrolMethod.name,
                handler: (): void => {
                    this.validateAccessAndOpen(enrolMethod, replaceCurrentPage);
                },
            }));

            buttons.push({
                text: Translate.instant('core.cancel'),
                role: 'cancel',
            });

            this.actionSheet = await ActionSheetController.create({
                header:  Translate.instant('core.course.viewcourse'),
                buttons: buttons,
            });

            await this.actionSheet.present();

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
     * Self enrol in a course.
     *
     * @param enrolMethod The enrolment method.
     */
    async selfEnrolInCourse(enrolMethod: CoreEnrolEnrolmentMethod): Promise<void> {
        let enrolled = false;
        try {
            enrolled = await CoreEnrolDelegate.enrol(enrolMethod);
        } catch {
            this.refreshData();

            return;
        }

        if (!enrolled) {
            return;
        }

        // Refresh data.
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
    }

    /**
     * Refresh the data.
     *
     * @param refresher The refresher if this was triggered by a Pull To Refresh.
     */
    async refreshData(refresher?: HTMLIonRefresherElement): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourses.invalidateUserCourses());
        promises.push(CoreCourses.invalidateCourse(this.courseId));
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(this.courseId));
        promises.push(CoreCourses.invalidateCoursesByField('id', this.courseId));
        promises.push(CoreEnrol.invalidateCourseEnrolmentMethods(this.courseId));

        this.selfEnrolInstances.forEach((method) => {
            promises.push(CoreEnrolDelegate.invalidate(method));
        });

        this.guestEnrolInstances.forEach((method) => {
            promises.push(CoreEnrolDelegate.invalidate(method));
        });

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
     * Removes the course image set because it cannot be loaded and set the fallback icon color.
     */
    loadFallbackCourseIcon(): void {
        if (!this.course) {
            return;
        }

        this.course.courseimage = undefined;

        // Set the color because it won't be set at this point.
        this.setCourseColor();
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
        if (this.selfEnrolInstances.length == 1 && !this.hasBrowserEnrolments) {
            this.selfEnrolInCourse(this.selfEnrolInstances[0]);

            return;
        }

        if (this.selfEnrolInstances.length == 0 && this.hasBrowserEnrolments) {
            this.browserEnrol();

            return;
        }

        const buttons: ActionSheetButton[] = this.selfEnrolInstances.map((enrolMethod) => ({
            text: enrolMethod.name,
            handler: (): void => {
                this.selfEnrolInCourse(enrolMethod);
            },
        }));

        if (this.hasBrowserEnrolments) {
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
