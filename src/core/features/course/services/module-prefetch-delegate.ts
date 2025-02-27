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
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';

import { CoreFile } from '@services/file';
import { CoreFileHelper } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreTime } from '@singletons/time';
import { CoreArray } from '@singletons/array';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseModuleContentFile } from './course';
import { CoreCache } from '@classes/cache';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { DownloadStatus, DownloadedStatus, ContextLevel } from '@/core/constants';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { makeSingleton } from '@singletons';
import { CoreEvents, CoreEventSectionStatusChangedData } from '@singletons/events';
import { CoreError } from '@classes/errors/error';
import { CoreWSFile, CoreWSExternalWarning } from '@services/ws';
import { CHECK_UPDATES_TIMES_TABLE, CoreCourseCheckUpdatesDBRecord } from './database/module-prefetch';
import { CoreFileSizeSum } from '@services/plugin-file-delegate';
import { CoreCourseHelper, CoreCourseModuleData } from './course-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';

const ROOT_CACHE_KEY = 'mmCourse:';

/**
 * Delegate to register module prefetch handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseModulePrefetchDelegateService extends CoreDelegate<CoreCourseModulePrefetchHandler> {

    protected statusCache = new CoreCache();
    protected featurePrefix = 'CoreCourseModuleDelegate_';
    protected handlerNameProperty = 'modName';

    // Promises for check updates, to prevent performing the same request twice at the same time.
    protected courseUpdatesPromises: Record<string, Record<string, Promise<CourseUpdates>>> = {};

    // Promises and observables for prefetching, to prevent downloading same section twice at the same time and notify progress.
    protected prefetchData: Record<string, Record<string, OngoingPrefetch>> = {};

    constructor() {
        super('CoreCourseModulePrefetchDelegate');
    }

    /**
     * Initialize.
     */
    initialize(): void {
        CoreEvents.on(CoreEvents.LOGOUT, () => this.clearStatusCache());

        CoreEvents.on(CoreEvents.PACKAGE_STATUS_CHANGED, (data) => {
            this.updateStatusCache(data.status, data.component, data.componentId);
        }, CoreSites.getCurrentSiteId());

        // If a file inside a module is downloaded/deleted, clear the corresponding cache.
        CoreEvents.on(CoreEvents.COMPONENT_FILE_ACTION, (data) => {
            if (!CoreFilepool.isFileEventDownloadedOrDeleted(data)) {
                return;
            }

            this.statusCache.invalidate(CoreFilepool.getPackageId(data.component, data.componentId));
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * Check if a certain module can use core_course_check_updates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with boolean: whether the module can use check updates WS.
     */
    async canModuleUseCheckUpdates(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        const handler = this.getPrefetchHandlerFor(module.modname);

        if (!handler) {
            // Module not supported, cannot use check updates.
            return false;
        }

        if (handler.canUseCheckUpdates) {
            return handler.canUseCheckUpdates(module, courseId);
        }

        // By default, modules can use check updates.
        return true;
    }

    /**
     * Clear the status cache.
     */
    clearStatusCache(): void {
        this.statusCache.clear();
    }

    /**
     * Creates the list of modules to check for get course updates.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @returns Promise resolved with the lists.
     */
    protected async createToCheckList(modules: CoreCourseModuleData[], courseId: number): Promise<ToCheckList> {
        const result: ToCheckList = {
            toCheck: [],
            cannotUse: [],
        };

        const promises = modules.map(async (module) => {
            try {
                const data = await this.getModuleDownloadTime(module);
                if (!data.downloadTime || data.outdated) {
                    return;
                }

                // Module is downloaded and not outdated. Check if it can check updates.
                const canUse = await this.canModuleUseCheckUpdates(module, courseId);
                if (canUse) {
                    // Can use check updates, add it to the tocheck list.
                    result.toCheck.push({
                        contextlevel: ContextLevel.MODULE,
                        id: module.id,
                        since: data.downloadTime || 0,
                    });
                } else {
                    // Cannot use check updates, add it to the cannotUse array.
                    result.cannotUse.push(module);
                }
            } catch {
                // Ignore errors.
            }
        });

        await Promise.all(promises);

        // Sort toCheck list.
        result.toCheck.sort((a, b) => a.id >= b.id ? 1 : -1);

        return result;
    }

    /**
     * Determines a module status based on current status, restoring downloads if needed.
     *
     * @param module Module.
     * @param status Current status.
     * @returns Module status.
     */
    determineModuleStatus(module: CoreCourseAnyModuleData, status: DownloadStatus): DownloadStatus {
        const handler = this.getPrefetchHandlerFor(module.modname);
        const siteId = CoreSites.getCurrentSiteId();

        if (!handler) {
            return status;
        }

        if (status === DownloadStatus.DOWNLOADING) {
            // Check if the download is being handled.
            if (!CoreFilepool.getPackageDownloadPromise(siteId, handler.component, module.id)) {
                // Not handled, the app was probably restarted or something weird happened.
                // Re-start download (files already on queue or already downloaded will be skipped).
                handler.prefetch(module, module.course);
            }
        } else if (handler.determineStatus) {
            // The handler implements a determineStatus function. Apply it.
            return handler.determineStatus(module, status, true);
        }

        return status;
    }

    /**
     * Download a module.
     *
     * @param module Module to download.
     * @param courseId Course ID the module belongs to.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when finished.
     */
    async downloadModule(module: CoreCourseAnyModuleData, courseId: number, dirPath?: string): Promise<void> {
        // Check if the module has a prefetch handler.
        const handler = this.getPrefetchHandlerFor(module.modname);

        if (!handler) {
            return;
        }

        await this.syncModule(module, courseId);

        await handler.download(module, courseId, dirPath);
    }

    /**
     * Check for updates in a course.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @returns Promise resolved with the updates. If a module is set to false, it means updates cannot be
     *         checked for that module in the current site.
     */
    async getCourseUpdates(modules: CoreCourseModuleData[], courseId: number): Promise<CourseUpdates> {
        // Check if there's already a getCourseUpdates in progress.
        const id = Md5.hashAsciiStr(courseId + '#' + JSON.stringify(modules));
        const siteId = CoreSites.getCurrentSiteId();

        if (this.courseUpdatesPromises[siteId] && this.courseUpdatesPromises[siteId][id] !== undefined) {
            // There's already a get updates ongoing, return the promise.
            return this.courseUpdatesPromises[siteId][id];
        } else if (!this.courseUpdatesPromises[siteId]) {
            this.courseUpdatesPromises[siteId] = {};
        }

        this.courseUpdatesPromises[siteId][id] = this.fetchCourseUpdates(modules, courseId, siteId);

        try {
            return await this.courseUpdatesPromises[siteId][id];
        } finally {
            // Get updates finished, delete the promise.
            delete this.courseUpdatesPromises[siteId][id];
        }
    }

    /**
     * Fetch updates in a course.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @param siteId Site ID.
     * @returns Promise resolved with the updates. If a module is set to false, it means updates cannot be
     *         checked for that module in the site.
     */
    protected async fetchCourseUpdates(
        modules: CoreCourseModuleData[],
        courseId: number,
        siteId: string,
    ): Promise<CourseUpdates> {
        const data = await this.createToCheckList(modules, courseId);
        const result: CourseUpdates = {};

        // Mark as false the modules that cannot use check updates WS.
        data.cannotUse.forEach((module) => {
            result[module.id] = false;
        });

        if (!data.toCheck.length) {
            // Nothing to check, no need to call the WS.
            return result;
        }

        // Get the site, maybe the user changed site.
        const site = await CoreSites.getSite(siteId);

        const params: CoreCourseCheckUpdatesWSParams = {
            courseid: courseId,
            tocheck: data.toCheck,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getCourseUpdatesCacheKey(courseId),
            emergencyCache: false, // If downloaded data has changed and offline, just fail. See MOBILE-2085.
            uniqueCacheKey: true,
            splitRequest: {
                param: 'tocheck',
                maxLength: 10,
            },
        };

        try {
            const response = await site.read<CoreCourseCheckUpdatesWSResponse>('core_course_check_updates', params, preSets);

            // Store the last execution of the check updates call.
            const entry: CoreCourseCheckUpdatesDBRecord = {
                courseId: courseId,
                time: CoreTime.timestamp(),
            };
            CorePromiseUtils.ignoreErrors(site.getDb().insertRecord(CHECK_UPDATES_TIMES_TABLE, entry));

            return this.treatCheckUpdatesResult(data.toCheck, response, result);
        } catch (error) {
            // Cannot get updates.
            // Get cached entries but discard modules with a download time higher than the last execution of check updates.
            let entry: CoreCourseCheckUpdatesDBRecord | undefined;
            try {
                entry = await site.getDb().getRecord<CoreCourseCheckUpdatesDBRecord>(
                    CHECK_UPDATES_TIMES_TABLE,
                    { courseId: courseId },
                );
            } catch {
                // No previous executions, return result as it is.
                return result;
            }

            preSets.getCacheUsingCacheKey = true;
            preSets.omitExpires = true;

            const response = await site.read<CoreCourseCheckUpdatesWSResponse>('core_course_check_updates', params, preSets);

            return this.treatCheckUpdatesResult(data.toCheck, response, result, entry.time);
        }
    }

    /**
     * Check for updates in a course.
     *
     * @param courseId Course ID the modules belong to.
     * @returns Promise resolved with the updates.
     */
    async getCourseUpdatesByCourseId(courseId: number): Promise<CourseUpdates> {
        // Get course sections and all their modules.
        const sections = await CoreCourse.getSections(courseId, false, true, { omitExpires: true });

        return this.getCourseUpdates(CoreCourse.getSectionsModules(sections), courseId);
    }

    /**
     * Get cache key for course updates WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getCourseUpdatesCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'courseUpdates:' + courseId;
    }

    /**
     * Get modules download size. Only treat the modules with status not downloaded or outdated.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @returns Promise resolved with the size.
     */
    async getDownloadSize(modules: CoreCourseModuleData[], courseId: number): Promise<CoreFileSizeSum> {
        // Get the status of each module.
        const data = await this.getModulesStatus(modules, courseId);

        const downloadableModules = data[DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED].concat(data[DownloadStatus.OUTDATED]);
        const result: CoreFileSizeSum = {
            size: 0,
            total: true,
        };

        await Promise.all(downloadableModules.map(async (module) => {
            const size = await this.getModuleDownloadSize(module, courseId);

            result.total = result.total && size.total;
            result.size += size.size;
        }));

        return result;
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module to get size.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved with the size.
     */
    async getModuleDownloadSize(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreFileSizeSum> {
        const handler = this.getPrefetchHandlerFor(module.modname);

        if (!handler) {
            return { size: 0, total: false };
        }
        const downloadable = await this.isModuleDownloadable(module, courseId);
        if (!downloadable) {
            return { size: 0, total: true };
        }

        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        const downloadSize = this.statusCache.getValue<CoreFileSizeSum>(packageId, 'downloadSize');
        if (downloadSize !== undefined) {
            return downloadSize;
        }

        try {
            const size = await handler.getDownloadSize(module, courseId, single);

            return this.statusCache.setValue(packageId, 'downloadSize', size);
        } catch (error) {
            const cachedSize = this.statusCache.getValue<CoreFileSizeSum>(packageId, 'downloadSize', true);
            if (cachedSize) {
                return cachedSize;
            }

            throw error;
        }
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module to get size.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with the size.
     */
    async getModuleDownloadedSize(module: CoreCourseAnyModuleData, courseId: number): Promise<number> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        if (!handler) {
            return 0;
        }

        const downloadable = await this.isModuleDownloadable(module, courseId);
        if (!downloadable) {
            return 0;
        }

        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        const downloadedSize = this.statusCache.getValue<number>(packageId, 'downloadedSize');
        if (downloadedSize !== undefined) {
            return downloadedSize;
        }

        try {
            let size = 0;

            if (handler.getDownloadedSize) {
                // Handler implements a method to calculate the downloaded size, use it.
                size = await handler.getDownloadedSize(module, courseId);
            } else {
                // Handler doesn't implement it, get the module files and check if they're downloaded.
                const files = await this.getModuleFiles(module, courseId);

                const siteId = CoreSites.getCurrentSiteId();

                // Retrieve file size if it's downloaded.
                await Promise.all(files.map(async (file) => {
                    const path = await CoreFilepool.getFilePathByUrl(siteId, CoreFileHelper.getFileUrl(file));

                    try {
                        const fileSize = await CoreFile.getFileSize(path);

                        size += fileSize;
                    } catch {
                        // Error getting size. Check if the file is being downloaded.
                        const isDownloading = await CoreFilepool.isFileDownloadingByUrl(siteId, CoreFileHelper.getFileUrl(file));
                        if (isDownloading) {
                            // If downloading, count as downloaded.
                            size += file.filesize || 0;
                        }
                    }
                }));
            }

            return this.statusCache.setValue(packageId, 'downloadedSize', size);
        } catch {
            return this.statusCache.getValue<number>(packageId, 'downloadedSize', true) || 0;
        }
    }

    /**
     * Gets the estimated total size of data stored for a module. This includes
     * the files downloaded for it (getModuleDownloadedSize) and also the total
     * size of web service requests stored for it.
     *
     * @param module Module to get the size.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with the total size (0 if unknown)
     */
    async getModuleStoredSize(module: CoreCourseAnyModuleData, courseId: number): Promise<number> {
        try {
            const site = CoreSites.getCurrentSite();
            const handler = this.getPrefetchHandlerFor(module.modname);

            const [downloadedSize, cachedSize] = await Promise.all([
                this.getModuleDownloadedSize(module, courseId),
                handler && site ? site.getComponentCacheSize(handler.component, module.id) : 0,
            ]);

            const totalSize = cachedSize + downloadedSize;

            return isNaN(totalSize) ? 0 : totalSize;
        } catch {
            return 0;
        }
    }

    /**
     * Get module files.
     *
     * @param module Module to get the files.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with the list of files.
     */
    async getModuleFiles(
        module: CoreCourseAnyModuleData,
        courseId: number,
    ): Promise<(CoreWSFile | CoreCourseModuleContentFile)[]> {
        const handler = this.getPrefetchHandlerFor(module.modname);

        if (handler?.getFiles) {
            // The handler defines a function to get files, use it.
            return handler.getFiles(module, courseId);
        } else if (handler?.loadContents) {
            // The handler defines a function to load contents, use it before returning module contents.
            await handler.loadContents(module, courseId);

            return module.contents || [];
        } else {
            return module.contents || [];
        }
    }

    /**
     * Get the module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates for all modules in the course. If not provided, it will be
     *                calculated (slower). If it's false it means the site doesn't support check updates.
     * @param refresh True if it should ignore the memory cache, not the WS cache.
     * @param sectionId ID of the section the module belongs to.
     * @returns Promise resolved with the status.
     */
    async getModuleStatus(
        module: CoreCourseAnyModuleData,
        courseId: number,
        updates?: CourseUpdates | false,
        refresh?: boolean,
        sectionId?: number,
    ): Promise<DownloadStatus> {
        const handler = this.getPrefetchHandlerFor(module.modname);

        if (!handler) {
            // No handler found, module not downloadable.
            return DownloadStatus.NOT_DOWNLOADABLE;
        }

        // Check if the status is cached.
        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        const status = this.statusCache.getValue<DownloadStatus>(packageId, 'status');

        if (!refresh && status !== undefined) {
            this.storeCourseAndSection(packageId, courseId, sectionId);

            return this.determineModuleStatus(module, status);
        }

        const result = await this.calculateModuleStatus(handler, module, courseId, updates, sectionId);
        if (result.updateStatus) {
            this.updateStatusCache(result.status, handler.component, module.id, courseId, sectionId);
        }

        return this.determineModuleStatus(module, result.status);
    }

    /**
     * If a module is downloaded or downloading, return its status.
     * This function has a better performance than getModuleStatus, but it doesn't allow you to differentiate betweeen
     * NOT_DOWNLOADABLE and DOWNLOADABLE_NOT_DOWNLOADED.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates for all modules in the course. If not provided, it will be
     *                calculated (slower). If it's false it means the site doesn't support check updates.
     * @param refresh True if it should ignore the memory cache, not the WS cache.
     * @param sectionId ID of the section the module belongs to.
     * @returns Promise resolved with the status, null if not downloaded.
     */
    async getDownloadedModuleStatus(
        module: CoreCourseAnyModuleData,
        courseId: number,
        updates?: CourseUpdates | false,
        refresh?: boolean,
        sectionId?: number,
    ): Promise<DownloadedStatus | null> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        if (!handler) {
            // No handler found, module not downloadable.
            return null;
        }

        // Check if the status is cached.
        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        const status = this.statusCache.getValue<DownloadStatus>(packageId, 'status');

        if (!refresh && status !== undefined) {
            this.storeCourseAndSection(packageId, courseId, sectionId);

            return this.filterDownloadedStatus(this.determineModuleStatus(module, status));
        }

        const result = await this.calculateDownloadedModuleStatus(handler, module, courseId, updates, sectionId);
        if (result.updateStatus && result.status) {
            this.updateStatusCache(result.status, handler.component, module.id, courseId, sectionId);
        }

        return this.filterDownloadedStatus(
            this.determineModuleStatus(module, result.status ?? DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED),
        );
    }

    /**
     * Calculate a module status.
     *
     * @param handler Prefetch handler.
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates for all modules in the course. If not provided, it will be
     *                calculated (slower). If it's false it means the site doesn't support check updates.
     * @param sectionId ID of the section the module belongs to.
     * @returns Promise resolved with the status.
     */
    protected async calculateModuleStatus(
        handler: CoreCourseModulePrefetchHandler,
        module: CoreCourseAnyModuleData,
        courseId: number,
        updates?: CourseUpdates | false,
        sectionId?: number,
    ): Promise<{status: DownloadStatus; updateStatus: boolean}> {
        // Check if the module is downloadable.
        const downloadable = await this.isModuleDownloadable(module, courseId);
        if (!downloadable) {
            return {
                status: DownloadStatus.NOT_DOWNLOADABLE,
                updateStatus: true,
            };
        }

        const result = await this.calculateDownloadedModuleStatus(handler, module, courseId, updates, sectionId);

        return {
            status: result.status ?? DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED,
            updateStatus: result.updateStatus,
        };
    }

    /**
     * Calculate the status of a downloaded module.
     * This function has a better performance than calculateModuleStatus, but it doesn't allow you to differentiate betweeen
     * NOT_DOWNLOADABLE and DOWNLOADABLE_NOT_DOWNLOADED.
     *
     * @param handler Prefetch handler.
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates for all modules in the course. If not provided, it will be
     *                calculated (slower). If it's false it means the site doesn't support check updates.
     * @param sectionId ID of the section the module belongs to.
     * @returns Promise resolved with the status.
     */
    protected async calculateDownloadedModuleStatus(
        handler: CoreCourseModulePrefetchHandler,
        module: CoreCourseAnyModuleData,
        courseId: number,
        updates?: CourseUpdates | false,
        sectionId?: number,
    ): Promise<{status: DownloadedStatus | null; updateStatus: boolean}> {
        // Get the saved package status.
        const siteId = CoreSites.getCurrentSiteId();
        const currentStatus = await CoreFilepool.getPackageStatus(siteId, handler.component, module.id);

        let status = handler.determineStatus ? handler.determineStatus(module, currentStatus, true) : currentStatus;
        if (status !== DownloadStatus.DOWNLOADED || updates === false) {
            return {
                status: this.filterDownloadedStatus(status),
                updateStatus: true,
            };
        }

        // Module is downloaded. Determine if there are updated in the module to show them outdated.
        if (updates === undefined) {
            try {
                // We don't have course updates, calculate them.
                updates = await this.getCourseUpdatesByCourseId(courseId);
            } catch {
                // Error getting updates, show the stored status.
                const packageId = CoreFilepool.getPackageId(handler.component, module.id);
                this.storeCourseAndSection(packageId, courseId, sectionId);

                return {
                    status: this.filterDownloadedStatus(currentStatus),
                    updateStatus: false,
                };
            }
        }

        if (!updates || updates[module.id] === false) {
            // Cannot check updates, always show outdated.
            return {
                status: DownloadStatus.OUTDATED,
                updateStatus: true,
            };
        }

        try {
            // Check if the module has any update.
            const hasUpdates = await this.moduleHasUpdates(module, courseId, updates);

            if (!hasUpdates) {
                // No updates, keep current status.
                return {
                    status,
                    updateStatus: true,
                };
            }

            // Has updates, mark the module as outdated.
            status = DownloadStatus.OUTDATED;

            await CorePromiseUtils.ignoreErrors(
                CoreFilepool.storePackageStatus(siteId, status, handler.component, module.id),
            );

            return {
                status,
                updateStatus: true,
            };
        } catch {
            // Error checking if module has updates.
            const packageId = CoreFilepool.getPackageId(handler.component, module.id);
            const status = this.statusCache.getValue<DownloadStatus>(packageId, 'status', true);

            return {
                status: status ? this.filterDownloadedStatus(status) : null,
                updateStatus: true,
            };
        }
    }

    /**
     * Given a download status, filter it to return only the downloaded statuses.
     *
     * @param status Status.
     * @returns Filtered status, null for not downloaded statuses.
     */
    protected filterDownloadedStatus(status: DownloadStatus): DownloadedStatus | null {
        return status === DownloadStatus.NOT_DOWNLOADABLE || status === DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED ?
            null : status;
    }

    /**
     * Get the status of a list of modules, along with the lists of modules for each status.
     *
     * @param modules List of modules to prefetch.
     * @param courseId Course ID the modules belong to.
     * @param sectionId ID of the section the modules belong to.
     * @param refresh True if it should always check the DB (slower).
     * @param onlyToDisplay True if the status will only be used to determine which button should be displayed.
     * @param checkUpdates Whether to use the WS to check updates. Defaults to true.
     * @returns Promise resolved with the data.
     */
    async getModulesStatus(
        modules: CoreCourseModuleData[],
        courseId: number,
        sectionId?: number,
        refresh?: boolean,
        onlyToDisplay?: boolean,
        checkUpdates: boolean = true,
    ): Promise<CoreCourseModulesStatus> {

        let updates: CourseUpdates | false = false;
        const result: CoreCourseModulesStatus = {
            total: 0,
            status: DownloadStatus.NOT_DOWNLOADABLE,
            [DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED]: [],
            [DownloadStatus.DOWNLOADED]: [],
            [DownloadStatus.DOWNLOADING]: [],
            [DownloadStatus.OUTDATED]: [],
        };

        if (checkUpdates) {
            // Check updates in course. Don't use getCourseUpdates because the list of modules might not be the whole course list.
            try {
                updates = await this.getCourseUpdatesByCourseId(courseId);
            } catch {
                // Cannot get updates.
            }
        }

        await Promise.all(modules.map(async (module) => {
            const handler = this.getPrefetchHandlerFor(module.modname);

            if (!handler) {
                return;
            }

            try {
                const modStatus = await this.getModuleStatus(module, courseId, updates, refresh);

                if (!result[modStatus]) {
                    return;
                }

                result.status = CoreFilepool.determinePackagesStatus(result.status, modStatus);
                result[modStatus].push(module);
                result.total++;
            } catch (error) {
                const packageId = CoreFilepool.getPackageId(handler.component, module.id);
                const cacheStatus = this.statusCache.getValue<DownloadStatus>(packageId, 'status', true);
                if (cacheStatus === undefined) {
                    throw error;
                }

                if (!result[cacheStatus]) {
                    return;
                }

                result.status = CoreFilepool.determinePackagesStatus(result.status, cacheStatus);
                result[cacheStatus].push(module);
                result.total++;
            }
        }));

        return result;
    }

    /**
     * Get the time a module was downloaded, and whether the download is outdated.
     * It will only return the download time if the module is downloaded or outdated.
     *
     * @param module Module.
     * @returns Promise resolved with the data.
     */
    protected async getModuleDownloadTime(
        module: CoreCourseAnyModuleData,
    ): Promise<{ downloadTime?: number; outdated?: boolean }> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        const siteId = CoreSites.getCurrentSiteId();

        if (!handler) {
            return {};
        }

        // Get the status from the cache.
        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        const status = this.statusCache.getValue<DownloadStatus>(packageId, 'status');

        if (status !== undefined && !CoreFileHelper.isStateDownloaded(status)) {
            return {};
        }

        try {
            // Get the stored data to get the status and downloadTime.
            const data = await CoreFilepool.getPackageData(siteId, handler.component, module.id);

            return {
                downloadTime: data.downloadTime,
                outdated: data.status === DownloadStatus.OUTDATED,
            };
        } catch {
            return {};
        }
    }

    /**
     * Get updates for a certain module.
     * It will only return the updates if the module can use check updates and it's downloaded or outdated.
     *
     * @param module Module to check.
     * @param courseId Course the module belongs to.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the updates.
     */
    async getModuleUpdates(
        module: CoreCourseAnyModuleData,
        courseId: number,
        ignoreCache?: boolean,
        siteId?: string,
    ): Promise<CheckUpdatesWSInstance | null> {

        const site = await CoreSites.getSite(siteId);

        const data = await this.getModuleDownloadTime(module);
        if (!data.downloadTime) {
            // Not downloaded, no updates.
            return null;
        }

        // Module is downloaded. Check if it can check updates.
        const canUse = await this.canModuleUseCheckUpdates(module, courseId);
        if (!canUse) {
            // Can't use check updates, no updates.
            return null;
        }

        const params: CoreCourseCheckUpdatesWSParams = {
            courseid: courseId,
            tocheck: [
                {
                    contextlevel: ContextLevel.MODULE,
                    id: module.id,
                    since: data.downloadTime || 0,
                },
            ],
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getModuleUpdatesCacheKey(courseId, module.id),
        };

        if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const response = await site.read<CoreCourseCheckUpdatesWSResponse>('core_course_check_updates', params, preSets);
        if (!response.instances[0]) {
            throw new CoreError('Could not get module updates.');
        }

        return response.instances[0];
    }

    /**
     * Get cache key for module updates WS calls.
     *
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @returns Cache key.
     */
    protected getModuleUpdatesCacheKey(courseId: number, moduleId: number): string {
        return this.getCourseUpdatesCacheKey(courseId) + ':' + moduleId;
    }

    /**
     * Get a prefetch handler.
     *
     * @param moduleName The module name to work on.
     * @returns Prefetch handler.
     */
    getPrefetchHandlerFor<T extends CoreCourseModulePrefetchHandler>(moduleName: string): T | undefined {
        return this.getHandler(moduleName, true) as T;
    }

    /**
     * Invalidate check updates WS call.
     *
     * @param courseId Course ID.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateCourseUpdates(courseId: number): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return;
        }

        await site.invalidateWsCacheForKey(this.getCourseUpdatesCacheKey(courseId));
    }

    /**
     * Invalidate a list of modules in a course. This should only invalidate WS calls, not downloaded files.
     *
     * @param modules List of modules.
     * @param courseId Course ID.
     * @returns Promise resolved when modules are invalidated.
     */
    async invalidateModules(modules: CoreCourseModuleData[], courseId: number): Promise<void> {

        const promises = modules.map(async (module) => {
            const handler = this.getPrefetchHandlerFor(module.modname);
            if (!handler) {
                return;
            }

            if (handler.invalidateModule) {
                await CorePromiseUtils.ignoreErrors(handler.invalidateModule(module, courseId));
            }

            // Invalidate cache.
            this.invalidateModuleStatusCache(module);
        });

        promises.push(this.invalidateCourseUpdates(courseId));

        await Promise.all(promises);
    }

    /**
     * Invalidates the cache for a given module.
     *
     * @param module Module to be invalidated.
     */
    invalidateModuleStatusCache(module: CoreCourseAnyModuleData): void {
        const handler = this.getPrefetchHandlerFor(module.modname);
        if (handler) {
            this.statusCache.invalidate(CoreFilepool.getPackageId(handler.component, module.id));
        }
    }

    /**
     * Invalidate check updates WS call for a certain module.
     *
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when data is invalidated.
     */
    async invalidateModuleUpdates(courseId: number, moduleId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getModuleUpdatesCacheKey(courseId, moduleId));
    }

    /**
     * Check if a list of modules is being downloaded.
     *
     * @param id An ID to identify the download.
     * @returns True if it's being downloaded, false otherwise.
     */
    isBeingDownloaded(id: string): boolean {
        const siteId = CoreSites.getCurrentSiteId();

        return !!(this.prefetchData[siteId]?.[id]);
    }

    /**
     * Check if a module is downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved with true if downloadable, false otherwise.
     */
    async isModuleDownloadable(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean> {
        if ('uservisible' in module && !CoreCourseHelper.canUserViewModule(module)) {
            // Module isn't visible by the user, cannot be downloaded.
            return false;
        }

        const handler = this.getPrefetchHandlerFor(module.modname);
        if (!handler) {
            return false;
        }

        if (!handler.isDownloadable) {
            // Function not defined, assume it's downloadable.
            return true;
        }

        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        let downloadable = this.statusCache.getValue<boolean>(packageId, 'downloadable');

        if (downloadable !== undefined) {
            return downloadable;
        }

        try {
            downloadable = await handler.isDownloadable(module, courseId);

            return this.statusCache.setValue(packageId, 'downloadable', downloadable);
        } catch {
            // Something went wrong, assume it's not downloadable.
            return false;
        }
    }

    /**
     * Check if a module has updates based on the result of getCourseUpdates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates.
     * @returns Promise resolved with boolean: whether the module has updates.
     */
    async moduleHasUpdates(module: CoreCourseAnyModuleData, courseId: number, updates: CourseUpdates): Promise<boolean> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        const moduleUpdates = updates[module.id];

        if (handler?.hasUpdates) {
            // Handler implements its own function to check the updates, use it.
            return handler.hasUpdates(module, courseId, moduleUpdates);
        } else if (!moduleUpdates || !moduleUpdates.updates || !moduleUpdates.updates.length) {
            // Module doesn't have any update.
            return false;
        } else if (handler?.updatesNames?.test) {
            // Check the update names defined by the handler.
            for (let i = 0, len = moduleUpdates.updates.length; i < len; i++) {
                if (handler.updatesNames.test(moduleUpdates.updates[i].name)) {
                    return true;
                }
            }

            return false;
        }

        // Handler doesn't define hasUpdates or updatesNames and there is at least 1 update. Assume it has updates.
        return true;
    }

    /**
     * Prefetch a module.
     *
     * @param module Module to prefetch.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved when finished.
     */
    async prefetchModule(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<void> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        if (!handler) {
            return;
        }

        await this.syncModule(module, courseId);

        await handler.prefetch(module, courseId, single);
    }

    /**
     * Sync a group of modules.
     *
     * @param modules Array of modules to sync.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when finished.
     */
    async syncModules(modules: CoreCourseModuleData[], courseId: number): Promise<void> {
        try {
            await Promise.all(modules.map((module) => this.syncModule(module, courseId)));
        } finally {
            // Invalidate course updates.
            await CorePromiseUtils.ignoreErrors(this.invalidateCourseUpdates(courseId));
        }
    }

    /**
     * Sync a module.
     *
     * @param module Module to sync.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when finished.
     */
    async syncModule<T = unknown>(module: CoreCourseAnyModuleData, courseId: number): Promise<T | undefined> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        if (!handler?.sync) {
            return;
        }

        const result = await CorePromiseUtils.ignoreErrors(handler.sync(module, courseId));

        // Always invalidate status cache for this module. We cannot know if data was sent to server or not.
        this.invalidateModuleStatusCache(module);

        return <T> result;
    }

    /**
     * Prefetches a list of modules using their prefetch handlers.
     * If a prefetch already exists for this site and id, returns the current promise.
     *
     * @param id An ID to identify the download. It can be used to retrieve the download promise.
     * @param modules List of modules to prefetch.
     * @param courseId Course ID the modules belong to.
     * @param onProgress Function to call everytime a module is downloaded.
     * @returns Promise resolved when all modules have been prefetched.
     */
    async prefetchModules(
        id: string,
        modules: CoreCourseModuleData[],
        courseId: number,
        onProgress?: CoreCourseModulesProgressFunction,
    ): Promise<void> {

        const siteId = CoreSites.getCurrentSiteId();
        const currentPrefetchData = this.prefetchData[siteId]?.[id];

        if (currentPrefetchData) {
            // There's a prefetch ongoing, return the current promise.
            if (onProgress) {
                currentPrefetchData.subscriptions.push(currentPrefetchData.observable.subscribe(onProgress));
            }

            return currentPrefetchData.promise;
        }

        let count = 0;
        const total = modules.length;
        const moduleIds = modules.map((module) => module.id);
        const prefetchData: OngoingPrefetch = {
            observable: new BehaviorSubject<CoreCourseModulesProgress>({ count: count, total: total }),
            promise: Promise.resolve(),
            subscriptions: [],
        };

        if (onProgress) {
            prefetchData.observable.subscribe(onProgress);
        }

        const promises = modules.map(async (module) => {
            // Check if the module has a prefetch handler.
            const handler = this.getPrefetchHandlerFor(module.modname);
            if (!handler) {
                return;
            }

            const downloadable = await this.isModuleDownloadable(module, courseId);
            if (!downloadable) {
                return;
            }

            await handler.prefetch(module, courseId);

            const index = moduleIds.indexOf(module.id);
            if (index > -1) {
                moduleIds.splice(index, 1);
                count++;
                prefetchData.observable.next({ count: count, total: total });
            }
        });

        // Set the promise.
        prefetchData.promise = CorePromiseUtils.allPromises(promises);

        // Store the prefetch data in the list.
        this.prefetchData[siteId] = this.prefetchData[siteId] || {};
        this.prefetchData[siteId][id] = prefetchData;

        try {
            await prefetchData.promise;
        } finally {
            // Unsubscribe all observers.
            prefetchData.subscriptions.forEach((subscription) => {
                subscription.unsubscribe();
            });
            delete this.prefetchData[siteId][id];
        }
    }

    /**
     * Remove module Files from handler.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     */
    async removeModuleFiles(module: CoreCourseAnyModuleData, courseId: number): Promise<void> {
        const handler = this.getPrefetchHandlerFor(module.modname);
        const siteId = CoreSites.getCurrentSiteId();

        if (handler?.removeFiles) {
            // Handler implements a method to remove the files, use it.
            await handler.removeFiles(module, courseId);
        } else {
            // No method to remove files, use get files to try to remove the files.
            const files = await this.getModuleFiles(module, courseId);

            await Promise.all(files.map(async (file) => {
                await CorePromiseUtils.ignoreErrors(CoreFilepool.removeFileByUrl(siteId, CoreFileHelper.getFileUrl(file)));
            }));
        }

        if (!handler) {
            return;
        }

        // Update downloaded size.
        const packageId = CoreFilepool.getPackageId(handler.component, module.id);
        this.statusCache.setValue(packageId, 'downloadedSize', 0);

        // If module is downloadable, set not dowloaded status.
        const downloadable = await this.isModuleDownloadable(module, courseId);
        if (!downloadable) {
            return;
        }

        await CoreFilepool.storePackageStatus(siteId, DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED, handler.component, module.id);
    }

    /**
     * Set an on progress function for the download of a list of modules.
     *
     * @param id An ID to identify the download.
     * @param onProgress Function to call everytime a module is downloaded.
     */
    setOnProgress(id: string, onProgress: CoreCourseModulesProgressFunction): void {
        const currentData = this.prefetchData[CoreSites.getCurrentSiteId()]?.[id];

        if (currentData) {
            // There's a prefetch ongoing, return the current promise.
            currentData.subscriptions.push(currentData.observable.subscribe(onProgress));
        }
    }

    /**
     * If courseId or sectionId is set, save them in the cache.
     *
     * @param packageId The package ID.
     * @param courseId Course ID.
     * @param sectionId Section ID.
     */
    storeCourseAndSection(packageId: string, courseId?: number, sectionId?: number): void {
        if (courseId) {
            this.statusCache.setValue(packageId, 'courseId', courseId);
        }
        if (sectionId && sectionId > 0) {
            this.statusCache.setValue(packageId, 'sectionId', sectionId);
        }
    }

    /**
     * Treat the result of the check updates WS call.
     *
     * @param toCheckList List of modules to check (from createToCheckList).
     * @param response WS call response.
     * @param result Object where to store the result.
     * @param previousTime Time of the previous check updates execution. If set, modules downloaded
     *                     after this time will be ignored.
     * @returns Result.
     */
    protected treatCheckUpdatesResult(
        toCheckList: CheckUpdatesToCheckWSParam[],
        response: CoreCourseCheckUpdatesWSResponse,
        result: CourseUpdates,
        previousTime?: number,
    ): CourseUpdates {
        // Format the response to index it by module ID.
        CoreArray.toObject<false | CheckUpdatesWSInstance>(response.instances, 'id', result);

        // Treat warnings, adding the not supported modules.
        response.warnings?.forEach((warning) => {
            if (warning.warningcode == 'missingcallback') {
                result[warning.itemid || -1] = false;
            }
        });

        if (previousTime) {
            // Remove from the list the modules downloaded after previousTime.
            toCheckList.forEach((entry) => {
                if (result[entry.id] && entry.since > previousTime) {
                    delete result[entry.id];
                }
            });
        }

        return result;
    }

    /**
     * Update the status of a module in the "cache".
     *
     * @param status New status.
     * @param component Package's component.
     * @param componentId An ID to use in conjunction with the component.
     * @param courseId Course ID of the module.
     * @param sectionId Section ID of the module.
     */
    updateStatusCache(
        status: DownloadStatus,
        component: string,
        componentId?: string | number,
        courseId?: number,
        sectionId?: number,
    ): void {
        const packageId = CoreFilepool.getPackageId(component, componentId);
        const cachedStatus = this.statusCache.getValue<DownloadStatus>(packageId, 'status', true);

        // If courseId/sectionId is set, store it.
        this.storeCourseAndSection(packageId, courseId, sectionId);

        if (cachedStatus === undefined || cachedStatus === status) {
            this.statusCache.setValue(packageId, 'status', status);

            return;
        }

        // The status has changed, notify that the section has changed.
        courseId = courseId || this.statusCache.getValue(packageId, 'courseId', true);
        sectionId = sectionId || this.statusCache.getValue(packageId, 'sectionId', true);

        // Invalidate and set again.
        this.statusCache.invalidate(packageId);
        this.statusCache.setValue(packageId, 'status', status);

        if (courseId && sectionId) {
            const data: CoreEventSectionStatusChangedData = {
                sectionId,
                courseId: courseId,
            };
            CoreEvents.trigger(CoreEvents.SECTION_STATUS_CHANGED, data, CoreSites.getCurrentSiteId());
        }
    }

}

export const CoreCourseModulePrefetchDelegate = makeSingleton(CoreCourseModulePrefetchDelegateService);

/**
 * Progress of downloading a list of modules.
 */
export type CoreCourseModulesProgress = {
    /**
     * Number of modules downloaded so far.
     */
    count: number;

    /**
     * Toal of modules to download.
     */
    total: number;
};

/**
 * Progress function for downloading a list of modules.
 *
 * @param data Progress data.
 */
export type CoreCourseModulesProgressFunction = (data: CoreCourseModulesProgress) => void;

/**
 * Interface that all course prefetch handlers must implement.
 */
export interface CoreCourseModulePrefetchHandler extends CoreDelegateHandler {
    /**
     * Name of the handler.
     */
    name: string;

    /**
     * Name of the module. It should match the "modname" of the module returned in core_course_get_contents.
     */
    modName: string;

    /**
     * The handler's component.
     */
    component: string;

    /**
     * The RegExp to check updates. If a module has an update whose name matches this RegExp, the module will be marked
     * as outdated. This RegExp is ignored if hasUpdates function is defined.
     */
    updatesNames?: RegExp;

    /**
     * Get the download size of a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @returns Promise resolved with the size.
     */
    getDownloadSize(module: CoreCourseAnyModuleData, courseId: number, single?: boolean): Promise<CoreFileSizeSum>;

    /**
     * Prefetch a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when done.
     */
    prefetch(module: CoreCourseAnyModuleData, courseId: number, single?: boolean, dirPath?: string): Promise<void>;

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @returns Promise resolved when all content is downloaded.
     */
    download(module: CoreCourseAnyModuleData, courseId: number, dirPath?: string): Promise<void>;

    /**
     * Invalidate the prefetched content.
     *
     * @param moduleId The module ID.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when the data is invalidated.
     */
    invalidateContent(moduleId: number, courseId: number): Promise<void>;

    /**
     * Check if a certain module can use core_course_check_updates to check if it has updates.
     * If not defined, it will assume all modules can be checked.
     * The modules that return false will always be shown as outdated when they're downloaded.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can use check_updates. The promise should never be rejected.
     */
    canUseCheckUpdates?(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean>;

    /**
     * Return the status to show based on current status. E.g. a module might want to show outdated instead of downloaded.
     * If not implemented, the original status will be returned.
     *
     * @param module Module.
     * @param status The current status.
     * @param canCheck Whether the site allows checking for updates. This parameter was deprecated since app 4.0.
     * @returns Status to display.
     */
    determineStatus?(module: CoreCourseAnyModuleData, status: DownloadStatus, canCheck: true): DownloadStatus;

    /**
     * Get the downloaded size of a module. If not defined, we'll use getFiles to calculate it (it can be slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Size, or promise resolved with the size.
     */
    getDownloadedSize?(module: CoreCourseAnyModuleData, courseId: number): Promise<number>;

    /**
     * Get the list of files of the module. If not defined, we'll assume they are in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns List of files, or promise resolved with the files.
     */
    getFiles?(module: CoreCourseAnyModuleData, courseId: number): Promise<(CoreWSFile | CoreCourseModuleContentFile)[]>;

    /**
     * Check if a certain module has updates based on the result of check updates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param moduleUpdates List of updates for the module.
     * @returns Whether the module has updates. The promise should never be rejected.
     */
    hasUpdates?(module: CoreCourseAnyModuleData, courseId: number, moduleUpdates: false | CheckUpdatesWSInstance): Promise<boolean>;

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when invalidated.
     */
    invalidateModule?(module: CoreCourseAnyModuleData, courseId: number): Promise<void>;

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable?(module: CoreCourseAnyModuleData, courseId: number): Promise<boolean>;

    /**
     * Load module contents in module.contents if they aren't loaded already. This is meant for resources.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     */
    loadContents?(module: CoreCourseAnyModuleData, courseId: number): Promise<void>;

    /**
     * Remove module downloaded files. If not defined, we'll use getFiles to remove them (slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @returns Promise resolved when done.
     */
    removeFiles?(module: CoreCourseAnyModuleData, courseId: number): Promise<void>;

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with sync data when done.
     */
    sync?(module: CoreCourseAnyModuleData, courseId: number, siteId?: string): Promise<unknown>;
}

type ToCheckList = {
    toCheck: CheckUpdatesToCheckWSParam[];
    cannotUse: CoreCourseModuleData[];
};

/**
 * Course updates.
 */
type CourseUpdates = Record<number, false | CheckUpdatesWSInstance>;

/**
 * Status data about a list of modules.
 */
export type CoreCourseModulesStatus = {
    total: number; // Number of modules.
    status: DownloadStatus; // Status of the list of modules.
    [DownloadStatus.DOWNLOADABLE_NOT_DOWNLOADED]: CoreCourseModuleData[]; // Modules with state NOT_DOWNLOADED.
    [DownloadStatus.DOWNLOADED]: CoreCourseModuleData[]; // Modules with state DOWNLOADED.
    [DownloadStatus.DOWNLOADING]: CoreCourseModuleData[]; // Modules with state DOWNLOADING.
    [DownloadStatus.OUTDATED]: CoreCourseModuleData[]; // Modules with state OUTDATED.
};

/**
 * Data for an ongoing module prefetch.
 */
type OngoingPrefetch = {
    promise: Promise<void>; // Prefetch promise.
    observable: Subject<CoreCourseModulesProgress>; // Observable to notify the download progress.
    subscriptions: Subscription[]; // Subscriptions that are currently listening the progress.
};

/**
 * Params of core_course_check_updates WS.
 */
export type CoreCourseCheckUpdatesWSParams = {
    courseid: number; // Course id to check.
    tocheck: CheckUpdatesToCheckWSParam[]; // Instances to check.
    filter?: string[]; // Check only for updates in these areas.
};

/**
 * Data to send in tocheck parameter.
 */
type CheckUpdatesToCheckWSParam = {
    contextlevel: ContextLevel.MODULE; // The context level for the file location. Only module supported right now.
    id: number; // Context instance id.
    since: number; // Check updates since this time stamp.
};

/**
 * Data returned by core_course_check_updates WS.
 */
export type CoreCourseCheckUpdatesWSResponse = {
    instances: CheckUpdatesWSInstance[];
    warnings?: CoreWSExternalWarning[];
};

/**
 * Instance data returned by the WS.
 */
type CheckUpdatesWSInstance = {
    contextlevel: string; // The context level.
    id: number; // Instance id.
    updates: {
        name: string; // Name of the area updated.
        timeupdated?: number; // Last time was updated.
        itemids?: number[]; // The ids of the items updated.
    }[];
};
