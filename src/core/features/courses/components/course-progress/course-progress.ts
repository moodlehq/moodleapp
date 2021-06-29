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
import { CoreEventCourseStatusChanged, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourses, CoreCoursesProvider } from '@features/courses/services/courses';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { Translate } from '@singletons';
import { CoreConstants } from '@/core/constants';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions } from '../../services/courses-helper';
import { CoreCoursesCourseOptionsMenuComponent } from '../course-options-menu/course-options-menu';
import { CoreUser } from '@features/user/services/user';

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

    /**
     * Component being initialized.
     */
    ngOnInit(): void {

        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();

        if (this.downloadCourseEnabled) {
            this.initPrefetchCourse();
        }

        // This field is only available from 3.6 onwards.
        this.courseOptionMenuEnabled = this.showAll && typeof this.course.isfavourite != 'undefined';

        // Refresh the enabled flag if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            const wasEnabled = this.downloadCourseEnabled;

            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();

            if (!wasEnabled && this.downloadCourseEnabled) {
                // Download course is enabled now, initialize it.
                this.initPrefetchCourse();
            }
        }, CoreSites.getCurrentSiteId());
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
        }, CoreSites.getCurrentSiteId());

        // Determine course prefetch icon.
        const status = await CoreCourse.getCourseStatus(this.course.id);

        this.updateCourseStatus(status);

        if (this.prefetchCourseData.loading) {
            // Course is being downloaded. Get the download promise.
            const promise = CoreCourseHelper.getCourseDownloadPromise(this.course.id);
            if (promise) {
                // There is a download promise. If it fails, show an error.
                promise.catch((error) => {
                    if (!this.isDestroyed) {
                        CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                    }
                });
            } else {
                // No download, this probably means that the app was closed while downloading. Set previous status.
                CoreCourse.setCoursePreviousStatus(this.course.id);
            }
        }

    }

    /**
     * Open a course.
     */
    openCourse(): void {
        CoreCourseHelper.openCourse(this.course);
    }

    /**
     * Prefetch the course.
     *
     * @param e Click event.
     */
    async prefetchCourse(e?: Event): Promise<void> {
        e?.preventDefault();
        e?.stopPropagation();

        try {
            await CoreCourseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        }
    }

    /**
     * Delete the course.
     */
    async deleteCourse(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        try {
            await CoreCourseHelper.deleteCourseFiles(this.course.id);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
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
        const statusData = CoreCourseHelper.getCoursePrefetchStatusInfo(status);

        this.courseStatus = status;
        this.prefetchCourseData.status = statusData.status;
        this.prefetchCourseData.icon = statusData.icon;
        this.prefetchCourseData.statusTranslatable = statusData.statusTranslatable;
        this.prefetchCourseData.loading = statusData.loading;
    }

    /**
     * Show the context menu.
     *
     * @param e Click Event.
     */
    async showCourseOptionsMenu(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        const popoverData = await CoreDomUtils.openPopover<string>({
            component: CoreCoursesCourseOptionsMenuComponent,
            componentProps: {
                course: this.course,
                courseStatus: this.courseStatus,
                prefetch: this.prefetchCourseData,
            },
            event: e,
        });

        switch (popoverData) {
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

    /**
     * Hide/Unhide the course from the course list.
     *
     * @param hide True to hide and false to show.
     */
    protected async setCourseHidden(hide: boolean): Promise<void> {
        this.showSpinner = true;

        // We should use null to unset the preference.
        try {
            await CoreUser.updateUserPreference(
                'block_myoverview_hidden_course_' + this.course.id,
                hide ? '1' : undefined,
            );

            this.course.hidden = hide;
            CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {
                courseId: this.course.id,
                course: this.course,
                action: CoreCoursesProvider.ACTION_STATE_CHANGED,
                state: CoreCoursesProvider.STATE_HIDDEN,
                value: hide,
            }, CoreSites.getCurrentSiteId());

        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'Error changing course visibility.');
            }
        } finally {
            this.showSpinner = false;
        }
    }

    /**
     * Favourite/Unfavourite the course from the course list.
     *
     * @param favourite True to favourite and false to unfavourite.
     */
    protected async setCourseFavourite(favourite: boolean): Promise<void> {
        this.showSpinner = true;

        try {
            await CoreCourses.setFavouriteCourse(this.course.id, favourite);

            this.course.isfavourite = favourite;
            CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {
                courseId: this.course.id,
                course: this.course,
                action: CoreCoursesProvider.ACTION_STATE_CHANGED,
                state: CoreCoursesProvider.STATE_FAVOURITE,
                value: favourite,
            }, CoreSites.getCurrentSiteId());

        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'Error changing course favourite attribute.');
            }
        } finally {
            this.showSpinner = false;
        }
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
