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

import { CoreNetwork } from '@services/network';
import { CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSitesCommonWSOptions, CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreUtils } from '@services/utils/utils';
import { CoreSite } from '@classes/sites/site';
import { CoreConstants } from '@/core/constants';
import { makeSingleton, Translate } from '@singletons';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';

import {
    CoreCourseStatusDBRecord, CoreCourseViewedModulesDBRecord, COURSE_STATUS_TABLE, COURSE_VIEWED_MODULES_TABLE ,
} from './database/course';
import { CoreCourseOffline } from './course-offline';
import { CoreError } from '@classes/errors/error';
import {
    CoreCourseAnyCourseData,
    CoreCourses,
    CoreCoursesProvider,
} from '../../courses/services/courses';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreCourseHelper, CoreCourseModuleData, CoreCourseModuleCompletionData } from './course-helper';
import { CoreCourseFormatDelegate } from './format-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreCourseLogCronHandler } from './handlers/log-cron';
import { CoreSitePlugins } from '@features/siteplugins/services/siteplugins';
import { CoreCourseAutoSyncData, CoreCourseSyncProvider } from './sync';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreCourseModuleDelegate } from './module-delegate';
import { lazyMap, LazyMap } from '@/core/utils/lazy-map';
import { asyncInstance, AsyncInstance } from '@/core/utils/async-instance';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy } from '@classes/database/database-table-proxy';
import { SQLiteDB } from '@classes/sqlitedb';
import { CorePlatform } from '@services/platform';
import { asyncObservable, firstValueFrom } from '@/core/utils/rxjs';
import { map } from 'rxjs/operators';
import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';

const ROOT_CACHE_KEY = 'mmCourse:';

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CoreCourseSyncProvider.AUTO_SYNCED]: CoreCourseAutoSyncData;
    }

}

/**
 * Course Module completion status enumeration.
 */
export enum CoreCourseModuleCompletionStatus {
    COMPLETION_INCOMPLETE = 0,
    COMPLETION_COMPLETE = 1,
    COMPLETION_COMPLETE_PASS = 2,
    COMPLETION_COMPLETE_FAIL = 3,
}

/**
 * @deprecated since 4.3 Not used anymore.
 */
export enum CoreCourseCompletionMode {
    FULL = 'full',
    BASIC = 'basic',
}

/**
 * Completion tracking valid values.
 */
export enum CoreCourseModuleCompletionTracking {
    COMPLETION_TRACKING_NONE = 0,
    COMPLETION_TRACKING_MANUAL = 1,
    COMPLETION_TRACKING_AUTOMATIC = 2,
}

/**
 * Service that provides some features regarding a course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseProvider {

    static readonly ALL_SECTIONS_ID = -2;
    static readonly STEALTH_MODULES_SECTION_ID = -1;
    static readonly ACCESS_GUEST = 'courses_access_guest';
    static readonly ACCESS_DEFAULT = 'courses_access_default';
    static readonly ALL_COURSES_CLEARED = -1;

    static readonly COMPONENT = 'CoreCourse';

    readonly CORE_MODULES = [
        'assign', 'bigbluebuttonbn', 'book', 'chat', 'choice', 'data', 'feedback', 'folder', 'forum', 'glossary', 'h5pactivity',
        'imscp', 'label', 'lesson', 'lti', 'page', 'quiz', 'resource', 'scorm', 'survey', 'url', 'wiki', 'workshop',
    ];

    protected logger: CoreLogger;
    protected statusTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreCourseStatusDBRecord>>>;
    protected viewedModulesTables: LazyMap<AsyncInstance<CoreDatabaseTable<CoreCourseViewedModulesDBRecord, 'courseId' | 'cmId'>>>;

    constructor() {
        this.logger = CoreLogger.getInstance('CoreCourseProvider');
        this.statusTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable(COURSE_STATUS_TABLE, {
                    siteId,
                    config: { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
                    onDestroy: () => delete this.statusTables[siteId],
                }),
            ),
        );

        this.viewedModulesTables = lazyMap(
            siteId => asyncInstance(
                () => CoreSites.getSiteTable<CoreCourseViewedModulesDBRecord, 'courseId' | 'cmId'>(COURSE_VIEWED_MODULES_TABLE, {
                    siteId,
                    config: { cachingStrategy: CoreDatabaseCachingStrategy.None },
                    primaryKeyColumns: ['courseId', 'cmId'],
                    onDestroy: () => delete this.viewedModulesTables[siteId],
                }),
            ),
        );
    }

    /**
     * Initialize.
     */
    initialize(): void {
        CorePlatform.resume.subscribe(() => {
            // Run the handler the app is open to keep user in online status.
            setTimeout(() => {
                CoreUtils.ignoreErrors(
                    CoreCronDelegate.forceCronHandlerExecution(CoreCourseLogCronHandler.name),
                );
            }, 1000);
        });

        CoreEvents.on(CoreEvents.LOGIN, () => {
            setTimeout(() => {
                // Ignore errors here, since probably login is not complete: it happens on token invalid.
                CoreUtils.ignoreErrors(
                    CoreCronDelegate.forceCronHandlerExecution(CoreCourseLogCronHandler.name),
                );
            }, 1000);
        });
    }

    /**
     * Check if the get course blocks WS is available in current site.
     *
     * @param site Site to check. If not defined, current site.
     * @returns Whether it's available.
     * @since 3.7
     */
    canGetCourseBlocks(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.isVersionGreaterEqualThan('3.7');
    }

    /**
     * Check whether the site supports requesting stealth modules.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether the site supports requesting stealth modules.
     * @since 3.5.3, 3.6
     */
    canRequestStealthModules(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!site && site.isVersionGreaterEqualThan('3.5.3');
    }

    /**
     * Check if module completion could have changed. If it could have, trigger event. This function must be used,
     * for example, after calling a "module_view" WS since it can change the module completion.
     *
     * @param courseId Course ID.
     * @param completion Completion status of the module.
     */
    checkModuleCompletion(courseId: number, completion?: CoreCourseModuleCompletionData): void {
        if (completion && this.isIncompleteAutomaticCompletion(completion)) {
            this.invalidateSections(courseId).finally(() => {
                CoreEvents.trigger(CoreEvents.COMPLETION_MODULE_VIEWED, {
                    courseId: courseId,
                    cmId: completion.cmid,
                });
            });
        }
    }

    /**
     * Given some completion data, return whether it's an automatic completion that hasn't been completed yet.
     *
     * @param completion Completion data.
     * @returns Whether it's an automatic completion that hasn't been completed yet.
     */
    isIncompleteAutomaticCompletion(completion: CoreCourseModuleCompletionData): boolean {
        return completion.tracking === CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_AUTOMATIC &&
            completion.state === CoreCourseModuleCompletionStatus.COMPLETION_INCOMPLETE;
    }

    /**
     * Check whether a course has indentation enabled.
     *
     * @param site Site.
     * @param courseId Course id.
     * @returns Whether indentation is enabled.
     */
    async isCourseIndentationEnabled(site: CoreSite, courseId: number): Promise<boolean> {
        if (!site.isVersionGreaterEqualThan('4.0')) {
            return false;
        }

        const course = await CoreCourses.getCourseByField('id', courseId, site.id);
        const formatOptions = CoreUtils.objectToKeyValueMap<{ indentation?: string }>(
            course.courseformatoptions ?? [],
            'name',
            'value',
        );

        return formatOptions.indentation === '1';
    }

    /**
     * Clear all courses status in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when all status are cleared.
     */
    async clearAllCoursesStatus(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        this.logger.debug('Clear all course status for site ' + site.id);

        await this.statusTables[site.getId()].delete();
        this.triggerCourseStatusChanged(CoreCourseProvider.ALL_COURSES_CLEARED, CoreConstants.NOT_DOWNLOADED, site.id);
    }

    /**
     * Check if the current view is a certain course initial page.
     *
     * @param courseId Course ID.
     * @returns Whether the current view is a certain course.
     */
    currentViewIsCourse(courseId: number): boolean {
        const route = CoreNavigator.getCurrentRoute({ routeData: { isCourseIndex: true } });

        if (!route) {
            return false;
        }

        return Number(route.snapshot.params.courseId) == courseId;
    }

    /**
     * Get completion status of all the activities in a course for a certain user.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user.
     * @param forceCache True if it should return cached data. Has priority over ignoreCache.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param includeOffline True if it should load offline data in the completion status.
     * @returns Promise resolved with the completion statuses: object where the key is module ID.
     */
    async getActivitiesCompletionStatus(
        courseId: number,
        siteId?: string,
        userId?: number,
        forceCache: boolean = false,
        ignoreCache: boolean = false,
        includeOffline: boolean = true,
    ): Promise<Record<string, CoreCourseCompletionActivityStatus>> {

        const site = await CoreSites.getSite(siteId);
        userId = userId || site.getUserId();

        this.logger.debug(`Getting completion status for user ${userId} in course ${courseId}`);

        const params: CoreCompletionGetActivitiesCompletionStatusWSParams = {
            courseid: courseId,
            userid: userId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getActivitiesCompletionCacheKey(courseId, userId),
        };

        if (forceCache) {
            preSets.omitExpires = true;
        } else if (ignoreCache) {
            preSets.getFromCache = false;
            preSets.emergencyCache = false;
        }

        const data = await site.read<CoreCourseCompletionActivityStatusWSResponse>(
            'core_completion_get_activities_completion_status',
            params,
            preSets,
        );

        if (!data || !data.statuses) {
            throw Error('WS core_completion_get_activities_completion_status failed');
        }

        const completionStatus = CoreUtils.arrayToObject(data.statuses, 'cmid');
        if (!includeOffline) {
            return completionStatus;
        }

        try {
            // Now get the offline completion (if any).
            const offlineCompletions = await CoreCourseOffline.getCourseManualCompletions(courseId, site.id);

            offlineCompletions.forEach((offlineCompletion) => {

                if (offlineCompletion && completionStatus[offlineCompletion.cmid] !== undefined) {
                    const onlineCompletion = completionStatus[offlineCompletion.cmid];

                    // If the activity uses manual completion, override the value with the offline one.
                    if (onlineCompletion.tracking === CoreCourseModuleCompletionTracking.COMPLETION_TRACKING_MANUAL) {
                        onlineCompletion.state = offlineCompletion.completed;
                        onlineCompletion.offline = true;
                    }
                }
            });

            return completionStatus;
        } catch {
            // Ignore errors.
            return completionStatus;
        }
    }

    /**
     * Get cache key for activities completion WS calls.
     *
     * @param courseId Course ID.
     * @param userId User ID.
     * @returns Cache key.
     */
    protected getActivitiesCompletionCacheKey(courseId: number, userId: number): string {
        return ROOT_CACHE_KEY + 'activitiescompletion:' + courseId + ':' + userId;
    }

    /**
     * Get certain module viewed records in the app.
     *
     * @param ids Module IDs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with map of last module viewed data.
     */
    async getCertainModulesViewed(ids: number[] = [], siteId?: string): Promise<Record<number, CoreCourseViewedModulesDBRecord>> {
        if (!ids.length) {
            return {};
        }

        const site = await CoreSites.getSite(siteId);

        const whereAndParams = SQLiteDB.getInOrEqual(ids);

        const entries = await this.viewedModulesTables[site.getId()].getManyWhere({
            sql: 'cmId ' + whereAndParams.sql,
            sqlParams: whereAndParams.params,
            js: (record) => ids.includes(record.cmId),
        });

        return CoreUtils.arrayToObject(entries, 'cmId');
    }

    /**
     * Get course blocks.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of blocks.
     * @since 3.7
     */
    getCourseBlocks(courseId: number, siteId?: string): Promise<CoreCourseBlock[]> {
        return firstValueFrom(this.getCourseBlocksObservable(courseId, { siteId }));
    }

    /**
     * Get course blocks.
     *
     * @param courseId Course ID.
     * @param options Options.
     * @returns Observable that returns the blocks.
     * @since 3.7
     */
    getCourseBlocksObservable(courseId: number, options: CoreSitesCommonWSOptions = {}): WSObservable<CoreCourseBlock[]> {
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const params: CoreBlockGetCourseBlocksWSParams = {
                courseid: courseId,
                returncontents: true,
            };
            const preSets: CoreSiteWSPreSets = {
                cacheKey: this.getCourseBlocksCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            return site.readObservable<CoreCourseBlocksWSResponse>('core_block_get_course_blocks', params, preSets).pipe(
                map(result => result.blocks),
            );
        });
    }

    /**
     * Get cache key for course blocks WS calls.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getCourseBlocksCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'courseblocks:' + courseId;
    }

    /**
     * Get the data stored for a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     */
    async getCourseStatusData(courseId: number, siteId?: string): Promise<CoreCourseStatusDBRecord> {
        const site = await CoreSites.getSite(siteId);
        const entry = await this.statusTables[site.getId()].getOneByPrimaryKey({ id: courseId });
        if (!entry) {
            throw Error('No entry found on course status table');
        }

        return entry;
    }

    /**
     * Get a course status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the status.
     */
    async getCourseStatus(courseId: number, siteId?: string): Promise<string> {
        try {
            const entry = await this.getCourseStatusData(courseId, siteId);

            return entry.status || CoreConstants.NOT_DOWNLOADED;
        } catch {
            return CoreConstants.NOT_DOWNLOADED;
        }
    }

    /**
     * Obtain ids of downloaded courses.
     *
     * @param siteId Site id.
     * @returns Resolves with an array containing downloaded course ids.
     */
    async getDownloadedCourseIds(siteId?: string): Promise<number[]> {
        const downloadedStatuses = [CoreConstants.DOWNLOADED, CoreConstants.DOWNLOADING, CoreConstants.OUTDATED];
        const site = await CoreSites.getSite(siteId);
        const entries = await this.statusTables[site.getId()].getManyWhere({
            sql: 'status IN (?,?,?)',
            sqlParams: downloadedStatuses,
            js: ({ status }) => downloadedStatuses.includes(status),
        });

        return entries.map((entry) => entry.id);
    }

    /**
     * Get last module viewed in the app for a course.
     *
     * @param id Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with last module viewed data, undefined if none.
     */
    async getLastModuleViewed(id: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord | undefined> {
        const viewedModules = await this.getViewedModules(id, siteId);

        return viewedModules[0];
    }

    /**
     * Get a module from Moodle.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID. Recommended to speed up the process and minimize data usage.
     * @param sectionId The section ID.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param modName If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @returns Promise resolved with the module.
     */
    async getModule(
        moduleId: number,
        courseId?: number,
        sectionId?: number,
        preferCache: boolean = false,
        ignoreCache: boolean = false,
        siteId?: string,
        modName?: string,
    ): Promise<CoreCourseModuleData> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Helper function to do the WS request without processing the result.
        const doRequest = async (
            site: CoreSite,
            courseId: number,
            moduleId: number,
            modName: string | undefined,
            includeStealth: boolean,
            preferCache: boolean,
        ): Promise<CoreCourseGetContentsWSSection[]> => {
            const params: CoreCourseGetContentsParams = {
                courseid: courseId,
            };
            params.options = [];

            const preSets: CoreSiteWSPreSets = {
                omitExpires: preferCache,
                updateFrequency: CoreSite.FREQUENCY_RARELY,
            };

            if (includeStealth) {
                params.options.push({
                    name: 'includestealthmodules',
                    value: true,
                });
            }

            // If modName is set, retrieve all modules of that type. Otherwise get only the module.
            if (modName) {
                params.options.push({
                    name: 'modname',
                    value: modName,
                });
                preSets.cacheKey = this.getModuleByModNameCacheKey(modName);
            } else {
                params.options.push({
                    name: 'cmid',
                    value: moduleId,
                });
                preSets.cacheKey = this.getModuleCacheKey(moduleId);
            }

            if (!preferCache && ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            try {
                const sections = await site.read<CoreCourseGetContentsWSResponse>('core_course_get_contents', params, preSets);

                return sections;
            } catch {
                // The module might still be cached by a request with different parameters.
                if (!ignoreCache && !CoreNetwork.isOnline()) {
                    if (includeStealth) {
                        // Older versions didn't include the includestealthmodules option.
                        return doRequest(site, courseId, moduleId, modName, false, true);
                    } else if (modName) {
                        // Falback to the request for the given moduleId only.
                        return doRequest(site, courseId, moduleId, undefined, this.canRequestStealthModules(site), true);
                    }
                }

                throw Error('WS core_course_get_contents failed, cache ignored');
            }
        };

        if (!courseId) {
            // No courseId passed, try to retrieve it.
            const module = await this.getModuleBasicInfo(
                moduleId,
                { siteId, readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
            );
            courseId = module.course;
            sectionId = module.section;
        }

        let sections: CoreCourseGetContentsWSSection[];
        try {
            const site = await CoreSites.getSite(siteId);
            // We have courseId, we can use core_course_get_contents for compatibility.
            this.logger.debug(`Getting module ${moduleId} in course ${courseId}`);

            sections = await doRequest(site, courseId, moduleId, modName, this.canRequestStealthModules(site), preferCache);
        } catch {
            // Error getting the module. Try to get all contents (without filtering by module).
            const preSets: CoreSiteWSPreSets = {
                omitExpires: preferCache,
            };

            if (!preferCache && ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            sections = await this.getSections(courseId, false, false, preSets, siteId);
        }

        let foundModule: CoreCourseGetContentsWSModule | undefined;

        const foundSection = sections.find((section) => {
            if (section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID &&
                sectionId !== undefined &&
                sectionId != section.id
            ) {
                return false;
            }

            foundModule = section.modules.find((module) => module.id == moduleId);

            return !!foundModule;
        });

        if (foundSection && foundModule) {
            return this.addAdditionalModuleData(foundModule, courseId, foundSection.id);
        }

        throw new CoreError(Translate.instant('core.course.modulenotfound'));
    }

    /**
     * Add some additional info to course module.
     *
     * @param module Module.
     * @param courseId Course ID of the module.
     * @param sectionId Section ID of the module.
     * @returns Module with additional info.
     */
    protected addAdditionalModuleData(
        module: CoreCourseGetContentsWSModule,
        courseId: number,
        sectionId: number,
    ): CoreCourseModuleData {
        let completionData: CoreCourseModuleCompletionData | undefined = undefined;

        if (module.completiondata && module.completion) {
            completionData = {
                ...module.completiondata,
                tracking: module.completion,
                cmid: module.id,
                courseId,
            };
        }

        return  {
            ...module,
            course: courseId,
            section: sectionId,
            completiondata: completionData,
            availabilityinfo: this.treatAvailablityInfo(module.availabilityinfo),
        };
    }

    /**
     * Gets a module basic info by module ID.
     *
     * @param moduleId Module ID.
     * @param options Comon site WS options.
     * @returns Promise resolved with the module's info.
     */
    async getModuleBasicInfo(moduleId: number, options: CoreSitesCommonWSOptions = {}): Promise<CoreCourseModuleBasicInfo> {
        const site = await CoreSites.getSite(options.siteId);
        const params: CoreCourseGetCourseModuleWSParams = {
            cmid: moduleId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getModuleCacheKey(moduleId),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };
        const response = await site.read<CoreCourseGetCourseModuleWSResponse>('core_course_get_course_module', params, preSets);

        if (response.warnings && response.warnings.length) {
            throw new CoreWSError(response.warnings[0]);
        }

        return response.cm;
    }

    /**
     * Gets a module basic grade info by module ID.
     *
     * @param moduleId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the module's grade info.
     */
    async getModuleBasicGradeInfo(moduleId: number, siteId?: string): Promise<CoreCourseModuleGradeInfo | undefined> {
        const info = await this.getModuleBasicInfo(moduleId, { siteId });

        if (
            info.grade !== undefined ||
            info.advancedgrading !== undefined ||
            info.outcomes !== undefined
        ) {
            return {
                advancedgrading: info.advancedgrading,
                grade: info.grade,
                gradecat: info.gradecat,
                gradepass: info.gradepass,
                outcomes: info.outcomes,
                scale: info.scale,
            };
        }

    }

    /**
     * Gets a module basic info by instance.
     *
     * @param instanceId Instance ID.
     * @param moduleName Name of the module. E.g. 'glossary'.
     * @param options Comon site WS options.
     * @returns Promise resolved with the module's info.
     */
    async getModuleBasicInfoByInstance(
        instanceId: number,
        moduleName: string,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<CoreCourseModuleBasicInfo> {
        const site = await CoreSites.getSite(options.siteId);

        const params: CoreCourseGetCourseModuleByInstanceWSParams = {
            instance: instanceId,
            module: moduleName,
        };

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getModuleBasicInfoByInstanceCacheKey(instanceId, moduleName),
            updateFrequency: CoreSite.FREQUENCY_RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response: CoreCourseGetCourseModuleWSResponse =
            await site.read('core_course_get_course_module_by_instance', params, preSets);

        if (response.warnings && response.warnings.length) {
            throw new CoreWSError(response.warnings[0]);
        } else if (response.cm) {
            return response.cm;
        }

        throw Error('WS core_course_get_course_module_by_instance failed');
    }

    /**
     * Get cache key for get module by instance WS calls.
     *
     * @param instanceId Instance ID.
     * @param moduleName Name of the module. E.g. 'glossary'.
     * @returns Cache key.
     */
    protected getModuleBasicInfoByInstanceCacheKey(instanceId: number, moduleName: string): string {
        return ROOT_CACHE_KEY + 'moduleByInstance:' + moduleName + ':' + instanceId;
    }

    /**
     * Get cache key for module WS calls.
     *
     * @param moduleId Module ID.
     * @returns Cache key.
     */
    protected getModuleCacheKey(moduleId: number): string {
        return ROOT_CACHE_KEY + 'module:' + moduleId;
    }

    /**
     * Get cache key for module by modname WS calls.
     *
     * @param modName Name of the module.
     * @returns Cache key.
     */
    protected getModuleByModNameCacheKey(modName: string): string {
        return ROOT_CACHE_KEY + 'module:modName:' + modName;
    }

    /**
     * Returns the source to a module icon.
     *
     * @param moduleName The module name.
     * @param modicon The mod icon string to use in case we are not using a core activity.
     * @returns The IMG src.
     */
    getModuleIconSrc(moduleName: string, modicon?: string, mimetypeIcon = ''): string {
        if (mimetypeIcon) {
            return mimetypeIcon;
        }

        if (this.CORE_MODULES.indexOf(moduleName) < 0) {
            if (modicon) {
                return modicon;
            }

            moduleName = 'external-tool';
        }

        let path = 'assets/img/mod/';
        if (!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0')) {
            // @deprecatedonmoodle since 3.11.
            path = 'assets/img/mod_legacy/';
        }

        // Use default icon on core modules.
        return path + moduleName + '.svg';
    }

    /**
     * Return a specific section.
     *
     * @param courseId The course ID.
     * @param sectionId The section ID.
     * @param excludeModules Do not return modules, return only the sections structure.
     * @param excludeContents Do not return module contents (i.e: files inside a resource).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the section.
     */
    async getSection(
        courseId: number,
        sectionId: number,
        excludeModules?: boolean,
        excludeContents?: boolean,
        siteId?: string,
    ): Promise<CoreCourseWSSection> {

        if (sectionId < 0) {
            throw new CoreError('Invalid section ID');
        }

        const sections = await this.getSections(courseId, excludeModules, excludeContents, undefined, siteId);
        const section = sections.find((section) => section.id == sectionId);

        if (section) {
            return section;
        }

        throw new CoreError('Unknown section');
    }

    /**
     * Get the course sections.
     *
     * @param courseId The course ID.
     * @param excludeModules Do not return modules, return only the sections structure.
     * @param excludeContents Do not return module contents (i.e: files inside a resource).
     * @param preSets Presets to use.
     * @param siteId Site ID. If not defined, current site.
     * @param includeStealthModules Whether to include stealth modules. Defaults to true.
     * @returns The reject contains the error message, else contains the sections.
     */
    getSections(
        courseId: number,
        excludeModules: boolean = false,
        excludeContents: boolean = false,
        preSets?: CoreSiteWSPreSets,
        siteId?: string,
        includeStealthModules: boolean = true,
    ): Promise<CoreCourseWSSection[]> {
        return firstValueFrom(this.getSectionsObservable(courseId, {
            excludeModules,
            excludeContents,
            includeStealthModules,
            preSets,
            siteId,
        }));
    }

    /**
     * Get the course sections.
     *
     * @param courseId The course ID.
     * @param options Options.
     * @returns Observable that returns the sections.
     */
    getSectionsObservable(
        courseId: number,
        options: CoreCourseGetSectionsOptions = {},
    ): WSObservable<CoreCourseWSSection[]> {
        options.includeStealthModules = options.includeStealthModules ?? true;

        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            const preSets: CoreSiteWSPreSets = {
                ...options.preSets,
                cacheKey: this.getSectionsCacheKey(courseId),
                updateFrequency: CoreSite.FREQUENCY_RARELY,
                ...CoreSites.getReadingStrategyPreSets(options.readingStrategy),
            };

            const params: CoreCourseGetContentsParams = {
                courseid: courseId,
            };
            params.options = [
                {
                    name: 'excludemodules',
                    value: !!options.excludeModules,
                },
                {
                    name: 'excludecontents',
                    value: !!options.excludeContents,
                },
            ];

            if (this.canRequestStealthModules(site)) {
                params.options.push({
                    name: 'includestealthmodules',
                    value: !!options.includeStealthModules,
                });
            }

            return site.readObservable<CoreCourseGetContentsWSSection[]>('core_course_get_contents', params, preSets).pipe(
                map(sections => {
                    const siteHomeId = site.getSiteHomeId();
                    let showSections = true;
                    if (courseId == siteHomeId) {
                        const storedNumSections = site.getStoredConfig('numsections');
                        showSections = storedNumSections !== undefined && !!storedNumSections;
                    }

                    if (showSections !== undefined && !showSections && sections.length > 0) {
                        // Get only the last section (Main menu block section).
                        sections.pop();
                    }

                    // Add course to all modules.
                    return sections.map((section) => ({
                        ...section,
                        availabilityinfo: this.treatAvailablityInfo(section.availabilityinfo),
                        modules: section.modules.map((module) => this.addAdditionalModuleData(module, courseId, section.id)),
                    }));
                }),
            );
        });
    }

    /**
     * Get cache key for section WS call.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getSectionsCacheKey(courseId: number): string {
        return ROOT_CACHE_KEY + 'sections:' + courseId;
    }

    /**
     * Given a list of sections, returns the list of modules in the sections.
     *
     * @param sections Sections.
     * @returns Modules.
     */
    getSectionsModules(sections: CoreCourseWSSection[]): CoreCourseModuleData[] {
        if (!sections || !sections.length) {
            return [];
        }

        return sections.reduce((previous: CoreCourseModuleData[], section) => previous.concat(section.modules || []), []);
    }

    /**
     * Get all viewed modules in a course, ordered by timeaccess in descending order.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of viewed modules.
     */
    async getViewedModules(courseId: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord[]> {
        const site = await CoreSites.getSite(siteId);

        return this.viewedModulesTables[site.getId()].getMany({ courseId }, {
            sorting: [
                { timeaccess: 'desc' },
            ],
        });
    }

    /**
     * Invalidates course blocks WS call.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateCourseBlocks(courseId: number, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getCourseBlocksCacheKey(courseId));
    }

    /**
     * Invalidates module WS call.
     *
     * @param moduleId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @param modName Module name. E.g. 'label', 'url', ...
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateModule(moduleId: number, siteId?: string, modName?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const promises: Promise<void>[] = [];
        if (modName) {
            promises.push(site.invalidateWsCacheForKey(this.getModuleByModNameCacheKey(modName)));
        }
        promises.push(site.invalidateWsCacheForKey(this.getModuleCacheKey(moduleId)));

        await Promise.all(promises);
    }

    /**
     * Invalidates module WS call.
     *
     * @param id Instance ID.
     * @param module Name of the module. E.g. 'glossary'.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateModuleByInstance(id: number, module: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getModuleBasicInfoByInstanceCacheKey(id, module));
    }

    /**
     * Invalidates sections WS call.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @param userId User ID. If not defined, current user.
     * @returns Promise resolved when the data is invalidated.
     */
    async invalidateSections(courseId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const promises: Promise<void>[] = [];
        const siteHomeId = site.getSiteHomeId();
        userId = userId || site.getUserId();
        promises.push(site.invalidateWsCacheForKey(this.getSectionsCacheKey(courseId)));
        promises.push(site.invalidateWsCacheForKey(this.getActivitiesCompletionCacheKey(courseId, userId)));
        if (courseId == siteHomeId) {
            promises.push(site.invalidateConfig());
        }

        await Promise.all(promises);
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param module Module to load the contents.
     * @param courseId Not used since 4.0.
     * @param sectionId The section ID.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param modName If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @returns Promise resolved when loaded.
     */
    async loadModuleContents(
        module: CoreCourseAnyModuleData,
        courseId?: number,
        sectionId?: number,
        preferCache?: boolean,
        ignoreCache?: boolean,
        siteId?: string,
        modName?: string,
    ): Promise<void> {

        if (!ignoreCache && module.contents && module.contents.length) {
            // Already loaded.
            return;
        }

        const mod = await this.getModule(module.id, module.course, sectionId, preferCache, ignoreCache, siteId, modName);

        if (!mod.contents) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        module.contents = mod.contents;
    }

    /**
     * Get module contents. If not present, this function will try to load them into module.contents.
     * It will throw an error if contents cannot be loaded.
     *
     * @param module Module to get its contents.
     * @param courseId Not used since 4.0.
     * @param sectionId The section ID.
     * @param preferCache True if shouldn't call WS if data is cached, false otherwise.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @param modName If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @returns Promise resolved when loaded.
     */
    async getModuleContents(
        module: CoreCourseModuleData,
        courseId?: number,
        sectionId?: number,
        preferCache?: boolean,
        ignoreCache?: boolean,
        siteId?: string,
        modName?: string,
    ): Promise<CoreCourseModuleContentFile[]> {
        // Make sure contents are loaded.
        await this.loadModuleContents(module, undefined, sectionId, preferCache, ignoreCache, siteId, modName);

        if (!module.contents) {
            throw new CoreError(Translate.instant('core.course.modulenotfound'));
        }

        return module.contents;
    }

    /**
     * Report a course and section as being viewed.
     *
     * @param courseId Course ID.
     * @param sectionNumber Section number.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logView(courseId: number, sectionNumber?: number, siteId?: string): Promise<void> {
        const params: CoreCourseViewCourseWSParams = {
            courseid: courseId,
        };

        if (sectionNumber !== undefined) {
            params.sectionnumber = sectionNumber;
        }

        const site = await CoreSites.getSite(siteId);
        const response: CoreStatusWithWarningsWSResponse = await site.write('core_course_view_course', params);

        if (!response.status) {
            throw Error('WS core_course_view_course failed.');
        } else {
            CoreEvents.trigger(CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {
                courseId: courseId,
                action: CoreCoursesProvider.ACTION_VIEW,
            }, site.getId());
        }
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param cmId The module ID.
     * @param completed Whether the module is completed or not.
     * @param courseId Course ID the module belongs to.
     * @param courseName Not used since 4.0.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when completion is successfully sent or stored.
     */
    async markCompletedManually(
        cmId: number,
        completed: boolean,
        courseId: number,
        courseName?: string,
        siteId?: string,
    ): Promise<CoreStatusWithWarningsWSResponse> {

        siteId = siteId || CoreSites.getCurrentSiteId();

        // Convenience function to store a completion to be synchronized later.
        const storeOffline = (): Promise<CoreStatusWithWarningsWSResponse> =>
            CoreCourseOffline.markCompletedManually(cmId, completed, courseId, undefined, siteId);

        // The offline function requires a courseId and it could be missing because it's a calculated field.
        if (!CoreNetwork.isOnline()) {
            // App is offline, store the action.
            return storeOffline();
        }

        // Try to send it to server.
        try {
            const result = await this.markCompletedManuallyOnline(cmId, completed, siteId);

            // Data sent to server, if there is some offline data delete it now.
            await CoreUtils.ignoreErrors(CoreCourseOffline.deleteManualCompletion(cmId, siteId));

            // Invalidate module now, completion has changed.
            await this.invalidateModule(cmId, siteId);

            return result;
        } catch (error) {
            if (CoreUtils.isWebServiceError(error)) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                throw error;
            } else {
                // Couldn't connect to server, store it offline.
                return storeOffline();
            }
        }
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param cmId The module ID.
     * @param completed Whether the module is completed or not.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when completion is successfully sent.
     */
    async markCompletedManuallyOnline(
        cmId: number,
        completed: boolean,
        siteId?: string,
    ): Promise<CoreStatusWithWarningsWSResponse> {
        const site = await CoreSites.getSite(siteId);
        const params: CoreCompletionUpdateActivityCompletionStatusManuallyWSParams = {
            cmid: cmId,
            completed: completed,
        };

        const result = await site.write<CoreStatusWithWarningsWSResponse>(
            'core_completion_update_activity_completion_status_manually',
            params,
        );

        if (!result.status) {
            if (result.warnings && result.warnings.length) {
                throw new CoreWSError(result.warnings[0]);
            }

            throw new CoreError('Cannot change completion.');
        }

        return result;
    }

    /**
     * Check if a module has a view page. E.g. labels don't have a view page.
     *
     * @param module The module object.
     * @returns Whether the module has a view page.
     */
    moduleHasView(module: CoreCourseModuleSummary | CoreCourseModuleData): boolean {
        if ('modname' in module) {
            // noviewlink was introduced in 3.8.5, use supports feature as a fallback.
            if (module.noviewlink ||
                CoreCourseModuleDelegate.supportsFeature(module.modname, CoreConstants.FEATURE_NO_VIEW_LINK, false)) {
                return false;
            }
        }

        return !!module.url;
    }

    /**
     * Wait for any course format plugin to load, and open the course page.
     *
     * If the plugin's promise is resolved, the course page will be opened. If it is rejected, they will see an error.
     * If the promise for the plugin is still in progress when the user tries to open the course, a loader
     * will be displayed until it is complete, before the course page is opened. If the promise is already complete,
     * they will see the result immediately.
     *
     * This function must be in here instead of course helper to prevent circular dependencies.
     *
     * @param course Course to open
     * @param navOptions Navigation options that includes params to pass to the page.
     * @returns Promise resolved when done.
     */
    async openCourse(
        course: CoreCourseAnyCourseData | { id: number },
        navOptions?: CoreNavigationOptions,
    ): Promise<void> {
        if (course.id === CoreSites.getCurrentSite()?.getSiteHomeId()) {
            // Open site home.
            await CoreNavigator.navigate('/main/home/site', navOptions);

            return;
        }

        const loading = await CoreDomUtils.showModalLoading();

        // Wait for site plugins to be fetched.
        await CoreUtils.ignoreErrors(CoreSitePlugins.waitFetchPlugins());

        if (!('format' in course) || course.format === undefined) {
            const result = await CoreCourseHelper.getCourse(course.id);

            course = result.course;
        }

        const format = 'format' in course && `format_${course.format}`;

        if (!format || !CoreSitePlugins.sitePluginPromiseExists(`format_${format}`)) {
            // No custom format plugin. We don't need to wait for anything.
            loading.dismiss();
            await CoreCourseFormatDelegate.openCourse(<CoreCourseAnyCourseData> course, navOptions);

            return;
        }

        // This course uses a custom format plugin, wait for the format plugin to finish loading.
        try {
            await CoreSitePlugins.sitePluginLoaded(format);

            // The format loaded successfully, but the handlers wont be registered until all site plugins have loaded.
            if (CoreSitePlugins.sitePluginsFinishedLoading) {
                return CoreCourseFormatDelegate.openCourse(<CoreCourseAnyCourseData> course, navOptions);
            }

            // Wait for plugins to be loaded.
            await new Promise((resolve, reject) => {
                const observer = CoreEvents.on(CoreEvents.SITE_PLUGINS_LOADED, () => {
                    observer?.off();

                    CoreCourseFormatDelegate.openCourse(<CoreCourseAnyCourseData> course, navOptions).then(resolve).catch(reject);
                });
            });

            return;
        } catch (error) {
            // The site plugin failed to load. The user needs to restart the app to try loading it again.
            const message = Translate.instant('core.courses.errorloadplugins');
            const reload = Translate.instant('core.courses.reload');
            const ignore = Translate.instant('core.courses.ignore');

            await CoreDomUtils.showConfirm(message, '', reload, ignore);
            window.location.reload();
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Select a certain tab in the course. Please use currentViewIsCourse() first to verify user is viewing the course.
     *
     * @param name Name of the tab. If not provided, course contents.
     * @param params Other params.
     */
    selectCourseTab(name?: string, params?: Params): void {
        params = params || {};
        params.name = name || '';

        CoreEvents.trigger(CoreEvents.SELECT_COURSE_TAB, params);
    }

    /**
     * Change the course status, setting it to the previous status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the status is changed. Resolve param: new status.
     */
    async setCoursePreviousStatus(courseId: number, siteId?: string): Promise<string> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.logger.debug(`Set previous status for course ${courseId} in site ${siteId}`);

        const site = await CoreSites.getSite(siteId);
        const entry = await this.getCourseStatusData(courseId, siteId);

        this.logger.debug(`Set previous status '${entry.status}' for course ${courseId}`);

        const newData = {
            id: courseId,
            status: entry.previous || CoreConstants.NOT_DOWNLOADED,
            updated: Date.now(),
            // Going back from downloading to previous status, restore previous download time.
            downloadTime: entry.status == CoreConstants.DOWNLOADING ? entry.previousDownloadTime : entry.downloadTime,
        };

        await this.statusTables[site.getId()].update(newData, { id: courseId });
        // Success updating, trigger event.
        this.triggerCourseStatusChanged(courseId, newData.status, siteId);

        return newData.status;
    }

    /**
     * Store course status.
     *
     * @param courseId Course ID.
     * @param status New course status.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the status is stored.
     */
    async setCourseStatus(courseId: number, status: string, siteId?: string): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.logger.debug(`Set status '${status}' for course ${courseId} in site ${siteId}`);

        const site = await CoreSites.getSite(siteId);
        let downloadTime = 0;
        let previousDownloadTime = 0;
        let previousStatus = '';

        if (status == CoreConstants.DOWNLOADING) {
            // Set download time if course is now downloading.
            downloadTime = CoreTimeUtils.timestamp();
        }

        try {
            const entry = await this.getCourseStatusData(courseId, siteId);
            if (downloadTime === undefined) {
                // Keep previous download time.
                downloadTime = entry.downloadTime;
                previousDownloadTime = entry.previousDownloadTime;
            } else {
                // The downloadTime will be updated, store current time as previous.
                previousDownloadTime = entry.downloadTime;
            }
            previousStatus = entry.status;
        } catch {
            // New entry.
        }

        if (previousStatus != status) {
            // Status has changed, update it.
            await this.statusTables[site.getId()].insert({
                id: courseId,
                status: status,
                previous: previousStatus,
                updated: Date.now(),
                downloadTime: downloadTime,
                previousDownloadTime: previousDownloadTime,
            });
        }

        // Success inserting, trigger event.
        this.triggerCourseStatusChanged(courseId, status, siteId);
    }

    /**
     * Store activity as viewed.
     *
     * @param courseId Chapter ID.
     * @param cmId Module ID.
     * @param options Other options.
     * @returns Promise resolved with last chapter viewed, undefined if none.
     */
    async storeModuleViewed(courseId: number, cmId: number, options: CoreCourseStoreModuleViewedOptions = {}): Promise<void> {
        const site = await CoreSites.getSite(options.siteId);

        const timeaccess = options.timeaccess ?? Date.now();

        await this.viewedModulesTables[site.getId()].insert({
            courseId,
            cmId,
            sectionId: options.sectionId,
            timeaccess,
        });

        CoreEvents.trigger(CoreEvents.COURSE_MODULE_VIEWED, {
            courseId,
            cmId,
            timeaccess,
            sectionId: options.sectionId,
        }, site.getId());
    }

    /**
     * Translate a module name to current language.
     *
     * @param moduleName The module name.
     * @param fallback Fallback text to use if not translated. Will use moduleName otherwise.
     *
     * @returns Translated name.
     */
    translateModuleName(moduleName: string, fallback?: string): string {
        const langKey = 'core.mod_' + moduleName;
        const translated = Translate.instant(langKey);

        return translated !== langKey ?
            translated :
            (fallback || moduleName);
    }

    /**
     * Trigger COURSE_STATUS_CHANGED with the right data.
     *
     * @param courseId Course ID.
     * @param status New course status.
     * @param siteId Site ID. If not defined, current site.
     */
    protected triggerCourseStatusChanged(courseId: number, status: string, siteId?: string): void {
        CoreEvents.trigger(CoreEvents.COURSE_STATUS_CHANGED, {
            courseId: courseId,
            status: status,
        }, siteId);
    }

    /**
     * Treat availability info HTML.
     *
     * @param availabilityInfo HTML to treat.
     * @returns Treated HTML.
     */
    protected treatAvailablityInfo(availabilityInfo?: string): string | undefined {
        if (!availabilityInfo) {
            return availabilityInfo;
        }

        // Remove "Show more" option in 4.2 or older sites.
        return CoreDomUtils.removeElementFromHtml(availabilityInfo, 'li[data-action="showmore"]');
    }

}

export const CoreCourse = makeSingleton(CoreCourseProvider);

/**
 * Common options used by modules when calling a WS through CoreSite.
 */
export type CoreCourseCommonModWSOptions = CoreSitesCommonWSOptions & {
    cmId?: number; // Module ID.
};

/**
 * Data returned by course_summary_exporter.
 */
export type CoreCourseSummary = {
    id: number; // Id.
    fullname: string; // Fullname.
    shortname: string; // Shortname.
    idnumber: string; // Idnumber.
    summary: string; // Summary.
    summaryformat: number; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    startdate: number; // Startdate.
    enddate: number; // Enddate.
    visible: boolean; // @since 3.8. Visible.
    fullnamedisplay: string; // Fullnamedisplay.
    viewurl: string; // Viewurl.
    courseimage: string; // @since 3.6. Courseimage.
    progress?: number; // @since 3.6. Progress.
    hasprogress: boolean; // @since 3.6. Hasprogress.
    isfavourite: boolean; // @since 3.6. Isfavourite.
    hidden: boolean; // @since 3.6. Hidden.
    timeaccess?: number; // @since 3.6. Timeaccess.
    showshortname: boolean; // @since 3.6. Showshortname.
    coursecategory: string; // @since 3.7. Coursecategory.
    showactivitydates: boolean | null; // @since 3.11. Whether the activity dates are shown or not.
    showcompletionconditions: boolean | null; // @since 3.11. Whether the activity completion conditions are shown or not.
    timemodified?: number; // @since 4.0. Last time course settings were updated (timestamp).
};

/**
 * Data returned by course_module_summary_exporter.
 */
export type CoreCourseModuleSummary = {
    id: number; // Id.
    name: string; // Name.
    url?: string; // Url.
    iconurl: string; // Iconurl.
};

/**
 * Params of core_completion_get_activities_completion_status WS.
 */
type CoreCompletionGetActivitiesCompletionStatusWSParams = {
    courseid: number; // Course ID.
    userid: number; // User ID.
};

/**
 * Data returned by core_completion_get_activities_completion_status WS.
 */
export type CoreCourseCompletionActivityStatusWSResponse = {
    statuses: CoreCourseCompletionActivityStatus[]; // List of activities status.
    warnings?: CoreStatusWithWarningsWSResponse[];
};

/**
 * Activity status.
 */
export type CoreCourseCompletionActivityStatus = {
    cmid: number; // Course module ID.
    modname: string; // Activity module name.
    instance: number; // Instance ID.
    state: number; // Completion state value: 0 means incomplete, 1 complete, 2 complete pass, 3 complete fail.
    timecompleted: number; // Timestamp for completed activity.
    tracking: CoreCourseModuleCompletionTracking; // Type of tracking: 0 means none, 1 manual, 2 automatic.
    overrideby?: number | null; // The user id who has overriden the status, or null.
    valueused?: boolean; // Whether the completion status affects the availability of another activity.
    hascompletion?: boolean; // @since 3.11. Whether this activity module has completion enabled.
    isautomatic?: boolean; // @since 3.11. Whether this activity module instance tracks completion automatically.
    istrackeduser?: boolean; // @since 3.11. Whether completion is being tracked for this user.
    uservisible?: boolean; // @since 3.11. Whether this activity is visible to the user.
    details?: { // @since 3.11. An array of completion details containing the description and status.
        rulename: string; // Rule name.
        rulevalue: {
            status: number; // Completion status.
            description: string; // Completion description.
        };
    }[];
    offline?: boolean; // Whether the completions is offline and not yet synced.
};

/**
 * Params of core_block_get_course_blocks WS.
 */
type CoreBlockGetCourseBlocksWSParams = {
    courseid: number; // Course id.
    returncontents?: boolean; // Whether to return the block contents.
};

/**
 * Data returned by core_block_get_course_blocks WS.
 */
export type CoreCourseBlocksWSResponse = {
    blocks: CoreCourseBlock[]; // List of blocks in the course.
    warnings?: CoreStatusWithWarningsWSResponse[];
};

/**
 * Block data type.
 */
export type CoreCourseBlock = {
    instanceid: number; // Block instance id.
    name: string; // Block name.
    region: string; // Block region.
    positionid: number; // Position id.
    collapsible: boolean; // Whether the block is collapsible.
    dockable: boolean; // Whether the block is dockable.
    weight?: number; // Used to order blocks within a region.
    visible?: boolean; // Whether the block is visible.
    contents?: {
        title: string; // Block title.
        content: string; // Block contents.
        contentformat: number; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
        footer: string; // Block footer.
        files: CoreWSExternalFile[];
    }; // Block contents (if required).
    configs?: { // Block instance and plugin configuration settings.
        name: string; // Name.
        value: string; // JSON encoded representation of the config value.
        type: string; // Type (instance or plugin).
    }[];
    configsRecord?: Record<string, { // Block instance and plugin configuration settings.
        name: string; // Name.
        value: string; // JSON encoded representation of the config value.
        type: string; // Type (instance or plugin).
    }>;
};

/**
 * Params of core_course_get_contents WS.
 */
export type CoreCourseGetContentsParams = {
    courseid: number; // Course id.
    options?: { // Options, used since Moodle 2.9.
        /**
         * The expected keys (value format) are:
         *
         * excludemodules (bool) Do not return modules, return only the sections structure
         * excludecontents (bool) Do not return module contents (i.e: files inside a resource)
         * includestealthmodules (bool) Return stealth modules for students in a special
         * section (with id -1)
         * sectionid (int) Return only this section
         * sectionnumber (int) Return only this section with number (order)
         * cmid (int) Return only this module information (among the whole sections structure)
         * modname (string) Return only modules with this name "label, forum, etc..."
         * modid (int) Return only the module with this id (to be used with modname.
         */
        name: string;
        value: string | number | boolean; // The value of the option, this param is personaly validated in the external function.
    }[];
};

/**
 * Data returned by core_course_get_contents WS.
 */
type CoreCourseGetContentsWSResponse = CoreCourseGetContentsWSSection[];

/**
 * Section data returned by core_course_get_contents WS.
 */
type CoreCourseGetContentsWSSection = {
    id: number; // Section ID.
    name: string; // Section name.
    visible?: number; // Is the section visible.
    summary: string; // Section description.
    summaryformat: number; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    section?: number; // Section number inside the course.
    hiddenbynumsections?: number; // Whether is a section hidden in the course format.
    uservisible?: boolean; // Is the section visible for the user?.
    availabilityinfo?: string; // Availability information.
    modules: CoreCourseGetContentsWSModule[]; // List of module.
};

/**
 * Module data returned by core_course_get_contents WS.
 */
export type CoreCourseGetContentsWSModule = {
    id: number; // Activity id.
    url?: string; // Activity url.
    name: string; // Activity module name.
    instance: number; // Instance id. Cannot be undefined.
    contextid?: number; // @since 3.10. Activity context id.
    description?: string; // Activity description.
    visible: number; // Is the module visible. Cannot be undefined.
    uservisible: boolean; // Is the module visible for the user?. Cannot be undefined.
    availabilityinfo?: string; // Availability information.
    visibleoncoursepage: number; // Is the module visible on course page. Cannot be undefined.
    modicon: string; // Activity icon url.
    modname: string; // Activity module type.
    modplural: string; // Activity module plural name.
    availability?: string; // Module availability settings.
    indent: number; // Number of identation in the site.
    onclick?: string; // Onclick action.
    afterlink?: string; // After link info to be displayed.
    customdata?: string; // Custom data (JSON encoded).
    noviewlink?: boolean; // Whether the module has no view page.
    completion?: CoreCourseModuleCompletionTracking; // Type of completion tracking: 0 means none, 1 manual, 2 automatic.
    completiondata?: CoreCourseModuleWSCompletionData; // Module completion data.
    contents?: CoreCourseModuleContentFile[];
    groupmode?: number; // @since 4.3. Group mode value
    downloadcontent?: number; // @since 4.0 The download content value.
    dates?: {
        label: string;
        timestamp: number;
    }[]; // @since 3.11. Activity dates.
    contentsinfo?: { // @since v3.7.6 Contents summary information.
        filescount: number; // Total number of files.
        filessize: number; // Total files size.
        lastmodified: number; // Last time files were modified.
        mimetypes: string[]; // Files mime types.
        repositorytype?: string; // The repository type for the main file.
    };
};

/**
 * Data returned by core_course_get_contents WS.
 */
export type CoreCourseWSSection = Omit<CoreCourseGetContentsWSSection, 'modules'> & {
    modules: CoreCourseModuleData[]; // List of module.
};

/**
 * Params of core_course_get_course_module WS.
 */
type CoreCourseGetCourseModuleWSParams = {
    cmid: number; // The course module id.
};

/**
 * Params of core_course_get_course_module_by_instance WS.
 */
type CoreCourseGetCourseModuleByInstanceWSParams = {
    module: string; // The module name.
    instance: number; // The module instance id.
};

/**
 * Data returned by core_course_get_course_module and core_course_get_course_module_by_instance WS.
 */
type CoreCourseGetCourseModuleWSResponse = {
    cm: CoreCourseModuleBasicInfo;
    warnings?: CoreWSExternalWarning[];
};

/**
 * Module completion data.
 */
export type CoreCourseModuleWSCompletionData = {
    state: CoreCourseModuleCompletionStatus; // Completion state value.
    timecompleted: number; // Timestamp for completion status.
    overrideby: number | null; // The user id who has overriden the status.
    valueused?: boolean; // Whether the completion status affects the availability of another activity.
    hascompletion?: boolean; // @since 3.11. Whether this activity module has completion enabled.
    isautomatic?: boolean; // @since 3.11. Whether this activity module instance tracks completion automatically.
    istrackeduser?: boolean; // @since 3.11. Whether completion is being tracked for this user.
    uservisible?: boolean; // @since 3.11. Whether this activity is visible to the user.
    details?: CoreCourseModuleWSRuleDetails[]; // @since 3.11. An array of completion details.
};

/**
 * Module completion rule details.
 */
export type CoreCourseModuleWSRuleDetails = {
    rulename: string; // Rule name.
    rulevalue: {
        status: number; // Completion status.
        description: string; // Completion description.
    };
};

export type CoreCourseModuleContentFile = {
    // Common properties with CoreWSExternalFile.
    filename: string; // Filename.
    filepath: string; // Filepath.
    filesize: number; // Filesize.
    fileurl: string; // Downloadable file url.
    timemodified: number; // Time modified.
    mimetype?: string; // File mime type.
    isexternalfile?: number; // Whether is an external file.
    repositorytype?: string; // The repository type for external files.

    type: string; // A file or a folder or external link.
    content?: string; // Raw content, will be used when type is content.
    timecreated: number; // Time created.
    sortorder: number; // Content sort order.
    userid: number; // User who added this content to moodle.
    author: string; // Content owner.
    license: string; // Content license.
    tags?: CoreTagItem[]; // Tags.
};

/**
 * Course module basic info type.
 */
export type CoreCourseModuleGradeInfo = {
    grade?: number; // Grade (max value or scale id).
    scale?: string; // Scale items (if used).
    gradepass?: string; // Grade to pass (float).
    gradecat?: number; // Grade category.
    advancedgrading?: CoreCourseModuleAdvancedGradingSetting[]; // Advanced grading settings.
    outcomes?: CoreCourseModuleGradeOutcome[];
};

/**
 * Advanced grading settings.
 */
export type CoreCourseModuleAdvancedGradingSetting = {
    area: string; // Gradable area name.
    method: string; // Grading method.
};

/**
 * Grade outcome information.
 */
export type CoreCourseModuleGradeOutcome = {
    id: string; // Outcome id.
    name: string; // Outcome full name.
    scale: string; // Scale items.
};

/**
 * Course module basic info type.
 */
export type CoreCourseModuleBasicInfo = CoreCourseModuleGradeInfo & {
    id: number; // The course module id.
    course: number; // The course id.
    module: number; // The module type id.
    name: string; // The activity name.
    modname: string; // The module component name (forum, assign, etc..).
    instance: number; // The activity instance id.
    section: number; // The module section id.
    sectionnum: number; // The module section number.
    groupmode: number; // Group mode.
    groupingid: number; // Grouping id.
    completion: number; // If completion is enabled.
    idnumber?: string; // Module id number.
    added?: number; // Time added.
    score?: number; // Score.
    indent?: number; // Indentation.
    visible?: number; // If visible.
    visibleoncoursepage?: number; // If visible on course page.
    visibleold?: number; // Visible old.
    completiongradeitemnumber?: number; // Completion grade item.
    completionpassgrade?: number; // @since 4.0. Completion pass grade setting.
    completionview?: number; // Completion view setting.
    completionexpected?: number; // Completion time expected.
    showdescription?: number; // If the description is showed.
    downloadcontent?: number; // @since 4.0. The download content value.
    availability?: string; // Availability settings.
};

/**
 * Params of core_course_view_course WS.
 */
type CoreCourseViewCourseWSParams = {
    courseid: number; // Id of the course.
    sectionnumber?: number; // Section number.
};

/**
 * Params of core_completion_update_activity_completion_status_manually WS.
 */
type CoreCompletionUpdateActivityCompletionStatusManuallyWSParams = {
    cmid: number; // Course module id.
    completed: boolean; // Activity completed or not.
};

/**
 * Any of the possible module WS data.
 */
export type CoreCourseAnyModuleData = CoreCourseModuleData | CoreCourseModuleBasicInfo & {
    contents?: CoreCourseModuleContentFile[]; // If needed, calculated in the app in loadModuleContents.
};

/**
 * Options for storeModuleViewed.
 */
export type CoreCourseStoreModuleViewedOptions = {
    sectionId?: number;
    timeaccess?: number;
    siteId?: string;
};

/**
 * Options for getSections.
 */
export type CoreCourseGetSectionsOptions = CoreSitesCommonWSOptions & {
    excludeModules?: boolean;
    excludeContents?: boolean;
    includeStealthModules?: boolean; // Defaults to true.
    preSets?: CoreSiteWSPreSets;
};
