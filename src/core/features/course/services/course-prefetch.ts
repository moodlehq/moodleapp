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
import { dayjs } from '@/core/utils/dayjs';

import { CoreSites } from '@services/sites';
import {
    CoreCourse,
    CoreCourseModuleContentFile,
    CoreCourseWSSection,
    sectionContentIsModule,
    CoreCourseAnyModuleData,
    CoreCourseModuleOrSection,
} from './course';
import { DownloadStatus, ContextLevel, CoreTimeConstants } from '@/core/constants';
import { CoreLogger } from '@static/logger';
import { makeSingleton, Translate } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import {
    CoreCourseAnyCourseData,
    CoreCourseBasicData,
    CoreCourses,
} from '@features/courses/services/courses';
import {
    CoreCourseOptionsDelegate,
    CoreCourseOptionsHandlerToDisplay,
    CoreCourseOptionsMenuHandlerToDisplay,
} from './course-options-delegate';
import { CoreError } from '@classes/errors/error';
import {
    CoreCourseModulePrefetchDelegate,
    CoreCourseModulePrefetchHandler,
    CoreCourseModulesStatus,
} from './module-prefetch-delegate';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreFileHelper } from '@services/file-helper';
import { CoreNetwork } from '@services/network';
import { CoreSite } from '@classes/sites/site';
import { CoreUrl } from '@static/url';
import { CoreText } from '@static/text';
import { CoreTime } from '@static/time';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreNetworkError } from '@classes/errors/network-error';
import {
    CORE_COURSE_ALL_SECTIONS_ID,
    CORE_COURSE_COMPONENT,
    CoreCourseDownloadStatusIcon,
} from '../constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreOpener, CoreOpenerOpenFileOptions } from '@static/opener';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseDownloadStatusHelper } from './course-download-status-helper';
import { CoreCourseHelper, CoreCourseModuleData, CoreCourseSection } from './course-helper';

/**
 * Service to handle course prefetching.
 */
@Injectable({ providedIn: 'root' })
export class CoreCoursePrefetchService {

    protected courseDwnPromises: { [s: string]: { [id: number]: Promise<void> } } = {};
    protected logger = CoreLogger.getInstance('CoreCoursePrefetchService');

    /**
     * Calculate the status of a section.
     *
     * @param section Section to calculate its status. It can't be "All sections".
     * @param courseId Course ID the section belongs to.
     * @param refresh True if it shouldn't use module status cache (slower).
     * @param checkUpdates Whether to use the WS to check updates. Defaults to true.
     * @returns Promise resolved when the status is calculated.
     */
    async calculateSectionStatus(
        section: CoreCourseSection,
        courseId: number,
        refresh?: boolean,
        checkUpdates = true,
    ): Promise<{ statusData: CoreCourseModulesStatus; section: CoreCourseSectionWithStatus }> {
        if (section.id === CORE_COURSE_ALL_SECTIONS_ID) {
            throw new CoreError('Invalid section');
        }

        // Get the status of this section based on their modules.
        const { modules, subsections } = this.classifyContents(section.contents);

        const statusData = await CoreCourseModulePrefetchDelegate.getModulesStatus(
            modules,
            courseId,
            section.id,
            refresh,
            true,
            checkUpdates,
        );

        // Now calculate status of subsections, and add them to the status data. Each subsection counts as 1 item in the section.
        await Promise.all(subsections.map(async (subsection) => {
            const subsectionStatus = await this.calculateSectionStatus(subsection, courseId, refresh, checkUpdates);
            statusData.total++;
            statusData.status = CoreFilepool.determinePackagesStatus(statusData.status, subsectionStatus.statusData.status);
        }));

        // Check if it's being downloaded.
        const downloadId = this.getSectionDownloadId(section);
        if (CoreCourseModulePrefetchDelegate.isBeingDownloaded(downloadId)) {
            statusData.status = DownloadStatus.DOWNLOADING;
        }

        const sectionWithStatus = <CoreCourseSectionWithStatus> section;
        sectionWithStatus.downloadStatus = statusData.status;

        // Set this section data.
        if (statusData.status !== DownloadStatus.DOWNLOADING) {
            sectionWithStatus.isDownloading = false;
            this.resetSectionDownloadCount(section);
        } else {
            // Section is being downloaded.
            sectionWithStatus.isDownloading = true;
            CoreCourseModulePrefetchDelegate.setOnProgress(downloadId, (data) => {
                this.setSectionDownloadCount(sectionWithStatus, data.count, data.total);
            });
        }

        return { statusData, section: sectionWithStatus };
    }

    /**
     * Show a confirm and prefetch a course. It will retrieve the sections and the course options if not provided.
     * This function will set the icon to "spinner" when starting and it will also set it back to the initial icon if the
     * user cancels. All the other updates of the icon should be made when COURSE_STATUS_CHANGED_EVENT is received.
     *
     * @param data An object where to store the course icon and title: "prefetchCourseIcon", "title" and "downloadSucceeded".
     * @param course Course to prefetch.
     * @param options Other options.
     */
    async confirmAndPrefetchCourse(
        data: CorePrefetchStatusInfo,
        course: CoreCourseAnyCourseData,
        options: CoreCoursePrefetchCourseOptions = {},
    ): Promise<void> {
        const initialIcon = data.icon;
        const initialStatus = data.status;
        const initialStatusTranslatable = data.statusTranslatable;
        const siteId = CoreSites.getCurrentSiteId();

        data.downloadSucceeded = false;
        data.icon = CoreCourseDownloadStatusIcon.DOWNLOADING;
        data.status = DownloadStatus.DOWNLOADING;
        data.loading = true;
        data.statusTranslatable = 'core.downloading';

        try {
            // Get the sections first if needed.
            if (!options.sections) {
                options.sections = await CoreCourse.getSections(course.id, false, true);
            }

            // Confirm the download.
            await this.confirmDownloadSizeSection(course.id, options.sections, true);

            // User confirmed, get the course handlers if needed.
            if (!options.courseHandlers) {
                options.courseHandlers = await CoreCourseOptionsDelegate.getHandlersToDisplay(course, false, options.isGuest);
            }
            if (!options.menuHandlers) {
                options.menuHandlers = await CoreCourseOptionsDelegate.getMenuHandlersToDisplay(course, false, options.isGuest);
            }

            // Now we have all the data, download the course.
            await this.prefetchCourse(course, options.sections, options.courseHandlers, options.menuHandlers, siteId);

            // Download successful.
            data.downloadSucceeded = true;
            data.loading = false;
        } catch (error) {
            // User cancelled or there was an error.
            data.icon = initialIcon;
            data.status = initialStatus;
            data.statusTranslatable = initialStatusTranslatable;
            data.loading = false;

            throw error;
        }
    }

    /**
     * Confirm and prefetches a list of courses.
     *
     * @param courses List of courses to download.
     * @param options Other options.
     */
    async confirmAndPrefetchCourses(
        courses: CoreCourseAnyCourseData[],
        options: CoreCourseConfirmPrefetchCoursesOptions = {},
    ): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();

        // Confirm the download without checking size because it could take a while.
        await CoreAlerts.confirm(Translate.instant('core.areyousure'), {
            header: Translate.instant('core.courses.downloadcourses'),
        });

        const total = courses.length;
        let count = 0;

        const promises = courses.map(async (course) => {
            let success = true;

            // Get the sections and the handlers.
            const [sections, handlers, menuHandlers] = await Promise.all([
                CoreCourse.getSections(course.id, false, true),
                CoreCourseOptionsDelegate.getHandlersToDisplay(course, false),
                CoreCourseOptionsDelegate.getMenuHandlersToDisplay(course, false),
            ]);

            try {
                await this.prefetchCourse(course, sections, handlers, menuHandlers, siteId);
            } catch (error) {
                success = false;

                throw error;
            } finally {
                // Course downloaded or failed, notify the progress.
                count++;
                if (options.onProgress) {
                    options.onProgress({ count: count, total: total, courseId: course.id, success: success });
                }
            }
        });

        if (options.onProgress) {
            // Notify the start of the download.
            options.onProgress({ count: 0, total: total, success: true });
        }

        await CorePromiseUtils.allPromises(promises);
    }

    /**
     * Calculate the size to download a section and show a confirm modal if needed.
     *
     * @param courseId Course ID the section belongs to.
     * @param sections List of sections to download
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     */
    async confirmDownloadSizeSection(
        courseId: number,
        sections: CoreCourseWSSection[] = [],
        alwaysConfirm = false,
    ): Promise<void> {
        let hasEmbeddedFiles = false;

        const getSectionSize = async (section: CoreCourseWSSection): Promise<CoreFileSizeSum> => {
            if (section.id === CORE_COURSE_ALL_SECTIONS_ID) {
                return { size: 0, total: true };
            }

            const { modules, subsections } = this.classifyContents(section.contents);

            const [modulesSize, subsectionsSizes] = await Promise.all([
                CoreCourseModulePrefetchDelegate.getDownloadSize(modules, courseId),
                Promise.all(subsections.map((modOrSubsection) => getSectionSize(modOrSubsection))),
            ]);

            // Check if the section has embedded files in the description.
            if (!hasEmbeddedFiles && CoreFilepool.extractDownloadableFilesFromHtml(section.summary).length > 0) {
                hasEmbeddedFiles = true;
            }

            return subsectionsSizes.concat(modulesSize).reduce((sizeSum, contentSize) => ({
                size: sizeSum.size + contentSize.size,
                total: sizeSum.total && contentSize.total,
            }), { size: 0, total: true });
        };

        const sectionsSizes = await Promise.all(sections.map((section) => getSectionSize(section)));

        const sizeSum = sectionsSizes.reduce((sizeSum, contentSize) => ({
            size: sizeSum.size + contentSize.size,
            total: sizeSum.total && contentSize.total,
        }), { size: 0, total: !hasEmbeddedFiles });

        // Show confirm modal if needed.
        await CoreAlerts.confirmDownloadSize(sizeSum, { alwaysConfirm });
    }

    /**
     * Sums the stored module sizes.
     *
     * @param modules List of modules.
     * @param courseId Course ID.
     * @returns Promise resolved with the sum of the stored sizes.
     */
    async getModulesDownloadedSize(modules: CoreCourseAnyModuleData[], courseId: number): Promise<number> {
        const moduleSizes = await Promise.all(modules.map(async (module) =>
            await CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, courseId)));

        return moduleSizes.reduce((totalSize, moduleSize) => totalSize + moduleSize, 0);
    }

    /**
     * Determine the status of a list of courses.
     *
     * @param courses Courses
     * @returns Promise resolved with the status.
     */
    protected async determineCoursesStatus(courses: CoreCourseBasicData[]): Promise<DownloadStatus> {
        // Get the status of each course.
        const promises: Promise<DownloadStatus>[] = [];
        const siteId = CoreSites.getCurrentSiteId();

        courses.forEach((course) => {
            promises.push(CoreCourseDownloadStatusHelper.getCourseStatus(course.id, siteId));
        });

        const statuses = await Promise.all(promises);

        // Now determine the status of the whole list.
        let status = statuses[0];
        for (let i = 1; i < statuses.length; i++) {
            status = CoreFilepool.determinePackagesStatus(status, statuses[i]);
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
     * @param options Options to open the file.
     */
    async downloadModuleAndOpenFile(
        module: CoreCourseModuleData,
        courseId: number,
        component?: string,
        componentId?: string | number,
        files?: CoreCourseModuleContentFile[],
        siteId?: string,
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!files || !files.length) {
            // Try to use module contents.
            files = await CoreCourse.getModuleContents(module);
        }

        if (!files.length) {
            throw new CoreError(Translate.instant('core.filenotfound'));
        }

        const mainFile = files[0];

        if (!CoreFileHelper.isOpenableInApp(mainFile)) {
            await CoreFileHelper.showConfirmOpenUnsupportedFile(false, mainFile);
        }

        const site = await CoreSites.getSite(siteId);

        // Check if the file should be opened in browser.
        if (CoreFileHelper.shouldOpenInBrowser(mainFile)) {
            await this.openModuleFileInBrowser(mainFile.fileurl, site, module, courseId, component, componentId, files, options);

            return;
        }

        // File shouldn't be opened in browser. Download the module if it needs to be downloaded.
        const result = await this.downloadModuleWithMainFileIfNeeded(
            module,
            courseId,
            component || '',
            componentId,
            files,
            siteId,
            options,
        );

        if (CoreUrl.isLocalFileUrl(result.path)) {
            await CoreOpener.openFile(result.path, options);

            return;
        }

        /* In iOS, if we use the same URL in embedded browser and background download then the download only
        downloads a few bytes (cached ones). Add a hash to the URL so both URLs are different. */
        result.path = `${result.path}#moodlemobile-embedded`;

        try {
            await CoreOpener.openOnlineFile(result.path);
        } catch {
            // Error opening the file, some apps don't allow opening online files.
            if (result.status === DownloadStatus.DOWNLOADING) {
                throw new CoreError(Translate.instant('core.erroropenfiledownloading'));
            }

            let path: string | undefined;
            if (result.status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
                // Not downloaded, download it now and return the local file.
                await this.downloadModule(module, courseId, component, componentId, files, siteId);

                path = await CoreFilepool.getInternalUrlByUrl(siteId, mainFile.fileurl);
            } else {
                // File is outdated or stale and can't be opened in online, return the local URL.
                path = await CoreFilepool.getInternalUrlByUrl(siteId, mainFile.fileurl);
            }

            await CoreOpener.openFile(path, options);
        }
    }

    /**
     * Convenience function to open a module main file in case it needs to be opened in browser.
     *
     * @param fileUrl URL of the main file.
     * @param site Site instance.
     * @param module The module to download.
     * @param courseId The course ID of the module.
     * @param component The component to link the files to.
     * @param componentId An ID to use in conjunction with the component.
     * @param files List of files of the module. If not provided, use module.contents.
     * @param options Options to open the file. Only used if not opened in browser.
     * @returns Resolved on success.
     */
    protected async openModuleFileInBrowser(
        fileUrl: string,
        site: CoreSite,
        module: CoreCourseModuleData,
        courseId: number,
        component?: string,
        componentId?: string | number,
        files?: CoreCourseModuleContentFile[],
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<void> {
        if (!CoreNetwork.isOnline()) {
            // Not online, get the offline file. It will fail if not found.
            let path: string | undefined;
            try {
                path = await CoreFilepool.getInternalUrlByUrl(site.getId(), fileUrl);
            } catch {
                throw new CoreNetworkError();
            }

            return CoreOpener.openFile(path, options);
        }

        // Open in browser.
        let fixedUrl = await site.checkAndFixPluginfileURL(fileUrl);

        fixedUrl = fixedUrl.replace('&offline=1', '');
        // Remove forcedownload when followed by another param.
        fixedUrl = fixedUrl.replace(/forcedownload=\d+&/, '');
        // Remove forcedownload when not followed by any param.
        fixedUrl = fixedUrl.replace(/[?|&]forcedownload=\d+/, '');

        CoreOpener.openInBrowser(fixedUrl);

        // Download the file if needed (file outdated or not downloaded).
        // Download will be in background, don't return the promise.
        this.downloadModule(module, courseId, component, componentId, files, site.getId());
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
     * @param options Options to open the file.
     * @returns Promise resolved when done.
     */
    async downloadModuleWithMainFileIfNeeded(
        module: CoreCourseModuleData,
        courseId: number,
        component: string,
        componentId?: string | number,
        files?: CoreCourseModuleContentFile[],
        siteId?: string,
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<{ fixedUrl: string; path: string; status?: DownloadStatus }> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        if (!files || !files.length) {
            // Module not valid, stop.
            throw new CoreError('File list not supplied.');
        }

        const mainFile = files[0];
        const site = await CoreSites.getSite(siteId);

        const fixedUrl = await site.checkAndFixPluginfileURL(mainFile.fileurl);

        // The file system is available.
        const status = await CoreFilepool.getPackageStatus(siteId, component, componentId);

        let path = '';

        if (status === DownloadStatus.DOWNLOADING) {
            // Use the online URL.
            path = fixedUrl;
        } else if (status === DownloadStatus.DOWNLOADED) {
            try {
                // Get the local file URL.
                path = await CoreFilepool.getInternalUrlByUrl(siteId, mainFile.fileurl);
            } catch {
                // File not found, mark the module as not downloaded.
                await CoreFilepool.storePackageStatus(siteId, DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED, component, componentId);
            }
        }

        if (!path) {
            try {
                path = await this.downloadModuleWithMainFile(
                    module,
                    courseId,
                    fixedUrl,
                    files,
                    status,
                    component,
                    componentId,
                    siteId,
                    options,
                );
            } catch (error) {
                if (status !== DownloadStatus.OUTDATED) {
                    throw error;
                }

                // Use the local file even if it's outdated.
                try {
                    path = await CoreFilepool.getInternalUrlByUrl(siteId, mainFile.fileurl);
                } catch {
                    throw error;
                }
            }
        }

        return {
            path,
            fixedUrl,
            status,
        };
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
     * @param options Options to open the file.
     * @returns Promise resolved when done.
     */
    protected async downloadModuleWithMainFile(
        module: CoreCourseModuleData,
        courseId: number,
        fixedUrl: string,
        files: CoreCourseModuleContentFile[],
        status: DownloadStatus,
        component?: string,
        componentId?: string | number,
        siteId?: string,
        options: CoreOpenerOpenFileOptions = {},
    ): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const isOnline = CoreNetwork.isOnline();
        const mainFile = files[0];
        const timemodified = mainFile.timemodified || 0;

        if (!isOnline && status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            // Not downloaded and we're offline, reject.
            throw new CoreNetworkError();
        }

        const shouldDownloadFirst = await CoreFilepool.shouldDownloadFileBeforeOpen(fixedUrl, mainFile.filesize, options);

        if (shouldDownloadFirst) {
            // Download and then return the local URL.
            await this.downloadModule(module, courseId, component, componentId, files, siteId);

            return CoreFilepool.getInternalUrlByUrl(siteId, mainFile.fileurl);
        }

        // Start the download if in wifi, but return the URL right away so the file is opened.
        if (CoreNetwork.isWifi()) {
            this.downloadModule(module, courseId, component, componentId, files, siteId);
        }

        if (!CoreFileHelper.isStateDownloaded(status) || isOnline) {
            // Not downloaded or online, return the online URL.
            return fixedUrl;
        } else {
            // Outdated but offline, so we return the local URL. Use getUrlByUrl so it's added to the queue.
            return CoreFilepool.getUrlByUrl(
                siteId,
                mainFile.fileurl,
                component,
                componentId,
                timemodified,
                false,
                false,
                mainFile,
            );
        }
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
     */
    async downloadModule(
        module: CoreCourseModuleData,
        courseId: number,
        component?: string,
        componentId?: string | number,
        files?: CoreCourseModuleContentFile[],
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const prefetchHandler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(module.modname);

        if (prefetchHandler) {
            // Use the prefetch handler to download the module.
            if (prefetchHandler.download) {
                await prefetchHandler.download(module, courseId);

                return;
            }

            await prefetchHandler.prefetch(module, courseId, true);

            return;
        }

        // There's no prefetch handler for the module, just download the files.
        files = files || module.contents || [];

        await CoreFilepool.downloadOrPrefetchFiles(siteId, files, false, false, component, componentId);
    }

    /**
     * Initialize the prefetch icon for selected courses.
     *
     * @param courses Courses array to get info from.
     * @param prefetch Prefetch information.
     * @returns Resolved with the prefetch information updated when done.
     */
    async initPrefetchCoursesIcons(
        courses: CoreCourseBasicData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<CorePrefetchStatusInfo> {
        if (!courses || courses.length <= 0) {
            // Not enough courses.
            prefetch.icon = CoreCourseDownloadStatusIcon.NOT_DOWNLOADABLE;

            return prefetch;
        }

        const status = await this.determineCoursesStatus(courses);

        prefetch = this.getCoursesPrefetchStatusInfo(status);

        if (prefetch.loading) {
            // It seems all courses are being downloaded, show a download button instead.
            prefetch.icon = CoreCourseDownloadStatusIcon.NOT_DOWNLOADED;
        }

        return prefetch;
    }

    /**
     * Prefetch all the courses in the array.
     *
     * @param courses Courses array to prefetch.
     * @param prefetch Prefetch information to be updated.
     */
    async prefetchCourses(
        courses: CoreCourseAnyCourseData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<void> {
        prefetch.loading = true;
        prefetch.icon = CoreCourseDownloadStatusIcon.DOWNLOADING;
        prefetch.badge = '';

        const prefetchOptions: CoreCourseConfirmPrefetchCoursesOptions = {
            onProgress: (progress) => {
                prefetch.badge = `${progress.count} / ${progress.total}`;
                prefetch.badgeA11yText = Translate.instant('core.course.downloadcoursesprogressdescription', progress);
                prefetch.count = progress.count;
                prefetch.total = progress.total;
            },
        };

        try {
            await this.confirmAndPrefetchCourses(courses, prefetchOptions);
            prefetch.icon = CoreCourseDownloadStatusIcon.OUTDATED;
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
     * @returns Download promise, undefined if not found.
     */
    getCourseDownloadPromise(courseId: number, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        return this.courseDwnPromises[siteId] && this.courseDwnPromises[siteId][courseId];
    }

    /**
     * Get a course status icon and the langkey to use as a title.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the icon name and the title key.
     */
    async getCourseStatusIconAndTitle(courseId: number, siteId?: string): Promise<CorePrefetchStatusInfo> {
        const status = await CoreCourseDownloadStatusHelper.getCourseStatus(courseId, siteId);

        return this.getCoursePrefetchStatusInfo(status);
    }

    /**
     * Get a course status icon and the langkey to use as a title from status.
     *
     * @param status Course status.
     * @returns Prefetch status info.
     */
    getCoursePrefetchStatusInfo(status: DownloadStatus): CorePrefetchStatusInfo {
        const prefetchStatus: CorePrefetchStatusInfo = {
            status: status,
            icon: this.getPrefetchStatusIcon(status, false),
            statusTranslatable: '',
            loading: false,
        };

        if (status === DownloadStatus.DOWNLOADED) {
            // Always show refresh icon, we cannot know if there's anything new in course options.
            prefetchStatus.statusTranslatable = 'core.course.refreshcourse';
        } else if (status === DownloadStatus.DOWNLOADING) {
            prefetchStatus.statusTranslatable = 'core.downloading';
            prefetchStatus.loading = true;
        } else {
            prefetchStatus.statusTranslatable = 'core.course.downloadcourse';
        }

        return prefetchStatus;
    }

    /**
     * Get a courses status icon and the langkey to use as a title from status.
     *
     * @param status Courses status.
     * @returns Prefetch status info.
     */
    protected getCoursesPrefetchStatusInfo(status: DownloadStatus): CorePrefetchStatusInfo {
        const prefetchStatus: CorePrefetchStatusInfo = {
            status: status,
            icon: this.getPrefetchStatusIcon(status, false),
            statusTranslatable: '',
            loading: false,
        };

        if (status === DownloadStatus.DOWNLOADED) {
            // Always show refresh icon, we cannot know if there's anything new in course options.
            prefetchStatus.statusTranslatable = 'core.courses.refreshcourses';
        } else if (status === DownloadStatus.DOWNLOADING) {
            prefetchStatus.statusTranslatable = 'core.downloading';
            prefetchStatus.loading = true;
        } else {
            prefetchStatus.statusTranslatable = 'core.courses.downloadcourses';
        }

        return prefetchStatus;
    }

    /**
     * Get the icon given the status and if trust the download status.
     *
     * @param status Status constant.
     * @param trustDownload True to show download success, false to show an outdated status when downloaded.
     * @returns Icon name.
     */
    protected getPrefetchStatusIcon(status: DownloadStatus, trustDownload = false): CoreCourseDownloadStatusIcon {
        if (status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            return CoreCourseDownloadStatusIcon.NOT_DOWNLOADED;
        }
        if (status === DownloadStatus.OUTDATED || (status === DownloadStatus.DOWNLOADED && !trustDownload)) {
            return CoreCourseDownloadStatusIcon.OUTDATED;
        }
        if (status === DownloadStatus.DOWNLOADED && trustDownload) {
            return CoreCourseDownloadStatusIcon.DOWNLOADED;
        }
        if (status === DownloadStatus.DOWNLOADING) {
            return CoreCourseDownloadStatusIcon.DOWNLOADING;
        }

        return CoreCourseDownloadStatusIcon.DOWNLOADING;
    }

    /**
     * Get prefetch info for a module.
     *
     * @param module Module to get the info from.
     * @param courseId Course ID the section belongs to.
     * @param invalidateCache Invalidates the cache first.
     * @param component Component of the module.
     * @returns Promise resolved with the info.
     */
    async getModulePrefetchInfo(
        module: CoreCourseModuleData,
        courseId: number,
        invalidateCache = false,
        component = '',
    ): Promise<CoreCourseModulePrefetchInfo> {
        if (invalidateCache) {
            // Currently, some modules pass invalidateCache=false because they already invalidate data in downloadResourceIfNeeded.
            // If this function is changed to do more actions if invalidateCache=true, please review those modules.
            CoreCourseModulePrefetchDelegate.invalidateModuleStatusCache(module);

            await CorePromiseUtils.ignoreErrors(CoreCourseModulePrefetchDelegate.invalidateCourseUpdates(courseId));
        }

        const [size, status, packageData] = await Promise.all([
            CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, courseId),
            CoreCourseModulePrefetchDelegate.getModuleStatus(module, courseId),
            this.getModulePackageLastDownloaded(module, component),
        ]);

        // Treat stored size.
        const sizeReadable = CoreText.bytesToSize(size, 2);

        // Treat module status.
        let statusIcon: string | undefined;
        switch (status) {
            case DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED:
                statusIcon = CoreCourseDownloadStatusIcon.NOT_DOWNLOADED;
                break;
            case DownloadStatus.DOWNLOADING:
                statusIcon = CoreCourseDownloadStatusIcon.DOWNLOADING;
                break;
            case DownloadStatus.OUTDATED:
                statusIcon = CoreCourseDownloadStatusIcon.OUTDATED;
                break;
            case DownloadStatus.DOWNLOADED:
                break;
            default:
                statusIcon = '';
                break;
        }

        return {
            size,
            sizeReadable,
            status,
            statusIcon,
            downloadTime: packageData.downloadTime,
            downloadTimeReadable: packageData.downloadTimeReadable,
        };
    }

    /**
     * Get prefetch info for a module.
     *
     * @param module Module to get the info from.
     * @param component Component of the module.
     * @returns Promise resolved with the info.
     */
    async getModulePackageLastDownloaded(
        module: CoreCourseModuleData,
        component = '',
    ): Promise<CoreCourseModulePackageLastDownloaded> {
        const siteId = CoreSites.getCurrentSiteId();
        const packageData = await CorePromiseUtils.ignoreErrors(CoreFilepool.getPackageData(siteId, component, module.id));

        // Treat download time.
        if (
            !packageData ||
            !packageData.downloadTime ||
            !packageData.status ||
            !CoreFileHelper.isStateDownloaded(packageData.status)
        ) {
            // Not downloaded.
            return {
                downloadTime: 0,
                downloadTimeReadable: '',
            };
        }

        const now = CoreTime.timestamp();
        const downloadTime = packageData.downloadTime;
        let downloadTimeReadable = '';
        if (now - downloadTime < CoreTimeConstants.SECONDS_WEEK) {
            downloadTimeReadable = dayjs(downloadTime * 1000).fromNow();
        } else {
            downloadTimeReadable = dayjs(downloadTime * 1000).calendar();
        }

        return {
            downloadTime,
            downloadTimeReadable,
        };
    }

    /**
     * Get the download ID of a section. It's used to interact with CoreCourseModulePrefetchDelegate.
     *
     * @param section Section.
     * @param section.id Section ID.
     * @returns Section download ID.
     */
    getSectionDownloadId(section: { id: number }): string {
        return `Section-${section.id}`;
    }

    /**
     * Prefetch all the activities in a course and also the course addons.
     *
     * @param course The course to prefetch.
     * @param sections List of course sections.
     * @param courseHandlers List of course options handlers.
     * @param courseMenuHandlers List of course menu handlers.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the download finishes.
     */
    protected async prefetchCourse(
        course: CoreCourseAnyCourseData,
        sections: CoreCourseWSSection[],
        courseHandlers: CoreCourseOptionsHandlerToDisplay[],
        courseMenuHandlers: CoreCourseOptionsMenuHandlerToDisplay[],
        siteId?: string,
    ): Promise<void> {
        const requiredSiteId = siteId || CoreSites.getRequiredCurrentSite().getId();

        if (this.courseDwnPromises[requiredSiteId] && this.courseDwnPromises[requiredSiteId][course.id] !== undefined) {
            // There's already a download ongoing for this course, return the promise.
            return this.courseDwnPromises[requiredSiteId][course.id];
        } else if (!this.courseDwnPromises[requiredSiteId]) {
            this.courseDwnPromises[requiredSiteId] = {};
        }

        // First of all, mark the course as being downloaded.
        this.courseDwnPromises[requiredSiteId][course.id] = CoreCourseDownloadStatusHelper.setCourseStatus(
            course.id,
            DownloadStatus.DOWNLOADING,
            requiredSiteId,
        ).then(async () => {

            const promises: Promise<unknown>[] = [];

            promises.push(this.prefetchSections(sections, course.id, true));

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
            });

            // Prefetch other data needed to render the course.
            promises.push(CoreCourses.getCoursesByField('id', course.id));

            const modules = CoreCourse.getSectionsModules(sections);
            if (!modules.length || modules[0].completion === undefined) {
                promises.push(CoreCourse.getActivitiesCompletionStatus(course.id));
            }

            promises.push(CoreFilterHelper.getFilters(ContextLevel.COURSE, course.id));

            await CorePromiseUtils.allPromises(promises);

            // Download success, mark the course as downloaded.
            return CoreCourseDownloadStatusHelper.setCourseStatus(course.id, DownloadStatus.DOWNLOADED, requiredSiteId);
        }).catch(async (error) => {
            // Error, restore previous status.
            await CoreCourseDownloadStatusHelper.setCoursePreviousStatus(course.id, requiredSiteId);

            throw error;
        }).finally(() => {
            delete this.courseDwnPromises[requiredSiteId][course.id];
        });

        return this.courseDwnPromises[requiredSiteId][course.id];
    }

    /**
     * Helper function to prefetch a module, showing a confirmation modal if the size is big
     * and invalidating contents if refreshing.
     *
     * @param handler Prefetch handler to use.
     * @param module Module to download.
     * @param size Size to download.
     * @param courseId Course ID of the module.
     * @param refresh True if refreshing, false otherwise.
     */
    async prefetchModule(
        handler: CoreCourseModulePrefetchHandler,
        module: CoreCourseModuleData,
        size: CoreFileSizeSum,
        courseId: number,
        refresh?: boolean,
    ): Promise<void> {
        // Show confirmation if needed.
        await CoreAlerts.confirmDownloadSize(size);

        // Invalidate content if refreshing and download the data.
        if (refresh) {
            await CorePromiseUtils.ignoreErrors(handler.invalidateContent(module.id, courseId));
        }

        await CoreCourseModulePrefetchDelegate.prefetchModule(module, courseId, true);
    }

    /**
     * Prefetch some sections
     *
     * @param sections List of sections.
     * @param courseId Course ID the section belongs to.
     * @param updateAllSections Update all sections status.
     */
    async prefetchSections(
        sections: CoreCourseSectionWithStatus[],
        courseId: number,
        updateAllSections = false,
    ): Promise<void> {

        let allSectionsStatus = DownloadStatus.NOT_DOWNLOADABLE as DownloadStatus;
        let allSectionsSection: (CoreCourseSectionWithStatus) | undefined;
        if (updateAllSections) {
            // Prefetch all the sections. If the first section is "All sections", use it. Otherwise, use a fake "All sections".
            allSectionsSection = sections[0];
            if (sections[0].id !== CORE_COURSE_ALL_SECTIONS_ID) {
                allSectionsSection = CoreCourseHelper.createAllSectionsSection();
            }
            allSectionsSection.isDownloading = true;
        }

        const promises = sections.map(async (section) => {
            // Download all the sections except "All sections".
            if (section.id === CORE_COURSE_ALL_SECTIONS_ID) {
                return;
            }

            try {
                await this.prefetchSingleSectionIfNeeded(section, courseId);
            } finally {
                // Calculate the status of the section that finished.
                const result = await this.calculateSectionStatus(section, courseId, false, false);

                // Calculate "All sections" status.
                allSectionsStatus = CoreFilepool.determinePackagesStatus(allSectionsStatus, result.statusData.status);
            }
        });

        try {
            await CorePromiseUtils.allPromises(promises);

            // Set "All sections" data.
            if (allSectionsSection) {
                allSectionsSection.downloadStatus = allSectionsStatus;
                allSectionsSection.isDownloading = allSectionsStatus === DownloadStatus.DOWNLOADING;
            }
        } finally {
            if (allSectionsSection) {
                allSectionsSection.isDownloading = false;
            }
        }
    }

    /**
     * Prefetch a certain section if it needs to be prefetched.
     * If the section is "All sections" it will be ignored.
     *
     * @param section Section to prefetch.
     * @param courseId Course ID the section belongs to.
     * @returns Promise resolved when the section is prefetched.
     */
    protected async prefetchSingleSectionIfNeeded(section: CoreCourseSectionWithStatus, courseId: number): Promise<void> {
        if (section.id === CORE_COURSE_ALL_SECTIONS_ID || section.hiddenbynumsections) {
            return;
        }

        const promises: Promise<void>[] = [];
        const siteId = CoreSites.getCurrentSiteId();

        section.isDownloading = true;

        // Download the modules.
        promises.push(this.syncModulesAndPrefetchSection(section, courseId));

        // Download the files in the section description.
        const introFiles = CoreFilepool.extractDownloadableFilesFromHtmlAsFakeFileObjects(section.summary);
        promises.push(CorePromiseUtils.ignoreErrors(
            CoreFilepool.addFilesToQueue(siteId, introFiles, CORE_COURSE_COMPONENT, courseId),
        ));

        try {
            await Promise.all(promises);
        } finally {
            section.isDownloading = false;
        }
    }

    /**
     * Sync modules in a section and prefetch them.
     *
     * @param section Section to prefetch.
     * @param courseId Course ID the section belongs to.
     * @returns Promise resolved when the section is prefetched.
     */
    protected async syncModulesAndPrefetchSection(section: CoreCourseSectionWithStatus, courseId: number): Promise<void> {
        const { modules, subsections } = this.classifyContents(section.contents);

        const syncAndPrefetchModules = async () => {
            // Sync the modules first.
            await CoreCourseModulePrefetchDelegate.syncModules(modules, courseId);

            // Validate the section needs to be downloaded and calculate amount of modules that need to be downloaded.
            const result = await CoreCourseModulePrefetchDelegate.getModulesStatus(modules, courseId, section.id);

            if (result.status === DownloadStatus.DOWNLOADED || result.status === DownloadStatus.NOT_DOWNLOADABLE) {
                // Section is downloaded or not downloadable, nothing to do.
                return;
            }

            await this.prefetchSingleSection(section, result, courseId);
        };

        this.setSectionDownloadCount(section, 0, subsections.length, true);

        await Promise.all([
            syncAndPrefetchModules(),
            Promise.all(subsections.map(async (subsection) => {
                await this.prefetchSingleSectionIfNeeded(subsection, courseId);

                this.setSectionDownloadCount(section, (section.subsectionCount ?? 0) + 1, subsections.length, true);
            })),
        ]);
    }

    /**
     * Start or restore the prefetch of a section.
     * If the section is "All sections" it will be ignored.
     *
     * @param section Section to download.
     * @param result Result of CoreCourseModulePrefetchDelegate.getModulesStatus for this section.
     * @param courseId Course ID the section belongs to.
     * @returns Promise resolved when the section has been prefetched.
     */
    protected async prefetchSingleSection(
        section: CoreCourseSectionWithStatus,
        result: CoreCourseModulesStatus,
        courseId: number,
    ): Promise<void> {
        if (section.id === CORE_COURSE_ALL_SECTIONS_ID) {
            return;
        }

        if (section.moduleTotal && section.moduleTotal > 0) {
            // Already being downloaded.
            return;
        }

        // We only download modules with status notdownloaded, downloading or outdated.
        const modules = result[DownloadStatus.OUTDATED]
            .concat(result[DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED])
            .concat(result[DownloadStatus.DOWNLOADING]);

        const downloadId = this.getSectionDownloadId(section);

        section.isDownloading = true;

        // Prefetch all modules to prevent incoherences in download count and to download stale data not marked as outdated.
        await CoreCourseModulePrefetchDelegate.prefetchModules(downloadId, modules, courseId, (data) => {
            this.setSectionDownloadCount(section, data.count, data.total);
        });
    }

    /**
     * Delete course files.
     *
     * @param courseId Course id.
     */
    async deleteCourseFiles(courseId: number): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();
        const sections = await CoreCourse.getSections(courseId);
        const modules = CoreCourse.getSectionsModules(sections);

        await Promise.all([
            ...modules.map((module) => this.removeModuleStoredData(module, courseId)),
            siteId && CoreFilepool.removeFilesByComponent(siteId, CORE_COURSE_COMPONENT, courseId),
        ]);

        await CoreCourseDownloadStatusHelper.setCourseStatus(courseId, DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED);
    }

    /**
     * Remove module stored data.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     */
    async removeModuleStoredData(module: CoreCourseModuleData, courseId: number): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(CoreCourseModulePrefetchDelegate.removeModuleFiles(module, courseId));

        const handler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(module.modname);
        const site = CoreSites.getCurrentSite();
        if (handler && site) {
            promises.push(site.deleteComponentFromCache(handler.component, module.id));
        }

        await Promise.all(promises);
    }

    /**
     * Reset download counts of a section.
     *
     * @param section Section.
     */
    protected resetSectionDownloadCount(section: CoreCourseSectionWithStatus): void {
        section.moduleTotal = undefined;
        section.subsectionTotal = undefined;
        section.moduleCount = undefined;
        section.subsectionCount = undefined;
        section.total = undefined;
    }

    /**
     * Set download counts of a section.
     *
     * @param section Section.
     * @param count Count value.
     * @param total Total value.
     * @param isSubsectionCount True to set subsection count, false to set module count.
     */
    protected setSectionDownloadCount(
        section: CoreCourseSectionWithStatus,
        count: number,
        total: number,
        isSubsectionCount = false,
    ): void {
        if (isSubsectionCount) {
            section.subsectionCount = count;
            section.subsectionTotal = total;
        } else {
            section.moduleCount = count;
            section.moduleTotal = total;
        }

        section.count = section.moduleCount !== undefined && section.subsectionCount !== undefined
            ? section.moduleCount + section.subsectionCount
            : undefined;
        section.total = section.moduleTotal !== undefined && section.subsectionTotal !== undefined
            ? section.moduleTotal + section.subsectionTotal
            : undefined;
    }

    /**
     * Given section contents, classify them into modules and sections.
     *
     * @param contents Contents.
     * @returns Classified contents.
     */
    protected classifyContents<
        Contents extends CoreCourseModuleOrSection,
        Module = Extract<Contents, CoreCourseModuleData>,
        Section = Extract<Contents, CoreCourseWSSection>,
    >(contents: Contents[]): { modules: Module[]; subsections: Section[] } {
        const modules: Module[] = [];
        const subsections: Section[] = [];

        contents.forEach((content) => {
            if (sectionContentIsModule(content)) {
                modules.push(content as Module);
            } else {
                subsections.push(content as unknown as Section);
            }
        });

        return { modules, subsections };
    }

}
export const CoreCoursePrefetch = makeSingleton(CoreCoursePrefetchService);

/**
 * Section with data about prefetch.
 */
export type CoreCourseSectionWithStatus = CoreCourseSection & {
    downloadStatus?: DownloadStatus; // Section status.
    isDownloading?: boolean; // Whether section is being downloaded.
    total?: number; // Total of modules and subsections being downloaded.
    count?: number; // Number of downloaded modules and subsections.
    moduleTotal?: number; // Total of modules being downloaded.
    moduleCount?: number; // Number of downloaded modules.
    subsectionTotal?: number; // Total of subsections being downloaded.
    subsectionCount?: number; // Number of downloaded subsections.
    isCalculating?: boolean; // Whether status is being calculated.
};

/**
 * Options for prefetch course function.
 */
export type CoreCoursePrefetchCourseOptions = {
    sections?: CoreCourseWSSection[]; // List of course sections.
    courseHandlers?: CoreCourseOptionsHandlerToDisplay[]; // List of course handlers.
    menuHandlers?: CoreCourseOptionsMenuHandlerToDisplay[]; // List of course menu handlers.
    isGuest?: boolean; // Whether the user is using an ACCESS_GUEST enrolment method.
};

/**
 * Options for confirm and prefetch courses function.
 */
export type CoreCourseConfirmPrefetchCoursesOptions = {
    onProgress?: (data: CoreCourseCoursesProgress) => void;
};

/**
 * Progress of downloading a list of courses.
 */
type CoreCourseCoursesProgress = {
    count: number; // Number of courses downloaded so far.
    total: number; // Total of courses to download.
    success: boolean; // Whether the download has been successful so far.
    courseId?: number; // Last downloaded course.
};

/**
 * Prefetch info of a module.
 */
export type CoreCourseModulePrefetchInfo = CoreCourseModulePackageLastDownloaded & {
    size: number; // Downloaded size.
    sizeReadable: string; // Downloadable size in a readable format.
    status: DownloadStatus; // Module status.
    statusIcon?: string; // Icon's name of the module status.
};

/**
 * Prefetch info of a module.
 */
export type CoreCourseModulePackageLastDownloaded = {
    downloadTime: number; // Time when the module was last downloaded.
    downloadTimeReadable: string; // Download time in a readable format.
};

export type CorePrefetchStatusInfo = {
    status: DownloadStatus; // Status of the prefetch.
    statusTranslatable: string; // Status translatable string.
    icon: CoreCourseDownloadStatusIcon; // Icon based on the status.
    loading: boolean; // If it's a loading status.
    badge?: string; // Progress badge string if any.
    badgeA11yText?: string; // Description of the badge if any.
    count?: number; // Amount of already downloaded courses.
    total?: number; // Total of courses.
    downloadSucceeded?: boolean; // Whether download has succeeded (in case it's downloaded).
};
