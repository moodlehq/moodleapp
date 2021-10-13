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

import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { CoreCourseProvider, CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CorePrefetchStatusInfo } from '@features/course/services/course-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreEventCourseStatusChanged, CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseListItem, CoreCourses } from '../../services/courses';
import { CoreCoursesHelper } from '../../services/courses-helper';

/**
 * This directive is meant to display an item for a list of courses.
 *
 * Example usage:
 *
 * <core-courses-course-list-item [course]="course"></core-courses-course-list-item>
 */
@Component({
    selector: 'core-courses-course-list-item',
    templateUrl: 'core-courses-course-list-item.html',
    styleUrls: ['course-list-item.scss'],
})
export class CoreCoursesCourseListItemComponent implements OnInit, OnDestroy, OnChanges {

    @Input() course!: CoreCourseListItem; // The course to render.

    @Input() showDownload = false; // If true, will show download button.

    icons: CoreCoursesEnrolmentIcons[] = [];
    isEnrolled = false;
    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: '',
        statusTranslatable: 'core.loading',
        status: '',
        loading: true,
    };

    protected courseStatusObserver?: CoreEventObserver;
    protected isDestroyed = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        CoreCoursesHelper.loadCourseColorAndImage(this.course);

        this.isEnrolled = this.course.progress !== undefined;

        if (!this.isEnrolled) {
            try {
                const course = await CoreCourses.getUserCourse(this.course.id);
                this.course.progress = course.progress;
                this.course.completionusertracked = course.completionusertracked;

                this.isEnrolled = true;

                if (this.showDownload) {
                    this.initPrefetchCourse();
                }
            } catch {
                this.isEnrolled = false;
            }
        }

        if (!this.isEnrolled) {
            this.icons = [];

            this.course.enrollmentmethods.forEach((instance) => {
                if (instance === 'self') {
                    this.icons.push({
                        label: 'core.courses.selfenrolment',
                        icon: 'fas-key',
                    });
                } else if (instance === 'guest') {
                    this.icons.push({
                        label: 'core.courses.allowguests',
                        icon: 'fas-unlock',
                    });
                } else if (instance === 'paypal') {
                    this.icons.push({
                        label: 'core.courses.paypalaccepted',
                        icon: 'fab-paypal',
                    });
                }
            });

            if (this.icons.length == 0) {
                this.icons.push({
                    label: 'core.courses.notenrollable',
                    icon: 'fas-lock',
                });
            }
        }
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        if (this.showDownload && this.isEnrolled) {
            this.initPrefetchCourse();
        }
    }

    /**
     * Open a course.
     *
     * @param course The course to open.
     */
    openCourse(): void {
        if (this.isEnrolled) {
            CoreCourseHelper.openCourse(this.course);
        } else {
            CoreNavigator.navigateToSitePath(
                '/course/' + this.course.id + '/preview',
                { params: { course: this.course } },
            );
        }
    }

    /**
     * Initialize prefetch course.
     */
    async initPrefetchCourse(): Promise<void> {
        if (this.courseStatusObserver !== undefined) {
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
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.courseStatusObserver?.off();
    }

}

/**
 * Enrolment icons to show on the list with a label.
 */
export type CoreCoursesEnrolmentIcons = {
    label: string;
    icon: string;
};
