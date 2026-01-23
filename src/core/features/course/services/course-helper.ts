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
import { dayjs } from '@/core/utils/dayjs';

import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import {
    CoreCourse,
    CoreCourseCompletionActivityStatus,
    CoreCourseModuleWSCompletionData,
    CoreCourseModuleContentFile,
    CoreCourseWSSection,
    CoreCourseGetContentsWSModule,
    sectionContentIsModule,
    CoreCourseAnyModuleData,
    CoreCourseModuleOrSection,
} from './course';
import { CoreConstants, DownloadStatus, ContextLevel } from '@/core/constants';
import { CoreLogger } from '@singletons/logger';
import { ApplicationInit, makeSingleton, Translate } from '@singletons';
import { CoreFilepool } from '@services/filepool';
import { CoreArray } from '@singletons/array';
import {
    CoreCourseAnyCourseData,
    CoreCourseBasicData,
    CoreCourses,
    CoreCourseSearchedData,
    CoreEnrolledCourseData,
} from '@features/courses/services/courses';
import { CoreCourseOffline } from './course-offline';
import {
    CoreCourseOptionsDelegate,
    CoreCourseOptionsHandlerToDisplay,
    CoreCourseOptionsMenuHandlerToDisplay,
} from './course-options-delegate';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerData } from './module-delegate';
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
import { CoreUrl } from '@singletons/url';
import { CoreText, DEFAULT_TEXT_FORMAT } from '@singletons/text';
import { CoreTime } from '@singletons/time';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { CoreNetworkError } from '@classes/errors/network-error';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { CoreCourseWithImageAndColor } from '@features/courses/services/courses-helper';
import { CoreRemindersPushNotificationData } from '@features/reminders/services/reminders';
import { CoreLocalNotifications } from '@services/local-notifications';
import { CoreEnrol } from '@features/enrol/services/enrol';
import { CoreEnrolAction, CoreEnrolDelegate } from '@features/enrol/services/enrol-delegate';
import { LazyDefaultStandaloneComponent } from '@/app/app-routing.module';
import { CoreModals } from '@services/overlays/modals';
import { CoreLoadings } from '@services/overlays/loadings';
import {
    CoreCourseModuleCompletionTracking,
    CoreCourseModuleCompletionStatus,
    CORE_COURSE_ALL_SECTIONS_ID,
    CORE_COURSE_STEALTH_MODULES_SECTION_ID,
    CORE_COURSE_COMPONENT,
} from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreOpener, CoreOpenerOpenFileOptions } from '@singletons/opener';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseDownloadStatusHelper } from './course-download-status-helper';
import { CORE_SITEHOME_PAGE_NAME } from '@features/sitehome/constants';

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
    status: DownloadStatus; // Status of the prefetch.
    statusTranslatable: string; // Status translatable string.
    icon: string; // Icon based on the status.
    loading: boolean; // If it's a loading status.
    badge?: string; // Progress badge string if any.
    badgeA11yText?: string; // Description of the badge if any.
    count?: number; // Amount of already downloaded courses.
    total?: number; // Total of courses.
    downloadSucceeded?: boolean; // Whether download has succeeded (in case it's downloaded).
};

/**
 * Helper to gather some common course functions.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseHelperProvider {

    protected courseDwnPromises: { [s: string]: { [id: number]: Promise<void> } } = {};
    protected logger = CoreLogger.getInstance('CoreCourseHelperProvider');

    /**
     * This function treats every module on the sections provided to load the handler data, treat completion
     * and navigate to a module page if required. It also returns if sections has content.
     *
     * @param sections List of sections to treat modules.
     * @param courseId Course ID of the modules.
     * @param completionStatus List of completion status.
     * @param courseName Not used since 4.0
     * @param forCoursePage Whether the data will be used to render the course page.
     * @returns Whether the sections have content.
     */
    async addHandlerDataForModules(
        sections: CoreCourseWSSection[],
        courseId: number,
        completionStatus?: Record<string, CoreCourseCompletionActivityStatus>,
        courseName?: string,
        forCoursePage = false,
    ): Promise<{ hasContent: boolean; sections: CoreCourseSection[] }> {

        let hasContent = false;

        const treatSection = async (sectionToTreat: CoreCourseWSSection): Promise<CoreCourseSection> => {
            const section = {
                ...sectionToTreat,
                hasContent: this.sectionHasContent(sectionToTreat),
            };

            if (!section.hasContent) {
                return section;
            }

            hasContent = true;

            section.contents = await Promise.all(section.contents.map(async (module) => {
                if (!sectionContentIsModule(module)) {
                    return await treatSection(module);
                }

                module.handlerData = await CoreCourseModuleDelegate.getModuleDataFor(
                    module.modname,
                    module,
                    courseId,
                    section.id,
                    forCoursePage,
                );

                if (!module.completiondata && completionStatus && completionStatus[module.id] !== undefined) {
                    // Should not happen on > 3.6. Check if activity has completions and if it's marked.
                    const activityStatus = completionStatus[module.id];

                    module.completiondata = {
                        state: activityStatus.state,
                        timecompleted: activityStatus.timecompleted,
                        overrideby: activityStatus.overrideby || 0,
                        valueused: activityStatus.valueused,
                        tracking: activityStatus.tracking,
                        courseId,
                        cmid: module.id,
                    };
                }

                // Check if the module is stealth.
                module.isStealth = CoreCourseHelper.isModuleStealth(module, section);

                return module;
            }));

            return section;
        };

        const formattedSections = await Promise.all(sections.map((courseSection) => treatSection(courseSection)));

        return { hasContent, sections: formattedSections };
    }

    /**
     * Module is stealth.
     *
     * @param module Module to check.
     * @param section Section to check. If the module belongs to a subsection, you can pass either the subsection or the parent
     *               section. Subsections inherit the visibility from their parent section.
     * @returns Wether the module is stealth.
     */
    isModuleStealth(module: CoreCourseModuleData, section?: CoreCourseWSSection): boolean {
        // visibleoncoursepage can be 1 for teachers when the section is hidden.
        return !!module.visible && (!module.visibleoncoursepage || (!!section && !section.visible));
    }

    /**
     * Module is visible by the user.
     *
     * @param module Module to check.
     * @param section Section to check. Omitted if not defined. If the module belongs to a subsection, you can pass either the
     *                subsection or the parent section. Subsections inherit the visibility from their parent section.
     * @returns Wether the section is visible by the user.
     */
    canUserViewModule(module: CoreCourseModuleData, section?: CoreCourseWSSection): boolean {
        return module.uservisible !== false && (!section || CoreCourseHelper.canUserViewSection(section));
    }

    /**
     * Section is stealth.
     * This should not be true on Moodle 4.0 onwards.
     *
     * @param section Section to check.
     * @returns Wether section is stealth (accessible but not visible to students).
     */
    isSectionStealth(section: CoreCourseWSSection): boolean {
        return section.hiddenbynumsections === 1 || section.id === CORE_COURSE_STEALTH_MODULES_SECTION_ID;
    }

    /**
     * Section is visible by the user.
     *
     * @param section Section to check.
     * @returns Wether the section is visible by the user.
     */
    canUserViewSection(section: CoreCourseWSSection): boolean {
        return section.uservisible !== false;
    }

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
        checkUpdates: boolean = true,
    ): Promise<{statusData: CoreCourseModulesStatus; section: CoreCourseSectionWithStatus}> {
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
     * @returns Promise resolved when the download finishes, rejected if an error occurs or the user cancels.
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
        data.icon = CoreConstants.ICON_DOWNLOADING;
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
     * @returns Resolved when downloaded, rejected if error or canceled.
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

        return CorePromiseUtils.allPromises(promises);
    }

    /**
     * Calculate the size to download a section and show a confirm modal if needed.
     *
     * @param courseId Course ID the section belongs to.
     * @param sections List of sections to download
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     * @returns Promise resolved if the user confirms or there's no need to confirm.
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
     * Check whether a course is accessed using guest access and if it requires user input to enter.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Data about guest access info.
     */
    async courseUsesGuestAccessInfo(
        courseId: number,
        siteId?: string,
    ): Promise<CoreCourseGuestAccessInfo> {
        const accessData: CoreCourseGuestAccessInfo = {
            guestAccess: false,
        };

        try {
            try {
                // Check if user is enrolled. If enrolled, no guest access.
                await CoreCourses.getUserCourse(courseId, false, siteId);

                return accessData;
            } catch {
                // Ignore errors.
            }

            try {
                // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
                await CoreCourses.getCourse(courseId, siteId);

                return accessData;
            } catch {
                // Ignore errors.
            }

            // Check if guest access is enabled.
            const enrolmentMethods = await CoreEnrol.getSupportedCourseEnrolmentMethods(courseId, {
                action: CoreEnrolAction.GUEST,
                siteId,
            });

            if (!enrolmentMethods) {
                return accessData;
            }

            const results = await Promise.all(enrolmentMethods.map(method => CoreEnrolDelegate.canAccess(method)));

            results.forEach(result => {
                accessData.guestAccess = accessData.guestAccess || result.canAccess;
                if (accessData.requiresUserInput !== false && result.canAccess) {
                    accessData.requiresUserInput = result.requiresUserInput ?? accessData.requiresUserInput;
                }
            });

            return accessData;
        } catch {
            return accessData;
        }
    }

    /**
     * Create and return a section for "All sections".
     *
     * @returns Created section.
     */
    createAllSectionsSection(): CoreCourseSection {
        return {
            id: CORE_COURSE_ALL_SECTIONS_ID,
            name: Translate.instant('core.course.allsections'),
            hasContent: true,
            summary: '',
            summaryformat: DEFAULT_TEXT_FORMAT,
            modules: [],
            contents: [],
        };
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
     * @returns Resolved on success.
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
            return this.openModuleFileInBrowser(mainFile.fileurl, site, module, courseId, component, componentId, files, options);
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
            return CoreOpener.openFile(result.path, options);
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
     * @returns Promise resolved when done.
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
                return prefetchHandler.download(module, courseId);
            }

            return prefetchHandler.prefetch(module, courseId, true);
        }

        // There's no prefetch handler for the module, just download the files.
        files = files || module.contents || [];

        await CoreFilepool.downloadOrPrefetchFiles(siteId, files, false, false, component, componentId);
    }

    /**
     * Get a course. It will first check the user courses, and fallback to another WS if not enrolled.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the course.
     */
    async getCourse(
        courseId: number,
        siteId?: string,
    ): Promise<{ enrolled: boolean; course: CoreEnrolledCourseData | CoreCourseSearchedData }> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Try with enrolled courses first.
        try {
            const course = await CoreCourses.getUserCourse(courseId, false, siteId);

            return ({ enrolled: true, course: course });
        } catch {
            // Not enrolled or an error happened. Try to use another WebService.
        }

        const course = await CoreCourses.getCourseByField('id', courseId, siteId);

        return ({ enrolled: false, course: course });
    }

    /**
     * Get a course, wait for any course format plugin to load, and open the course page. It basically chains the functions
     * getCourse and openCourse.
     *
     * @param courseId Course ID.
     * @param params Other params to pass to the course page.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async getAndOpenCourse(courseId: number, params: Params = {}, siteId?: string): Promise<void> {
        siteId = siteId ?? CoreSites.getCurrentSiteId();

        // Do not navigate if the course is already being displayed.
        if (siteId === CoreSites.getCurrentSiteId() && CoreCourse.currentViewIsCourse(courseId)) {
            CoreCourse.selectCourseTab(params.selectedTab, params);

            return;
        }

        const modal = await CoreLoadings.show();

        let course: CoreCourseAnyCourseData | { id: number };

        try {
            const data = await this.getCourse(courseId, siteId);

            course = data.course;
        } catch {
            // Cannot get course, return a "fake".
            course = { id: courseId };
        }

        modal?.dismiss();

        return this.openCourse(course, { params , siteId });
    }

    /**
     * Check if the course has a block with that name.
     *
     * @param courseId Course ID.
     * @param name Block name to search.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with true if the block exists or false otherwise.
     * @since 3.7
     */
    async hasABlockNamed(courseId: number, name: string, siteId?: string): Promise<boolean> {
        try {
            const blocks = await CoreCourse.getCourseBlocks(courseId, siteId);

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
     * @returns Resolved with the prefetch information updated when done.
     */
    async initPrefetchCoursesIcons(
        courses: CoreCourseBasicData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<CorePrefetchStatusInfo> {
        if (!courses || courses.length <= 0) {
            // Not enough courses.
            prefetch.icon = '';

            return prefetch;
        }

        const status = await this.determineCoursesStatus(courses);

        prefetch = this.getCoursesPrefetchStatusInfo(status);

        if (prefetch.loading) {
            // It seems all courses are being downloaded, show a download button instead.
            prefetch.icon = CoreConstants.ICON_NOT_DOWNLOADED;
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
     * @returns Promise resolved when done.
     */
    async loadOfflineCompletion(courseId: number, sections: CoreCourseWSSection[], siteId?: string): Promise<void> {
        const offlineCompletions = await CoreCourseOffline.getCourseManualCompletions(courseId, siteId);

        if (!offlineCompletions || !offlineCompletions.length) {
            // No offline completion.
            return;
        }

        const totalOffline = offlineCompletions.length;
        let loaded = 0;
        const offlineCompletionsMap = CoreArray.toObject(offlineCompletions, 'cmid');

        const loadSectionOfflineCompletion = (section: CoreCourseWSSection): void => {
            if (!section.contents || !section.contents.length) {
                return;
            }

            for (let j = 0; j < section.contents.length && loaded < totalOffline; j++) {
                const modOrSubsection = section.contents[j];
                if (!sectionContentIsModule(modOrSubsection)) {
                    loadSectionOfflineCompletion(modOrSubsection);

                    continue;
                }

                const offlineCompletion = offlineCompletionsMap[modOrSubsection.id];

                if (offlineCompletion && modOrSubsection.completiondata !== undefined &&
                    offlineCompletion.timecompleted >= modOrSubsection.completiondata.timecompleted * 1000) {
                    // The module has offline completion. Load it.
                    modOrSubsection.completiondata.state = offlineCompletion.completed;
                    modOrSubsection.completiondata.offline = true;

                    loaded++;
                }
            }
        };

        // Load the offline data in the modules.
        for (let i = 0; i < sections.length && loaded < totalOffline; i++) {
            loadSectionOfflineCompletion(sections[i]);
        }
    }

    /**
     * Load offline completion for a certain module.
     * This should be used in 3.6 sites or higher, where the course contents already include the completion.
     *
     * @param courseId The course to get the completion.
     * @param module The module.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @deprecated since 5.1. Use loadOfflineCompletionData instead.
     */
    async loadModuleOfflineCompletion(courseId: number, module: CoreCourseModuleData, siteId?: string): Promise<void> {
        module.completiondata = await this.loadOfflineCompletionData(module.id, module.completiondata, siteId);
    }

    /**
     * Given a completion info, load the offline completion any and return the completion with the offline data added.
     *
     * @param cmId The module ID.
     * @param completiondata The completion data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Completion data with offline info added if there's any.
     */
    async loadOfflineCompletionData(
        cmId: number,
        completiondata?: CoreCourseModuleCompletionData,
        siteId?: string,
    ): Promise<CoreCourseModuleCompletionData | undefined> {
        if (!completiondata) {
            return;
        }

        const offlineCompletion = await CorePromiseUtils.ignoreErrors(CoreCourseOffline.getManualCompletion(cmId, siteId));

        if (offlineCompletion && offlineCompletion.timecompleted >= completiondata.timecompleted * 1000) {
            return {
                ...completiondata,
                state: offlineCompletion.completed,
                offline: true,
            };
        }

        return completiondata;
    }

    /**
     * Prefetch all the courses in the array.
     *
     * @param courses Courses array to prefetch.
     * @param prefetch Prefetch information to be updated.
     * @returns Promise resolved when done.
     */
    async prefetchCourses(
        courses: CoreCourseAnyCourseData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<void> {
        prefetch.loading = true;
        prefetch.icon = CoreConstants.ICON_DOWNLOADING;
        prefetch.badge = '';

        const prefetchOptions = {
            onProgress: (progress) => {
                prefetch.badge = `${progress.count} / ${progress.total}`;
                prefetch.badgeA11yText = Translate.instant('core.course.downloadcoursesprogressdescription', progress);
                prefetch.count = progress.count;
                prefetch.total = progress.total;
            },
        };

        try {
            await this.confirmAndPrefetchCourses(courses, prefetchOptions);
            prefetch.icon = CoreConstants.ICON_OUTDATED;
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
    protected getPrefetchStatusIcon(status: DownloadStatus, trustDownload: boolean = false): string {
        if (status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED) {
            return CoreConstants.ICON_NOT_DOWNLOADED;
        }
        if (status === DownloadStatus.OUTDATED || (status === DownloadStatus.DOWNLOADED && !trustDownload)) {
            return CoreConstants.ICON_OUTDATED;
        }
        if (status === DownloadStatus.DOWNLOADED && trustDownload) {
            return CoreConstants.ICON_DOWNLOADED;
        }
        if (status === DownloadStatus.DOWNLOADING) {
            return CoreConstants.ICON_DOWNLOADING;
        }

        return CoreConstants.ICON_DOWNLOADING;
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
                statusIcon = CoreConstants.ICON_NOT_DOWNLOADED;
                break;
            case DownloadStatus.DOWNLOADING:
                statusIcon = CoreConstants.ICON_DOWNLOADING;
                break;
            case DownloadStatus.OUTDATED:
                statusIcon = CoreConstants.ICON_OUTDATED;
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
        if (now - downloadTime < 7 * 86400) {
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
     * @returns Section download ID.
     */
    getSectionDownloadId(section: {id: number}): string {
        return `Section-${section.id}`;
    }

    /**
     * Navigate to a module using instance ID and module name.
     *
     * @param instanceId Activity instance ID.
     * @param modName Module name of the activity.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async navigateToModuleByInstance(
        instanceId: number,
        modName: string,
        options: CoreCourseNavigateToModuleByInstanceOptions = {},
    ): Promise<void> {

        const modal = await CoreLoadings.show();

        try {
            const module = await CoreCourse.getModuleBasicInfoByInstance(instanceId, modName, { siteId: options.siteId });

            this.navigateToModule(
                module.id,
                {
                    ...options,
                    courseId: module.course,
                    modName: options.useModNameToGetModule ? modName : undefined,
                },
            );
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            // Just in case. In fact we need to dismiss the modal before showing a toast or error message.
            modal.dismiss();
        }
    }

    /**
     * Navigate to a module.
     *
     * @param moduleId Module's ID.
     * @param options Other options.
     * @returns Promise resolved when done.
     */
    async navigateToModule(
        moduleId: number,
        options: CoreCourseNavigateToModuleOptions = {},
    ): Promise<void> {
        const siteId = options.siteId || CoreSites.getCurrentSiteId();
        let courseId = options.courseId;

        const modal = await CoreLoadings.show();

        try {
            if (!courseId) {
                const module = await CoreCourse.getModuleBasicInfo(
                    moduleId,
                    { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
                );

                courseId = module.course;
            }

            // Get the site.
            const site = await CoreSites.getSite(siteId);

            // Get the module.
            const module = await CoreCourse.getModule(moduleId, courseId, undefined, false, false, siteId, options.modName);

            if (CoreSites.getCurrentSiteId() === site.getId()) {
                // Try to use the module's handler to navigate cleanly.
                module.handlerData = await CoreCourseModuleDelegate.getModuleDataFor(
                    module.modname,
                    module,
                    courseId,
                    module.section,
                    false,
                );

                if (module.handlerData?.action) {
                    modal.dismiss();

                    return module.handlerData.action(new Event('click'), module, courseId, options.modNavOptions);
                }
            }

            const params: Params = {
                course: { id: courseId },
                module,
                modNavOptions: options.modNavOptions,
            };

            if (courseId === site.getSiteHomeId()) {
                // Check if site home is available.
                const isAvailable = await CoreSiteHome.isAvailable();

                if (isAvailable) {
                    await CoreNavigator.navigateToSitePath(CORE_SITEHOME_PAGE_NAME, { params, siteId });

                    return;
                }
            }

            modal.dismiss();

            params.sectionId = module.section;

            await this.getAndOpenCourse(courseId, params, siteId);
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Open a module.
     *
     * @param module The module to open.
     * @param courseId The course ID of the module.
     * @param options Other options.
     * @returns True if module can be opened, false otherwise.
     */
    async openModule(module: CoreCourseModuleData, courseId: number, options: CoreCourseOpenModuleOptions = {}): Promise<boolean> {
        console.log('[CourseHelper] openModule called for module:', module.id, module.name, module.modname);
        
        // Check if viewing as mentee
        const { CoreUserParent } = await import('@features/user/services/parent');
        const site = CoreSites.getCurrentSite();
        console.log('[CourseHelper] Current site:', site?.getId());
        
        if (site) {
            const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
            console.log('[CourseHelper] Selected mentee ID:', selectedMenteeId);
            console.log('[CourseHelper] Current user ID:', site.getUserId());
            
            if (selectedMenteeId && selectedMenteeId !== site.getUserId()) {
                console.log('[CourseHelper] Parent viewing mentee activity - using custom handler');
                // Parent viewing mentee's activity - show custom parent view
                try {
                    // Check if custom WS is available
                    const hasCustomWS = await site.wsAvailable('local_aspireparent_get_mentee_activity_info');
                    console.log('[CourseHelper] Custom WS available:', hasCustomWS);
                    
                    if (hasCustomWS) {
                        console.log('[CourseHelper] Calling custom WS with params:', {
                            cmid: module.id,
                            userid: selectedMenteeId,
                        });
                        
                        // Fetch activity info using custom WS
                        const activityInfo: any = await site.read('local_aspireparent_get_mentee_activity_info', {
                            cmid: module.id,
                            userid: selectedMenteeId,
                        });
                        
                        console.log('[CourseHelper] Activity info received:', activityInfo);
                        
                        // Build HTML content to display
                        let content = `<h2>${activityInfo.name}</h2>`;
                        content += `<p><strong>Activity Type:</strong> ${CoreCourse.translateModuleName(activityInfo.modname)}</p>`;
                        
                        if (activityInfo.intro) {
                            content += `<div class="activity-intro">${activityInfo.intro}</div>`;
                        }
                        
                        // Add module-specific content
                        if (activityInfo.duedate) {
                            const dueDate = new Date(activityInfo.duedate * 1000);
                            content += `<p><strong>Due Date:</strong> ${dueDate.toLocaleString()}</p>`;
                        }
                        
                        if (activityInfo.grade) {
                            content += `<p><strong>Grade:</strong> ${activityInfo.grade}</p>`;
                        }
                        
                        // Show submissions for assignments
                        if (activityInfo.submissions && activityInfo.submissions.length > 0) {
                            content += '<h3>Submission Status</h3>';
                            activityInfo.submissions.forEach((sub: any) => {
                                content += `<p>Status: ${sub.status}`;
                                if (sub.grade !== undefined) {
                                    content += ` | Grade: ${sub.grade}`;
                                }
                                content += '</p>';
                            });
                        }
                        
                        // Show attempts for quizzes
                        if (activityInfo.attempts && activityInfo.attempts.length > 0) {
                            content += '<h3>Quiz Attempts</h3>';
                            content += '<ul>';
                            activityInfo.attempts.forEach((attempt: any) => {
                                const startDate = new Date(attempt.timestart * 1000);
                                content += `<li>Attempt ${attempt.attempt}: Started ${startDate.toLocaleString()}`;
                                if (attempt.state === 'finished' && attempt.grade !== undefined) {
                                    content += ` | Grade: ${attempt.grade}`;
                                }
                                content += '</li>';
                            });
                            content += '</ul>';
                        }
                        
                        // Show files for resources
                        if (activityInfo.files && activityInfo.files.length > 0) {
                            content += '<h3>Files</h3>';
                            content += '<ul>';
                            activityInfo.files.forEach((file: any) => {
                                content += `<li><a href="${file.fileurl}" target="_blank">${file.filename}</a> (${Math.round(file.filesize / 1024)} KB)</li>`;
                            });
                            content += '</ul>';
                        }
                        
                        // Show page content
                        if (activityInfo.content) {
                            if (activityInfo.modname === 'url') {
                                content += `<p><strong>URL:</strong> <a href="${activityInfo.content}" target="_blank">${activityInfo.content}</a></p>`;
                            } else {
                                content += `<div class="activity-content">${activityInfo.content}</div>`;
                            }
                        }
                        
                        // Show completion status
                        if (module.completiondata) {
                            content += '<h3>Completion Status</h3>';
                            const completion = module.completiondata;
                            if (completion.state === 0) {
                                content += '<p>Not completed</p>';
                            } else if (completion.state === 1) {
                                content += '<p>Completed</p>';
                            } else if (completion.state === 2) {
                                content += '<p>Completed (Passed)</p>';
                            } else if (completion.state === 3) {
                                content += '<p>Completed (Failed)</p>';
                            }
                        }
                        
                        if (activityInfo.message) {
                            content += `<p class="alert alert-info">${activityInfo.message}</p>`;
                        }
                        
                        // Show the content in a modal
                        await CoreAlerts.show({ message: content, header: 'Activity Details' });
                        return true;
                    } else {
                        console.log('[CourseHelper] Custom WS not available, falling back to default handler');
                    }
                } catch (error) {
                    // Fall back to showing basic info if custom WS fails
                    console.error('[CourseHelper] Error fetching mentee activity info:', error);
                    console.error('[CourseHelper] Error details:', {
                        message: error.message,
                        code: error.code,
                        debuginfo: error.debuginfo
                    });
                }
            } else {
                console.log('[CourseHelper] Not viewing as mentee, using default handler');
            }
        } else {
            console.log('[CourseHelper] No site available');
        }
        
        console.log('[CourseHelper] Using default module handler');
        
        if (!module.handlerData) {
            console.log('[CourseHelper] Getting module handler data for:', module.modname);
            module.handlerData = await CoreCourseModuleDelegate.getModuleDataFor(
                module.modname,
                module,
                courseId,
                options.sectionId,
                false,
            );
            console.log('[CourseHelper] Module handler data:', module.handlerData);
        }

        if (module.handlerData?.action) {
            console.log('[CourseHelper] Calling module handler action');
            module.handlerData.action(new Event('click'), module, courseId, {
                animated: false,
                ...options.modNavOptions,
            });

            return true;
        }

        console.log('[CourseHelper] No handler action available for module');
        return false;
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
     * @returns Promise resolved when downloaded.
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
     * @param sections List of sections. .
     * @param courseId Course ID the section belongs to.
     * @param updateAllSections Update all sections status
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
                allSectionsSection = this.createAllSectionsSection();
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
                return ;
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
            return ;
        }

        // We only download modules with status notdownloaded, downloading or outdated.
        const modules = result[DownloadStatus.OUTDATED].concat(result[DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED])
            .concat(result[DownloadStatus.DOWNLOADING]);
        const downloadId = this.getSectionDownloadId(section);

        section.isDownloading = true;

        // Prefetch all modules to prevent incoeherences in download count and to download stale data not marked as outdated.
        await CoreCourseModulePrefetchDelegate.prefetchModules(downloadId, modules, courseId, (data) => {
            this.setSectionDownloadCount(section, data.count, data.total);
        });
    }

    /**
     * Check if a section has content.
     *
     * @param section Section to check.
     * @returns Whether the section has content.
     */
    sectionHasContent(section: CoreCourseWSSection): boolean {
        if (section.hiddenbynumsections) {
            return false;
        }

        return (section.availabilityinfo !== undefined && section.availabilityinfo !== '') ||
            section.summary !== '' ||
            section.contents.filter(modOrSubsection =>
                !('visibleoncoursepage' in modOrSubsection) || modOrSubsection.visibleoncoursepage !== 0).length > 0;
    }

    /**
     * Wait for any course format plugin to load, and open the course page.
     *
     * If the plugin's promise is resolved, the course page will be opened. If it is rejected, they will see an error.
     * If the promise for the plugin is still in progress when the user tries to open the course, a loader
     * will be displayed until it is complete, before the course page is opened. If the promise is already complete,
     * they will see the result immediately.
     *
     * @param course Course to open
     * @param navOptions Navigation options that includes params to pass to the page.
     * @returns Promise resolved when done.
     */
    async openCourse(
        course: CoreCourseAnyCourseData | { id: number },
        navOptions?: CoreNavigationOptions & { siteId?: string },
    ): Promise<void> {
        const siteId = navOptions?.siteId;
        if (!siteId || siteId === CoreSites.getCurrentSiteId()) {
            // Current site, we can open the course.
            return CoreCourse.openCourse(course, navOptions);
        } else {
            // We need to load the site first.
            navOptions = navOptions || {};

            navOptions.params = navOptions.params || {};
            Object.assign(navOptions.params, { course: course });

            await CoreNavigator.navigateToSitePath(`course/${course.id}`, navOptions);
        }
    }

    /**
     * Check if user can access the course.
     *
     * @param courseId Course ID.
     * @returns Promise resolved with boolean: whether user can access the course.
     */
    async userHasAccessToCourse(courseId: number): Promise<boolean> {
        if (CoreNetwork.isOnline()) {
            return CorePromiseUtils.promiseWorks(
                CoreCourse.getSections(courseId, true, true, { getFromCache: false, emergencyCache: false }, undefined, false),
            );
        } else {
            return CorePromiseUtils.promiseWorks(
                CoreCourse.getSections(courseId, true, true, { getCacheUsingCacheKey: true }, undefined, false),
            );
        }
    }

    /**
     * Delete course files.
     *
     * @param courseId Course id.
     * @returns Promise to be resolved once the course files are deleted.
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
     * @returns Promise resolved when done.
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
     * Completion clicked.
     *
     * @param completion The completion.
     * @returns Promise resolved with the result.
     */
    async changeManualCompletion(
        completion: CoreCourseModuleCompletionData,
    ): Promise<CoreStatusWithWarningsWSResponse | void> {
        if (!completion) {
            return;
        }

        if (completion.cmid === undefined ||
            completion.tracking !== CoreCourseModuleCompletionTracking.MANUAL) {
            return;
        }

        const modal = await CoreLoadings.show();
        completion.state = completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE
            ? CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE
            : CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE;
        completion.isoverallcomplete = completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE;

        try {
            const response = await CoreCourse.markCompletedManually(
                completion.cmid,
                completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE,
                completion.courseId,
            );

            if (response.offline) {
                completion.offline = true;
            }

            return response;
        } catch (error) {
            // Restore previous state.
            completion.state = completion.state === CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE
                ? CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE
                : CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE;
            completion.isoverallcomplete = !completion.isoverallcomplete;

            CoreAlerts.showError(error, { default: Translate.instant('core.errorchangecompletion') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Retrieves course summary page module.
     * This is meant to be here so it can be overriden.
     *
     * @returns Course summary page module.
     */
    getCourseSummaryPage(): LazyDefaultStandaloneComponent {
        return import('@features/course/pages/course-summary/course-summary');
    }

    /**
     * Open course summary in side modal.
     *
     * @param course Course selected
     */
    async openCourseSummary(course: CoreCourseWithImageAndColor & CoreCourseAnyCourseData): Promise<void> {
        const page = await this.getCourseSummaryPage();

        CoreModals.openSideModal<void>({
            component: page.default,
            componentProps: {
                courseId: course.id,
                course: course,
            },
        });
    }

    /**
     * Register click for reminder local notification.
     *
     * @param component Component to register.
     */
    registerModuleReminderClick(component: string): void {
        CoreLocalNotifications.registerClick<CoreRemindersPushNotificationData>(
            component,
            async (notification) => {
                await ApplicationInit.donePromise;

                CoreCourseHelper.navigateToModule(
                    notification.instanceId,
                    {
                        siteId: notification.siteId,
                    },
                );
            },
        );
    }

    /**
     * Get course communication room URL.
     *
     * @param course Course.
     * @returns Promise resolved with the URL.
     */
    async getCourseCommunicationRoom(course: CoreCourseAnyCourseData): Promise<string | undefined> {

        const site = CoreSites.getRequiredCurrentSite();
        if (!site.isVersionGreaterEqualThan('4.4')) {
            return;
        }

        if ('communicationroomurl' in course) {
            return course.communicationroomurl;
        }

        course = await CoreCourses.getCourseByField('id', course.id, site.id);
        if ('communicationroomurl' in course) {
            return course.communicationroomurl;
        }
    }

    /**
     * Guess if the user is a teacher in a course.
     *
     * @param courseId Course Id.
     * @param course Course object.
     * @returns Promise resolved with boolean: whether the user is a teacher.
     */
    async guessIsTeacher(
        courseId: number,
        course?: CoreEnrolledCourseData | CoreCourseSearchedData,
    ): Promise<boolean> {
        if (course && 'admOptions' in course && course.admOptions) {
            return !!course.admOptions['reports'];
        }

        // Not loaded yet, try to load it.
        const adminOptions = await CoreCourses.getUserAdministrationOptions(
            [courseId],
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        return !!adminOptions[courseId]?.['reports'];
    }

    /**
     * Get the course object whatever the user is enrolled or not..
     *
     * @param courseId Course ID.
     * @returns Promise resolved with the course object if found.
     */
    async getCourseInfo(courseId: number): Promise<CoreCourseAnyCourseData | undefined> {
        try {
            // Check if user is enrolled. If enrolled, no guest access.
            return await CoreCourses.getUserCourse(courseId, true);
        } catch {
            // Ignore errors.
        }

        try {
            // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
            return await CoreCourses.getCourse(courseId);
        } catch {
            // Ignore errors.
        }

        return await CoreCourses.getCourseByField('id', courseId);
    }

    /**
     * Get the completion status of a module.
     *
     * @param completion Completion data.
     * @returns Completion status or undefined if not available.
     */
    getCompletionStatus(completion?: CoreCourseModuleCompletionData): CoreCourseModuleCompletionStatus | undefined {
        if (completion === undefined) {
            return undefined;
        }

        if (completion.tracking === CoreCourseModuleCompletionTracking.NONE) {
            return undefined;
        }

        if (completion.isoverallcomplete === true) {
            // If the module is marked as overall complete, we'll show it as complete.
            return CoreCourseModuleCompletionStatus.COMPLETION_COMPLETE;
        }

        return completion.state;
    }

    /**
     * Find a section by id.
     *
     * @param sections List of sections, with subsections included in the contents.
     * @param searchValue Value to search. If moduleId, returns the section that contains the module.
     * @returns Section object, list of parents (if any) from top to bottom.
     */
    findSection<T extends CoreCourseWSSection>(
        sections: T[],
        searchValue: { id?: number; num?: number; moduleId?: number},
    ): {section: T | undefined; parents: T[]} {
        if (searchValue.id === undefined && searchValue.num === undefined && searchValue.moduleId === undefined) {
            return { section: undefined, parents: [] };
        }

        let foundSection: T | undefined;
        const parents: T[] = [];

        const findInSection = (section: T): T | undefined => {
            if (section.id === searchValue.id || (section.section !== undefined && section.section === searchValue.num)) {
                return section;
            }

            let foundSection: T | undefined;

            section.contents.some(modOrSubsection => {
                if (sectionContentIsModule(modOrSubsection)) {
                    if (searchValue.moduleId !== undefined && modOrSubsection.id === searchValue.moduleId) {
                        foundSection = section;

                        return true;
                    }

                    return false;
                }

                foundSection = findInSection(modOrSubsection as T);
                if (!foundSection) {
                    return false;
                }

                parents.push(section);

                return true;
            });

            return foundSection;
        };

        sections.some(section => {
            foundSection = findInSection(section);

            return !!foundSection;
        });

        return { section: foundSection, parents: parents.reverse() };
    }

    /**
     * Given a list of sections, returns the list of sections and subsections.
     *
     * @param sections Sections.
     * @returns All sections, including subsections.
     */
    flattenSections<T extends CoreCourseWSSection>(sections: T[]): T[] {
        const subsections: T[] = [];

        const getSubsections = (section: T): void => {
            section.contents.forEach((modOrSubsection) => {
                if (!sectionContentIsModule(modOrSubsection)) {
                    subsections.push(modOrSubsection as T);
                    getSubsections(modOrSubsection as T);
                }
            });
        };

        sections.forEach((section) => {
            getSubsections(section);
        });

        return sections.concat(subsections);
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

        section.count = section.moduleCount !== undefined && section.subsectionCount !== undefined ?
            section.moduleCount + section.subsectionCount : undefined;
        section.total = section.moduleTotal !== undefined && section.subsectionTotal !== undefined ?
            section.moduleTotal + section.subsectionTotal : undefined;
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

export const CoreCourseHelper = makeSingleton(CoreCourseHelperProvider);

/**
 * Section with calculated data.
 */
export type CoreCourseSection = Omit<CoreCourseWSSection, 'contents'> & {
    hasContent?: boolean;
    contents: (CoreCourseModuleData | CoreCourseSection)[];
};

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
 * Module with calculated data.
 */
export type CoreCourseModuleData = Omit<CoreCourseGetContentsWSModule, 'completiondata'> & {
    course: number; // The course id.
    isStealth?: boolean;
    handlerData?: CoreCourseModuleHandlerData;
    completiondata?: CoreCourseModuleCompletionData;
    section: number;
};

/**
 * Module completion with calculated data.
 */
export type CoreCourseModuleCompletionData = CoreCourseModuleWSCompletionData & {
    courseId: number;
    tracking: CoreCourseModuleCompletionTracking;
    cmid: number;
    offline?: boolean;
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
 * Common options for navigate to module functions.
 */
type CoreCourseNavigateToModuleCommonOptions = {
    courseId?: number; // Course ID. If not defined we'll try to retrieve it from the site.
    sectionId?: number; // Section the module belongs to. If not defined we'll try to retrieve it from the site.
    modNavOptions?: CoreNavigationOptions; // Navigation options to open the module, including params to pass to the module.
    siteId?: string; // Site ID. If not defined, current site.
};

/**
 * Options for navigate to module by instance function.
 */
export type CoreCourseNavigateToModuleByInstanceOptions = CoreCourseNavigateToModuleCommonOptions & {
    // True to retrieve all instances with a single WS call. Not recommended if can return a lot of contents.
    useModNameToGetModule?: boolean;
};

/**
 * Options for navigate to module function.
 */
export type CoreCourseNavigateToModuleOptions = CoreCourseNavigateToModuleCommonOptions & {
    modName?: string; // To retrieve all instances with a single WS call. Not recommended if can return a lot of contents.
};

/**
 * Options for open module function.
 */
export type CoreCourseOpenModuleOptions = {
    sectionId?: number; // Section the module belongs to.
    modNavOptions?: CoreNavigationOptions; // Navigation options to open the module, including params to pass to the module.
};

/**
 * Result of courseUsesGuestAccessInfo.
 */
export type CoreCourseGuestAccessInfo = {
    guestAccess: boolean; // Whether guest access is enabled for a course.
    requiresUserInput?: boolean; // Whether the first guest access enrolment method requires user input.
};
