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

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { CoreEventCourseStatusChanged, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
// import { CoreUser } from '@core/user/services/user';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { Translate } from '@singletons';
import { CoreConstants } from '@/core/constants';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions } from '../../services/courses-helper';
import { CoreCoursesCourseOptionsMenuComponent } from '../course-options-menu/course-options-menu';

/**
 * This component is meant to display a course for a list of courses with progress.
 *
 * Example usage:
 *
 * <core-courses-course-progress [course]="course">
 * </core-courses-course-progress>
 */
@Component({
    selector: 'core-courses-course-progress',
    templateUrl: 'core-courses-course-progress.html',
    styleUrls: ['course-progress.scss'],
})
export class CoreCoursesCourseProgressComponent implements OnInit, OnDestroy {

    @Input() course!: CoreEnrolledCourseDataWithExtraInfoAndOptions; // The course to render.
    @Input() showAll = false; // If true, will show all actions, options, star and progress.
    @Input() showDownload = true; // If true, will show download button. Only works if the options menu is not shown.

    courseStatus = CoreConstants.NOT_DOWNLOADED;
    isDownloading = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: '',
        loading: true,
    };

    showSpinner = false;
    downloadCourseEnabled = false;
    courseOptionMenuEnabled = false;

    protected isDestroyed = false;
    protected courseStatusObserver?: CoreEventObserver;
    protected siteUpdatedObserver?: CoreEventObserver;

    constructor(
        protected popoverCtrl: PopoverController,
    ) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();

        if (this.downloadCourseEnabled) {
            this.initPrefetchCourse();
        }

        // This field is only available from 3.6 onwards.
        this.courseOptionMenuEnabled = this.showAll && typeof this.course.isfavourite != 'undefined';

        // Refresh the enabled flag if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            const wasEnabled = this.downloadCourseEnabled;

            this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();

            if (!wasEnabled && this.downloadCourseEnabled) {
                // Download course is enabled now, initialize it.
                this.initPrefetchCourse();
            }
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * Initialize prefetch course.
     */
    async initPrefetchCourse(): Promise<void> {
        if (typeof this.courseStatusObserver != 'undefined') {
            // Already initialized.
            return;
        }

        // Listen for status change in course.
        this.courseStatusObserver = CoreEvents.on(CoreEvents.COURSE_STATUS_CHANGED, (data: CoreEventCourseStatusChanged) => {
            if (data.courseId == this.course.id || data.courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
                this.updateCourseStatus(data.status);
            }
        }, CoreSites.instance.getCurrentSiteId());

        // Determine course prefetch icon.
        const status = await CoreCourse.instance.getCourseStatus(this.course.id);

        this.prefetchCourseData = CoreCourseHelper.instance.getCourseStatusIconAndTitleFromStatus(status);
        this.courseStatus = status;

        if (this.prefetchCourseData.loading) {
            // Course is being downloaded. Get the download promise.
            const promise = CoreCourseHelper.instance.getCourseDownloadPromise(this.course.id);
            if (promise) {
                // There is a download promise. If it fails, show an error.
                promise.catch((error) => {
                    if (!this.isDestroyed) {
                        CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                    }
                });
            } else {
                // No download, this probably means that the app was closed while downloading. Set previous status.
                CoreCourse.instance.setCoursePreviousStatus(this.course.id);
            }
        }

    }

    /**
     * Open a course.
     */
    openCourse(): void {
        CoreCourseHelper.instance.openCourse(this.course);
    }

    /**
     * Prefetch the course.
     *
     * @param e Click event.
     */
    prefetchCourse(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        /* @ todo try {
            CoreCourseHelper.instance.confirmAndPrefetchCourse(this.prefetchCourseData, this.course);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        }*/
    }

    /**
     * Delete the course.
     */
    async deleteCourse(): Promise<void> {
        try {
            await CoreDomUtils.instance.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (CoreDomUtils.instance.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreDomUtils.instance.showModalLoading();

        try {
            await CoreCourseHelper.instance.deleteCourseFiles(this.course.id);
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, Translate.instance.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: string): void {
        this.prefetchCourseData = CoreCourseHelper.instance.getCourseStatusIconAndTitleFromStatus(status);

        this.courseStatus = status;
    }

    /**
     * Show the context menu.
     *
     * @param e Click Event.
     * @todo
     */
    async showCourseOptionsMenu(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const popover = await this.popoverCtrl.create({
            component: CoreCoursesCourseOptionsMenuComponent,
            componentProps: {
                course: this.course,
                courseStatus: this.courseStatus,
                prefetch: this.prefetchCourseData,
            },
            event: e,
        });
        await popover.present();

        const action = await popover.onDidDismiss<string>();

        if (action.data) {
            switch (action.data) {
                case 'download':
                    if (!this.prefetchCourseData.loading) {
                        this.prefetchCourse(e);
                    }
                    break;
                case 'delete':
                    if (this.courseStatus == 'downloaded' || this.courseStatus == 'outdated') {
                        this.deleteCourse();
                    }
                    break;
                case 'hide':
                    this.setCourseHidden(true);
                    break;
                case 'show':
                    this.setCourseHidden(false);
                    break;
                case 'favourite':
                    this.setCourseFavourite(true);
                    break;
                case 'unfavourite':
                    this.setCourseFavourite(false);
                    break;
                default:
                    break;
            }
        }

    }

    /**
     * Hide/Unhide the course from the course list.
     *
     * @param hide True to hide and false to show.
     * @todo CoreUser
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected setCourseHidden(hide: boolean): void {
        return;
    }

    /**
     * Favourite/Unfavourite the course from the course list.
     *
     * @param favourite True to favourite and false to unfavourite.
     * @todo CoreUser
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected setCourseFavourite(favourite: boolean): void {
        return;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.siteUpdatedObserver?.off();
        this.courseStatusObserver?.off();
    }

}
