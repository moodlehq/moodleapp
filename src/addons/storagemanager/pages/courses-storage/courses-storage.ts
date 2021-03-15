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

import { CoreConstants } from '@/core/constants';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreArray } from '@singletons/array';
import { CoreEventObserver, CoreEvents } from '@singletons/events';

/**
 * Page that displays downloaded courses and allows the user to delete them.
 */
@Component({
    selector: 'page-addon-storagemanager-courses-storage',
    templateUrl: 'courses-storage.html',
    styleUrls: ['courses-storage.scss'],
})
export class AddonStorageManagerCoursesStoragePage implements OnInit, OnDestroy {

    userCourses: CoreEnrolledCourseData[] = [];
    downloadedCourses: DownloadedCourse[] = [];
    completelyDownloadedCourses: DownloadedCourse[] = [];
    totalSize = 0;
    loaded = false;

    courseStatusObserver?: CoreEventObserver;

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        this.userCourses = await CoreCourses.getUserCourses();
        this.courseStatusObserver = CoreEvents.on(
            CoreEvents.COURSE_STATUS_CHANGED,
            ({ courseId, status }) => this.onCourseUpdated(courseId, status),
        );

        const downloadedCourseIds = await CoreCourse.getDownloadedCourseIds();
        const downloadedCourses = await Promise.all(
            this.userCourses
                .filter((course) => downloadedCourseIds.indexOf(course.id) !== -1)
                .map((course) => this.getDownloadedCourse(course)),
        );

        this.setDownloadedCourses(downloadedCourses);

        this.loaded = true;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.courseStatusObserver?.off();
    }

    /**
     * Delete all courses that have been downloaded.
     */
    async deleteCompletelyDownloadedCourses(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreDomUtils.showModalLoading();
        const deletedCourseIds = this.completelyDownloadedCourses.map((course) => course.id);

        try {
            await Promise.all(deletedCourseIds.map((courseId) => CoreCourseHelper.deleteCourseFiles(courseId)));

            this.setDownloadedCourses(this.downloadedCourses.filter((course) => !CoreArray.contains(deletedCourseIds, course.id)));
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Delete course.
     *
     * @param course Course to delete.
     */
    async deleteCourse(course: DownloadedCourse): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        try {
            await CoreCourseHelper.deleteCourseFiles(course.id);

            this.setDownloadedCourses(CoreArray.withoutItem(this.downloadedCourses, course));
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Handle course updated event.
     *
     * @param courseId Updated course id.
     */
    private async onCourseUpdated(courseId: number, status: string): Promise<void> {
        if (courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
            this.setDownloadedCourses([]);

            return;
        }

        const course = this.downloadedCourses.find((course) => course.id === courseId);

        if (!course) {
            return;
        }

        course.isDownloading = status === CoreConstants.DOWNLOADING;
        course.totalSize = await this.calculateDownloadedCourseSize(course.id);

        this.setDownloadedCourses(this.downloadedCourses);
    }

    /**
     * Set downloaded courses data.
     *
     * @param courses Courses info.
     */
    private setDownloadedCourses(courses: DownloadedCourse[]): void {
        this.downloadedCourses = courses.sort((a, b) => b.totalSize - a.totalSize);
        this.completelyDownloadedCourses = courses.filter((course) => !course.isDownloading);
        this.totalSize = this.downloadedCourses.reduce((totalSize, course) => totalSize + course.totalSize, 0);
    }

    /**
     * Get downloaded course data.
     *
     * @param course Course.
     * @return Course info.
     */
    private async getDownloadedCourse(course: CoreEnrolledCourseData): Promise<DownloadedCourse> {
        const totalSize = await this.calculateDownloadedCourseSize(course.id);
        const status = await CoreCourse.getCourseStatus(course.id);

        return {
            ...course,
            totalSize,
            isDownloading: status === CoreConstants.DOWNLOADING,
        };
    }

    /**
     * Calculate the size of a downloaded course.
     *
     * @param courseId Downloaded course id.
     * @return Promise to be resolved with the course size.
     */
    private async calculateDownloadedCourseSize(courseId: number): Promise<number> {
        const sections = await CoreCourse.getSections(courseId);
        const modules = CoreArray.flatten(sections.map((section) => section.modules));
        const promisedModuleSizes = modules.map(async (module) => {
            const size = await CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, courseId);

            return isNaN(size) ? 0 : size;
        });
        const moduleSizes = await Promise.all(promisedModuleSizes);

        return moduleSizes.reduce((totalSize, moduleSize) => totalSize + moduleSize, 0);
    }

}

/**
 * Downloaded course data.
 */
interface DownloadedCourse extends CoreEnrolledCourseData {
    totalSize: number;
    isDownloading: boolean;
}
