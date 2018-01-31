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

import { Injectable } from '@angular/core';
import { NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreFilepoolProvider } from '../../../providers/filepool';
import { CoreSitesProvider } from '../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../providers/utils/text';
import { CoreTimeUtilsProvider } from '../../../providers/utils/time';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreCourseOptionsDelegate, CoreCourseOptionsHandlerToDisplay } from './options-delegate';
import { CoreSiteHomeProvider } from '../../sitehome/providers/sitehome';
import { CoreCourseProvider } from './course';
import { CoreCourseModuleDelegate } from './module-delegate';
import { CoreCourseModulePrefetchDelegate } from './module-prefetch-delegate';
import { CoreLoginHelperProvider } from '../../login/providers/helper';
import { CoreConstants } from '../../constants';
import { CoreSite } from '../../../classes/site';
import * as moment from 'moment';

/**
 * Prefetch info of a module.
 */
export type CoreCourseModulePrefetchInfo = {
    /**
     * Downloaded size.
     * @type {number}
     */
    size?: number;

    /**
     * Downloadable size in a readable format.
     * @type {string}
     */
    sizeReadable?: string;

    /**
     * Module status.
     * @type {string}
     */
    status?: string;

    /**
     * Icon's name of the module status.
     * @type {string}
     */
    statusIcon?: string;

    /**
     * Time when the module was last downloaded.
     * @type {number}
     */
    downloadTime?: number;

    /**
     * Download time in a readable format.
     * @type {string}
     */
    downloadTimeReadable?: string;
};

/**
 * Progress of downloading a list of courses.
 */
export type CoreCourseCoursesProgress = {
    /**
     * Number of courses downloaded so far.
     * @type {number}
     */
    count: number;

    /**
     * Toal of courses to download.
     * @type {number}
     */
    total: number;

    /**
     * Whether the download has been successful so far.
     * @type {boolean}
     */
    success: boolean;

    /**
     * Last downloaded course.
     * @type {number}
     */
    courseId?: number;
};

/**
 * Helper to gather some common course functions.
 */
@Injectable()
export class CoreCourseHelperProvider {

    protected courseDwnPromises: { [s: string]: { [id: number]: Promise<any> } } = {};

    constructor(private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
        private moduleDelegate: CoreCourseModuleDelegate, private prefetchDelegate: CoreCourseModulePrefetchDelegate,
        private filepoolProvider: CoreFilepoolProvider, private sitesProvider: CoreSitesProvider,
        private textUtils: CoreTextUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
        private utils: CoreUtilsProvider, private translate: TranslateService, private loginHelper: CoreLoginHelperProvider,
        private courseOptionsDelegate: CoreCourseOptionsDelegate, private siteHomeProvider: CoreSiteHomeProvider) { }

    /**
     * This function treats every module on the sections provided to load the handler data, treat completion
     * and navigate to a module page if required. It also returns if sections has content.
     *
     * @param {any[]} sections List of sections to treat modules.
     * @param {number} courseId Course ID of the modules.
     * @param {any[]} [completionStatus] List of completion status.
     * @return {boolean} Whether the sections have content.
     */
    addHandlerDataForModules(sections: any[], courseId: number, completionStatus?: any): boolean {
        let hasContent = false;

        sections.forEach((section) => {
            if (!section || !this.sectionHasContent(section) || !section.modules) {
                return;
            }

            hasContent = true;

            section.modules.forEach((module) => {
                module.handlerData = this.moduleDelegate.getModuleDataFor(module.modname, module, courseId, section.id);

                if (completionStatus && typeof completionStatus[module.id] != 'undefined') {
                    // Check if activity has completions and if it's marked.
                    module.completionstatus = completionStatus[module.id];
                    module.completionstatus.courseId = courseId;
                }
            });
        });

        return hasContent;
    }

    /**
     * Calculate the status of a section.
     *
     * @param {any} section Section to calculate its status. It can't be "All sections".
     * @param {number} courseId Course ID the section belongs to.
     * @param {boolean} [refresh] True if it shouldn't use module status cache (slower).
     * @return {Promise<any>} Promise resolved when the status is calculated.
     */
    calculateSectionStatus(section: any, courseId: number, refresh?: boolean): Promise<any> {

        if (section.id == CoreCourseProvider.ALL_SECTIONS_ID) {
            return Promise.reject(null);
        }

        // Get the status of this section.
        return this.prefetchDelegate.getModulesStatus(section.modules, courseId, section.id, refresh).then((result) => {
            // Check if it's being downloaded.
            const downloadId = this.getSectionDownloadId(section);
            if (this.prefetchDelegate.isBeingDownloaded(downloadId)) {
                result.status = CoreConstants.DOWNLOADING;
            }

            // Set this section data.
            section.showDownload = result.status === CoreConstants.NOT_DOWNLOADED;
            section.showRefresh = result.status === CoreConstants.OUTDATED;

            if (result.status !== CoreConstants.DOWNLOADING || !this.prefetchDelegate.isBeingDownloaded(section.id)) {
                section.isDownloading = false;
                section.total = 0;
            } else {
                // Section is being downloaded.
                section.isDownloading = true;
                this.prefetchDelegate.setOnProgress(downloadId, (data) => {
                    section.count = data.count;
                    section.total = data.total;
                });
            }

            return result;
        });
    }

    /**
     * Calculate the status of a list of sections, setting attributes to determine the icons/data to be shown.
     *
     * @param {any[]} sections Sections to calculate their status.
     * @param {number} courseId Course ID the sections belong to.
     * @param {boolean} [refresh] True if it shouldn't use module status cache (slower).
     * @return {Promise<void>} Promise resolved when the states are calculated.
     */
    calculateSectionsStatus(sections: any[], courseId: number, refresh?: boolean): Promise<void> {
        const promises = [];
        let allSectionsSection,
            allSectionsStatus;

        sections.forEach((section) => {
            if (section.id === CoreCourseProvider.ALL_SECTIONS_ID) {
                // "All sections" section status is calculated using the status of the rest of sections.
                allSectionsSection = section;
                section.isCalculating = true;
            } else {
                section.isCalculating = true;
                promises.push(this.calculateSectionStatus(section, courseId, refresh).then((result) => {
                    // Calculate "All sections" status.
                    allSectionsStatus = this.filepoolProvider.determinePackagesStatus(allSectionsStatus, result.status);
                }).finally(() => {
                    section.isCalculating = false;
                }));
            }
        });

        return Promise.all(promises).then(() => {
            if (allSectionsSection) {
                // Set "All sections" data.
                allSectionsSection.showDownload = allSectionsStatus === CoreConstants.NOT_DOWNLOADED;
                allSectionsSection.showRefresh = allSectionsStatus === CoreConstants.OUTDATED;
                allSectionsSection.isDownloading = allSectionsStatus === CoreConstants.DOWNLOADING;
            }
        }).finally(() => {
            if (allSectionsSection) {
                allSectionsSection.isCalculating = false;
            }
        });
    }

    /**
     * Show a confirm and prefetch a course. It will retrieve the sections and the course options if not provided.
     * This function will set the icon to "spinner" when starting and it will also set it back to the initial icon if the
     * user cancels. All the other updates of the icon should be made when CoreEventsProvider.COURSE_STATUS_CHANGED is received.
     *
     * @param {any} iconData An object where to store the course icon. It will be stored with the name "prefetchCourseIcon".
     * @param {any} course Course to prefetch.
     * @param {any[]} [sections] List of course sections.
     * @param {CoreCourseOptionsHandlerToDisplay[]} courseHandlers List of course handlers.
     * @return {Promise<boolean>} Promise resolved with true when the download finishes, resolved with false if user doesn't
     *                            confirm, rejected if an error occurs.
     */
    confirmAndPrefetchCourse(iconData: any, course: any, sections?: any[], courseHandlers?: CoreCourseOptionsHandlerToDisplay[])
            : Promise<boolean> {

        const initialIcon = iconData.prefetchCourseIcon,
            siteId = this.sitesProvider.getCurrentSiteId();
        let promise;

        iconData.prefetchCourseIcon = 'spinner';

        // Get the sections first if needed.
        if (sections) {
            promise = Promise.resolve(sections);
        } else {
            promise = this.courseProvider.getSections(course.id, false, true);
        }

        return promise.then((sections) => {
            // Confirm the download.
            return this.confirmDownloadSizeSection(course.id, undefined, sections, true).then(() => {
                // User confirmed, get the course handlers if needed.
                if (courseHandlers) {
                    promise = Promise.resolve(courseHandlers);
                } else {
                    promise = this.courseOptionsDelegate.getHandlersToDisplay(course);
                }

                return promise.then((handlers: CoreCourseOptionsHandlerToDisplay[]) => {
                    // Now we have all the data, download the course.
                    return this.prefetchCourse(course, sections, handlers, siteId);
                }).then(() => {
                    // Download successful.
                    return true;
                });
            }, (error): any => {
                // User cancelled or there was an error calculating the size.
                iconData.prefetchCourseIcon = initialIcon;
                if (error) {
                    return Promise.reject(error);
                }

                return false;
            });
        });
    }

    /**
     * Confirm and prefetches a list of courses.
     *
     * @param {any[]} courses List of courses to download.
     * @param {Function} [onProgress] Function to call everytime a course is downloaded.
     * @return {Promise<boolean>} Resolved with true when downloaded, resolved with false if user cancels, rejected if error.
     */
    confirmAndPrefetchCourses(courses: any[], onProgress?: (data: CoreCourseCoursesProgress) => void): Promise<boolean> {
        const siteId = this.sitesProvider.getCurrentSiteId();

        // Confirm the download without checking size because it could take a while.
        return this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            const promises = [],
                total = courses.length;
            let count = 0;

            courses.forEach((course) => {
                const subPromises = [];
                let sections,
                    handlers,
                    success = true;

                // Get the sections and the handlers.
                subPromises.push(this.courseProvider.getSections(course.id, false, true).then((courseSections) => {
                    sections = courseSections;
                }));
                subPromises.push(this.courseOptionsDelegate.getHandlersToDisplay(course).then((cHandlers) => {
                    handlers = cHandlers;
                }));

                promises.push(Promise.all(subPromises).then(() => {
                    return this.prefetchCourse(course, sections, handlers, siteId);
                }).catch((error) => {
                    success = false;

                    return Promise.reject(error);
                }).finally(() => {
                    // Course downloaded or failed, notify the progress.
                    count++;
                    if (onProgress) {
                        onProgress({ count: count, total: total, courseId: course.id, success: success });
                    }
                }));
            });

            if (onProgress) {
                // Notify the start of the download.
                onProgress({ count: 0, total: total, success: true });
            }

            return this.utils.allPromises(promises).then(() => {
                return true;
            });
        }, () => {
            // User cancelled.
            return false;
        });
    }

    /**
     * Show confirmation dialog and then remove a module files.
     *
     * @param {any} module Module to remove the files.
     * @param {number} courseId Course ID the module belongs to.
     * @return {Promise<any>} Promise resolved when done.
     */
    confirmAndRemoveFiles(module: any, courseId: number): Promise<any> {
        return this.domUtils.showConfirm(this.translate.instant('course.confirmdeletemodulefiles')).then(() => {
            return this.prefetchDelegate.removeModuleFiles(module, courseId);
        });
    }

    /**
     * Calculate the size to download a section and show a confirm modal if needed.
     *
     * @param {number} courseId Course ID the section belongs to.
     * @param {any} [section] Section. If not provided, all sections.
     * @param {any[]} [sections] List of sections. Used when downloading all the sections.
     * @param {boolean} [alwaysConfirm] True to show a confirm even if the size isn't high, false otherwise.
     * @return {Promise<any>} Promise resolved if the user confirms or there's no need to confirm.
     */
    confirmDownloadSizeSection(courseId: number, section?: any, sections?: any[], alwaysConfirm?: boolean): Promise<any> {
        let sizePromise;

        // Calculate the size of the download.
        if (section && section.id != CoreCourseProvider.ALL_SECTIONS_ID) {
            sizePromise = this.prefetchDelegate.getDownloadSize(section.modules, courseId);
        } else {
            const promises = [],
                results = {
                    size: 0,
                    total: true
                };

            sections.forEach((s) => {
                if (s.id != CoreCourseProvider.ALL_SECTIONS_ID) {
                    promises.push(this.prefetchDelegate.getDownloadSize(s.modules, courseId).then((sectionSize) => {
                        results.total = results.total && sectionSize.total;
                        results.size += sectionSize.size;
                    }));
                }
            });

            sizePromise = Promise.all(promises).then(() => {
                return results;
            });
        }

        return sizePromise.then((size) => {
            // Show confirm modal if needed.
            return this.domUtils.confirmDownloadSize(size, undefined, undefined, undefined, undefined, alwaysConfirm);
        });
    }

    /**
     * Determine the status of a list of courses.
     *
     * @param {any[]} courses Courses
     * @return {Promise<string>} Promise resolved with the status.
     */
    determineCoursesStatus(courses: any[]): Promise<string> {
        // Get the status of each course.
        const promises = [],
            siteId = this.sitesProvider.getCurrentSiteId();

        courses.forEach((course) => {
            promises.push(this.courseProvider.getCourseStatus(course.id, siteId));
        });

        return Promise.all(promises).then((statuses) => {
            // Now determine the status of the whole list.
            let status = statuses[0];
            for (let i = 1; i < statuses.length; i++) {
                status = this.filepoolProvider.determinePackagesStatus(status, statuses[i]);
            }

            return status;
        });
    }

    /**
     * Get a course download promise (if any).
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Download promise, undefined if not found.
     */
    getCourseDownloadPromise(courseId: number, siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.courseDwnPromises[siteId] && this.courseDwnPromises[siteId][courseId];
    }

    /**
     * Get a course status icon.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved with the icon name.
     */
    getCourseStatusIcon(courseId: number, siteId?: string): Promise<string> {
        return this.courseProvider.getCourseStatus(courseId, siteId).then((status) => {
            return this.getCourseStatusIconFromStatus(status);
        });
    }

    /**
     * Get a course status icon from status.
     *
     * @module mm.core.course
     * @ngdoc method
     * @name $mmCourseHelper#getCourseStatusIconFromStatus
     * @param {String} status Course status.
     * @return {String}       Icon name.
     */
    getCourseStatusIconFromStatus(status: string): string {
        if (status == CoreConstants.DOWNLOADED) {
            // Always show refresh icon, we cannot knew if there's anything new in course options.
            return 'refresh';
        } else if (status == CoreConstants.DOWNLOADING) {
            return 'spinner';
        } else {
            return 'cloud-download';
        }
    }

    /**
     * Get the course ID from a module instance ID, showing an error message if it can't be retrieved.
     *
     * @param {number} id Instance ID.
     * @param {string} module Name of the module. E.g. 'glossary'.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the module's course ID.
     */
    getModuleCourseIdByInstance(id: number, module: any, siteId?: string): Promise<number> {
        return this.courseProvider.getModuleBasicInfoByInstance(id, module, siteId).then((cm) => {
            return cm.course;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);

            return Promise.reject(null);
        });
    }

    /**
     * Get prefetch info for a module.
     *
     * @param {any} module Module to get the info from.
     * @param {number} courseId Course ID the section belongs to.
     * @param {boolean} [invalidateCache] Invalidates the cache first.
     * @param {string} [component] Component of the module.
     * @return {Promise<CoreCourseModulePrefetchInfo>} Promise resolved with the info.
     */
    getModulePrefetchInfo(module: any, courseId: number, invalidateCache?: boolean, component?: string)
            : Promise<CoreCourseModulePrefetchInfo> {
        const moduleInfo: CoreCourseModulePrefetchInfo = {},
            siteId = this.sitesProvider.getCurrentSiteId(),
            promises = [];

        if (invalidateCache) {
            this.prefetchDelegate.invalidateModuleStatusCache(module);
        }

        promises.push(this.prefetchDelegate.getModuleDownloadedSize(module, courseId).then((moduleSize) => {
            moduleInfo.size = moduleSize;
            moduleInfo.sizeReadable = this.textUtils.bytesToSize(moduleSize, 2);
        }));

        // @todo: Decide what to display instead of timemodified. Last check_updates?

        promises.push(this.prefetchDelegate.getModuleStatus(module, courseId).then((moduleStatus) => {
            moduleInfo.status = moduleStatus;
            switch (moduleStatus) {
                case CoreConstants.NOT_DOWNLOADED:
                    moduleInfo.statusIcon = 'cloud-download';
                    break;
                case CoreConstants.DOWNLOADING:
                    moduleInfo.statusIcon = 'spinner';
                    break;
                case CoreConstants.OUTDATED:
                    moduleInfo.statusIcon = 'ion-android-refresh';
                    break;
                default:
                    moduleInfo.statusIcon = '';
                    break;
            }
        }));

        // Get the time it was downloaded (if it was downloaded).
        promises.push(this.filepoolProvider.getPackageData(siteId, component, module.id).then((data) => {
            if (data && data.downloadTime && (data.status == CoreConstants.OUTDATED || data.status == CoreConstants.DOWNLOADED)) {
                const now = this.timeUtils.timestamp();
                moduleInfo.downloadTime = data.downloadTime;
                if (now - data.downloadTime < 7 * 86400) {
                    moduleInfo.downloadTimeReadable = moment(data.downloadTime * 1000).fromNow();
                } else {
                    moduleInfo.downloadTimeReadable = moment(data.downloadTime * 1000).calendar();
                }
            }
        }).catch(() => {
            // Not downloaded.
            moduleInfo.downloadTime = 0;
        }));

        return Promise.all(promises).then(() => {
            return moduleInfo;
        });
    }

    /**
     * Get the download ID of a section. It's used to interact with CoreCourseModulePrefetchDelegate.
     *
     * @param {any} section Section.
     * @return {string} Section download ID.
     */
    getSectionDownloadId(section: any): string {
        return 'Section-' + section.id;
    }

    /**
     * Navigate to a module.
     *
     * @param {number} moduleId Module's ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [courseId] Course ID. If not defined we'll try to retrieve it from the site.
     * @param {number} [sectionId] Section the module belongs to. If not defined we'll try to retrieve it from the site.
     * @return {Promise<void>} Promise resolved when done.
     */
    navigateToModule(moduleId: number, siteId?: string, courseId?: number, sectionId?: number): Promise<void> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        const modal = this.domUtils.showModalLoading();
        let promise,
            site: CoreSite;

        if (courseId && sectionId) {
            // No need to retrieve more data.
            promise = Promise.resolve();
        } else if (!courseId) {
            // We don't have courseId.
            promise = this.courseProvider.getModuleBasicInfo(moduleId, siteId).then((module) => {
                courseId = module.course;
                sectionId = module.section;
            });
        } else {
            // We don't have sectionId but we have courseId.
            promise = this.courseProvider.getModuleSectionId(moduleId, siteId).then((id) => {
                sectionId = id;
            });
        }

        return promise.then(() => {
            // Get the site.
            return this.sitesProvider.getSite(siteId);
        }).then((s) => {
            site = s;

            // Get the module.
            return this.courseProvider.getModule(moduleId, courseId, sectionId, false, false, siteId);
        }).then((module) => {
            const params = {
                course: { id: courseId },
                module: module,
                sectionId: sectionId
            };

            module.handlerData = this.moduleDelegate.getModuleDataFor(module.modname, module, courseId, sectionId);

            if (courseId == site.getSiteHomeId()) {
                // Check if site home is available.
                return this.siteHomeProvider.isAvailable().then(() => {
                    this.loginHelper.redirect('CoreSiteHomeIndexPage', params, siteId);
                });
            } else {
                this.loginHelper.redirect('CoreCourseSectionPage', params, siteId);
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Open a module.
     *
     * @param {NavController} navCtrl The NavController to use.
     * @param {any} module The module to open.
     * @param {number} courseId The course ID of the module.
     * @param {number} [sectionId] The section ID of the module.
     * @param {boolean} True if module can be opened, false otherwise.
     */
    openModule(navCtrl: NavController, module: any, courseId: number, sectionId?: number): boolean {
        if (!module.handlerData) {
            module.handlerData = this.moduleDelegate.getModuleDataFor(module.modname, module, courseId, sectionId);
        }

        if (module.handlerData && module.handlerData.action) {
            module.handlerData.action(new Event('click'), navCtrl, module, courseId, { animate: false });

            return true;
        }

        return false;
    }

    /**
     * Prefetch all the activities in a course and also the course addons.
     *
     * @param {any} course The course to prefetch.
     * @param {any[]} sections List of course sections.
     * @param {CoreCourseOptionsHandlerToDisplay[]} courseHandlers List of course options handlers.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise}                Promise resolved when the download finishes.
     */
    prefetchCourse(course: any, sections: any[], courseHandlers: CoreCourseOptionsHandlerToDisplay[], siteId?: string)
            : Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        if (this.courseDwnPromises[siteId] && this.courseDwnPromises[siteId][course.id]) {
            // There's already a download ongoing for this course, return the promise.
            return this.courseDwnPromises[siteId][course.id];
        } else if (!this.courseDwnPromises[siteId]) {
            this.courseDwnPromises[siteId] = {};
        }

        // First of all, mark the course as being downloaded.
        this.courseDwnPromises[siteId][course.id] = this.courseProvider.setCourseStatus(course.id, CoreConstants.DOWNLOADING,
            siteId).then(() => {
                const promises = [];
                let allSectionsSection = sections[0];

                // Prefetch all the sections. If the first section is "All sections", use it. Otherwise, use a fake "All sections".
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

                return this.utils.allPromises(promises);
            }).then(() => {
                // Download success, mark the course as downloaded.
                return this.courseProvider.setCourseStatus(course.id, CoreConstants.DOWNLOADED, siteId);
            }).catch((error) => {
                // Error, restore previous status.
                return this.courseProvider.setCoursePreviousStatus(course.id, siteId).then(() => {
                    return Promise.reject(error);
                });
            }).finally(() => {
                delete this.courseDwnPromises[siteId][course.id];
            });

        return this.courseDwnPromises[siteId][course.id];
    }

    /**
     * Helper function to prefetch a module, showing a confirmation modal if the size is big
     * and invalidating contents if refreshing.
     *
     * @param {handler} handler Prefetch handler to use. Must implement 'prefetch' and 'invalidateContent'.
     * @param {any} module Module to download.
     * @param {any} size Object containing size to download (in bytes) and a boolean to indicate if its totally calculated.
     * @param {number} courseId Course ID of the module.
     * @param {boolean} [refresh] True if refreshing, false otherwise.
     * @return {Promise<any>} Promise resolved when downloaded.
     */
    prefetchModule(handler: any, module: any, size: any, courseId: number, refresh?: boolean): Promise<any> {
        // Show confirmation if needed.
        return this.domUtils.confirmDownloadSize(size).then(() => {
            // Invalidate content if refreshing and download the data.
            const promise = refresh ? handler.invalidateContent(module.id, courseId) : Promise.resolve();

            return promise.catch(() => {
                // Ignore errors.
            }).then(() => {
                return handler.prefetch(module, courseId, true);
            });
        });
    }

    /**
     * Prefetch one section or all the sections.
     * If the section is "All sections" it will prefetch all the sections.
     *
     * @param {any} section Section.
     * @param {number} courseId Course ID the section belongs to.
     * @param {any[]} [sections] List of sections. Used when downloading all the sections.
     * @return {Promise<any>} Promise resolved when the prefetch is finished.
     */
    prefetchSection(section: any, courseId: number, sections?: any[]): Promise<any> {
        if (section.id != CoreCourseProvider.ALL_SECTIONS_ID) {
            // Download only this section.
            return this.prefetchSingleSectionIfNeeded(section, courseId).then(() => {
                // Calculate the status of the section that finished.
                return this.calculateSectionStatus(section, courseId);
            });
        } else {
            // Download all the sections except "All sections".
            const promises = [];
            let allSectionsStatus;

            section.isDownloading = true;
            sections.forEach((section) => {
                if (section.id != CoreCourseProvider.ALL_SECTIONS_ID) {
                    promises.push(this.prefetchSingleSectionIfNeeded(section, courseId).then(() => {
                        // Calculate the status of the section that finished.
                        return this.calculateSectionStatus(section, courseId).then((result) => {
                            // Calculate "All sections" status.
                            allSectionsStatus = this.filepoolProvider.determinePackagesStatus(allSectionsStatus, result.status);
                        });
                    }));
                }
            });

            return this.utils.allPromises(promises).then(() => {
                // Set "All sections" data.
                section.showDownload = allSectionsStatus === CoreConstants.NOT_DOWNLOADED;
                section.showRefresh = allSectionsStatus === CoreConstants.OUTDATED;
                section.isDownloading = allSectionsStatus === CoreConstants.DOWNLOADING;
            }).finally(() => {
                section.isDownloading = false;
            });
        }
    }

    /**
     * Prefetch a certain section if it needs to be prefetched.
     * If the section is "All sections" it will be ignored.
     *
     * @param {any} section Section to prefetch.
     * @param {number} courseId Course ID the section belongs to.
     * @return {Promise<any>} Promise resolved when the section is prefetched.
     */
    protected prefetchSingleSectionIfNeeded(section: any, courseId: number): Promise<any> {
        if (section.id == CoreCourseProvider.ALL_SECTIONS_ID) {
            return Promise.resolve();
        }

        section.isDownloading = true;

        // Validate the section needs to be downloaded and calculate amount of modules that need to be downloaded.
        return this.prefetchDelegate.getModulesStatus(section.modules, courseId, section.id).then((result) => {
            if (result.status == CoreConstants.DOWNLOADED || result.status == CoreConstants.NOT_DOWNLOADABLE) {
                // Section is downloaded or not downloadable, nothing to do.
                return;
            }

            return this.prefetchSingleSection(section, result, courseId);
        }, (error) => {
            section.isDownloading = false;

            return Promise.reject(error);
        });
    }

    /**
     * Start or restore the prefetch of a section.
     * If the section is "All sections" it will be ignored.
     *
     * @param {any} section Section to download.
     * @param {any} result Result of CoreCourseModulePrefetchDelegate.getModulesStatus for this section.
     * @param {number} courseId Course ID the section belongs to.
     * @return {Promise<any>} Promise resolved when the section has been prefetched.
     */
    protected prefetchSingleSection(section: any, result: any, courseId: number): Promise<any> {
        if (section.id == CoreCourseProvider.ALL_SECTIONS_ID) {
            return Promise.resolve();
        }

        if (section.total > 0) {
            // Already being downloaded.
            return Promise.resolve();
        }

        // We only download modules with status notdownloaded, downloading or outdated.
        const modules = result[CoreConstants.OUTDATED].concat(result[CoreConstants.NOT_DOWNLOADED])
                .concat(result[CoreConstants.DOWNLOADING]),
            downloadId = this.getSectionDownloadId(section);

        section.isDownloading = true;

        // Prefetch all modules to prevent incoeherences in download count and to download stale data not marked as outdated.
        return this.prefetchDelegate.prefetchModules(downloadId, modules, courseId, (data) => {
            section.count = data.count;
            section.total = data.total;
        });
    }

    /**
     * Check if a section has content.
     *
     * @param {any} section Section to check.
     * @return {boolean} Whether the section has content.
     */
    sectionHasContent(section: any): boolean {
        if (section.id == CoreCourseProvider.ALL_SECTIONS_ID || section.hiddenbynumsections) {
            return false;
        }

        return (typeof section.availabilityinfo != 'undefined' && section.availabilityinfo != '') ||
            section.summary != '' || (section.modules && section.modules.length > 0);
    }
}
