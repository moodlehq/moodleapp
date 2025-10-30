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
import { CoreSitesCommonWSOptions, CoreSites, CoreSitesReadingStrategy, CoreSitesWSOptionsWithFilter } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreCacheUpdateFrequency, DownloadStatus } from '@/core/constants';
import { makeSingleton, Translate } from '@singletons';
import { CoreStatusWithWarningsWSResponse, CoreWSExternalFile, CoreWSExternalWarning } from '@services/ws';
import {
    CoreCourseStatusDBRecord,
    CoreCourseViewedModulesDBRecord,
} from './database/course';
import { CoreCourseOffline } from './course-offline';
import { CoreError } from '@classes/errors/error';
import {
    CoreCourseAnyCourseData,
    CoreCourses,
} from '../../courses/services/courses';
import { CoreWSError } from '@classes/errors/wserror';
import { CoreCourseHelper, CoreCourseModuleData, CoreCourseModuleCompletionData } from './course-helper';
import { CoreCourseFormatDelegate } from './format-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreCourseLogCronHandler } from './handlers/log-cron';
import { CoreTagItem } from '@features/tag/services/tag';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CorePlatform } from '@services/platform';
import { asyncObservable } from '@/core/utils/rxjs';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoreSiteWSPreSets, WSObservable } from '@classes/sites/authenticated-site';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreArray } from '@singletons/array';
import { CoreText, CoreTextFormat } from '@singletons/text';
import { ArrayElement } from '@/core/utils/types';
import { CORE_COURSES_MY_COURSES_UPDATED_EVENT, CoreCoursesMyCoursesUpdatedEventAction } from '@features/courses/constants';
import {
    CoreCourseAccessDataType,
    CoreCourseModuleCompletionStatus,
    CoreCourseModuleCompletionTracking,
    CORE_COURSE_ALL_COURSES_CLEARED,
    CORE_COURSE_ALL_SECTIONS_ID,
    CORE_COURSE_COMPONENT,
    CORE_COURSE_CORE_MODULES,
    CORE_COURSE_PROGRESS_UPDATED_EVENT,
    CORE_COURSE_STEALTH_MODULES_SECTION_ID,
    CORE_COURSE_SELECT_TAB,
} from '../constants';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreObject } from '@singletons/object';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreCourseModuleHelper, CoreCourseStoreModuleViewedOptions } from './course-module-helper';
import { CoreCourseDownloadStatusHelper } from './course-download-status-helper';
import { MAIN_MENU_HOME_PAGE_NAME } from '@features/mainmenu/constants';
import { CORE_SITEHOME_PAGE_NAME } from '@features/sitehome/constants';
import { CoreDom } from '@singletons/dom';
import { CoreCourseModuleDelegate } from './module-delegate';
import { ModFeature, ModPurpose } from '@addons/mod/constants';

export type CoreCourseProgressUpdated = { progress: number; courseId: number };

declare module '@singletons/events' {

    /**
     * Augment CoreEventsData interface with events specific to this service.
     *
     * @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
     */
    export interface CoreEventsData {
        [CORE_COURSE_PROGRESS_UPDATED_EVENT]: CoreCourseProgressUpdated;
        [CORE_COURSE_SELECT_TAB]: CoreEventSelectCourseTabData;
    }

}

/**
 * Service that provides some features regarding a course.
 */
@Injectable({ providedIn: 'root' })
export class CoreCourseProvider {

    /**
     * @deprecated since 4.4 Not used anymore. Use CoreCourseAccessDataType instead.
     */
    static readonly ACCESS_GUEST = CoreCourseAccessDataType.ACCESS_GUEST;
    /**
     * @deprecated since 4.4 Not used anymore. Use CoreCourseAccessDataType instead.
     */
    static readonly ACCESS_DEFAULT = CoreCourseAccessDataType.ACCESS_DEFAULT;

    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_ALL_SECTIONS_ID instead.
     */
    static readonly ALL_SECTIONS_ID = CORE_COURSE_ALL_SECTIONS_ID;
    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_STEALTH_MODULES_SECTION_ID instead.
     */
    static readonly STEALTH_MODULES_SECTION_ID = CORE_COURSE_STEALTH_MODULES_SECTION_ID;
    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_ALL_COURSES_CLEARED instead.
     */
    static readonly ALL_COURSES_CLEARED = CORE_COURSE_ALL_COURSES_CLEARED;
    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_PROGRESS_UPDATED instead.
     */
    static readonly PROGRESS_UPDATED = CORE_COURSE_PROGRESS_UPDATED_EVENT;

    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_COMPONENT instead.
     */
    static readonly COMPONENT = CORE_COURSE_COMPONENT;

    /**
     * @deprecated since 5.0 Not used anymore. Use COURSE_CORE_MODULES instead.
     */
    static readonly CORE_MODULES = CORE_COURSE_CORE_MODULES;

    protected logger = CoreLogger.getInstance('CoreCourseProvider');

    protected static readonly ROOT_CACHE_KEY = 'mmCourse:';

    /**
     * Initialize.
     */
    initialize(): void {
        CorePlatform.resume.subscribe(() => {
            // Run the handler the app is open to keep user in online status.
            setTimeout(() => {
                CorePromiseUtils.ignoreErrors(
                    CoreCronDelegate.forceCronHandlerExecution(CoreCourseLogCronHandler.name),
                );
            }, 1000);
        });

        CoreEvents.on(CoreEvents.LOGIN, () => {
            setTimeout(() => {
                // Ignore errors here, since probably login is not complete: it happens on token invalid.
                CorePromiseUtils.ignoreErrors(
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
    protected canRequestStealthModules(site?: CoreSite): boolean {
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
        return completion.tracking === CoreCourseModuleCompletionTracking.AUTOMATIC &&
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
        const formatOptions = CoreObject.toKeyValueMap(
            course.courseformatoptions ?? [],
            'name',
            'value',
        ) as { indentation?: string };

        return formatOptions.indentation === '1';
    }

    /**
     * Clear all courses status in a site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when all status are cleared.
     * @deprecated since 5.0. Use CoreCourseStatusHelper.clearAllCoursesStatus.
     */
    async clearAllCoursesStatus(siteId?: string): Promise<void> {
        await CoreCourseDownloadStatusHelper.clearAllCoursesStatus(siteId);
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

        return Number(CoreNavigator.getRouteParams(route).courseId) === courseId;
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
        forceCache = false,
        ignoreCache = false,
        includeOffline = true,
    ): Promise<Record<number, CoreCourseCompletionActivityStatus>> {

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

        const completionStatus = CoreArray.toObject(data.statuses, 'cmid');
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
                    if (onlineCompletion.tracking === CoreCourseModuleCompletionTracking.MANUAL) {
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
        return `${CoreCourseProvider.ROOT_CACHE_KEY}activitiescompletion:${courseId}:${userId}`;
    }

    /**
     * Get certain module viewed records in the app.
     *
     * @param ids Module IDs.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with map of last module viewed data.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.getCertainModulesViewed.
     */
    async getCertainModulesViewed(ids: number[] = [], siteId?: string): Promise<Record<number, CoreCourseViewedModulesDBRecord>> {
        return CoreCourseModuleHelper.getCertainModulesViewed(ids, siteId);
    }

    /**
     * Get course blocks.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of blocks.
     * @since 3.7
     */
    async getCourseBlocks(courseId: number, siteId?: string): Promise<CoreCourseBlock[]> {
        return await firstValueFrom(this.getCourseBlocksObservable(courseId, { siteId }));
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
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
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
        return `${CoreCourseProvider.ROOT_CACHE_KEY}courseblocks:${courseId}`;
    }

    /**
     * Get the data stored for a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the data.
     * @deprecated since 5.0. Use CoreCourseStatusHelper.getCourseStatusData.
     */
    async getCourseStatusData(courseId: number, siteId?: string): Promise<CoreCourseStatusDBRecord> {
        return CoreCourseDownloadStatusHelper.getCourseStatusData(courseId, siteId);
    }

    /**
     * Get a course status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the status.
     * @deprecated since 5.0. Use CoreCourseStatusHelper.getCourseStatus.
     */
    async getCourseStatus(courseId: number, siteId?: string): Promise<DownloadStatus> {
        return CoreCourseDownloadStatusHelper.getCourseStatus(courseId, siteId);
    }

    /**
     * Obtain ids of downloaded courses.
     *
     * @param siteId Site id.
     * @returns Resolves with an array containing downloaded course ids.
     * @deprecated since 5.2. Not used anymore.
     */
    async getDownloadedCourseIds(siteId?: string): Promise<number[]> {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return CoreCourseDownloadStatusHelper.getDownloadedCourseIds(siteId);
    }

    /**
     * Get last module viewed in the app for a course.
     *
     * @param id Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with last module viewed data, undefined if none.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.getLastModuleViewed.
     */
    async getLastModuleViewed(id: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord | undefined> {
        return CoreCourseModuleHelper.getLastModuleViewed(id, siteId);
    }

    /**
     * Get a module from Moodle.
     *
     * @param moduleId The module ID.
     * @param courseId The course ID. Recommended to speed up the process and minimize data usage.
     * @param sectionId Not used since 5.0
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
                updateFrequency: CoreCacheUpdateFrequency.RARELY,
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
        }

        const site = await CoreSites.getSite(siteId);
        let sections: CoreCourseGetContentsWSSection[];
        try {
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

            sections = await firstValueFrom(this.callGetSectionsWS(site, courseId, {
                excludeModules: false,
                excludeContents: false,
                preSets,
            }));
        }

        let foundModule: CoreCourseGetContentsWSModule | undefined;

        const foundSection = sections.find((section) => {
            foundModule = section.modules.find((module) => module.id === moduleId);

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

        const canDisplay = CoreCourseModuleDelegate.supportsFeature(module.modname, ModFeature.CAN_DISPLAY, true);

        return  {
            ...module,
            course: courseId,
            section: sectionId,
            completiondata: completionData,
            availabilityinfo: this.treatAvailablityInfo(module.availabilityinfo),
            visible: canDisplay ? module.visible : 0,
            uservisible: canDisplay ? module.uservisible : false,
            visibleoncoursepage: canDisplay ? module.visibleoncoursepage : 0,
        };
    }

    /**
     * Gets a module basic info by module ID.
     *
     * @param moduleId Module ID.
     * @param options Common site WS options.
     * @returns Promise resolved with the module's info.
     */
    async getModuleBasicInfo(moduleId: number, options: CoreSitesCommonWSOptions = {}): Promise<CoreCourseModuleBasicInfo> {
        const site = await CoreSites.getSite(options.siteId);
        const params: CoreCourseGetCourseModuleWSParams = {
            cmid: moduleId,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getModuleCacheKey(moduleId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
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
     * @param cmId Module ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the module's grade info.
     */
    async getModuleBasicGradeInfo(cmId: number, siteId?: string): Promise<CoreCourseModuleGradeInfo | undefined> {
        const info = await this.getModuleBasicInfo(cmId, { siteId });

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
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy), // Include reading strategy preSets.
        };

        const response: CoreCourseGetCourseModuleWSResponse =
            await site.read('core_course_get_course_module_by_instance', params, preSets);

        if (response.warnings?.length) {
            throw new CoreWSError(response.warnings[0]);
        }
        if (!response.cm) {
            throw Error('WS core_course_get_course_module_by_instance failed');
        }

        return response.cm;
    }

    /**
     * Get cache key for get module by instance WS calls.
     *
     * @param instanceId Instance ID.
     * @param moduleName Name of the module. E.g. 'glossary'.
     * @returns Cache key.
     */
    protected getModuleBasicInfoByInstanceCacheKey(instanceId: number, moduleName: string): string {
        return `${CoreCourseProvider.ROOT_CACHE_KEY}moduleByInstance:${moduleName}:${instanceId}`;
    }

    /**
     * Get cache key for module WS calls.
     *
     * @param moduleId Module ID.
     * @returns Cache key.
     */
    protected getModuleCacheKey(moduleId: number): string {
        return `${CoreCourseProvider.ROOT_CACHE_KEY}module:${moduleId}`;
    }

    /**
     * Get cache key for module by modname WS calls.
     *
     * @param modName Name of the module.
     * @returns Cache key.
     */
    protected getModuleByModNameCacheKey(modName: string): string {
        return `${CoreCourseProvider.ROOT_CACHE_KEY}module:modName:${modName}`;
    }

    /**
     * Returns the source to a module icon.
     *
     * @param moduleName The module name.
     * @param modicon The mod icon string to use in case we are not using a core activity.
     * @returns The IMG src.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.getModuleIconSrc instead.
     */
    getModuleIconSrc(moduleName: string, modicon?: string, mimetypeIcon = ''): string {
        return CoreCourseModuleHelper.getModuleIconSrc(moduleName, modicon, mimetypeIcon);
    }

    /**
     * Get the path where the module icons are stored.
     *
     * @returns Path.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.getModuleIconsPath instead.
     */
    getModuleIconsPath(): string {
        return CoreCourseModuleHelper.getModuleIconsPath();
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
    async getSections(
        courseId: number,
        excludeModules: boolean = false,
        excludeContents: boolean = false,
        preSets?: CoreSiteWSPreSets,
        siteId?: string,
        includeStealthModules: boolean = true,
    ): Promise<CoreCourseWSSection[]> {
        return await firstValueFrom(this.getSectionsObservable(courseId, {
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
        return asyncObservable(async () => {
            const site = await CoreSites.getSite(options.siteId);

            return this.callGetSectionsWS(site, courseId, options).pipe(
                map(sections => {
                    const siteHomeId = site.getSiteHomeId();
                    let showSections = true;
                    if (courseId === siteHomeId) {
                        const storedNumSections = site.getStoredConfig('numsections');
                        showSections = storedNumSections !== undefined && !!storedNumSections;
                    }

                    if (showSections !== undefined && !showSections && sections.length > 0) {
                        // Get only the last section (Main menu block section).
                        sections.pop();
                    }

                    // First format all the sections and their modules.
                    const formattedSections: CoreCourseWSSection[] = sections.map((section) => ({
                        ...section,
                        availabilityinfo: this.treatAvailablityInfo(section.availabilityinfo),
                        modules: section.modules.map((module) => this.addAdditionalModuleData(module, courseId, section.id)),
                        contents: [],
                    }));

                    // Only return the root sections, subsections are included in section contents.
                    return this.addSectionsContents(formattedSections).filter((section) => !section.component);
                }),
            );
        });
    }

    /**
     * Call the WS to get the course sections.
     *
     * @param site Site.
     * @param courseId The course ID.
     * @param options Options.
     * @returns Observable that returns the sections.
     */
    protected callGetSectionsWS(
        site: CoreSite,
        courseId: number,
        options: CoreCourseGetSectionsOptions = {},
    ): WSObservable<CoreCourseGetContentsWSSection[]> {
        const preSets: CoreSiteWSPreSets = {
            ...options.preSets,
            cacheKey: this.getSectionsCacheKey(courseId),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
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
                value: !!(options.includeStealthModules ?? true),
            });
        }

        return site.readObservable<CoreCourseGetContentsWSSection[]>('core_course_get_contents', params, preSets);
    }

    /**
     * Calculate and add the section contents. Section contents include modules and subsections.
     *
     * @param sections Sections to calculate.
     * @returns Sections with contents.
     */
    protected addSectionsContents(sections: CoreCourseWSSection[]): CoreCourseWSSection[] {
        const subsections = sections.filter((section) => !!section.component);
        const subsectionsComponents = CoreArray.unique(subsections.map(section => (section.component ?? '').replace('mod_', '')));

        sections.forEach(section => {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            section.contents = section.modules.map(module => {
                if (!subsectionsComponents.includes(module.modname)) {
                    return module;
                }

                // Replace the module with the subsection. If subsection not found, the module will be removed from the list.
                const customData = CoreText.parseJSON<{ sectionid?: string | number }>(module.customdata ?? '{}', {});

                return subsections.find(subsection => subsection.id === Number(customData.sectionid));
            }).filter((content): content is (CoreCourseWSSection | CoreCourseModuleData) => content !== undefined);
        });

        return sections;
    }

    /**
     * Get cache key for section WS call.
     *
     * @param courseId Course ID.
     * @returns Cache key.
     */
    protected getSectionsCacheKey(courseId: number): string {
        return `${CoreCourseProvider.ROOT_CACHE_KEY}sections:${courseId}`;
    }

    /**
     * Given a list of sections, returns the list of modules in the sections.
     * The modules are ordered in the order of appearance in the course.
     *
     * @param sections Sections.
     * @param options Other options.
     * @returns Modules.
     */
    getSectionsModules<
        Section extends CoreCourseWSSection,
        Module = Extract<ArrayElement<Section['contents']>, CoreCourseModuleData>
    >(
        sections: Section[],
        options: CoreCourseGetSectionsModulesOptions<Section, Module> = {},
    ): Module[] {
        let modules: Module[] = [];

        sections.forEach((section) => {
            if (options.ignoreSection && options.ignoreSection(section)) {
                return;
            }

            section.contents.forEach((modOrSubsection) => {
                if (sectionContentIsModule(modOrSubsection)) {
                    if (options.ignoreModule && options.ignoreModule(modOrSubsection as Module)) {
                        return;
                    }

                    modules.push(modOrSubsection as Module);
                } else {
                    modules = modules.concat(this.getSectionsModules([modOrSubsection], options));
                }
            });
        });

        return modules;
    }

    /**
     * Get all viewed modules in a course, ordered by timeaccess in descending order.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the list of viewed modules.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.getViewedModules.
     */
    async getViewedModules(courseId: number, siteId?: string): Promise<CoreCourseViewedModulesDBRecord[]> {
        return CoreCourseModuleHelper.getViewedModules(courseId, siteId);
    }

    /**
     * Invalidates course blocks WS call.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
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
     */
    async invalidateSections(courseId: number, siteId?: string, userId?: number): Promise<void> {
        const site = await CoreSites.getSite(siteId);
        const promises: Promise<void>[] = [];

        promises.push(site.invalidateWsCacheForKey(this.getSectionsCacheKey(courseId)));

        if (courseId === site.getSiteHomeId()) {
            // Homepage section is inside the site config.
            promises.push(site.invalidateConfig());
        }

        userId = userId || site.getUserId();
        promises.push(site.invalidateWsCacheForKey(this.getActivitiesCompletionCacheKey(courseId, userId)));

        await Promise.all(promises);
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param module Module to load the contents.
     * @param courseId Not used since 4.0.
     * @param sectionId Not used since 5.0
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
        await this.loadModuleContents(module, module.course, undefined, preferCache, ignoreCache, siteId, modName);

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
            CoreEvents.trigger(CORE_COURSES_MY_COURSES_UPDATED_EVENT, {
                courseId: courseId,
                action: CoreCoursesMyCoursesUpdatedEventAction.VIEW,
            }, site.getId());
        }
    }

    /**
     * Report a course and section as being viewed.
     *
     * @param courseId Course ID.
     * @param modName The module name, or "resource" if viewing resources list
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the WS call is successful.
     */
    async logViewModuleInstanceList(courseId: number, modName: string, siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        const params: CoreCourseViewModuleInstanceListWSParams = {
            courseid: courseId,
            modname: modName,
        };
        const response = await site.write<CoreStatusWithWarningsWSResponse>('core_course_view_module_instance_list', params);

        if (!response.status) {
            const warning = response.warnings?.[0] || {
                warningcode: 'errorlog',
                message: 'Error logging data.',
            };

            throw new CoreWSError(warning);
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
            await CorePromiseUtils.ignoreErrors(CoreCourseOffline.deleteManualCompletion(cmId, siteId));

            // Invalidate module now, completion has changed.
            await this.invalidateModule(cmId, siteId);

            return result;
        } catch (error) {
            if (CoreWSError.isWebServiceError(error)) {
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
     * @deprecated since 5.0. Use CoreCourseModuleHelper.moduleHasView.
     */
    moduleHasView(module: CoreCourseModuleSummary | CoreCourseModuleData): boolean {
        return CoreCourseModuleHelper.moduleHasView(module);
    }

    /**
     * Check if the module is a core module.
     *
     * @param moduleName The module name.
     * @returns Whether it's a core module.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.isCoreModule.
     */
    isCoreModule(moduleName: string): boolean {
        // If core modules are removed for a certain version we should check the version of the site.
        return CoreCourseModuleHelper.isCoreModule(moduleName);
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
            await CoreNavigator.navigate(`/main/${MAIN_MENU_HOME_PAGE_NAME}/${CORE_SITEHOME_PAGE_NAME}`, navOptions);

            return;
        }

        const { CoreSitePlugins } = await import('@features/siteplugins/services/siteplugins');

        const loading = await CoreLoadings.show();

        // Wait for site plugins to be fetched.
        await CorePromiseUtils.ignoreErrors(CoreSitePlugins.waitFetchPlugins());

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
        } catch {
            // The site plugin failed to load. The user needs to restart the app to try loading it again.
            await CoreAlerts.confirm(Translate.instant('core.courses.errorloadplugins'), {
                okText: Translate.instant('core.courses.reload'),
                cancelText: Translate.instant('core.courses.ignore'),
            });

            window.location.reload();
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Select a certain tab in the course. Please use currentViewIsCourse() first to verify user is viewing the course.
     *
     * @param selectedTab Name of the tab. If not provided, course contents.
     * @param params Other page params.
     */
    selectCourseTab(selectedTab: string, params: Params = {}): void {
        const tabParams: CoreEventSelectCourseTabData = {
            selectedTab,
            pageParams: { ...params },
        };

        CoreEvents.trigger(CORE_COURSE_SELECT_TAB, tabParams);

        // Deprecated event since 5.1.0. Will be removed in future versions.
        params = params || {};
        params.name = selectedTab || '';
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        CoreEvents.trigger(CoreEvents.SELECT_COURSE_TAB, params);
    }

    /**
     * Change the course status, setting it to the previous status.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the status is changed. Resolve param: new status.
     * @deprecated since 5.0. Use CoreCourseStatusHelper.setCoursePreviousStatus.
     */
    async setCoursePreviousStatus(courseId: number, siteId?: string): Promise<DownloadStatus> {
        return CoreCourseDownloadStatusHelper.setCoursePreviousStatus(courseId, siteId);
    }

    /**
     * Store course status.
     *
     * @param courseId Course ID.
     * @param status New course status.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when the status is stored.
     * @deprecated since 5.0. Use CoreCourseStatusHelper.setCourseStatus.
     */
    async setCourseStatus(courseId: number, status: DownloadStatus, siteId?: string): Promise<void> {
        return CoreCourseDownloadStatusHelper.setCourseStatus(courseId, status, siteId);
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
        await CoreCourseModuleHelper.storeModuleViewed(courseId, cmId, options);
    }

    /**
     * Translate a module name to current language.
     *
     * @param moduleName The module name.
     * @param fallback Fallback text to use if not translated. Will use moduleName otherwise.
     * @returns Translated name.
     * @deprecated since 5.0. Use CoreCourseModuleHelper.translateModuleName instead.
     */
    translateModuleName(moduleName: string, fallback?: string): string {
        return CoreCourseModuleHelper.translateModuleName(moduleName, fallback);
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
        return CoreDom.removeElementFromHtml(availabilityInfo, 'li[data-action="showmore"]');
    }

}

export const CoreCourse = makeSingleton(CoreCourseProvider);

/**
 * Type guard to detect if a section content (module or subsection) is a module.
 *
 * @param content Section module or subsection.
 * @returns Whether section content is a module.
 */
export function sectionContentIsModule<Section extends CoreCourseWSSection, Module extends CoreCourseModuleData>(
    content: Module | Section,
): content is Module {
    return 'modname' in content;
}

/**
 * Common options used by modules when calling a WS through CoreSite.
 */
export type CoreCourseCommonModWSOptions = CoreSitesCommonWSOptions & {
    cmId?: number; // Module ID.
};

/**
 * Common options used by modules when calling a WS through CoreSite, including an option to determine if text should be filtered.
 */
export type CoreCourseCommonModWSOptionsWithFilter = CoreCourseCommonModWSOptions & CoreSitesWSOptionsWithFilter;

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
    state: CoreCourseModuleCompletionStatus; // Completion state value.
    timecompleted: number; // Timestamp for completed activity.
    tracking: CoreCourseModuleCompletionTracking; // Type of tracking: 0 means none, 1 manual, 2 automatic.
    overrideby: number | null; // The user id who has overriden the status, or null.
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
    isoverallcomplete?: boolean; // @since 4.4.
                                // Whether the overall completion state of this course module should be marked as complete or not.
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
        contentformat: CoreTextFormat; // Content format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
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
    summaryformat: CoreTextFormat; // Summary format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    section?: number; // Section number inside the course.
    hiddenbynumsections?: number; // Whether is a section hidden in the course format.
    uservisible?: boolean; // Is the section visible for the user?.
    availabilityinfo?: string; // Availability information.
    modules: CoreCourseGetContentsWSModule[]; // List of module.
    component?: string; // @since 4.5 The delegate component of this section if any.
    itemid?: number; // @since 4.5 The optional item id delegate component can use to identify its instance.
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
    purpose?: ModPurpose; // @since 4.4 The module purpose.
    branded?: boolean; // @since 4.4 Whether the module is branded or not.
    modplural: string; // Activity module plural name.
    availability?: string; // Module availability settings.
    indent: number; // Number of identation in the site.
    onclick?: string; // Onclick action.
    afterlink?: string; // After link info to be displayed.
    activitybadge?: { // @since 4.3. Activity badge to display near the name.
        badgecontent?: string; // The content to be displayed in the activity badge.
        badgestyle?: string; // The style for the activity badge.
        badgeurl?: string; // An optional URL to redirect the user when the activity badge is clicked.
        badgeelementid?: string; // An optional id in case the module wants to add some code for the activity badge.
        badgeextraattributes?: { // An optional array of extra HTML attributes to add to the badge element.
            name?: string; // The attribute name.
            value?: string; // The attribute value.
        }[];
    };
    customdata?: string; // Custom data (JSON encoded).
    noviewlink?: boolean; // Whether the module has no view page.
    completion?: CoreCourseModuleCompletionTracking; // Type of completion tracking: 0 means none, 1 manual, 2 automatic.
    completiondata?: CoreCourseModuleWSCompletionData; // Module completion data.
    contents?: CoreCourseModuleContentFile[];
    groupmode?: number; // @since 4.3. Group mode value
    downloadcontent?: number; // @since 4.0 The download content value.
    dates?: { // @since 3.11. Course dates.
        label: string; // Date label.
        timestamp: number; // Date timestamp.
        relativeto?: number; // @since 4.1. Relative date timestamp.
        dataid?: string; // @since 4.1. Cm data id.
    }[];
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
    contents: CoreCourseModuleOrSection[]; // List of modules and subsections.

    /**
     * List of modules
     *
     * @deprecated since 4.5. Use contents instead.
     */
    modules: CoreCourseModuleData[];
};

/**
 * Module or subsection.
 */
export type CoreCourseModuleOrSection = CoreCourseModuleData | CoreCourseWSSection;

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
    isoverallcomplete?: boolean; // @since 4.4.
                                // Whether the overall completion state of this course module should be marked as complete or not.
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
    fileurl: string; // Downloadable file url. Required field.
    timemodified: number; // Time modified.
    mimetype?: string; // File mime type.
    isexternalfile?: boolean; // Whether is an external file.
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
 * Params of core_course_view_module_instance_list WS.
 */
type CoreCourseViewModuleInstanceListWSParams = {
    courseid: number; // Course ID.
    modname: string; // The module name, or "resource" if viewing resources list.
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
 * Options for getSections.
 */
export type CoreCourseGetSectionsOptions = CoreSitesCommonWSOptions & {
    excludeModules?: boolean;
    excludeContents?: boolean;
    includeStealthModules?: boolean; // Defaults to true.
    preSets?: CoreSiteWSPreSets;
};

/**
 * Options for get sections modules.
 */
export type CoreCourseGetSectionsModulesOptions<Section, Module> = {
    ignoreSection?: (section: Section) => boolean; // Function to filter sections. Return true to ignore it, false to use it.
    ignoreModule?: (module: Module) => boolean; // Function to filter module. Return true to ignore it, false to use it.
};

/**
 * Data passed to SELECT_COURSE_TAB event.
 */
type CoreEventSelectCourseTabData = {
    selectedTab: string; // Name of the tab's handler. If not set, load course contents.
    pageParams: Params;
};
