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

import { Component, Input, OnInit, OnDestroy, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreCourseFormatDelegate } from '@core/course/providers/format-delegate';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';

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
    templateUrl: 'core-courses-course-progress.html'
})
export class CoreCoursesCourseProgressComponent implements OnInit, OnDestroy {
    @Input() course: any; // The course to render.

    isDownloading: boolean;
    prefetchCourseData = {
        prefetchCourseIcon: 'spinner',
        title: 'core.course.downloadcourse'
    };
    downloadCourseEnabled: boolean;

    protected isDestroyed = false;
    protected courseStatusObserver;
    protected siteUpdatedObserver;

    constructor(@Optional() private navCtrl: NavController, private courseHelper: CoreCourseHelperProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private domUtils: CoreDomUtilsProvider,
            private courseProvider: CoreCourseProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private coursesProvider: CoreCoursesProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();

        if (this.downloadCourseEnabled) {
            this.initPrefetchCourse();
        }

        // Refresh the enabled flag if site is updated.
        this.siteUpdatedObserver = this.eventsProvider.on(CoreEventsProvider.SITE_UPDATED, () => {
            const wasEnabled = this.downloadCourseEnabled;

            this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();

            if (!wasEnabled && this.downloadCourseEnabled) {
                // Download course is enabled now, initialize it.
                this.initPrefetchCourse();
            }
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Initialize prefetch course.
     */
    initPrefetchCourse(): void {
        if (typeof this.courseStatusObserver != 'undefined') {
            // Already initialized.
            return;
        }

        // Listen for status change in course.
        this.courseStatusObserver = this.eventsProvider.on(CoreEventsProvider.COURSE_STATUS_CHANGED, (data) => {
            if (data.courseId == this.course.id) {
                this.updateCourseStatus(data.status);
            }
        }, this.sitesProvider.getCurrentSiteId());

        // Determine course prefetch icon.
        this.courseHelper.getCourseStatusIconAndTitle(this.course.id).then((data) => {
            this.prefetchCourseData.prefetchCourseIcon = data.icon;
            this.prefetchCourseData.title = data.title;

            if (data.icon == 'spinner') {
                // Course is being downloaded. Get the download promise.
                const promise = this.courseHelper.getCourseDownloadPromise(this.course.id);
                if (promise) {
                    // There is a download promise. If it fails, show an error.
                    promise.catch((error) => {
                        if (!this.isDestroyed) {
                            this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                        }
                    });
                } else {
                    // No download, this probably means that the app was closed while downloading. Set previous status.
                    this.courseProvider.setCoursePreviousStatus(this.course.id);
                }
            }
        });

    }

    /**
     * Open a course.
     *
     * @param {any} course The course to open.
     */
    openCourse(course: any): void {
        this.courseFormatDelegate.openCourse(this.navCtrl, course);
    }

    /**
     * Prefetch the course.
     *
     * @param {Event} e Click event.
     */
    prefetchCourse(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.courseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course).catch((error) => {
            if (!this.isDestroyed) {
                this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        });
    }

    /**
     * Update the course status icon and title.
     *
     * @param {string} status Status to show.
     */
    protected updateCourseStatus(status: string): void {
        const statusData = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status);

        this.prefetchCourseData.prefetchCourseIcon = statusData.icon;
        this.prefetchCourseData.title = statusData.title;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        this.siteUpdatedObserver && this.siteUpdatedObserver.off();
        this.courseStatusObserver && this.courseStatusObserver.off();
    }
}
