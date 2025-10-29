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

import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import {
    CoreCourse,
    CoreCourseCompletionActivityStatus,
    CoreCourseModuleWSCompletionData,
    CoreCourseWSSection,
    CoreCourseGetContentsWSModule,
    sectionContentIsModule,
    CoreCourseAnyModuleData,
    CoreCourseModuleContentFile,
} from './course';
import { ApplicationInit, makeSingleton, Translate } from '@singletons';
import { CoreArray } from '@static/array';
import {
    CoreCourseAnyCourseData,
    CoreCourseBasicData,
    CoreCourses,
    CoreCourseSearchedData,
    CoreEnrolledCourseData,
} from '@features/courses/services/courses';
import { CoreCourseOffline } from './course-offline';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerData } from './module-delegate';
import { CoreNetwork } from '@services/network';
import { DEFAULT_TEXT_FORMAT } from '@static/text';
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
} from '../constants';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CORE_SITEHOME_PAGE_NAME } from '@features/sitehome/constants';
import { DownloadStatus } from '@/core/constants';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreOpenerOpenFileOptions } from '@static/opener';
import {
    CoreCourseSectionWithStatus,
    CorePrefetchStatusInfo,
    CoreCoursePrefetchCourseOptions,
    CoreCourseConfirmPrefetchCoursesOptions,
    CoreCourseModulePrefetchInfo,
    CoreCourseModulePackageLastDownloaded,
    CoreCoursePrefetch,
} from './course-prefetch';
import { CoreCourseModulesStatus, CoreCourseModulePrefetchHandler } from './module-prefetch-delegate';

/**
 * Helper to gather some common course functions.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseHelperProvider {

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
     * @deprecated since 5.2. Use CoreCoursePrefetch.calculateSectionStatus instead.
     */
    async calculateSectionStatus(
        section: CoreCourseSection,
        courseId: number,
        refresh?: boolean,
        checkUpdates = true,
    ): Promise<{ statusData: CoreCourseModulesStatus; section: CoreCourseSectionWithStatus }> {
        return CoreCoursePrefetch.calculateSectionStatus(section, courseId, refresh, checkUpdates);
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.confirmAndPrefetchCourse instead.
     */
    async confirmAndPrefetchCourse(
        data: CorePrefetchStatusInfo,
        course: CoreCourseAnyCourseData,
        options: CoreCoursePrefetchCourseOptions = {},
    ): Promise<void> {
        return CoreCoursePrefetch.confirmAndPrefetchCourse(data, course, options);
    }

    /**
     * Confirm and prefetches a list of courses.
     *
     * @param courses List of courses to download.
     * @param options Other options.
     * @returns Resolved when downloaded, rejected if error or canceled.
     * @deprecated since 5.2. Use CoreCoursePrefetch.confirmAndPrefetchCourses instead.
     */
    async confirmAndPrefetchCourses(
        courses: CoreCourseAnyCourseData[],
        options: CoreCourseConfirmPrefetchCoursesOptions = {},
    ): Promise<void> {
        return CoreCoursePrefetch.confirmAndPrefetchCourses(courses, options);
    }

    /**
     * Calculate the size to download a section and show a confirm modal if needed.
     *
     * @param courseId Course ID the section belongs to.
     * @param sections List of sections to download
     * @param alwaysConfirm True to show a confirm even if the size isn't high, false otherwise.
     * @returns Promise resolved if the user confirms or there's no need to confirm.
     * @deprecated since 5.2. Use CoreCoursePrefetch.confirmDownloadSizeSection instead.
     */
    async confirmDownloadSizeSection(
        courseId: number,
        sections: CoreCourseWSSection[] = [],
        alwaysConfirm = false,
    ): Promise<void> {
        return CoreCoursePrefetch.confirmDownloadSizeSection(courseId, sections, alwaysConfirm);
    }

    /**
     * Sums the stored module sizes.
     *
     * @param modules List of modules.
     * @param courseId Course ID.
     * @returns Promise resolved with the sum of the stored sizes.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getModulesDownloadedSize instead.
     */
    async getModulesDownloadedSize(modules: CoreCourseAnyModuleData[], courseId: number): Promise<number> {
        return CoreCoursePrefetch.getModulesDownloadedSize(modules, courseId);
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.downloadModuleAndOpenFile instead.
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
        return CoreCoursePrefetch.downloadModuleAndOpenFile(
            module,
            courseId,
            component,
            componentId,
            files,
            siteId,
            options,
        );
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.downloadModuleWithMainFileIfNeeded instead.
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
        return CoreCoursePrefetch.downloadModuleWithMainFileIfNeeded(
            module,
            courseId,
            component,
            componentId,
            files,
            siteId,
            options,
        );
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.downloadModule instead.
     */
    async downloadModule(
        module: CoreCourseModuleData,
        courseId: number,
        component?: string,
        componentId?: string | number,
        files?: CoreCourseModuleContentFile[],
        siteId?: string,
    ): Promise<void> {
        return CoreCoursePrefetch.downloadModule(
            module,
            courseId,
            component,
            componentId,
            files,
            siteId,
        );
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

            return blocks.some((block) => block.name === name);
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.initPrefetchCoursesIcons instead.
     */
    async initPrefetchCoursesIcons(
        courses: CoreCourseBasicData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<CorePrefetchStatusInfo> {
        return CoreCoursePrefetch.initPrefetchCoursesIcons(courses, prefetch);
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.prefetchCourses instead.
     */
    async prefetchCourses(
        courses: CoreCourseAnyCourseData[],
        prefetch: CorePrefetchStatusInfo,
    ): Promise<void> {
        return CoreCoursePrefetch.prefetchCourses(courses, prefetch);
    }

    /**
     * Get a course download promise (if any).
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Download promise, undefined if not found.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getCourseDownloadPromise instead.
     */
    getCourseDownloadPromise(courseId: number, siteId?: string): Promise<void> {
        return CoreCoursePrefetch.getCourseDownloadPromise(courseId, siteId);
    }

    /**
     * Get a course status icon and the langkey to use as a title.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the icon name and the title key.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getCourseStatusIconAndTitle instead.
     */
    async getCourseStatusIconAndTitle(courseId: number, siteId?: string): Promise<CorePrefetchStatusInfo> {
        return CoreCoursePrefetch.getCourseStatusIconAndTitle(courseId, siteId);
    }

    /**
     * Get a course status icon and the langkey to use as a title from status.
     *
     * @param status Course status.
     * @returns Prefetch status info.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getCoursePrefetchStatusInfo instead.
     */
    getCoursePrefetchStatusInfo(status: DownloadStatus): CorePrefetchStatusInfo {
        return CoreCoursePrefetch.getCoursePrefetchStatusInfo(status);
    }

    /**
     * Get prefetch info for a module.
     *
     * @param module Module to get the info from.
     * @param courseId Course ID the section belongs to.
     * @param invalidateCache Invalidates the cache first.
     * @param component Component of the module.
     * @returns Promise resolved with the info.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getModulePrefetchInfo instead.
     */
    async getModulePrefetchInfo(
        module: CoreCourseModuleData,
        courseId: number,
        invalidateCache = false,
        component = '',
    ): Promise<CoreCourseModulePrefetchInfo> {
        return CoreCoursePrefetch.getModulePrefetchInfo(module, courseId, invalidateCache, component);
    }

    /**
     * Get prefetch info for a module.
     *
     * @param module Module to get the info from.
     * @param component Component of the module.
     * @returns Promise resolved with the info.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getModulePackageLastDownloaded instead.
     */
    async getModulePackageLastDownloaded(
        module: CoreCourseModuleData,
        component = '',
    ): Promise<CoreCourseModulePackageLastDownloaded> {
        return CoreCoursePrefetch.getModulePackageLastDownloaded(module, component);
    }

    /**
     * Get the download ID of a section. It's used to interact with CoreCourseModulePrefetchDelegate.
     *
     * @param section Section.
     * @param section.id Section ID.
     * @returns Section download ID.
     * @deprecated since 5.2. Use CoreCoursePrefetch.getSectionDownloadId instead.
     */
    getSectionDownloadId(section: { id: number }): string {
        return CoreCoursePrefetch.getSectionDownloadId(section);
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
        if (!module.handlerData) {
            module.handlerData = await CoreCourseModuleDelegate.getModuleDataFor(
                module.modname,
                module,
                courseId,
                options.sectionId,
                false,
            );
        }

        if (module.handlerData?.action) {
            module.handlerData.action(new Event('click'), module, courseId, {
                animated: false,
                ...options.modNavOptions,
            });

            return true;
        }

        return false;
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.prefetchModule instead.
     */
    async prefetchModule(
        handler: CoreCourseModulePrefetchHandler,
        module: CoreCourseModuleData,
        size: CoreFileSizeSum,
        courseId: number,
        refresh?: boolean,
    ): Promise<void> {
        return CoreCoursePrefetch.prefetchModule(handler, module, size, courseId, refresh);
    }

    /**
     * Prefetch some sections
     *
     * @param sections List of sections.
     * @param courseId Course ID the section belongs to.
     * @param updateAllSections Update all sections status.
     * @returns Promise resolved when done.
     * @deprecated since 5.2. Use CoreCoursePrefetch.prefetchSections instead.
     */
    async prefetchSections(
        sections: CoreCourseSectionWithStatus[],
        courseId: number,
        updateAllSections = false,
    ): Promise<void> {
        return CoreCoursePrefetch.prefetchSections(sections, courseId, updateAllSections);
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
     * @deprecated since 5.2. Use CoreCoursePrefetch.deleteCourseFiles instead.
     */
    async deleteCourseFiles(courseId: number): Promise<void> {
        return CoreCoursePrefetch.deleteCourseFiles(courseId);
    }

    /**
     * Remove module stored data.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     * @deprecated since 5.2. Use CoreCoursePrefetch.removeModuleStoredData instead.
     */
    async removeModuleStoredData(module: CoreCourseModuleData, courseId: number): Promise<void> {
        return CoreCoursePrefetch.removeModuleStoredData(module, courseId);
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
     * This is meant to be here so it can be overridden.
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
     * @param options Options to pass to the modal.
     * @param options.params Params to pass to the page.
     */
    async openCourseSummary(course: CoreCourseWithImageAndColor & CoreCourseAnyCourseData, options: Params = {}): Promise<void> {
        const page = await this.getCourseSummaryPage();

        CoreModals.openSideModal<void>({
            component: page.default,
            componentProps: {
                courseId: course.id,
                course: course,
                ...options,
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
     * @param searchValue.id Section id.
     * @param searchValue.num Section number.
     * @param searchValue.moduleId Module id.
     * @returns Section object, list of parents (if any) from top to bottom.
     */
    findSection<T extends CoreCourseWSSection>(
        sections: T[],
        searchValue: { id?: number; num?: number; moduleId?: number },
    ): { section: T | undefined; parents: T[] } {
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
