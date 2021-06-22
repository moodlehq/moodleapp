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

import { Component, OnDestroy, NgZone, OnInit } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import {
    CoreCourseEnrolmentMethod,
    CoreCourseGetCoursesData,
    CoreCourses,
    CoreCourseSearchedData,
    CoreCoursesProvider,
    CoreEnrolledCourseData,
} from '@features/courses/services/courses';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { Translate } from '@singletons';
import { CoreConstants } from '@/core/constants';
import { CoreCoursesSelfEnrolPasswordComponent } from '../../../courses/components/self-enrol-password/self-enrol-password';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that allows "previewing" a course and enrolling in it if enabled and not enrolled.
 */
@Component({
    selector: 'page-core-course-preview',
    templateUrl: 'preview.html',
    styleUrls: ['preview.scss'],
})
export class CoreCoursePreviewPage implements OnInit, OnDestroy {

    course?: CoreCourseSearchedData;
    isEnrolled = false;
    canAccessCourse = true;
    selfEnrolInstances: CoreCourseEnrolmentMethod[] = [];
    paypalEnabled = false;
    dataLoaded = false;
    avoidOpenCourse = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: '',
        loading: true,
    };

    statusDownloaded = CoreConstants.DOWNLOADED;

    downloadCourseEnabled: boolean;
    courseUrl = '';
    courseImageUrl?: string;
    isMobile: boolean;

    protected isGuestEnabled = false;
    protected guestInstanceId?: number;
    protected enrolmentMethods: CoreCourseEnrolmentMethod[] = [];
    protected waitStart = 0;
    protected enrolUrl = '';
    protected paypalReturnUrl = '';
    protected pageDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;

    constructor(
        protected zone: NgZone,
    ) {
        this.isMobile = CoreApp.isMobile();
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();

        if (this.downloadCourseEnabled) {
            // Listen for status change in course.
            this.courseStatusObserver = CoreEvents.on(CoreEvents.COURSE_STATUS_CHANGED, (data) => {
                if (data.courseId == this.course!.id || data.courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
                    this.updateCourseStatus(data.status);
                }
            }, CoreSites.getCurrentSiteId());
        }
    }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        this.course = CoreNavigator.getRouteParam('course');
        this.avoidOpenCourse = !!CoreNavigator.getRouteBooleanParam('avoidOpenCourse');

        if (!this.course) {
            CoreNavigator.back();

            return;
        }

        const currentSite = CoreSites.getCurrentSite();
        const currentSiteUrl = currentSite && currentSite.getURL();

        this.paypalEnabled = this.course!.enrollmentmethods?.indexOf('paypal') > -1;
        this.enrolUrl = CoreTextUtils.concatenatePaths(currentSiteUrl!, 'enrol/index.php?id=' + this.course!.id);
        this.courseUrl = CoreTextUtils.concatenatePaths(currentSiteUrl!, 'course/view.php?id=' + this.course!.id);
        this.paypalReturnUrl = CoreTextUtils.concatenatePaths(currentSiteUrl!, 'enrol/paypal/return.php');
        if (this.course.overviewfiles.length > 0) {
            this.courseImageUrl = this.course.overviewfiles[0].fileurl;
        }

        try {
            await this.getCourse();
        } finally {
            if (this.downloadCourseEnabled) {

                // Determine course prefetch icon.
                this.prefetchCourseData = await CoreCourseHelper.getCourseStatusIconAndTitle(this.course!.id);

                if (this.prefetchCourseData.loading) {
                    // Course is being downloaded. Get the download promise.
                    const promise = CoreCourseHelper.getCourseDownloadPromise(this.course!.id);
                    if (promise) {
                        // There is a download promise. If it fails, show an error.
                        promise.catch((error) => {
                            if (!this.pageDestroyed) {
                                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                            }
                        });
                    } else {
                        // No download, this probably means that the app was closed while downloading. Set previous status.
                        CoreCourse.setCoursePreviousStatus(this.course!.id);
                    }
                }
            }
        }
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
     */
    protected async getCourse(): Promise<void> {
        // Get course enrolment methods.
        this.selfEnrolInstances = [];

        try {
            this.enrolmentMethods = await CoreCourses.getCourseEnrolmentMethods(this.course!.id);

            this.enrolmentMethods.forEach((method) => {
                if (method.type === 'self') {
                    this.selfEnrolInstances.push(method);
                } else if (method.type === 'guest') {
                    this.isGuestEnabled = true;
                }
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting enrolment data');
        }

        try {
            let course: CoreEnrolledCourseData | CoreCourseGetCoursesData;

            // Check if user is enrolled in the course.
            try {
                course = await CoreCourses.getUserCourse(this.course!.id);
                this.isEnrolled = true;
            } catch {
                // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
                this.isEnrolled = false;

                course = await CoreCourses.getCourse(this.course!.id);
            }

            // Success retrieving the course, we can assume the user has permissions to view it.
            this.course!.fullname = course.fullname || this.course!.fullname;
            this.course!.summary = course.summary || this.course!.summary;
            this.canAccessCourse = true;
        } catch {
            // The user is not an admin/manager. Check if we can provide guest access to the course.
            try {
                this.canAccessCourse = !(await this.canAccessAsGuest());
            } catch {
                this.canAccessCourse = false;
            }
        }

        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('3.7')) {
            try {
                const available = await CoreCourses.isGetCoursesByFieldAvailableInSite();
                if (available) {
                    const course = await CoreCourses.getCourseByField('id', this.course!.id);

                    this.course!.customfields = course.customfields;
                }
            } catch {
                // Ignore errors.
            }
        }

        this.dataLoaded = true;
    }

    /**
     * Open the course.
     */
    openCourse(): void {
        if (!this.canAccessCourse || this.avoidOpenCourse) {
            // Course cannot be opened or we are avoiding opening because we accessed from inside a course.
            return;
        }

        CoreCourseHelper.openCourse(this.course!);
    }

    /**
     * Enrol using PayPal.
     */
    async paypalEnrol(): Promise<void> {
        // We cannot control browser in browser.
        if (!this.isMobile || !CoreSites.getCurrentSite()) {
            return;
        }

        let hasReturnedFromPaypal = false;

        const urlLoaded = (event: InAppBrowserEvent): void => {
            if (event.url.indexOf(this.paypalReturnUrl) != -1) {
                hasReturnedFromPaypal = true;
            } else if (event.url.indexOf(this.courseUrl) != -1 && hasReturnedFromPaypal) {
                // User reached the course index page after returning from PayPal, close the InAppBrowser.
                inAppClosed();
                window.close();
            }
        };
        const inAppClosed = (): void => {
            // InAppBrowser closed, refresh data.
            unsubscribeAll();

            if (!this.dataLoaded) {
                return;
            }
            this.dataLoaded = false;
            this.refreshData();
        };
        const unsubscribeAll = (): void => {
            inAppLoadSubscription?.unsubscribe();
            inAppExitSubscription?.unsubscribe();
        };

        // Open the enrolment page in InAppBrowser.
        const window = await CoreSites.getCurrentSite()!.openInAppWithAutoLogin(this.enrolUrl);

        // Observe loaded pages in the InAppBrowser to check if the enrol process has ended.
        const inAppLoadSubscription = window.on('loadstart').subscribe((event) => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            this.zone.run(() => urlLoaded(event));
        });
        // Observe window closed.
        const inAppExitSubscription = window.on('exit').subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            this.zone.run(inAppClosed);
        });
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
            await CoreCourses.selfEnrol(this.course!.id, password, instanceId);

            // Close modal and refresh data.
            this.isEnrolled = true;
            this.dataLoaded = false;

            // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
            await this.waitForEnrolled(true);

            await this.refreshData().finally(() => {
                // My courses have been updated, trigger event.
                CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {
                    courseId: this.course!.id,
                    course: this.course,
                    action: CoreCoursesProvider.ACTION_ENROL,
                }, CoreSites.getCurrentSiteId());
            });

            this.openCourse();

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

                if (typeof modalData != 'undefined') {
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
        promises.push(CoreCourses.invalidateCourse(this.course!.id));
        promises.push(CoreCourses.invalidateCourseEnrolmentMethods(this.course!.id));
        promises.push(CoreCourseOptionsDelegate.clearAndInvalidateCoursesOptions(this.course!.id));
        if (CoreSites.getCurrentSite() && !CoreSites.getCurrentSite()!.isVersionGreaterEqualThan('3.7')) {
            promises.push(CoreCourses.invalidateCoursesByField('id', this.course!.id));
        }
        if (this.guestInstanceId) {
            promises.push(CoreCourses.invalidateCourseGuestEnrolmentInfo(this.guestInstanceId));
        }

        await Promise.all(promises).finally(() => this.getCourse()).finally(() => {
            refresher?.complete();
        });
    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: string): void {
        const statusData = CoreCourseHelper.getCoursePrefetchStatusInfo(status);

        this.prefetchCourseData.status = statusData.status;
        this.prefetchCourseData.icon = statusData.icon;
        this.prefetchCourseData.statusTranslatable = statusData.statusTranslatable;
        this.prefetchCourseData.loading = statusData.loading;
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
        try {
            CoreCourses.invalidateUserCourses();
        } catch {
            // Ignore errors.
        }

        try {
            await CoreCourses.getUserCourse(this.course!.id);
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
     * Prefetch the course.
     */
    prefetchCourse(): void {
        CoreCourseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course!).catch((error) => {
            if (!this.pageDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.pageDestroyed = true;

        if (this.courseStatusObserver) {
            this.courseStatusObserver.off();
        }
    }

}
