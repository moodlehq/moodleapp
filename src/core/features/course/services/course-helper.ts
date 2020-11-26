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

import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { CoreSites } from '@services/sites';
import { CoreCourse, CoreCourseSection } from './course';
import { CoreConstants } from '@/core/constants';
import { CoreLogger } from '@singletons/logger';
import { makeSingleton, Translate } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import {
    CoreCourseBasicData,
    CoreCourseGetCoursesData,
    CoreCourses,
    CoreCourseSearchedData,
    CoreEnrolledCourseBasicData,
    CoreEnrolledCourseData,
} from '@features/courses/services/courses';
import { CoreEnrolledCourseDataWithExtraInfoAndOptions } from '@features/courses/services/courses-helper';
import { CoreArray } from '@singletons/array';
import { CoreLoginHelper, CoreLoginHelperProvider } from '@features/login/services/login-helper';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreCourseOffline } from './course-offline';

/**
 * Prefetch info of a module.
 */
export type CoreCourseModulePrefetchInfo = {
    /**
     * Downloaded size.
     */
    size?: number;

    /**
     * Downloadable size in a readable format.
     */
    sizeReadable?: string;

    /**
     * Module status.
     */
    status?: string;

    /**
     * Icon's name of the module status.
     */
    statusIcon?: string;

    /**
     * Time when the module was last downloaded.
     */
    downloadTime?: number;

    /**
     * Download time in a readable format.
     */
    downloadTimeReadable?: string;
};

/**
 * Progress of downloading a list of courses.
 */
export type CoreCourseCoursesProgress = {
    /**
     * Number of courses downloaded so far.
     */
    count: number;

    /**
     * Toal of courses to download.
     */
    total: number;

    /**
     * Whether the download has been successful so far.
     */
    success: boolean;

    /**
     * Last downloaded course.
     */
    courseId?: number;
};

export type CorePrefetchStatusInfo = {
    status: string; // Status of the prefetch.
    statusTranslatable: string; // Status translatable string.
    icon: string; // Icon based on the status.
    loading: boolean; // If it's a loading status.
    badge?: string; // Progress badge string if any.
};

/**
 * Helper to gather some common course functions.
 */
@Injectable({
    providedIn: 'root',
})
export class CoreCourseHelperProvider {

    protected courseDwnPromises: { [s: string]: { [id: number]: Promise<void> } } = {};
    protected logger: CoreLogger;

    constructor() {

        this.logger = CoreLogger.getInstance('CoreCourseHelperProvider');
    }

    /**
     * This function treats every module on the sections provided to load the handler data, treat completion
     * and navigate to a module page if required. It also returns if sections has content.
     *
     * @param sections List of sections to treat modules.
     * @param courseId Course ID of the modules.
     * @param completionStatus List of completion status.
     * @param courseName Course name. Recommended if completionStatus is supplied.
     * @param forCoursePage Whether the data will be used to render the course page.
     * @return Whether the sections have content.
     */
    addHandlerDataForModules(): void {
        // @todo params and logic
    }

    /**
     * Calculate the status of a section.
     *
     * @param section Section to calculate its status. It can't be "All sections".
     * @param courseId Course ID the section belongs to.
     * @param refresh True if it shouldn't use module status cache (slower).
     * @param checkUpdates Whether to use the WS to check updates. Defaults to true.
     * @return Promise resolved when the status is calculated.
     */
    calculateSectionStatus(): void {
        // @todo params and logic
    }

    /**
     * Calculate the status of a list of sections, setting attributes to determine the icons/data to be shown.
     *
     * @param sections Sections to calculate their status.
     * @param courseId Course ID the sections belong to.
     * @param refresh True if it shouldn't use module status cache (slower).
     * @param checkUpdates Whether to use the WS to check updates. Defaults to true.
     * @return Promise resolved when the states are calculated.
     */
    calculateSectionsStatus(): void {
        // @todo params and logic
    }

    /**
     * Show a confirm and prefetch a course. It will retrieve the sections and the course options if not provided.
     * This function will set the icon to "spinner" when starting and it will also set it back to the initial icon if the
     * user cancels. All the other updates of the icon should be made when CoreEvents.COURSE_STATUS_CHANGED is received.
     *
     * @param data An object where to store the course icon and title: "prefetchCourseIcon", "title" and "downloadSucceeded".
     * @param course Course to prefetch.
     * @param sections List of course sections.
     * @param courseHandlers List of course handlers.
     * @param menuHandlers List of course menu handlers.
     * @return Promise resolved when the download finishes, rejected if an error occurs or the user cancels.
     */
    confirmAndPrefetchCourse(): void {
        // @todo params and logic
    }

    /**
     * Confirm and prefetches a list of courses.
     *
     * @param courses List of courses to download.
     * @param onProgress Function to call everytime a course is downloaded.
     * @return Resolved when downloaded, rejected if error or canceled.
     */
    async confirmAndPrefetchCourses(
        courses: CoreEnrolledCourseDataWithExtraInfoAndOptions[],
        onProgress?: (data: CoreCourseCoursesProgress) => void,
    ): Promise<void> {
        const siteId = CoreSites.instance.getCurrentSiteId();

        // Confirm the download without checking size because it could take a while.
        await CoreDomUtils.instance.showConfirm(Translate.instance.instant('core.areyousure'));

        const total = courses.length;
        let count = 0;

        const promises = courses.map((course) => {
            const subPromises: Promise<void>[] = [];
            let sections: CoreCourseSection[];
            let handlers: any;
            let menuHandlers: any;
            let success = true;

            // Get the sections and the handlers.
            subPromises.push(CoreCourse.instance.getSections(course.id, false, true).then((courseSections) => {
                sections = courseSections;

                return;
            }));

            /**
             * @todo
            subPromises.push(this.courseOptionsDelegate.getHandlersToDisplay(this.injector, course).then((cHandlers: any) => {
                handlers = cHandlers;
            }));
            subPromises.push(this.courseOptionsDelegate.getMenuHandlersToDisplay(this.injector, course).then((mHandlers: any) => {
                menuHandlers = mHandlers;
            }));
             */

            return Promise.all(subPromises).then(() => this.prefetchCourse(course, sections, handlers, menuHandlers, siteId))
                .catch((error) => {
                    success = false;

                    throw error;
                }).finally(() => {
                // Course downloaded or failed, notify the progress.
                    count++;
                    if (onProgress) {
                        onProgress({ count: count, total: total, courseId: course.id, success: success });
                    }
                });
        });

        if (onProgress) {
            // Notify the start of the download.
            onProgress({ count: 0, total: total, success: true });
        }

        return CoreUtils.instance.allPromises(promises);
    }

    /**
     * Show confirmation dialog and then remove a module files.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     * @param done Function to call when done. It will close the context menu.
     * @return Promise resolved when done.
     * @todo module type.
     */
    async confirmAndRemoveFiles(module: any, courseId: number, done?: () => void): Promise<void> {
        let modal: CoreIonLoadingElement | undefined;

        try {

            await CoreDomUtils.instance.showDeleteConfirm('core.course.confirmdeletestoreddata');

            modal = await CoreDomUtils.instance.showModalLoading();

            await this.removeModuleStoredData(module, courseId);

            done && done();

        } catch (error) {
            if (error) {
                CoreDomUtils.instance.showErrorModal(error);
            }
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Calculate the size to download a section and show a confirm modal if needed.
     *
     * @param courseId Course ID the section belongs to.
     * @param section Section. If not provided, all sections.
     * @param sections List of sections. Used when downloading all the sections.
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     * @return Promise resolved if the user confirms or there's no need to confirm.
     */
    confirmDownloadSizeSection(): void {
        // @todo params and logic
    }

    /**
     * Helper function to prefetch a module, showing a confirmation modal if the size is big.
     * This function is meant to be called from a context menu option. It will also modify some data like the prefetch icon.
     *
     * @param instance The component instance that has the context menu. It should have prefetchStatusIcon and isDestroyed.
     * @param module Module to be prefetched
     * @param courseId Course ID the module belongs to.
     * @param done Function to call when done. It will close the context menu.
     * @return Promise resolved when done.
     */
    contextMenuPrefetch(): void {
        // @todo params and logic
    }

    /**
     * Determine the status of a list of courses.
     *
     * @param courses Courses
     * @return Promise resolved with the status.
     */
    async determineCoursesStatus(courses: CoreCourseBasicData[]): Promise<string> {
        // Get the status of each course.
        const promises: Promise<string>[] = [];
        const siteId = CoreSites.instance.getCurrentSiteId();

        courses.forEach((course) => {
            promises.push(CoreCourse.instance.getCourseStatus(course.id, siteId));
        });

        const statuses = await Promise.all(promises);

        // Now determine the status of the whole list.
        let status = statuses[0];
        const filepool = CoreFilepool.instance;
        for (let i = 1; i < statuses.length; i++) {
            status = filepool.determinePackagesStatus(status, statuses[i]);
        }

        return status;
    }

    /**
     * Convenience function to open a module main file, downloading the package if needed.
     * This is meant for modules like mod_resource.
     *
     * @param module The module to download.
     * @param courseId The course ID of the module.
     * @param component The component to link the files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param files List of files of the module. If not provided, use module.contents.
     * @param siteId The site ID. If not defined, current site.
     * @return Resolved on success.
     */
    downloadModuleAndOpenFile(): void {
        // @todo params and logic
    }

    /**
     * Convenience function to download a module that has a main file and return the local file's path and other info.
     * This is meant for modules like mod_resource.
     *
     * @param module The module to download.
     * @param courseId The course ID of the module.
     * @param component The component to link the files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param files List of files of the module. If not provided, use module.contents.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    downloadModuleWithMainFileIfNeeded(): void {
        // @todo params and logic
    }

    /**
     * Convenience function to download a module that has a main file and return the local file's path and other info.
     * This is meant for modules like mod_resource.
     *
     * @param module The module to download.
     * @param courseId The course ID of the module.
     * @param fixedUrl Main file's fixed URL.
     * @param files List of files of the module.
     * @param status The package status.
     * @param component The component to link the files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    protected downloadModuleWithMainFile(): void {
        // @todo params and logic
    }

    /**
     * Convenience function to download a module.
     *
     * @param module The module to download.
     * @param courseId The course ID of the module.
     * @param component The component to link the files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param files List of files of the module. If not provided, use module.contents.
     * @param siteId The site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    downloadModule(): void {
        // @todo params and logic
    }

    /**
     * Fill the Context Menu for a certain module.
     *
     * @param instance The component instance that has the context menu.
     * @param module Module to be prefetched
     * @param courseId Course ID the module belongs to.
     * @param invalidateCache Invalidates the cache first.
     * @param component Component of the module.
     * @return Promise resolved when done.
     */
    fillContextMenu(): void {
        // @todo params and logic
    }

    /**
     * Get a course. It will first check the user courses, and fallback to another WS if not enrolled.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the course.
     */
    async getCourse(
        courseId: number,
        siteId?: string,
    ): Promise<{ enrolled: boolean; course: CoreEnrolledCourseData | CoreCourseSearchedData | CoreCourseGetCoursesData }> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        let course: CoreEnrolledCourseData | CoreCourseSearchedData | CoreCourseGetCoursesData;

        // Try with enrolled courses first.
        try {
            course = await CoreCourses.instance.getUserCourse(courseId, false, siteId);

            return ({ enrolled: true, course: course });
        } catch {
            // Not enrolled or an error happened. Try to use another WebService.
        }

        const available = await CoreCourses.instance.isGetCoursesByFieldAvailableInSite(siteId);

        if (available) {
            course = await CoreCourses.instance.getCourseByField('id', courseId, siteId);
        } else {
            course = await CoreCourses.instance.getCourse(courseId, siteId);
        }

        return ({ enrolled: false, course: course });
    }

    /**
     * Get a course, wait for any course format plugin to load, and open the course page. It basically chains the functions
     * getCourse and openCourse.
     *
     * @param courseId Course ID.
     * @param params Other params to pass to the course page.
     * @param siteId Site ID. If not defined, current site.
     */
    async getAndOpenCourse(courseId: number, params?: Params, siteId?: string): Promise<any> {
        const modal = await CoreDomUtils.instance.showModalLoading();

        let course: CoreEnrolledCourseData | CoreCourseSearchedData | CoreCourseGetCoursesData | { id: number };

        try {
            const data = await this.getCourse(courseId, siteId);

            course = data.course;
        } catch {
            // Cannot get course, return a "fake".
            course = { id: courseId };
        }

        modal?.dismiss();

        return this.openCourse(course, params, siteId);
    }

    /**
     * Check if the course has a block with that name.
     *
     * @param courseId Course ID.
     * @param name Block name to search.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if the block exists or false otherwise.
     * @since 3.3
     */
    async hasABlockNamed(courseId: number, name: string, siteId?: string): Promise<boolean> {
        try {
            const blocks = await CoreCourse.instance.getCourseBlocks(courseId, siteId);

            return blocks.some((block) => block.name == name);
        } catch {
            return false;
        }
    }

    /**
     * Initialize the prefetch icon for selected courses.
     *
     * @param courses Courses array to get info from.
     * @param prefetch Prefetch information.
     * @param minCourses Min course to show icon.
     * @return Resolved with the prefetch information updated when done.
     */
    async initPrefetchCoursesIcons(
        courses: CoreCourseBasicData[],
        prefetch: CorePrefetchStatusInfo,
        minCourses: number = 2,
    ): Promise<CorePrefetchStatusInfo> {
        if (!courses || courses.length < minCourses) {
            // Not enough courses.
            prefetch.icon = '';

            return prefetch;
        }

        const status = await this.determineCoursesStatus(courses);

        prefetch = this.getCourseStatusIconAndTitleFromStatus(status);

        if (prefetch.loading) {
            // It seems all courses are being downloaded, show a download button instead.
            prefetch.icon = CoreConstants.NOT_DOWNLOADED_ICON;
        }

        return prefetch;
    }

    /**
     * Load offline completion into a list of sections.
     * This should be used in 3.6 sites or higher, where the course contents already include the completion.
     *
     * @param courseId The course to get the completion.
     * @param sections List of sections of the course.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    async loadOfflineCompletion(courseId: number, sections: any[], siteId?: string): Promise<void> {
        const offlineCompletions = await CoreCourseOffline.instance.getCourseManualCompletions(courseId, siteId);

        if (!offlineCompletions || !offlineCompletions.length) {
            // No offline completion.
            return;
        }

        const totalOffline = offlineCompletions.length;
        let loaded = 0;
        const offlineCompletionsMap = CoreUtils.instance.arrayToObject(offlineCompletions, 'cmid');
        // Load the offline data in the modules.
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (!section.modules || !section.modules.length) {
                // Section has no modules, ignore it.
                continue;
            }

            for (let j = 0; j < section.modules.length; j++) {
                const module = section.modules[j];
                const offlineCompletion = offlineCompletionsMap[module.id];

                if (offlineCompletion && typeof module.completiondata != 'undefined' &&
                    offlineCompletion.timecompleted >= module.completiondata.timecompleted * 1000) {
                    // The module has offline completion. Load it.
                    module.completiondata.state = offlineCompletion.completed;
                    module.completiondata.offline = true;

                    // If all completions have been loaded, stop.
                    loaded++;
                    if (loaded == totalOffline) {
                        break;
                    }
                }
            }
        }
    }

    /**
     * Prefetch all the courses in the array.
     *
     * @param courses Courses array to prefetch.
     * @param prefetch Prefetch information to be updated.
     * @return Promise resolved when done.
     */
    async prefetchCourses(
        courses: CoreEnrolledCourseDataWithExtraInfoAndOptions[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<void> {
        prefetch.loading = true;
        prefetch.icon = CoreConstants.DOWNLOADING_ICON;
        prefetch.badge = '';

        try {
            await this.confirmAndPrefetchCourses(courses, (progress) => {
                prefetch.badge = progress.count + ' / ' + progress.total;
            });
            prefetch.icon = CoreConstants.OUTDATED_ICON;
        } finally {
            prefetch.loading = false;
            prefetch.badge = '';
        }
    }

    /**
     * Get a course download promise (if any).
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Download promise, undefined if not found.
     */
    getCourseDownloadPromise(courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        return this.courseDwnPromises[siteId] && this.courseDwnPromises[siteId][courseId];
    }

    /**
     * Get a course status icon and the langkey to use as a title.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the icon name and the title key.
     */
    async getCourseStatusIconAndTitle(courseId: number, siteId?: string): Promise<CorePrefetchStatusInfo> {
        const status = await CoreCourse.instance.getCourseStatus(courseId, siteId);

        return this.getCourseStatusIconAndTitleFromStatus(status);
    }

    /**
     * Get a course status icon and the langkey to use as a title from status.
     *
     * @param status Course status.
     * @return Title and icon name.
     */
    getCourseStatusIconAndTitleFromStatus(status: string): CorePrefetchStatusInfo {
        const prefetchStatus: CorePrefetchStatusInfo = {
            status: status,
            icon: this.getPrefetchStatusIcon(status, false),
            statusTranslatable: '',
            loading: false,
        };

        if (status == CoreConstants.DOWNLOADED) {
            // Always show refresh icon, we cannot know if there's anything new in course options.
            prefetchStatus.statusTranslatable = 'core.course.refreshcourse';
        } else if (status == CoreConstants.DOWNLOADING) {
            prefetchStatus.statusTranslatable = 'core.downloading';
            prefetchStatus.loading = true;
        } else {
            prefetchStatus.statusTranslatable = 'core.course.downloadcourse';
        }

        return prefetchStatus;
    }

    /**
     * Get the icon given the status and if trust the download status.
     *
     * @param status Status constant.
     * @param trustDownload True to show download success, false to show an outdated status when downloaded.
     * @return Icon name.
     */
    getPrefetchStatusIcon(status: string, trustDownload: boolean = false): string {
        if (status == CoreConstants.NOT_DOWNLOADED) {
            return CoreConstants.NOT_DOWNLOADED_ICON;
        }
        if (status == CoreConstants.OUTDATED || (status == CoreConstants.DOWNLOADED && !trustDownload)) {
            return CoreConstants.OUTDATED_ICON;
        }
        if (status == CoreConstants.DOWNLOADED && trustDownload) {
            return CoreConstants.DOWNLOADED_ICON;
        }
        if (status == CoreConstants.DOWNLOADING) {
            return CoreConstants.DOWNLOADING_ICON;
        }

        return CoreConstants.DOWNLOADING_ICON;
    }

    /**
     * Get the course ID from a module instance ID, showing an error message if it can't be retrieved.
     *
     * @param id Instance ID.
     * @param module Name of the module. E.g. 'glossary'.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the module's course ID.
     * @todo module type.
     */
    async getModuleCourseIdByInstance(id: number, module: any, siteId?: string): Promise<number> {
        try {
            const cm = await CoreCourse.instance.getModuleBasicInfoByInstance(id, module, siteId);

            return cm.course;
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.errorgetmodule', true);

            throw error;
        }
    }

    /**
     * Get prefetch info for a module.
     *
     * @param module Module to get the info from.
     * @param courseId Course ID the section belongs to.
     * @param invalidateCache Invalidates the cache first.
     * @param component Component of the module.
     * @return Promise resolved with the info.
     */
    getModulePrefetchInfo(): void {
        // @todo params and logic
    }

    /**
     * Get the download ID of a section. It's used to interact with CoreCourseModulePrefetchDelegate.
     *
     * @param section Section.
     * @return Section download ID.
     * @todo section type.
     */
    getSectionDownloadId(section: any): string {
        return 'Section-' + section.id;
    }

    /**
     * Navigate to a module using instance ID and module name.
     *
     * @param instanceId Activity instance ID.
     * @param modName Module name of the activity.
     * @param siteId Site ID. If not defined, current site.
     * @param courseId Course ID. If not defined we'll try to retrieve it from the site.
     * @param sectionId Section the module belongs to. If not defined we'll try to retrieve it from the site.
     * @param useModNameToGetModule If true, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                              number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @param modParams Params to pass to the module
     * @param navCtrl NavController for adding new pages to the current history. Optional for legacy support, but
     *                generates a warning if omitted.
     * @return Promise resolved when done.
     */
    navigateToModuleByInstance(): void {
        // @todo params and logic
    }

    /**
     * Navigate to a module.
     *
     * @param moduleId Module's ID.
     * @param siteId Site ID. If not defined, current site.
     * @param courseId Course ID. If not defined we'll try to retrieve it from the site.
     * @param sectionId Section the module belongs to. If not defined we'll try to retrieve it from the site.
     * @param modName If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @param modParams Params to pass to the module
     * @param navCtrl NavController for adding new pages to the current history. Optional for legacy support, but
     *                generates a warning if omitted.
     * @return Promise resolved when done.
     */
    navigateToModule(): void {
        // @todo params and logic
    }

    /**
     * Open a module.
     *
     * @param navCtrl The NavController to use.
     * @param module The module to open.
     * @param courseId The course ID of the module.
     * @param sectionId The section ID of the module.
     * @param modParams Params to pass to the module
     * @param True if module can be opened, false otherwise.
     */
    openModule(): void {
        // @todo params and logic
    }

    /**
     * Prefetch all the activities in a course and also the course addons.
     *
     * @param course The course to prefetch.
     * @param sections List of course sections.
     * @param courseHandlers List of course options handlers.
     * @param courseMenuHandlers List of course menu handlers.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when the download finishes.
     */
    async prefetchCourse(
        course: CoreEnrolledCourseDataWithExtraInfoAndOptions,
        sections: CoreCourseSection[],
        courseHandlers: any[], // @todo CoreCourseOptionsHandlerToDisplay[],
        courseMenuHandlers: any[], // @todo CoreCourseOptionsMenuHandlerToDisplay[],
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.instance.getCurrentSiteId();

        if (this.courseDwnPromises[siteId] && this.courseDwnPromises[siteId][course.id]) {
            // There's already a download ongoing for this course, return the promise.
            return this.courseDwnPromises[siteId][course.id];
        } else if (!this.courseDwnPromises[siteId]) {
            this.courseDwnPromises[siteId] = {};
        }

        // First of all, mark the course as being downloaded.
        this.courseDwnPromises[siteId][course.id] = CoreCourse.instance.setCourseStatus(
            course.id,
            CoreConstants.DOWNLOADING,
            siteId,
        ).then(async () => {

            const promises: Promise<any>[] = [];

            // Prefetch all the sections. If the first section is "All sections", use it. Otherwise, use a fake "All sections".
            /*
             * @todo
            let allSectionsSection = sections[0];
             if (sections[0].id != CoreCourseProvider.ALL_SECTIONS_ID) {
                allSectionsSection = { id: CoreCourseProvider.ALL_SECTIONS_ID };
            }
            promises.push(this.prefetchSection(allSectionsSection, course.id, sections));

            // Prefetch course options.
            courseHandlers.forEach((handler) => {
                if (handler.prefetch) {
                    promises.push(handler.prefetch(course));
                }
            });
            courseMenuHandlers.forEach((handler) => {
                if (handler.prefetch) {
                    promises.push(handler.prefetch(course));
                }
            });*/

            // Prefetch other data needed to render the course.
            if (CoreCourses.instance.isGetCoursesByFieldAvailable()) {
                promises.push(CoreCourses.instance.getCoursesByField('id', course.id));
            }

            const sectionWithModules = sections.find((section) => section.modules && section.modules.length > 0);
            if (!sectionWithModules || typeof sectionWithModules.modules[0].completion == 'undefined') {
                promises.push(CoreCourse.instance.getActivitiesCompletionStatus(course.id));
            }

            // @todo promises.push(this.filterHelper.getFilters('course', course.id));

            return CoreUtils.instance.allPromises(promises);
        }).then(() =>
            // Download success, mark the course as downloaded.
            CoreCourse.instance.setCourseStatus(course.id, CoreConstants.DOWNLOADED, siteId)).catch(async (error) => {
            // Error, restore previous status.
            await CoreCourse.instance.setCoursePreviousStatus(course.id, siteId);

            throw error;
        }).finally(() => {
            delete this.courseDwnPromises[siteId!][course.id];
        });

        return this.courseDwnPromises[siteId][course.id];
    }

    /**
     * Helper function to prefetch a module, showing a confirmation modal if the size is big
     * and invalidating contents if refreshing.
     *
     * @param handler Prefetch handler to use. Must implement 'prefetch' and 'invalidateContent'.
     * @param module Module to download.
     * @param size Object containing size to download (in bytes) and a boolean to indicate if its totally calculated.
     * @param courseId Course ID of the module.
     * @param refresh True if refreshing, false otherwise.
     * @return Promise resolved when downloaded.
     */
    prefetchModule(): void {
        // @todo params and logic
    }

    /**
     * Prefetch one section or all the sections.
     * If the section is "All sections" it will prefetch all the sections.
     *
     * @param section Section.
     * @param courseId Course ID the section belongs to.
     * @param sections List of sections. Used when downloading all the sections.
     * @return Promise resolved when the prefetch is finished.
     */
    async prefetchSection(): Promise<void> {
        // @todo params and logic
    }

    /**
     * Prefetch a certain section if it needs to be prefetched.
     * If the section is "All sections" it will be ignored.
     *
     * @param section Section to prefetch.
     * @param courseId Course ID the section belongs to.
     * @return Promise resolved when the section is prefetched.
     */
    protected prefetchSingleSectionIfNeeded(): void {
        // @todo params and logic
    }

    /**
     * Start or restore the prefetch of a section.
     * If the section is "All sections" it will be ignored.
     *
     * @param section Section to download.
     * @param result Result of CoreCourseModulePrefetchDelegate.getModulesStatus for this section.
     * @param courseId Course ID the section belongs to.
     * @return Promise resolved when the section has been prefetched.
     */
    protected prefetchSingleSection(): void {
        // @todo params and logic
    }

    /**
     * Check if a section has content.
     *
     * @param section Section to check.
     * @return Whether the section has content.
     * @todo section type.
     */
    sectionHasContent(section: any): boolean {
        if (section.hiddenbynumsections) {
            return false;
        }

        return (typeof section.availabilityinfo != 'undefined' && section.availabilityinfo != '') ||
            section.summary != '' || (section.modules && section.modules.length > 0);
    }

    /**
     * Wait for any course format plugin to load, and open the course page.
     *
     * If the plugin's promise is resolved, the course page will be opened.  If it is rejected, they will see an error.
     * If the promise for the plugin is still in progress when the user tries to open the course, a loader
     * will be displayed until it is complete, before the course page is opened.  If the promise is already complete,
     * they will see the result immediately.
     *
     * @param course Course to open
     * @param params Params to pass to the course page.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    openCourse(course: CoreEnrolledCourseBasicData | { id: number }, params?: Params, siteId?: string): Promise<void> {
        if (!siteId || siteId == CoreSites.instance.getCurrentSiteId()) {
            // Current site, we can open the course.
            return CoreCourse.instance.openCourse(course, params);
        } else {
            // We need to load the site first.
            params = params || {};
            Object.assign(params, { course: course });

            return CoreLoginHelper.instance.redirect(CoreLoginHelperProvider.OPEN_COURSE, params, siteId);
        }
    }

    /**
     * Delete course files.
     *
     * @param courseId Course id.
     * @return Promise to be resolved once the course files are deleted.
     */
    async deleteCourseFiles(courseId: number): Promise<void> {
        const sections = await CoreCourse.instance.getSections(courseId);
        const modules = CoreArray.flatten(sections.map((section) => section.modules));

        await Promise.all(
            modules.map((module) => this.removeModuleStoredData(module, courseId)),
        );

        await CoreCourse.instance.setCourseStatus(courseId, CoreConstants.NOT_DOWNLOADED);
    }

    /**
     * Remove module stored data.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when done.
     */
    // @todo remove when done.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async removeModuleStoredData(module: any, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];

        // @todo
        // promises.push(this.prefetchDelegate.removeModuleFiles(module, courseId));

        // @todo
        // const handler = this.prefetchDelegate.getPrefetchHandlerFor(module);
        // if (handler) {
        //   promises.push(CoreSites.instance.getCurrentSite().deleteComponentFromCache(handler.component, module.id));
        // }

        await Promise.all(promises);
    }

}

export class CoreCourseHelper extends makeSingleton(CoreCourseHelperProvider) {}
