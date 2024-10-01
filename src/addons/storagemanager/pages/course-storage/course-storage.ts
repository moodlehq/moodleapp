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

import { CoreConstants, DownloadStatus } from '@/core/constants';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { CoreCourse, CoreCourseProvider } from '@features/course/services/course';
import {
    CoreCourseHelper,
    CoreCourseModuleData,
    CoreCourseSectionWithStatus,
    CorePrefetchStatusInfo,
} from '@features/course/services/course-helper';
import {
    CoreCourseModulePrefetchDelegate,
    CoreCourseModulePrefetchHandler } from '@features/course/services/module-prefetch-delegate';
import { CoreCourseAnyCourseData, CoreCourses } from '@features/courses/services/courses';
import { AccordionGroupChangeEventDetail } from '@ionic/angular';
import { CoreLoadings } from '@services/loadings';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';
import { CoreArray } from '@singletons/array';
import { CoreDom } from '@singletons/dom';
import { CoreEventObserver, CoreEvents, CoreEventSectionStatusChangedData } from '@singletons/events';

/**
 * Page that displays the amount of file storage used by each activity on the course, and allows
 * the user to prefecth and delete this data.
 */
@Component({
    selector: 'page-addon-storagemanager-course-storage',
    templateUrl: 'course-storage.html',
    styleUrl: 'course-storage.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddonStorageManagerCourseStoragePage implements OnInit, OnDestroy {

    courseId!: number;
    title = '';
    loaded = false;
    sections: AddonStorageManagerCourseSection[] = [];
    totalSize = 0;
    calculatingSize = true;
    accordionMultipleValue: string[] = [];

    downloadEnabled = false;
    downloadCourseEnabled = false;

    prefetchCourseData: CorePrefetchStatusInfo = {
        icon: CoreConstants.ICON_LOADING,
        statusTranslatable: 'core.course.downloadcourse',
        status: DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
        loading: true,
    };

    statusDownloaded = DownloadStatus.DOWNLOADED;

    protected siteUpdatedObserver?: CoreEventObserver;
    protected courseStatusObserver?: CoreEventObserver;
    protected sectionStatusObserver?: CoreEventObserver;
    protected moduleStatusObserver?: CoreEventObserver;
    protected isDestroyed = false;
    protected isGuest = false;

    constructor(protected elementRef: ElementRef, protected changeDetectorRef: ChangeDetectorRef) {
        // Refresh the enabled flags if site is updated.
        this.siteUpdatedObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadEnabled = !CoreSites.getRequiredCurrentSite().isOfflineDisabled();

            this.initCoursePrefetch();
            this.initModulePrefetch();
            this.changeDetectorRef.markForCheck();
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.courseId = CoreNavigator.getRequiredRouteParam('courseId');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.title = CoreNavigator.getRouteParam<string>('title') || '';
        if (!this.title && this.courseId == CoreSites.getCurrentSiteHomeId()) {
            this.title = Translate.instant('core.sitehome.sitehome');
        }

        this.isGuest = CoreNavigator.getRouteBooleanParam('isGuest') ??
            (await CoreCourseHelper.courseUsesGuestAccessInfo(this.courseId)).guestAccess;

        const initialSectionId = CoreNavigator.getRouteNumberParam('sectionId');

        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadEnabled = !CoreSites.getRequiredCurrentSite().isOfflineDisabled();

        const sections = (await CoreCourse.getSections(this.courseId, false, true))
            .filter((section) => !CoreCourseHelper.isSectionStealth(section));

        const sectionsToRender = (await CoreCourseHelper.addHandlerDataForModules(sections, this.courseId)).sections
            .map(section => ({
                ...section,
                totalSize: 0,
                calculatingSize: false,
                expanded: section.id === initialSectionId,
                modules: section.modules.map(module => ({
                    ...module,
                    totalSize: 0,
                    calculatingSize: false,
                })),
            }));

        const subSections = sectionsToRender.filter((section) => section.component === 'mod_subsection');

        this.sections = sectionsToRender.filter((section) => section.component !== 'mod_subsection');
        this.sections.forEach((section) => {
            section.modules.forEach((module) => {
                if (module.modname === 'subsection') {
                    module.subSection = subSections.find((section) =>
                        section.component === 'mod_subsection' && section.itemid === module.instance);
                }
            });
        });

        this.loaded = true;

        if (initialSectionId !== undefined && initialSectionId > 0) {
            this.accordionMultipleValue.push(initialSectionId.toString());
            this.accordionGroupChange();

            CoreDom.scrollToElement(
                this.elementRef.nativeElement,
                `#addons-course-storage-${initialSectionId}`,
                { addYAxis: -10 },
            );
        } else {
            this.accordionMultipleValue.push(this.sections[0].id.toString());
            this.accordionGroupChange();
        }

        await Promise.all([
            this.initSizes(),
            this.initCoursePrefetch(),
            this.initModulePrefetch(),
        ]);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Init course prefetch information.
     */
    protected async initCoursePrefetch(): Promise<void> {
        if (!this.downloadCourseEnabled || this.courseStatusObserver) {
            return;
        }

        // Listen for changes in course status.
        this.courseStatusObserver = CoreEvents.on(CoreEvents.COURSE_STATUS_CHANGED, (data) => {
            if (data.courseId === this.courseId || data.courseId === CoreCourseProvider.ALL_COURSES_CLEARED) {
                this.updateCourseStatus(data.status);
            }
        }, CoreSites.getCurrentSiteId());

        // Determine the course prefetch status.
        await this.determineCoursePrefetchIcon();

        if (this.prefetchCourseData.icon !== CoreConstants.ICON_LOADING) {
            return;
        }

        // Course is being downloaded. Get the download promise.
        const promise = CoreCourseHelper.getCourseDownloadPromise(this.courseId);
        if (promise) {
            // There is a download promise. Show an error if it fails.
            promise.catch((error) => {
                if (!this.isDestroyed) {
                    CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                }
            });
        } else {
            // No download, this probably means that the app was closed while downloading. Set previous status.
            const status = await CoreCourse.setCoursePreviousStatus(this.courseId);

            this.updateCourseStatus(status);
        }
    }

    /**
     * Init module prefetch information.
     */
    protected async initModulePrefetch(): Promise<void> {
        if (!this.downloadEnabled || this.sectionStatusObserver) {
            return;
        }

        // Listen for section status changes.
        this.sectionStatusObserver = CoreEvents.on(
            CoreEvents.SECTION_STATUS_CHANGED,
            async (data) => {
                if (!this.downloadEnabled || !this.sections.length || !data.sectionId || data.courseId != this.courseId) {
                    return;
                }

                // Get the affected section.
                const sectionFinder = CoreCourseHelper.findSectionWithSubsection(this.sections, data.sectionId);
                if (!sectionFinder?.section) {
                    return;
                }

                const section = sectionFinder.section;

                // Check if the affected section is being downloaded.
                // If so, we don't update section status because it'll already be updated when the download finishes.
                const downloadId = CoreCourseHelper.getSectionDownloadId({ id: section.id });
                if (CoreCourseModulePrefetchDelegate.isBeingDownloaded(downloadId)) {
                    return;
                }

                // Recalculate the status.
                await this.updateSizes([section]);

                if (section.isDownloading && !CoreCourseModulePrefetchDelegate.isBeingDownloaded(downloadId)) {
                    // All the modules are now downloading, set a download all promise.
                    this.prefetchSection(section);
                }
            },
            CoreSites.getCurrentSiteId(),
        );

        this.moduleStatusObserver = CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
            let moduleFound: AddonStorageManagerModule | undefined;

            this.sections.some((section) =>
                section.modules.some((module) => {
                    if (module.id === data.componentId &&
                        module.prefetchHandler &&
                        data.component === module.prefetchHandler?.component) {
                        moduleFound = module;

                        return true;
                    } else if (module.subSection) {
                        return module.subSection.modules.some((module) => {
                            if (module.id === data.componentId &&
                                module.prefetchHandler &&
                                data.component === module.prefetchHandler?.component) {
                                moduleFound = module;

                                return true;
                            }
                        });
                    }

                    return false;
            }));

            if (!moduleFound) {
                return;
            }

            // Call determineModuleStatus to get the right status to display.
            const status = CoreCourseModulePrefetchDelegate.determineModuleStatus(moduleFound, data.status);
            if (moduleFound.subSection) {
                const data: CoreEventSectionStatusChangedData = {
                    sectionId: moduleFound.subSection.id,
                    courseId: this.courseId,
                };
                CoreEvents.trigger(CoreEvents.SECTION_STATUS_CHANGED, data, CoreSites.getCurrentSiteId());
            }

            // Update the status.
            this.updateModuleStatus(moduleFound, status);
        }, CoreSites.getCurrentSiteId());

        // The download status of a section might have been changed from within a module page.
        this.updateSizes(this.sections);
    }

    /**
     * Init section, course and modules sizes.
     */
    protected async initSizes(): Promise<void> {
        await this.updateSizes(this.sections);
    }

    /**
     * Update the sizes of some sections and modules.
     *
     * @param sections Modules.
     */
    protected async updateSizes(sections: AddonStorageManagerCourseSection[]): Promise<void> {
        sections = CoreArray.unique(sections, 'id');

        this.calculatingSize = true;
        sections.forEach((section) => {
            section.calculatingSize = true;
            section.modules.map((module) => {
                if (module.subSection) {
                    module.subSection.calculatingSize = true;
                }
            });
        });

        this.changeDetectorRef.markForCheck();

        // Update only affected module sections.
        const modules = this.getAllModulesList(sections);
        await Promise.all(modules.map(async (module) => {
            await this.calculateModuleSize(module);
        }));

        const updateSectionSize = (section: AddonStorageManagerCourseSection): void => {
            section.totalSize = 0;
            section.calculatingSize = true;

            this.changeDetectorRef.markForCheck();

            section.modules.forEach((module) => {
                if (module.subSection) {
                    updateSectionSize(module.subSection);
                    module.totalSize = module.subSection.totalSize;
                }

                section.totalSize += module.totalSize ?? 0;
                this.changeDetectorRef.markForCheck();
            });
            section.calculatingSize = false;

            this.changeDetectorRef.markForCheck();
        };

        // Update section and total sizes.
        this.totalSize = 0;
        this.sections.forEach((section) => {
            updateSectionSize(section);
            this.totalSize += section.totalSize;
        });
        this.calculatingSize = false;

        // Mark course as not downloaded if course size is 0.
        if (this.totalSize === 0) {
            this.markCourseAsNotDownloaded();
        }

        this.changeDetectorRef.markForCheck();

        await this.calculateSectionsStatus(sections);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * The user has requested a delete for the whole course data.
     *
     * (This works by deleting data for each module on the course that has data.)
     *
     * @param event Event object.
     */
    async deleteForCourse(event: Event): Promise<void> {
        event.stopPropagation();
        event.preventDefault();

        try {
            await CoreDomUtils.showDeleteConfirm(
                'addon.storagemanager.confirmdeletedatafrom',
                { name: this.title },
            );
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modules = this.getAllModulesList(this.sections).filter((module) => module.totalSize && module.totalSize > 0);

        await this.deleteModules(modules);
    }

    /**
     * The user has requested a delete for a section's data.
     *
     * (This works by deleting data for each module in the section that has data.)
     *
     * @param event Event object.
     * @param section Section object with information about section and modules
     */
    async deleteForSection(event: Event, section: AddonStorageManagerCourseSection): Promise<void> {
        event.stopPropagation();
        event.preventDefault();

        try {
            await CoreDomUtils.showDeleteConfirm(
                'addon.storagemanager.confirmdeletedatafrom',
                { name: section.name },
            );
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modules: AddonStorageManagerModule[] = [];
        section.modules.forEach((module) => {
            if (module.subSection) {
                module.subSection.modules.forEach((module) => {
                    if (module.totalSize && module.totalSize > 0) {
                        modules.push(module);
                    }
                });

                return;
            }

            if (module.totalSize && module.totalSize > 0) {
                modules.push(module);
            }
        });

        await this.deleteModules(modules);
    }

    /**
     * The user has requested a delete for a module's data
     *
     * @param event Event object.
     * @param module Module details
     */
    async deleteForModule(
        event: Event,
        module: AddonStorageManagerModule,
    ): Promise<void> {
        event.stopPropagation();
        event.preventDefault();

        if (module.totalSize === 0) {
            return;
        }

        try {
            await CoreDomUtils.showDeleteConfirm(
                'addon.storagemanager.confirmdeletedatafrom',
                { name: module.name },
            );
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        await this.deleteModules([module]);
    }

    /**
     * Deletes the specified modules, showing the loading overlay while it happens.
     *
     * @param modules Modules to delete
     */
    protected async deleteModules(modules: AddonStorageManagerModule[]): Promise<void> {
        const modal = await CoreLoadings.show('core.deleting', true);

        const sections: AddonStorageManagerCourseSection[]  = [];
        const promises = modules.map(async (module) => {
            // Remove the files.
            await CoreCourseHelper.removeModuleStoredData(module, this.courseId);

            module.totalSize = 0;

            const sectionFinder = CoreCourseHelper.findSectionWithSubsection(this.sections, module.section);
            if (sectionFinder?.section) {
                sections.push(sectionFinder?.section);
            }
        });

        try {
            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();

            await this.updateSizes(sections);

            this.changeDetectorRef.markForCheck();
        }
    }

    /**
     * Mark course as not downloaded.
     */
    protected markCourseAsNotDownloaded(): void {
        // @TODO In order to correctly check the status of the course we should check all module statuses.
        // We are currently marking as not downloaded if size is 0 but we should take into account that
        // resources without files can be downloaded and cached.

        CoreCourse.setCourseStatus(this.courseId, DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED);
    }

    /**
     * Confirm and prefetch a section. If the section is "all sections", prefetch all the sections.
     *
     * @param section Section to download.
     */
    async prefetchSection(section: AddonStorageManagerCourseSection): Promise<void> {
        section.isCalculating = true;
        this.changeDetectorRef.markForCheck();
        try {
            await CoreCourseHelper.confirmDownloadSizeSection(this.courseId, [section]);

            try {
                await CoreCourseHelper.prefetchSections([section], this.courseId);

            } catch (error) {
                if (!this.isDestroyed) {
                    CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingsection', true);
                }
            } finally {
                await this.updateSizes([section]);
            }
        } catch (error) {
            // User cancelled or there was an error calculating the size.
            if (!this.isDestroyed && error) {
                CoreDomUtils.showErrorModal(error);
                this.changeDetectorRef.markForCheck();

                return;
            }
        } finally {
            section.isCalculating = false;
            this.changeDetectorRef.markForCheck();
        }
    }

    /**
     * Download the module.
     *
     * @param module Module to prefetch.
     * @param refresh Whether it's refreshing.
     * @returns Promise resolved when done.
     */
    async prefetchModule(
        module: AddonStorageManagerModule,
        refresh = false,
    ): Promise<void> {
        if (!module.prefetchHandler) {
            return;
        }

        // Show spinner since this operation might take a while.
        module.spinner = true;

        try {
            // Get download size to ask for confirm if it's high.
            const size = await module.prefetchHandler.getDownloadSize(module, module.course, true);

            await CoreCourseHelper.prefetchModule(module.prefetchHandler, module, size, module.course, refresh);
        } catch (error) {
            if (!this.isDestroyed) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }
        } finally {
            module.spinner = false;

            const sectionFinder = CoreCourseHelper.findSectionWithSubsection(this.sections, module.section);
            if (sectionFinder?.section) {
                await this.updateSizes([sectionFinder?.section]);
            }
        }
    }

    /**
     * Show download buttons according to module status.
     *
     * @param module Module to update.
     * @param status Module status.
     */
    protected updateModuleStatus(module: AddonStorageManagerModule, status: DownloadStatus): void {
        if (!status) {
            return;
        }

        module.spinner = false;
        module.downloadStatus = status;

        module.handlerData?.updateStatus?.(status);
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Calculate all modules status on a section.
     *
     * @param section Section to check.
     */
    protected async calculateModulesStatusOnSection(section: AddonStorageManagerCourseSection): Promise<void> {
        await Promise.all(section.modules.map(async (module) => {
            if (module.handlerData?.showDownloadButton) {
                module.spinner = true;
                // Listen for changes on this module status, even if download isn't enabled.
                module.prefetchHandler = CoreCourseModulePrefetchDelegate.getPrefetchHandlerFor(module.modname);
                const status = await CoreCourseModulePrefetchDelegate.getModuleStatus(module, this.courseId);

                this.updateModuleStatus(module, status);
            }

            if (module.subSection) {
                await this.calculateModulesStatusOnSection(module.subSection);
            }
        }));
    }

    /**
     * Determines the prefetch icon of the course.
     */
    protected async determineCoursePrefetchIcon(): Promise<void> {
        this.prefetchCourseData = await CoreCourseHelper.getCourseStatusIconAndTitle(this.courseId);
    }

    /**
     * Update the course status icon and title.
     *
     * @param status Status to show.
     */
    protected updateCourseStatus(status: DownloadStatus): void {
        const statusData = CoreCourseHelper.getCoursePrefetchStatusInfo(status);

        this.prefetchCourseData.status = statusData.status;
        this.prefetchCourseData.icon = statusData.icon;
        this.prefetchCourseData.statusTranslatable = statusData.statusTranslatable;
        this.prefetchCourseData.loading = statusData.loading;
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Get the course object.
     *
     * @param courseId Course ID.
     * @returns Promise resolved with the course object if found.
     */
    protected async getCourse(courseId: number): Promise<CoreCourseAnyCourseData | undefined> {
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

        return await CoreCourses.getCourseByField('id', this.courseId);

    }

    /**
     * Prefetch the whole course.
     *
     * @param event Event object.
     */
    async prefetchCourse(event: Event): Promise<void> {
        event.stopPropagation();
        event.preventDefault();

        const course = await this.getCourse(this.courseId);
        if (!course) {
            CoreDomUtils.showErrorModal('core.course.errordownloadingcourse', true);

            return;
        }

        try {
            this.changeDetectorRef.markForCheck();
            await CoreCourseHelper.confirmAndPrefetchCourse(
                this.prefetchCourseData,
                course,
                {
                    sections: this.sections,
                    isGuest: this.isGuest,
                },
            );

            await this.updateSizes(this.sections);
        } catch (error) {
            if (this.isDestroyed) {
                return;
            }

            CoreDomUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
        }
    }

    /**
     * Get all modules list.
     *
     * @param sections Sections to get the modules from.
     * @returns All modules list.
     */
    protected getAllModulesList(sections: AddonStorageManagerCourseSection[]): AddonStorageManagerModule[] {
        const modules: AddonStorageManagerModule[] = [];
        sections.forEach((section) => {
            section.modules.forEach((module) => {
                modules.push(module);

                if (module.subSection) {
                    module.subSection.modules.forEach((module) => {
                        modules.push(module);
                    });
                }
            });
        });

        return modules;
    }

    /**
     * Calculate the size of the modules.
     *
     * @param module Module to calculate.
     */
    protected async calculateModuleSize(module: AddonStorageManagerModule): Promise<void> {
        if (module.calculatingSize) {
            return;
        }

        module.calculatingSize = true;
        this.changeDetectorRef.markForCheck();

        // Note: This function only gets the size for modules which are downloadable.
        // For other modules it always returns 0, even if they have downloaded some files.
        // However there is no 100% reliable way to actually track the files in this case.
        // You can maybe guess it based on the component and componentid.
        // But these aren't necessarily consistent, for example mod_frog vs mmaModFrog.
        // There is nothing enforcing correct values.
        // Most modules which have large files are downloadable, so I think this is sufficient.
        module.totalSize = await CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, this.courseId);

        module.calculatingSize = false;
        this.changeDetectorRef.markForCheck();
    }

    /**
     * Toggle expand status.
     *
     * @param event Event object. If not defined, use the current value.
     */
    accordionGroupChange(event?: AccordionGroupChangeEventDetail): void {
        const sectionIds = event?.value as string[] ?? this.accordionMultipleValue;
        this.sections.forEach((section) => {
            section.expanded = false;
            section.modules.forEach((section) => {
                if (section.subSection) {
                    section.subSection.expanded = false;
                }
            });
        });

        sectionIds.forEach((sectionId) => {
            const sectionToExpand = CoreCourseHelper.findSectionById(this.sections, Number(sectionId));
            if (sectionToExpand) {
                sectionToExpand.expanded = true;
            }
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.courseStatusObserver?.off();
        this.sectionStatusObserver?.off();
        this.moduleStatusObserver?.off();
        this.siteUpdatedObserver?.off();

        this.sections.forEach((section) => {
            section.modules.forEach((module) => {
                module.subSection?.modules.forEach((module) => {
                    module.handlerData?.onDestroy?.();
                });

                module.handlerData?.onDestroy?.();
            });
        });
        this.isDestroyed = true;
    }

    /**
     * Calculate the status of a list of sections, setting attributes to determine the icons/data to be shown.
     *
     * @param sections Sections to calculate their status.
     */
    protected async calculateSectionsStatus(
        sections: AddonStorageManagerCourseSection[],
    ): Promise<void> {
        if (!sections) {
            return;
        }

        await Promise.all(sections.map(async (section) => {
            if (section.id === CoreCourseProvider.ALL_SECTIONS_ID) {
                return;
            }

            try {
                section.isCalculating = true;
                await this.calculateModulesStatusOnSection(section);
                await CoreCourseHelper.calculateSectionStatus(section, this.courseId, false, false);

                await Promise.all(section.modules.map(async (module) => {
                    if (module.subSection) {
                        return CoreCourseHelper.calculateSectionStatus(module.subSection, this.courseId, false, false);
                    }
                }));
            } finally {
                section.isCalculating = false;
            }
        }));
    }

}

type AddonStorageManagerCourseSection = Omit<CoreCourseSectionWithStatus, 'modules'> & {
    totalSize: number;
    calculatingSize: boolean;
    expanded: boolean;
    modules: AddonStorageManagerModule[];
};

type AddonStorageManagerModule = CoreCourseModuleData & {
    totalSize?: number;
    calculatingSize: boolean;
    prefetchHandler?: CoreCourseModulePrefetchHandler;
    spinner?: boolean;
    downloadStatus?: DownloadStatus;
    subSection?: AddonStorageManagerCourseSection;
};
