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

import { DownloadStatus } from '@/core/constants';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreQueueRunner } from '@classes/queue-runner';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreCourses, CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreSettingsHelper, CoreSiteSpaceUsage } from '@features/settings/services/settings-helper';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreLoadings } from '@services/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
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
    spaceUsage: CoreSiteSpaceUsage = {
        cacheEntries: 0,
        spaceUsage: 0,
    };

    courseStatusObserver?: CoreEventObserver;
    siteId: string;

    private downloadedCoursesQueue = new CoreQueueRunner();

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
    }

    /**
     * @inheritdoc
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

        const siteHomeEnabled = await CoreSiteHome.isAvailable(this.siteId);
        if (siteHomeEnabled) {
            const siteHomeId = CoreSites.getCurrentSiteHomeId();
            const size = await this.calculateDownloadedCourseSize(siteHomeId);
            if (size > 0) {
                const status = await CoreCourse.getCourseStatus(siteHomeId);

                downloadedCourses.push({
                    id: siteHomeId,
                    title: Translate.instant('core.sitehome.sitehome'),
                    totalSize: size,
                    isDownloading: status === DownloadStatus.DOWNLOADING,
                });
            }
        }

        await this.downloadedCoursesQueue.run(() => this.setDownloadedCourses(downloadedCourses));

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
     *
     * @param event Event Object.
     */
    async deleteCompletelyDownloadedCourses(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        try {
            await CoreDomUtils.showDeleteConfirm('addon.storagemanager.confirmdeletecourses');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreLoadings.show('core.deleting', true);
        const deletedCourseIds = this.completelyDownloadedCourses.map((course) => course.id);

        try {
            await Promise.all(deletedCourseIds.map((courseId) => CoreCourseHelper.deleteCourseFiles(courseId)));

            await this.downloadedCoursesQueue.run(async () => {
                await this.setDownloadedCourses(this.downloadedCourses.filter((course) => !deletedCourseIds.includes(course.id)));
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Delete course.
     *
     * @param event Event Object.
     * @param course Course to delete.
     */
    async deleteCourse(event: Event, course: DownloadedCourse): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        try {
            await CoreDomUtils.showDeleteConfirm(
                'addon.storagemanager.confirmdeletedatafrom',
                { name: course.title },
            );
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modal = await CoreLoadings.show('core.deleting', true);

        try {
            await CoreCourseHelper.deleteCourseFiles(course.id);

            await this.downloadedCoursesQueue.run(async () => {
                await this.setDownloadedCourses(CoreArray.withoutItem(this.downloadedCourses, course));
            });
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
    private async onCourseUpdated(courseId: number, status: DownloadStatus): Promise<void> {
        if (courseId == CoreCourseProvider.ALL_COURSES_CLEARED) {
            await this.downloadedCoursesQueue.run(() => this.setDownloadedCourses([]));

            return;
        }

        const course = this.downloadedCourses.find((course) => course.id === courseId);

        if (!course) {
            return;
        }

        course.isDownloading = status === DownloadStatus.DOWNLOADING;
        course.totalSize = await this.calculateDownloadedCourseSize(course.id);

        await this.downloadedCoursesQueue.run(() => this.setDownloadedCourses(this.downloadedCourses));
    }

    /**
     * Set downloaded courses data.
     *
     * @param courses Courses info.
     */
    private async setDownloadedCourses(courses: DownloadedCourse[]): Promise<void> {
        // Downloaded courses changed, update site usage too.
        this.spaceUsage = await CoreSettingsHelper.getSiteSpaceUsage(this.siteId);

        this.downloadedCourses = courses.sort((a, b) => b.totalSize - a.totalSize);
        this.completelyDownloadedCourses = courses.filter((course) => !course.isDownloading);
        this.totalSize = this.downloadedCourses.reduce((totalSize, course) => totalSize + course.totalSize, 0);
    }

    /**
     * Get downloaded course data.
     *
     * @param course Course.
     * @returns Course info.
     */
    private async getDownloadedCourse(course: CoreEnrolledCourseData): Promise<DownloadedCourse> {
        const totalSize = await this.calculateDownloadedCourseSize(course.id);
        const status = await CoreCourse.getCourseStatus(course.id);

        return {
            id: course.id,
            title: course.displayname || course.fullname,
            totalSize,
            isDownloading: status === DownloadStatus.DOWNLOADING,
        };
    }

    /**
     * Calculate the size of a downloaded course.
     *
     * @param courseId Downloaded course id.
     * @returns Promise to be resolved with the course size.
     */
    private async calculateDownloadedCourseSize(courseId: number): Promise<number> {
        const sections = await CoreCourse.getSections(courseId);
        const modules = CoreCourseHelper.getSectionsModules(sections);
        const promisedModuleSizes = modules.map(async (module) => {
            const size = await CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, courseId);

            return isNaN(size) ? 0 : size;
        });
        const moduleSizes = await Promise.all(promisedModuleSizes);

        return moduleSizes.reduce((totalSize, moduleSize) => totalSize + moduleSize, 0);
    }

    /**
     * Open course storage.
     *
     * @param courseId Course Id.
     */
    openCourse(courseId: number, title: string): void {
        CoreNavigator.navigateToSitePath('/storage/' + courseId, { params: { title } });
    }

    /**
     * Deletes files of a site and the tables that can be cleared.
     *
     * @param event Event Object.
     */
    async deleteSiteStorage(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        try {
            const site = CoreSites.getRequiredCurrentSite();
            const siteName = await site.getSiteName();

            this.spaceUsage = await CoreSettingsHelper.deleteSiteStorage(siteName, this.siteId);
        } catch {
            // Ignore cancelled confirmation modal.
        }
    }

}

/**
 * Downloaded course data.
 */
interface DownloadedCourse {
    id: number;
    title: string;
    totalSize: number;
    isDownloading: boolean;
}
