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
import { CoreEventsProvider } from '@providers/events';
import { CoreFileProvider } from '@providers/file';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreCourseProvider } from './course';
import { CoreCache } from '@classes/cache';
import { CoreSiteWSPreSets } from '@classes/site';
import { CoreConstants } from '../../constants';
import { Md5 } from 'ts-md5/dist/md5';
import { Subject, BehaviorSubject, Subscription } from 'rxjs';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreFileHelperProvider } from '@providers/file-helper';

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
     * If true, this module will be treated as not downloadable when determining the status of a list of modules. The module will
     * still be downloaded when downloading the section/course, it only affects whether the button should be displayed.
     */
    skipListStatus: boolean;

    /**
     * Get the download size of a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the size and a boolean indicating if it was able
     *         to calculate the total size.
     */
    getDownloadSize(module: any, courseId: number, single?: boolean): Promise<{ size: number, total: boolean }>;

    /**
     * Prefetch a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when done.
     */
    prefetch(module: any, courseId?: number, single?: boolean, dirPath?: string): Promise<any>;

    /**
     * Download the module.
     *
     * @param module The module object returned by WS.
     * @param courseId Course ID.
     * @param dirPath Path of the directory where to store all the content files.
     * @return Promise resolved when all content is downloaded.
     */
    download?(module: any, courseId: number, dirPath?: string): Promise<any>;

    /**
     * Check if a certain module can use core_course_check_updates to check if it has updates.
     * If not defined, it will assume all modules can be checked.
     * The modules that return false will always be shown as outdated when they're downloaded.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can use check_updates. The promise should never be rejected.
     */
    canUseCheckUpdates?(module: any, courseId: number): boolean | Promise<boolean>;

    /**
     * Return the status to show based on current status. E.g. a module might want to show outdated instead of downloaded.
     * If not implemented, the original status will be returned.
     *
     * @param module Module.
     * @param status The current status.
     * @param canCheck Whether the site allows checking for updates.
     * @return Status to display.
     */
    determineStatus?(module: any, status: string, canCheck: boolean): string;

    /**
     * Get the downloaded size of a module. If not defined, we'll use getFiles to calculate it (it can be slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Size, or promise resolved with the size.
     */
    getDownloadedSize?(module: any, courseId: number): number | Promise<number>;

    /**
     * Get the list of files of the module. If not defined, we'll assume they are in module.contents.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return List of files, or promise resolved with the files.
     */
    getFiles?(module: any, courseId: number): any[] | Promise<any[]>;

    /**
     * Check if a certain module has updates based on the result of check updates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param moduleUpdates List of updates for the module.
     * @return Whether the module has updates. The promise should never be rejected.
     */
    hasUpdates?(module: any, courseId: number, moduleUpdates: any[]): boolean | Promise<boolean>;

    /**
     * Invalidate WS calls needed to determine module status (usually, to check if module is downloadable).
     * It doesn't need to invalidate check updates. It should NOT invalidate files nor all the prefetched data.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when invalidated.
     */
    invalidateModule?(module: any, courseId: number): Promise<any>;

    /**
     * Check if a module can be downloaded. If the function is not defined, we assume that all modules are downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Whether the module can be downloaded. The promise should never be rejected.
     */
    isDownloadable?(module: any, courseId: number): boolean | Promise<boolean>;

    /**
     * Load module contents in module.contents if they aren't loaded already. This is meant for resources.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when done.
     */
    loadContents?(module: any, courseId: number): Promise<any>;

    /**
     * Remove module downloaded files. If not defined, we'll use getFiles to remove them (slow).
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when done.
     */
    removeFiles?(module: any, courseId: number): Promise<any>;

    /**
     * Sync a module.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    sync?(module: any, courseId: number, siteId?: any): Promise<any>;
}

/**
 * Delegate to register module prefetch handlers.
 */
@Injectable()
export class CoreCourseModulePrefetchDelegate extends CoreDelegate {
    // Variables for database.
    protected CHECK_UPDATES_TIMES_TABLE = 'check_updates_times';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreCourseModulePrefetchDelegate',
        version: 1,
        tables: [
            {
                name: this.CHECK_UPDATES_TIMES_TABLE,
                columns: [
                    {
                        name: 'courseId',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'time',
                        type: 'INTEGER',
                        notNull: true
                    }
                ]
            }
        ]
    };

    protected ROOT_CACHE_KEY = 'mmCourse:';
    protected statusCache = new CoreCache();
    protected handlerNameProperty = 'modName';

    // Promises for check updates, to prevent performing the same request twice at the same time.
    protected courseUpdatesPromises: { [s: string]: { [s: string]: Promise<any> } } = {};

    // Promises and observables for prefetching, to prevent downloading same section twice at the same time and notify progress.
    protected prefetchData: {
        [s: string]: {
            [s: string]: {
                promise: Promise<any>,
                observable: Subject<CoreCourseModulesProgress>,
                subscriptions: Subscription[]
            }
        }
    } = {};

    constructor(loggerProvider: CoreLoggerProvider,
            protected sitesProvider: CoreSitesProvider,
            protected utils: CoreUtilsProvider,
            protected courseProvider: CoreCourseProvider,
            protected filepoolProvider: CoreFilepoolProvider,
            protected timeUtils: CoreTimeUtilsProvider,
            protected fileProvider: CoreFileProvider,
            protected eventsProvider: CoreEventsProvider,
            protected fileHelper: CoreFileHelperProvider) {
        super('CoreCourseModulePrefetchDelegate', loggerProvider, sitesProvider, eventsProvider);

        this.sitesProvider.registerSiteSchema(this.siteSchema);

        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearStatusCache.bind(this));
        eventsProvider.on(CoreEventsProvider.PACKAGE_STATUS_CHANGED, (data) => {
            this.updateStatusCache(data.status, data.component, data.componentId);
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Check if current site can check updates using core_course_check_updates.
     *
     * @return True if can check updates, false otherwise.
     */
    canCheckUpdates(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_course_check_updates');
    }

    /**
     * Check if a certain module can use core_course_check_updates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with boolean: whether the module can use check updates WS.
     */
    canModuleUseCheckUpdates(module: any, courseId: number): Promise<boolean> {
        const handler = this.getPrefetchHandlerFor(module);

        if (!handler) {
            // Module not supported, cannot use check updates.
            return Promise.resolve(false);
        }

        if (handler.canUseCheckUpdates) {
            return Promise.resolve(handler.canUseCheckUpdates(module, courseId));
        }

        // By default, modules can use check updates.
        return Promise.resolve(true);
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
     * @return Promise resolved with the lists.
     */
    protected createToCheckList(modules: any[], courseId: number): Promise<{ toCheck: any[], cannotUse: any[] }> {
        const result = {
                toCheck: [],
                cannotUse: []
            },
            promises = [];

        modules.forEach((module) => {
            promises.push(this.getModuleStatusAndDownloadTime(module, courseId).then((data) => {
                if (data.status == CoreConstants.DOWNLOADED) {
                    // Module is downloaded and not outdated. Check if it can check updates.
                    return this.canModuleUseCheckUpdates(module, courseId).then((canUse) => {
                        if (canUse) {
                            // Can use check updates, add it to the tocheck list.
                            result.toCheck.push({
                                contextlevel: 'module',
                                id: module.id,
                                since: data.downloadTime || 0
                            });
                        } else {
                            // Cannot use check updates, add it to the cannotUse array.
                            result.cannotUse.push(module);
                        }
                    });
                }
            }).catch(() => {
                // Ignore errors.
            }));
        });

        return Promise.all(promises).then(() => {
            // Sort toCheck list.
            result.toCheck.sort((a, b) => {
                return a.id >= b.id ? 1 : -1;
            });

            return result;
        });
    }

    /**
     * Determines a module status based on current status, restoring downloads if needed.
     *
     * @param module Module.
     * @param status Current status.
     * @param canCheck True if updates can be checked using core_course_check_updates.
     * @return Module status.
     */
    determineModuleStatus(module: any, status: string, canCheck?: boolean): string {
        const handler = this.getPrefetchHandlerFor(module),
            siteId = this.sitesProvider.getCurrentSiteId();

        if (handler) {
            if (status == CoreConstants.DOWNLOADING) {
                // Check if the download is being handled.
                if (!this.filepoolProvider.getPackageDownloadPromise(siteId, handler.component, module.id)) {
                    // Not handled, the app was probably restarted or something weird happened.
                    // Re-start download (files already on queue or already downloaded will be skipped).
                    handler.prefetch(module);
                }
            } else if (handler.determineStatus) {
                // The handler implements a determineStatus function. Apply it.
                canCheck = canCheck || this.canCheckUpdates();

                return handler.determineStatus(module, status, canCheck);
            }
        }

        return status;
    }

    /**
     * Check for updates in a course.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @return Promise resolved with the updates. If a module is set to false, it means updates cannot be
     *         checked for that module in the current site.
     */
    getCourseUpdates(modules: any[], courseId: number): Promise<any> {
        if (!this.canCheckUpdates()) {
            return Promise.reject(null);
        }

        // Check if there's already a getCourseUpdates in progress.
        const id = <string> Md5.hashAsciiStr(courseId + '#' + JSON.stringify(modules)),
            siteId = this.sitesProvider.getCurrentSiteId();

        if (this.courseUpdatesPromises[siteId] && this.courseUpdatesPromises[siteId][id]) {
            // There's already a get updates ongoing, return the promise.
            return this.courseUpdatesPromises[siteId][id];
        } else if (!this.courseUpdatesPromises[siteId]) {
            this.courseUpdatesPromises[siteId] = {};
        }

        this.courseUpdatesPromises[siteId][id] = this.createToCheckList(modules, courseId).then((data) => {
            const result = {};

            // Mark as false the modules that cannot use check updates WS.
            data.cannotUse.forEach((module) => {
                result[module.id] = false;
            });

            if (!data.toCheck.length) {
                // Nothing to check, no need to call the WS.
                return result;
            }

            // Get the site, maybe the user changed site.
            return this.sitesProvider.getSite(siteId).then((site) => {
                const params = {
                        courseid: courseId,
                        tocheck: data.toCheck
                    },
                    preSets: CoreSiteWSPreSets = {
                        cacheKey: this.getCourseUpdatesCacheKey(courseId),
                        emergencyCache: false, // If downloaded data has changed and offline, just fail. See MOBILE-2085.
                        uniqueCacheKey: true
                    };

                return site.read('core_course_check_updates', params, preSets).then((response) => {
                    if (!response || typeof response.instances == 'undefined') {
                        return Promise.reject(null);
                    }

                    // Store the last execution of the check updates call.
                    const entry = {
                        courseId: courseId,
                        time: this.timeUtils.timestamp()
                    };
                    site.getDb().insertRecord(this.CHECK_UPDATES_TIMES_TABLE, entry).catch(() => {
                        // Ignore errors.
                    });

                    return this.treatCheckUpdatesResult(data.toCheck, response, result);
                }).catch((error) => {
                    // Cannot get updates.
                    // Get cached entries but discard modules with a download time higher than the last execution of check updates.
                    return site.getDb().getRecord(this.CHECK_UPDATES_TIMES_TABLE, { courseId: courseId }).then((entry) => {
                        preSets.getCacheUsingCacheKey = true;
                        preSets.omitExpires = true;

                        return site.read('core_course_check_updates', params, preSets).then((response) => {
                            if (!response || typeof response.instances == 'undefined') {
                                return Promise.reject(error);
                            }

                            return this.treatCheckUpdatesResult(data.toCheck, response, result, entry.time);
                        });
                    }, () => {
                        // No previous executions, return result as it is.
                        return result;
                    });
                });
            });
        }).finally(() => {
            // Get updates finished, delete the promise.
            delete this.courseUpdatesPromises[siteId][id];
        });

        return this.courseUpdatesPromises[siteId][id];
    }

    /**
     * Check for updates in a course.
     *
     * @param courseId Course ID the modules belong to.
     * @return Promise resolved with the updates.
     */
    getCourseUpdatesByCourseId(courseId: number): Promise<any> {
        if (!this.canCheckUpdates()) {
            return Promise.reject(null);
        }

        // Get course sections and all their modules.
        return this.courseProvider.getSections(courseId, false, true, { omitExpires: true }).then((sections) => {
            return this.getCourseUpdates(this.courseProvider.getSectionsModules(sections), courseId);
        });
    }

    /**
     * Get cache key for course updates WS calls.
     *
     * @param courseId Course ID.
     * @return Cache key.
     */
    protected getCourseUpdatesCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'courseUpdates:' + courseId;
    }

    /**
     * Get modules download size. Only treat the modules with status not downloaded or outdated.
     *
     * @param modules List of modules.
     * @param courseId Course ID the modules belong to.
     * @return Promise resolved with the size and a boolean indicating if it was able
     *         to calculate the total size.
     */
    getDownloadSize(modules: any[], courseId: number): Promise<{ size: number, total: boolean }> {
        // Get the status of each module.
        return this.getModulesStatus(modules, courseId).then((data) => {
            const downloadableModules = data[CoreConstants.NOT_DOWNLOADED].concat(data[CoreConstants.OUTDATED]),
                promises = [],
                result = {
                    size: 0,
                    total: true
                };

            downloadableModules.forEach((module) => {
                promises.push(this.getModuleDownloadSize(module, courseId).then((size) => {
                    result.total = result.total && size.total;
                    result.size += size.size;
                }));
            });

            return Promise.all(promises).then(() => {
                return result;
            });
        });
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module to get size.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved with the size and a boolean indicating if it was able
     *         to calculate the total size.
     */
    getModuleDownloadSize(module: any, courseId: number, single?: boolean): Promise<{ size: number, total: boolean }> {
        const handler = this.getPrefetchHandlerFor(module);
        let downloadSize,
            packageId;

        // Check if the module has a prefetch handler.
        if (handler) {
            return this.isModuleDownloadable(module, courseId).then((downloadable) => {
                if (!downloadable) {
                    return { size: 0, total: true };
                }

                packageId = this.filepoolProvider.getPackageId(handler.component, module.id);
                downloadSize = this.statusCache.getValue(packageId, 'downloadSize');
                if (typeof downloadSize != 'undefined') {
                    return downloadSize;
                }

                return Promise.resolve(handler.getDownloadSize(module, courseId, single)).then((size) => {
                    return this.statusCache.setValue(packageId, 'downloadSize', size);
                }).catch((error) => {
                    const cachedSize = this.statusCache.getValue(packageId, 'downloadSize', true);
                    if (cachedSize) {
                        return cachedSize;
                    }

                    return Promise.reject(error);
                });
            });
        }

        return Promise.resolve({ size: 0, total: false });
    }

    /**
     * Get the download size of a module.
     *
     * @param module Module to get size.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with the size.
     */
    getModuleDownloadedSize(module: any, courseId: number): Promise<number> {
        const handler = this.getPrefetchHandlerFor(module);
        let downloadedSize,
            packageId,
            promise;

        // Check if the module has a prefetch handler.
        if (handler) {
            return this.isModuleDownloadable(module, courseId).then((downloadable) => {
                if (!downloadable) {
                    return 0;
                }

                packageId = this.filepoolProvider.getPackageId(handler.component, module.id);
                downloadedSize = this.statusCache.getValue(packageId, 'downloadedSize');
                if (typeof downloadedSize != 'undefined') {
                    return downloadedSize;
                }

                if (handler.getDownloadedSize) {
                    // Handler implements a method to calculate the downloaded size, use it.
                    promise = Promise.resolve(handler.getDownloadedSize(module, courseId));
                } else {
                    // Handler doesn't implement it, get the module files and check if they're downloaded.
                    promise = this.getModuleFiles(module, courseId).then((files) => {
                        const siteId = this.sitesProvider.getCurrentSiteId(),
                            promises = [];
                        let size = 0;

                        // Retrieve file size if it's downloaded.
                        files.forEach((file) => {
                            const fileUrl = file.url || file.fileurl;
                            promises.push(this.filepoolProvider.getFilePathByUrl(siteId, fileUrl).then((path) => {
                                return this.fileProvider.getFileSize(path).catch(() => {
                                    // Error getting size. Check if the file is being downloaded.
                                    return this.filepoolProvider.isFileDownloadingByUrl(siteId, fileUrl).then(() => {
                                        // If downloading, count as downloaded.
                                        return file.filesize;
                                    }).catch(() => {
                                        // Not downloading and not found in disk.
                                        return 0;
                                    });
                                }).then((fs) => {
                                    size += fs;
                                });
                            }));
                        });

                        return Promise.all(promises).then(() => {
                            return size;
                        });
                    });
                }

                return promise.then((size) => {
                    return this.statusCache.setValue(packageId, 'downloadedSize', size);
                }).catch(() => {
                    return this.statusCache.getValue(packageId, 'downloadedSize', true);
                });
            });
        }

        return Promise.resolve(0);
    }

    /**
     * Get module files.
     *
     * @param module Module to get the files.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with the list of files.
     */
    getModuleFiles(module: any, courseId: number): Promise<any[]> {
        const handler = this.getPrefetchHandlerFor(module);

        if (handler.getFiles) {
            // The handler defines a function to get files, use it.
            return Promise.resolve(handler.getFiles(module, courseId));
        } else if (handler.loadContents) {
            // The handler defines a function to load contents, use it before returning module contents.
            return handler.loadContents(module, courseId).then(() => {
                return module.contents;
            });
        } else {
            return Promise.resolve(module.contents || []);
        }
    }

    /**
     * Get the module status.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates for all modules in the course. If not provided, it will be
     *                calculated (slower). If it's false it means the site doesn't support check updates.
     * @param refresh True if it should ignore the cache.
     * @param sectionId ID of the section the module belongs to.
     * @return Promise resolved with the status.
     */
    getModuleStatus(module: any, courseId: number, updates?: any, refresh?: boolean, sectionId?: number): Promise<string> {
        const handler = this.getPrefetchHandlerFor(module),
            siteId = this.sitesProvider.getCurrentSiteId(),
            canCheck = this.canCheckUpdates();

        if (handler) {
            // Check if the status is cached.
            const component = handler.component,
                packageId = this.filepoolProvider.getPackageId(component, module.id);
            let status = this.statusCache.getValue(packageId, 'status'),
                updateStatus = true,
                promise;

            if (!refresh && typeof status != 'undefined') {
                this.storeCourseAndSection(packageId, courseId, sectionId);

                return Promise.resolve(this.determineModuleStatus(module, status, canCheck));
            }

            // Check if the module is downloadable.
            return this.isModuleDownloadable(module, courseId).then((downloadable) => {
                if (!downloadable) {
                    return CoreConstants.NOT_DOWNLOADABLE;
                }

                // Get the saved package status.
                return this.filepoolProvider.getPackageStatus(siteId, component, module.id).then((currentStatus) => {
                    status = handler.determineStatus ? handler.determineStatus(module, currentStatus, canCheck) : currentStatus;
                    if (status != CoreConstants.DOWNLOADED) {
                        return status;
                    }

                    // Module is downloaded. Determine if there are updated in the module to show them outdated.
                    if (typeof updates == 'undefined') {
                        // We don't have course updates, calculate them.
                        promise = this.getCourseUpdatesByCourseId(courseId);
                    } else if (updates === false) {
                        // Cannot check updates.
                        return status;
                    } else {
                        promise = Promise.resolve(updates);
                    }

                    return promise.then((updates) => {
                        if (!updates || updates[module.id] === false) {
                            // Cannot check updates, always show outdated.
                            return CoreConstants.OUTDATED;
                        }

                        // Check if the module has any update.
                        return this.moduleHasUpdates(module, courseId, updates).then((hasUpdates) => {
                            if (!hasUpdates) {
                                // No updates, keep current status.
                                return status;
                            }

                            // Has updates, mark the module as outdated.
                            status = CoreConstants.OUTDATED;

                            return this.filepoolProvider.storePackageStatus(siteId, status, component, module.id).catch(() => {
                                // Ignore errors.
                            }).then(() => {
                                return status;
                            });
                        }).catch(() => {
                            // Error checking if module has updates.
                            const status = this.statusCache.getValue(packageId, 'status', true);

                            return this.determineModuleStatus(module, status, canCheck);
                        });
                    }, () => {
                        // Error getting updates, show the stored status.
                        updateStatus = false;
                        this.storeCourseAndSection(packageId, courseId, sectionId);

                        return currentStatus;
                    });
                });
            }).then((status) => {
                if (updateStatus) {
                    this.updateStatusCache(status, component, module.id, courseId, sectionId);
                }

                return this.determineModuleStatus(module, status, canCheck);
            });
        }

        // No handler found, module not downloadable.
        return Promise.resolve(CoreConstants.NOT_DOWNLOADABLE);
    }

    /**
     * Get the status of a list of modules, along with the lists of modules for each status.
     * @see {@link CoreFilepoolProvider.determinePackagesStatus}
     *
     * @param modules List of modules to prefetch.
     * @param courseId Course ID the modules belong to.
     * @param sectionId ID of the section the modules belong to.
     * @param refresh True if it should always check the DB (slower).
     * @param onlyToDisplay True if the status will only be used to determine which button should be displayed.
     * @param checkUpdates Whether to use the WS to check updates. Defaults to true.
     * @return Promise resolved with an object with the following properties:
     *         - status (string) Status of the module.
     *         - total (number) Number of modules.
     *         - CoreConstants.NOT_DOWNLOADED (any[]) Modules with state NOT_DOWNLOADED.
     *         - CoreConstants.DOWNLOADED (any[]) Modules with state DOWNLOADED.
     *         - CoreConstants.DOWNLOADING (any[]) Modules with state DOWNLOADING.
     *         - CoreConstants.OUTDATED (any[]) Modules with state OUTDATED.
     */
    getModulesStatus(modules: any[], courseId: number, sectionId?: number, refresh?: boolean, onlyToDisplay?: boolean,
            checkUpdates: boolean = true): any {

        const promises = [],
            result: any = {
                total: 0
            };
        let status = CoreConstants.NOT_DOWNLOADABLE,
            promise;

        // Init result.
        result[CoreConstants.NOT_DOWNLOADED] = [];
        result[CoreConstants.DOWNLOADED] = [];
        result[CoreConstants.DOWNLOADING] = [];
        result[CoreConstants.OUTDATED] = [];

        if (checkUpdates) {
            // Check updates in course. Don't use getCourseUpdates because the list of modules might not be the whole course list.
            promise = this.getCourseUpdatesByCourseId(courseId).catch(() => {
                // Cannot get updates.
                return false;
            });
        } else {
            promise = Promise.resolve(false);
        }

        return promise.then((updates) => {

            modules.forEach((module) => {
                // Check if the module has a prefetch handler.
                const handler = this.getPrefetchHandlerFor(module);
                if (handler) {
                    if (onlyToDisplay && handler.skipListStatus) {
                        // Skip this module.
                        return;
                    }

                    const packageId = this.filepoolProvider.getPackageId(handler.component, module.id);

                    promises.push(this.getModuleStatus(module, courseId, updates, refresh).then((modStatus) => {
                        if (result[modStatus]) {
                            status = this.filepoolProvider.determinePackagesStatus(status, modStatus);
                            result[modStatus].push(module);
                            result.total++;
                        }
                    }).catch((error) => {
                        const cacheStatus = this.statusCache.getValue(packageId, 'status', true);
                        if (typeof cacheStatus == 'undefined') {
                            return Promise.reject(error);
                        }

                        if (result[cacheStatus]) {
                            status = this.filepoolProvider.determinePackagesStatus(status, cacheStatus);
                            result[cacheStatus].push(module);
                            result.total++;
                        }
                    }));
                }
            });

            return Promise.all(promises).then(() => {
                result.status = status;

                return result;
            });
        });
    }

    /**
     * Get a module status and download time. It will only return the download time if the module is downloaded or outdated.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with the data.
     */
    protected getModuleStatusAndDownloadTime(module: any, courseId: number): Promise<{ status: string, downloadTime?: number }> {
        const handler = this.getPrefetchHandlerFor(module),
            siteId = this.sitesProvider.getCurrentSiteId();

        if (handler) {
            // Get the status from the cache.
            const packageId = this.filepoolProvider.getPackageId(handler.component, module.id),
                status = this.statusCache.getValue(packageId, 'status');

            if (typeof status != 'undefined' && !this.fileHelper.isStateDownloaded(status)) {
                // Module isn't downloaded, just return the status.
                return Promise.resolve({
                    status: status
                });
            }

            // Check if the module is downloadable.
            return this.isModuleDownloadable(module, courseId).then((downloadable: boolean): any => {
                if (!downloadable) {
                    return {
                        status: CoreConstants.NOT_DOWNLOADABLE
                    };
                }

                // Get the stored data to get the status and downloadTime.
                return this.filepoolProvider.getPackageData(siteId, handler.component, module.id).then((data) => {
                    return {
                        status: data.status,
                        downloadTime: data.downloadTime || 0
                    };
                });
            });
        }

        // No handler found, module not downloadable.
        return Promise.resolve({
            status: CoreConstants.NOT_DOWNLOADABLE
        });
    }

    /**
     * Get updates for a certain module.
     * It will only return the updates if the module can use check updates and it's downloaded or outdated.
     *
     * @param module Module to check.
     * @param courseId Course the module belongs to.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the updates.
     */
    getModuleUpdates(module: any, courseId: number, ignoreCache?: boolean, siteId?: string): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get the status and download time of the module.
            return this.getModuleStatusAndDownloadTime(module, courseId).then((data) => {
                if (!this.fileHelper.isStateDownloaded(data.status)) {
                    // Not downloaded, no updates.
                    return {};
                }

                // Module is downloaded. Check if it can check updates.
                return this.canModuleUseCheckUpdates(module, courseId).then((canUse) => {
                    if (!canUse) {
                        // Can't use check updates, no updates.
                        return {};
                    }

                    const params = {
                            courseid: courseId,
                            tocheck: [
                                {
                                    contextlevel: 'module',
                                    id: module.id,
                                    since: data.downloadTime || 0
                                }
                            ]
                        },
                        preSets: CoreSiteWSPreSets = {
                            cacheKey: this.getModuleUpdatesCacheKey(courseId, module.id),
                        };

                    if (ignoreCache) {
                        preSets.getFromCache = false;
                        preSets.emergencyCache = false;
                    }

                    return site.read('core_course_check_updates', params, preSets).then((response) => {
                        if (!response || !response.instances || !response.instances[0]) {
                            return Promise.reject(null);
                        }

                        return response.instances[0];
                    });
                });
            });
        });
    }

    /**
     * Get cache key for module updates WS calls.
     *
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @return Cache key.
     */
    protected getModuleUpdatesCacheKey(courseId: number, moduleId: number): string {
        return this.getCourseUpdatesCacheKey(courseId) + ':' + moduleId;
    }

    /**
     * Get a prefetch handler.
     *
     * @param module The module to work on.
     * @return Prefetch handler.
     */
    getPrefetchHandlerFor(module: any): CoreCourseModulePrefetchHandler {
        return <CoreCourseModulePrefetchHandler> this.getHandler(module.modname, true);
    }

    /**
     * Invalidate check updates WS call.
     *
     * @param courseId Course ID.
     * @return Promise resolved when data is invalidated.
     */
    invalidateCourseUpdates(courseId: number): Promise<any> {
        return this.sitesProvider.getCurrentSite().invalidateWsCacheForKey(this.getCourseUpdatesCacheKey(courseId));
    }

    /**
     * Invalidate a list of modules in a course. This should only invalidate WS calls, not downloaded files.
     *
     * @param modules List of modules.
     * @param courseId Course ID.
     * @return Promise resolved when modules are invalidated.
     */
    invalidateModules(modules: any[], courseId: number): Promise<any> {
        const promises = [];

        modules.forEach((module) => {
            const handler = this.getPrefetchHandlerFor(module);
            if (handler) {
                if (handler.invalidateModule) {
                    promises.push(handler.invalidateModule(module, courseId).catch(() => {
                        // Ignore errors.
                    }));
                }

                // Invalidate cache.
                this.invalidateModuleStatusCache(module);
            }
        });

        promises.push(this.invalidateCourseUpdates(courseId));

        return Promise.all(promises);
    }

    /**
     * Invalidates the cache for a given module.
     *
     * @param module Module to be invalidated.
     */
    invalidateModuleStatusCache(module: any): void {
        const handler = this.getPrefetchHandlerFor(module);
        if (handler) {
            this.statusCache.invalidate(this.filepoolProvider.getPackageId(handler.component, module.id));
        }
    }

    /**
     * Invalidate check updates WS call for a certain module.
     *
     * @param courseId Course ID.
     * @param moduleId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when data is invalidated.
     */
    invalidateModuleUpdates(courseId: number, moduleId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getModuleUpdatesCacheKey(courseId, moduleId));
        });
    }

    /**
     * Check if a list of modules is being downloaded.
     *
     * @param id An ID to identify the download.
     * @return True if it's being downloaded, false otherwise.
     */
    isBeingDownloaded(id: string): boolean {
        const siteId = this.sitesProvider.getCurrentSiteId();

        return !!(this.prefetchData[siteId] && this.prefetchData[siteId][id]);
    }

    /**
     * Check if a module is downloadable.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved with true if downloadable, false otherwise.
     */
    isModuleDownloadable(module: any, courseId: number): Promise<boolean> {
        if (module.uservisible === false) {
            // Module isn't visible by the user, cannot be downloaded.
            return Promise.resolve(false);
        }

        const handler = this.getPrefetchHandlerFor(module);

        if (handler) {
            if (typeof handler.isDownloadable == 'function') {
                const packageId = this.filepoolProvider.getPackageId(handler.component, module.id),
                    downloadable = this.statusCache.getValue(packageId, 'downloadable');

                if (typeof downloadable != 'undefined') {
                    return Promise.resolve(downloadable);
                } else {
                    return Promise.resolve(handler.isDownloadable(module, courseId)).then((downloadable) => {
                        return this.statusCache.setValue(packageId, 'downloadable', downloadable);
                    }).catch(() => {
                        // Something went wrong, assume it's not downloadable.
                        return false;
                    });
                }
            } else {
                // Function not defined, assume it's not downloadable.
                return Promise.resolve(true);
            }
        } else {
            // No handler for module, so it's not downloadable.
            return Promise.resolve(false);
        }
    }

    /**
     * Check if a module has updates based on the result of getCourseUpdates.
     *
     * @param module Module.
     * @param courseId Course ID the module belongs to.
     * @param updates Result of getCourseUpdates.
     * @return Promise resolved with boolean: whether the module has updates.
     */
    moduleHasUpdates(module: any, courseId: number, updates: any): Promise<boolean> {
        const handler = this.getPrefetchHandlerFor(module),
            moduleUpdates = updates[module.id];

        if (handler && handler.hasUpdates) {
            // Handler implements its own function to check the updates, use it.
            return Promise.resolve(handler.hasUpdates(module, courseId, moduleUpdates));
        } else if (!moduleUpdates || !moduleUpdates.updates || !moduleUpdates.updates.length) {
            // Module doesn't have any update.
            return Promise.resolve(false);
        } else if (handler && handler.updatesNames && handler.updatesNames.test) {
            // Check the update names defined by the handler.
            for (let i = 0, len = moduleUpdates.updates.length; i < len; i++) {
                if (handler.updatesNames.test(moduleUpdates.updates[i].name)) {
                    return Promise.resolve(true);
                }
            }

            return Promise.resolve(false);
        }

        // Handler doesn't define hasUpdates or updatesNames and there is at least 1 update. Assume it has updates.
        return Promise.resolve(true);
    }

    /**
     * Prefetch a module.
     *
     * @param module Module to prefetch.
     * @param courseId Course ID the module belongs to.
     * @param single True if we're downloading a single module, false if we're downloading a whole section.
     * @return Promise resolved when finished.
     */
    prefetchModule(module: any, courseId: number, single?: boolean): Promise<any> {
        const handler = this.getPrefetchHandlerFor(module);

        // Check if the module has a prefetch handler.
        if (handler) {
            return this.syncModule(module, courseId).then(() => {
                return handler.prefetch(module, courseId, single);
            });
        }

        return Promise.resolve();
    }

    /**
     * Sync a group of modules.
     *
     * @param modules Array of modules to sync.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when finished.
     */
    syncModules(modules: any[], courseId: number): Promise<any> {
        return Promise.all(modules.map((module) => {
            return this.syncModule(module, courseId).then(() => {
                // Invalidate course updates.
                return this.invalidateCourseUpdates(courseId).catch(() => {
                    // Ignore errors.
                });
            });
        }));
    }

    /**
     * Sync a module.
     *
     * @param module Module to sync.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when finished.
     */
    syncModule(module: any, courseId: number): Promise<any> {
        const handler = this.getPrefetchHandlerFor(module);

        if (handler && handler.sync) {
            return handler.sync(module, courseId).then((result) => {
                // Always invalidate status cache for this module. We cannot know if data was sent to server or not.
                this.invalidateModuleStatusCache(module);

                return result;
            }).catch(() => {
                // Ignore errors.
            });
        }

        return Promise.resolve();
    }

    /**
     * Prefetches a list of modules using their prefetch handlers.
     * If a prefetch already exists for this site and id, returns the current promise.
     *
     * @param id An ID to identify the download. It can be used to retrieve the download promise.
     * @param modules List of modules to prefetch.
     * @param courseId Course ID the modules belong to.
     * @param onProgress Function to call everytime a module is downloaded.
     * @return Promise resolved when all modules have been prefetched.
     */
    prefetchModules(id: string, modules: any[], courseId: number, onProgress?: CoreCourseModulesProgressFunction): Promise<any> {

        const siteId = this.sitesProvider.getCurrentSiteId(),
            currentData = this.prefetchData[siteId] && this.prefetchData[siteId][id];

        if (currentData) {
            // There's a prefetch ongoing, return the current promise.
            if (onProgress) {
                currentData.subscriptions.push(currentData.observable.subscribe(onProgress));
            }

            return currentData.promise;
        }

        let count = 0;
        const promises = [],
            total = modules.length,
            moduleIds = modules.map((module) => {
                return module.id;
            }),
            prefetchData = {
                observable: new BehaviorSubject<CoreCourseModulesProgress>({ count: count, total: total }),
                promise: undefined,
                subscriptions: []
            };

        if (onProgress) {
            prefetchData.observable.subscribe(onProgress);
        }

        modules.forEach((module) => {
            // Check if the module has a prefetch handler.
            const handler = this.getPrefetchHandlerFor(module);
            if (handler) {
                promises.push(this.isModuleDownloadable(module, courseId).then((downloadable) => {
                    if (!downloadable) {
                        return;
                    }

                    return handler.prefetch(module, courseId).then(() => {
                        const index = moduleIds.indexOf(module.id);
                        if (index > -1) {
                            // It's one of the modules we were expecting to download.
                            moduleIds.splice(index, 1);
                            count++;
                            prefetchData.observable.next({ count: count, total: total });
                        }
                    });
                }));
            }
        });

        // Set the promise.
        prefetchData.promise = this.utils.allPromises(promises).finally(() => {
            // Unsubscribe all observers.
            prefetchData.subscriptions.forEach((subscription: Subscription) => {
                subscription.unsubscribe();
            });
            delete this.prefetchData[siteId][id];
        });

        // Store the prefetch data in the list.
        if (!this.prefetchData[siteId]) {
            this.prefetchData[siteId] = {};
        }
        this.prefetchData[siteId][id] = prefetchData;

        return prefetchData.promise;
    }

    /**
     * Remove module Files from handler.
     *
     * @param module Module to remove the files.
     * @param courseId Course ID the module belongs to.
     * @return Promise resolved when done.
     */
    removeModuleFiles(module: any, courseId: number): Promise<void> {
        const handler = this.getPrefetchHandlerFor(module),
            siteId = this.sitesProvider.getCurrentSiteId();
        let promise;

        if (handler && handler.removeFiles) {
            // Handler implements a method to remove the files, use it.
            promise = handler.removeFiles(module, courseId);
        } else {
            // No method to remove files, use get files to try to remove the files.
            promise = this.getModuleFiles(module, courseId).then((files) => {
                const promises = [];
                files.forEach((file) => {
                    promises.push(this.filepoolProvider.removeFileByUrl(siteId, file.url || file.fileurl).catch(() => {
                        // Ignore errors.
                    }));
                });

                return Promise.all(promises);
            });
        }

        return promise.then(() => {
            if (handler) {
                // Update status of the module.
                const packageId = this.filepoolProvider.getPackageId(handler.component, module.id);
                this.statusCache.setValue(packageId, 'downloadedSize', 0);

                return this.filepoolProvider.storePackageStatus(siteId, CoreConstants.NOT_DOWNLOADED, handler.component, module.id);
            }
        });
    }

    /**
     * Set an on progress function for the download of a list of modules.
     *
     * @param id An ID to identify the download.
     * @param onProgress Function to call everytime a module is downloaded.
     */
    setOnProgress(id: string, onProgress: CoreCourseModulesProgressFunction): void {
        const siteId = this.sitesProvider.getCurrentSiteId(),
            currentData = this.prefetchData[siteId] && this.prefetchData[siteId][id];

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
     * @return Result.
     */
    protected treatCheckUpdatesResult(toCheckList: any[], response: any, result: any, previousTime?: number): any {
        // Format the response to index it by module ID.
        this.utils.arrayToObject(response.instances, 'id', result);

        // Treat warnings, adding the not supported modules.
        response.warnings.forEach((warning) => {
            if (warning.warningcode == 'missingcallback') {
                result[warning.itemid] = false;
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
    updateStatusCache(status: string, component: string, componentId?: string | number, courseId?: number, sectionId?: number)
            : void {
        const packageId = this.filepoolProvider.getPackageId(component, componentId),
            cachedStatus = this.statusCache.getValue(packageId, 'status', true);
        let notify;

        // If the status has changed, notify that the section has changed.
        notify = typeof cachedStatus != 'undefined' && cachedStatus !== status;

        // If courseId/sectionId is set, store it.
        this.storeCourseAndSection(packageId, courseId, sectionId);

        if (notify) {
            if (!courseId) {
                courseId = this.statusCache.getValue(packageId, 'courseId', true);
            }
            if (!sectionId) {
                sectionId = this.statusCache.getValue(packageId, 'sectionId', true);
            }

            // Invalidate and set again.
            this.statusCache.invalidate(packageId);
            this.statusCache.setValue(packageId, 'status', status);

            if (sectionId) {
                this.eventsProvider.trigger(CoreEventsProvider.SECTION_STATUS_CHANGED, {
                    sectionId: sectionId,
                    courseId: courseId
                }, this.sitesProvider.getCurrentSiteId());
            }
        } else {
            this.statusCache.setValue(packageId, 'status', status);
        }
    }
}
