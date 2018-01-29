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

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreCourseFormatDelegate } from '../../../course/providers/format-delegate';
import { CoreCourseProvider } from '../../../course/providers/course';
import { CoreCourseHelperProvider } from '../../../course/providers/helper';

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
    templateUrl: 'course-progress.html'
})
export class CoreCoursesCourseProgressComponent implements OnInit, OnDestroy {
    @Input() course: any; // The course to render.

    isDownloading: boolean;
    prefetchCourseData = {
        prefetchCourseIcon: 'spinner'
    };

    protected isDestroyed = false;
    protected courseStatusObserver;

    constructor(private navCtrl: NavController, private courseHelper: CoreCourseHelperProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private domUtils: CoreDomUtilsProvider,
            private courseProvider: CoreCourseProvider, eventsProvider: CoreEventsProvider, sitesProvider: CoreSitesProvider) {
        // Listen for status change in course.
        this.courseStatusObserver = eventsProvider.on(CoreEventsProvider.COURSE_STATUS_CHANGED, (data) => {
            if (data.courseId == this.course.id) {
                this.prefetchCourseData.prefetchCourseIcon = this.courseHelper.getCourseStatusIconFromStatus(data.status);
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Determine course prefetch icon.
        this.courseHelper.getCourseStatusIcon(this.course.id).then((icon) => {
            this.prefetchCourseData.prefetchCourseIcon = icon;

            if (icon == 'spinner') {
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
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        if (this.courseStatusObserver) {
            this.courseStatusObserver.off();
        }
    }
}
