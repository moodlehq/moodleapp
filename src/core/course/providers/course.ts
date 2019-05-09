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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider, CoreSiteSchema } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSiteWSPreSets, CoreSite } from '@classes/site';
import { CoreConstants } from '../../constants';
import { CoreCourseOfflineProvider } from './course-offline';
import { CoreSitePluginsProvider } from '@core/siteplugins/providers/siteplugins';
import { CoreCourseFormatDelegate } from './format-delegate';
import { CorePushNotificationsProvider } from '@core/pushnotifications/providers/pushnotifications';

/**
 * Service that provides some features regarding a course.
 */
@Injectable()
export class CoreCourseProvider {
    static ALL_SECTIONS_ID = -2;
    static STEALTH_MODULES_SECTION_ID = -1;
    static ACCESS_GUEST = 'courses_access_guest';
    static ACCESS_DEFAULT = 'courses_access_default';
    static ALL_COURSES_CLEARED = -1;

    static COMPLETION_TRACKING_NONE = 0;
    static COMPLETION_TRACKING_MANUAL = 1;
    static COMPLETION_TRACKING_AUTOMATIC = 2;

    static COMPLETION_INCOMPLETE = 0;
    static COMPLETION_COMPLETE = 1;
    static COMPLETION_COMPLETE_PASS = 2;
    static COMPLETION_COMPLETE_FAIL = 3;

    static COMPONENT = 'CoreCourse';

    protected ROOT_CACHE_KEY = 'mmCourse:';

    // Variables for database.
    protected COURSE_STATUS_TABLE = 'course_status';
    protected siteSchema: CoreSiteSchema = {
        name: 'CoreCourseProvider',
        version: 1,
        tables: [
            {
                name: this.COURSE_STATUS_TABLE,
                columns: [
                    {
                        name: 'id',
                        type: 'INTEGER',
                        primaryKey: true
                    },
                    {
                        name: 'status',
                        type: 'TEXT',
                        notNull: true
                    },
                    {
                        name: 'previous',
                        type: 'TEXT'
                    },
                    {
                        name: 'updated',
                        type: 'INTEGER'
                    },
                    {
                        name: 'downloadTime',
                        type: 'INTEGER'
                    },
                    {
                        name: 'previousDownloadTime',
                        type: 'INTEGER'
                    }
                ]
            }
        ]
    };

    protected logger;
    protected CORE_MODULES = [
        'assign', 'assignment', 'book', 'chat', 'choice', 'data', 'database', 'date', 'external-tool',
        'feedback', 'file', 'folder', 'forum', 'glossary', 'ims', 'imscp', 'label', 'lesson', 'lti', 'page', 'quiz',
        'resource', 'scorm', 'survey', 'url', 'wiki', 'workshop'
    ];

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private eventsProvider: CoreEventsProvider,
            private utils: CoreUtilsProvider, private timeUtils: CoreTimeUtilsProvider, private translate: TranslateService,
            private courseOffline: CoreCourseOfflineProvider, private appProvider: CoreAppProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate, private sitePluginsProvider: CoreSitePluginsProvider,
            private domUtils: CoreDomUtilsProvider, protected pushNotificationsProvider: CorePushNotificationsProvider) {
        this.logger = logger.getInstance('CoreCourseProvider');

        this.sitesProvider.registerSiteSchema(this.siteSchema);
    }

    /**
     * Check if the get course blocks WS is available in current site.
     *
     * @return {boolean} Whether it's available.
     * @since 3.3
     */
    canGetCourseBlocks(): boolean {
        return this.sitesProvider.wsAvailableInCurrentSite('core_block_get_course_blocks');
    }

    /**
     * Check whether the site supports requesting stealth modules.
     *
     * @param {CoreSite} [site] Site. If not defined, current site.
     * @return {boolean} Whether the site supports requesting stealth modules.
     * @since 3.4.6, 3.5.3, 3.6
     */
    canRequestStealthModules(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.isVersionGreaterEqualThan(['3.4.6', '3.5.3']);
    }

    /**
     * Check if module completion could have changed. If it could have, trigger event. This function must be used,
     * for example, after calling a "module_view" WS since it can change the module completion.
     *
     * @param {number} courseId Course ID.
     * @param {any} completion Completion status of the module.
     */
    checkModuleCompletion(courseId: number, completion: any): void {
        if (completion && completion.tracking === 2 && completion.state === 0) {
            this.invalidateSections(courseId).finally(() => {
                this.eventsProvider.trigger(CoreEventsProvider.COMPLETION_MODULE_VIEWED, { courseId: courseId });
            });
        }
    }

    /**
     * Clear all courses status in a site.
     *
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<void>} Promise resolved when all status are cleared.
     */
    clearAllCoursesStatus(siteId?: string): Promise<void> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            this.logger.debug('Clear all course status for site ' + site.id);

            return site.getDb().deleteRecords(this.COURSE_STATUS_TABLE).then(() => {
                this.triggerCourseStatusChanged(CoreCourseProvider.ALL_COURSES_CLEARED, CoreConstants.NOT_DOWNLOADED, site.id);
            });
        });
    }

    /**
     * Get completion status of all the activities in a course for a certain user.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, current user.
     * @param {boolean} [forceCache] True if it should return cached data. Has priority over ignoreCache.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {boolean} [includeOffline=true] True if it should load offline data in the completion status.
     * @return {Promise<any>} Promise resolved with the completion statuses: object where the key is module ID.
     */
    getActivitiesCompletionStatus(courseId: number, siteId?: string, userId?: number, forceCache: boolean = false,
            ignoreCache: boolean = false, includeOffline: boolean = true): Promise<any> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug(`Getting completion status for user ${userId} in course ${courseId}`);

            const params = {
                    courseid: courseId,
                    userid: userId
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getActivitiesCompletionCacheKey(courseId, userId)
                };

            if (forceCache) {
                preSets.omitExpires = true;
            } else if (ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_completion_get_activities_completion_status', params, preSets).then((data) => {
                if (data && data.statuses) {
                    return this.utils.arrayToObject(data.statuses, 'cmid');
                }

                return Promise.reject(null);
            }).then((completionStatus) => {
                if (!includeOffline) {
                    return completionStatus;
                }

                // Now get the offline completion (if any).
                return this.courseOffline.getCourseManualCompletions(courseId, site.id).then((offlineCompletions) => {
                    offlineCompletions.forEach((offlineCompletion) => {

                        if (offlineCompletion && typeof completionStatus[offlineCompletion.cmid] != 'undefined') {
                            const onlineCompletion = completionStatus[offlineCompletion.cmid];

                            // If the activity uses manual completion, override the value with the offline one.
                            if (onlineCompletion.tracking === 1) {
                                onlineCompletion.state = offlineCompletion.completed;
                                onlineCompletion.offline = true;
                            }
                        }
                    });

                    return completionStatus;
                }).catch(() => {
                    // Ignore errors.
                    return completionStatus;
                });
            });
        });
    }

    /**
     * Get cache key for activities completion WS calls.
     *
     * @param {number} courseId Course ID.
     * @param {number} userId User ID.
     * @return {string} Cache key.
     */
    protected getActivitiesCompletionCacheKey(courseId: number, userId: number): string {
        return this.ROOT_CACHE_KEY + 'activitiescompletion:' + courseId + ':' + userId;
    }

    /**
     * Get course blocks.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any[]>} Promise resolved with the list of blocks.
     * @since 3.3
     */
    getCourseBlocks(courseId: number, siteId?: string): Promise<any[]> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    courseid: courseId,
                    returncontents: 1
                },
                preSets: CoreSiteWSPreSets = {
                    cacheKey: this.getCourseBlocksCacheKey(courseId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_block_get_course_blocks', params, preSets).then((result) => {
                return result.blocks || [];
            });
        });
    }

    /**
     * Get cache key for course blocks WS calls.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getCourseBlocksCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'courseblocks:' + courseId;
    }

    /**
     * Get the data stored for a course.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the data.
     */
    getCourseStatusData(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.getDb().getRecord(this.COURSE_STATUS_TABLE, { id: courseId }).then((entry) => {
                if (!entry) {
                    return Promise.reject(null);
                }

                return entry;
            });
        });
    }

    /**
     * Get a course status.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved with the status.
     */
    getCourseStatus(courseId: number, siteId?: string): Promise<string> {
        return this.getCourseStatusData(courseId, siteId).then((entry) => {
            return entry.status || CoreConstants.NOT_DOWNLOADED;
        }).catch(() => {
            return CoreConstants.NOT_DOWNLOADED;
        });
    }

    /**
     * Get a module from Moodle.
     *
     * @param {number} moduleId The module ID.
     * @param {number} [courseId] The course ID. Recommended to speed up the process and minimize data usage.
     * @param {number} [sectionId] The section ID.
     * @param {boolean} [preferCache] True if shouldn't call WS if data is cached, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [modName] If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                           number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @return {Promise<any>} Promise resolved with the module.
     */
    getModule(moduleId: number, courseId?: number, sectionId?: number, preferCache?: boolean, ignoreCache?: boolean,
            siteId?: string, modName?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Helper function to do the WS request without processing the result.
        const doRequest = (site: CoreSite, moduleId: number, modName: string, includeStealth: boolean, preferCache: boolean):
                Promise<any> => {
            const params: any = {
                courseid: courseId,
                options: []
            };
            const preSets: CoreSiteWSPreSets = {
                omitExpires: preferCache,
                updateFrequency: CoreSite.FREQUENCY_RARELY
            };

            if (includeStealth) {
                params.options.push({
                    name: 'includestealthmodules',
                    value: 1
                });
            }

            // If modName is set, retrieve all modules of that type. Otherwise get only the module.
            if (modName) {
                params.options.push({
                    name: 'modname',
                    value: modName
                });
                preSets.cacheKey = this.getModuleByModNameCacheKey(modName);
            } else {
                params.options.push({
                    name: 'cmid',
                    value: moduleId
                });
                preSets.cacheKey = this.getModuleCacheKey(moduleId);
            }

            if (!preferCache && ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return site.read('core_course_get_contents', params, preSets).catch(() => {
                // The module might still be cached by a request with different parameters.
                if (!ignoreCache && !this.appProvider.isOnline()) {
                    if (includeStealth) {
                        // Older versions didn't include the includestealthmodules option.
                        return doRequest(site, moduleId, modName, false, true);
                    } else if (modName) {
                        // Falback to the request for the given moduleId only.
                        return doRequest(site, moduleId, undefined, this.canRequestStealthModules(site), true);
                    }
                }

                return Promise.reject(null);
            });
        };

        let promise;
        if (!courseId) {
            // No courseId passed, try to retrieve it.
            promise = this.getModuleBasicInfo(moduleId, siteId).then((module) => {
                courseId = module.course;
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            return this.sitesProvider.getSite(siteId);
        }).then((site) => {
            // We have courseId, we can use core_course_get_contents for compatibility.
            this.logger.debug(`Getting module ${moduleId} in course ${courseId}`);

            return doRequest(site, moduleId, modName, this.canRequestStealthModules(site), preferCache);
        }).catch(() => {
            // Error getting the module. Try to get all contents (without filtering by module).
            const preSets: CoreSiteWSPreSets = {
                omitExpires: preferCache
            };

            if (!preferCache && ignoreCache) {
                preSets.getFromCache = false;
                preSets.emergencyCache = false;
            }

            return this.getSections(courseId, false, false, preSets, siteId);
        }).then((sections) => {
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                if (sectionId != null && !isNaN(sectionId) && section.id != CoreCourseProvider.STEALTH_MODULES_SECTION_ID &&
                        sectionId != section.id) {
                    continue;
                }

                for (let j = 0; j < section.modules.length; j++) {
                    const module = section.modules[j];
                    if (module.id == moduleId) {
                        module.course = courseId;

                        return module;
                    }
                }
            }

            return Promise.reject(null);
        });
    }

    /**
     * Gets a module basic info by module ID.
     *
     * @param {number} moduleId Module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the module's info.
     */
    getModuleBasicInfo(moduleId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    cmid: moduleId
                },
                preSets = {
                    cacheKey: this.getModuleCacheKey(moduleId),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_course_module', params, preSets).then((response) => {
                if (response.warnings && response.warnings.length) {
                    return Promise.reject(response.warnings[0]);
                } else if (response.cm) {
                    return response.cm;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Gets a module basic grade info by module ID.
     *
     * If the user does not have permision to manage the activity false is returned.
     *
     * @param {number} moduleId Module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the module's grade info.
     */
    getModuleBasicGradeInfo(moduleId: number, siteId?: string): Promise<any> {
        return this.getModuleBasicInfo(moduleId, siteId).then((info) => {
            const grade = {
                advancedgrading: info.advancedgrading || false,
                grade: info.grade || false,
                gradecat: info.gradecat || false,
                gradepass: info.gradepass || false,
                outcomes: info.outcomes || false,
                scale: info.scale || false
            };

            if (grade.grade !== false || grade.advancedgrading !== false || grade.outcomes !== false) {
                return grade;
            }

            return false;
        });
    }

    /**
     * Gets a module basic info by instance.
     *
     * @param {number} id Instance ID.
     * @param {string} module Name of the module. E.g. 'glossary'.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the module's info.
     */
    getModuleBasicInfoByInstance(id: number, module: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    instance: id,
                    module: module
                },
                preSets = {
                    cacheKey: this.getModuleBasicInfoByInstanceCacheKey(id, module),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_course_get_course_module_by_instance', params, preSets).then((response) => {
                if (response.warnings && response.warnings.length) {
                    return Promise.reject(response.warnings[0]);
                } else if (response.cm) {
                    return response.cm;
                }

                return Promise.reject(null);
            });
        });
    }

    /**
     * Get cache key for get module by instance WS calls.
     *
     * @param {number} id Instance ID.
     * @param {string} module Name of the module. E.g. 'glossary'.
     * @return {string} Cache key.
     */
    protected getModuleBasicInfoByInstanceCacheKey(id: number, module: string): string {
        return this.ROOT_CACHE_KEY + 'moduleByInstance:' + module + ':' + id;
    }

    /**
     * Get cache key for module WS calls.
     *
     * @param {number} moduleId Module ID.
     * @return {string} Cache key.
     */
    protected getModuleCacheKey(moduleId: number): string {
        return this.ROOT_CACHE_KEY + 'module:' + moduleId;
    }

    /**
     * Get cache key for module by modname WS calls.
     *
     * @param {string} modName Name of the module.
     * @return {string} Cache key.
     */
    protected getModuleByModNameCacheKey(modName: string): string {
        return this.ROOT_CACHE_KEY + 'module:modName:' + modName;
    }

    /**
     * Returns the source to a module icon.
     *
     * @param {string} moduleName The module name.
     * @param {string} [modicon] The mod icon string to use in case we are not using a core activity.
     * @return {string} The IMG src.
     */
    getModuleIconSrc(moduleName: string, modicon?: string): string {
        // @TODO: Check modicon url theme to apply other theme icons.

        // Use default icon on core themes.
        if (this.CORE_MODULES.indexOf(moduleName) < 0) {
            if (modicon) {
                return modicon;
            }

            moduleName = 'external-tool';
        }

        return 'assets/img/mod/' + moduleName + '.svg';
    }

    /**
     * Get the section ID a module belongs to.
     *
     * @param {number} moduleId The module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<number>} Promise resolved with the section ID.
     */
    getModuleSectionId(moduleId: number, siteId?: string): Promise<number> {
        // Try to get the section using getModuleBasicInfo.
        return this.getModuleBasicInfo(moduleId, siteId).then((module) => {
            return module.section;
        });
    }

    /**
     * Return a specific section.
     *
     * @param {number} courseId The course ID.
     * @param {number} sectionId The section ID.
     * @param {boolean} [excludeModules] Do not return modules, return only the sections structure.
     * @param {boolean} [excludeContents] Do not return module contents (i.e: files inside a resource).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved with the section.
     */
    getSection(courseId: number, sectionId?: number, excludeModules?: boolean, excludeContents?: boolean, siteId?: string)
        : Promise<any> {

        if (sectionId < 0) {
            return Promise.reject('Invalid section ID');
        }

        return this.getSections(courseId, excludeModules, excludeContents, undefined, siteId).then((sections) => {
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].id == sectionId) {
                    return sections[i];
                }
            }

            return Promise.reject('Unkown section');
        });
    }

    /**
     * Get the course sections.
     *
     * @param {number} courseId The course ID.
     * @param {boolean} [excludeModules] Do not return modules, return only the sections structure.
     * @param {boolean} [excludeContents] Do not return module contents (i.e: files inside a resource).
     * @param {CoreSiteWSPreSets} [preSets] Presets to use.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {boolean} [includeStealthModules] Whether to include stealth modules. Defaults to true.
     * @return {Promise}                The reject contains the error message, else contains the sections.
     */
    getSections(courseId?: number, excludeModules?: boolean, excludeContents?: boolean, preSets?: CoreSiteWSPreSets,
        siteId?: string, includeStealthModules: boolean = true): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            preSets = preSets || {};
            preSets.cacheKey = this.getSectionsCacheKey(courseId);
            preSets.updateFrequency = preSets.updateFrequency || CoreSite.FREQUENCY_RARELY;

            const params = {
                courseid: courseId,
                options: [
                    {
                        name: 'excludemodules',
                        value: excludeModules ? 1 : 0
                    },
                    {
                        name: 'excludecontents',
                        value: excludeContents ? 1 : 0
                    }
                ]
            };

            if (this.canRequestStealthModules(site)) {
                params.options.push({
                    name: 'includestealthmodules',
                    value: includeStealthModules ? 1 : 0
                });
            }

            return site.read('core_course_get_contents', params, preSets).catch(() => {
                // Error getting the data, it could fail because we added a new parameter and the call isn't cached.
                // Retry without the new parameter and forcing cache.
                preSets.omitExpires = true;
                params.options.splice(-1, 1);

                return site.read('core_course_get_contents', params, preSets);
            }).then((sections) => {
                const siteHomeId = site.getSiteHomeId();
                let showSections = true;

                if (courseId == siteHomeId) {
                    showSections = site.getStoredConfig('numsections');
                }

                if (typeof showSections != 'undefined' && !showSections && sections.length > 0) {
                    // Get only the last section (Main menu block section).
                    sections.pop();
                }

                return sections;
            });
        });
    }

    /**
     * Get cache key for section WS call.
     *
     * @param {number} courseId Course ID.
     * @return {string} Cache key.
     */
    protected getSectionsCacheKey(courseId: number): string {
        return this.ROOT_CACHE_KEY + 'sections:' + courseId;
    }

    /**
     * Given a list of sections, returns the list of modules in the sections.
     *
     * @param {any[]} sections Sections.
     * @return {any[]} Modules.
     */
    getSectionsModules(sections: any[]): any[] {
        if (!sections || !sections.length) {
            return [];
        }

        let modules = [];
        sections.forEach((section) => {
            if (section.modules) {
                modules = modules.concat(section.modules);
            }
        });

        return modules;
    }

    /**
     * Invalidates course blocks WS call.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateCourseBlocks(courseId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getCourseBlocksCacheKey(courseId));
        });
    }

    /**
     * Invalidates module WS call.
     *
     * @param {number} moduleId Module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [modName] Module name. E.g. 'label', 'url', ...
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateModule(moduleId: number, siteId?: string, modName?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [];

            if (modName) {
                promises.push(site.invalidateWsCacheForKey(this.getModuleByModNameCacheKey(modName)));
            }

            promises.push(site.invalidateWsCacheForKey(this.getModuleCacheKey(moduleId)));

            return Promise.all(promises);
        });
    }

    /**
     * Invalidates module WS call.
     *
     * @param {number} id Instance ID.
     * @param {string} module Name of the module. E.g. 'glossary'.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateModuleByInstance(id: number, module: string, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getModuleBasicInfoByInstanceCacheKey(id, module));
        });
    }

    /**
     * Invalidates sections WS call.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, current user.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateSections(courseId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const promises = [],
                siteHomeId = site.getSiteHomeId();

            userId = userId || site.getUserId();

            promises.push(site.invalidateWsCacheForKey(this.getSectionsCacheKey(courseId)));
            promises.push(site.invalidateWsCacheForKey(this.getActivitiesCompletionCacheKey(courseId, userId)));
            if (courseId == siteHomeId) {
                promises.push(site.invalidateConfig());
            }

            return Promise.all(promises);
        });
    }

    /**
     * Load module contents into module.contents if they aren't loaded already.
     *
     * @param {any} module Module to load the contents.
     * @param {number} [courseId] The course ID. Recommended to speed up the process and minimize data usage.
     * @param {number} [sectionId] The section ID.
     * @param {boolean} [preferCache] True if shouldn't call WS if data is cached, false otherwise.
     * @param {boolean} [ignoreCache] True if it should ignore cached data (it will always fail in offline or server down).
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [modName] If set, the app will retrieve all modules of this type with a single WS call. This reduces the
     *                           number of WS calls, but it isn't recommended for modules that can return a lot of contents.
     * @return {Promise<void>} Promise resolved when loaded.
     */
    loadModuleContents(module: any, courseId?: number, sectionId?: number, preferCache?: boolean, ignoreCache?: boolean,
            siteId?: string, modName?: string): Promise<void> {

        if (!ignoreCache && module.contents && module.contents.length) {
            // Already loaded.
            return Promise.resolve();
        }

        return this.getModule(module.id, courseId, sectionId, preferCache, ignoreCache, siteId, modName).then((mod) => {
            module.contents = mod.contents;
        });
    }

    /**
     * Report a course and section as being viewed.
     *
     * @param {number} courseId  Course ID.
     * @param {number} [sectionNumber] Section number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {string} [name] Name of the course.
     * @return {Promise<void>} Promise resolved when the WS call is successful.
     */
    logView(courseId: number, sectionNumber?: number, siteId?: string, name?: string): Promise<void> {
        const params: any = {
                courseid: courseId
            },
            wsName = 'core_course_view_course';

        if (typeof sectionNumber != 'undefined') {
            params.sectionnumber = sectionNumber;
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            this.pushNotificationsProvider.logViewEvent(courseId, name, 'course', wsName, {sectionnumber: sectionNumber}, siteId);

            return site.write('core_course_view_course', params).then((response) => {
                if (!response.status) {
                    return Promise.reject(null);
                }
            });
        });
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param {number} cmId The module ID.
     * @param {number} completed Whether the module is completed or not.
     * @param {number} courseId Course ID the module belongs to.
     * @param {string} [courseName] Course name. Recommended, it is used to display a better warning message.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when completion is successfully sent or stored.
     */
    markCompletedManually(cmId: number, completed: number, courseId: number, courseName?: string, siteId?: string)
            : Promise<any> {

        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Convenience function to store a completion to be synchronized later.
        const storeOffline = (): Promise<any> => {
            return this.courseOffline.markCompletedManually(cmId, completed, courseId, courseName, siteId);
        };

        // The offline function requires a courseId and it could be missing because it's a calculated field.
        if (!this.appProvider.isOnline() && courseId) {
            // App is offline, store the action.
            return storeOffline();
        }

        // Try to send it to server.
        return this.markCompletedManuallyOnline(cmId, completed, siteId).then((result) => {
            // Data sent to server, if there is some offline data delete it now.
            return this.courseOffline.deleteManualCompletion(cmId, siteId).catch(() => {
                // Ignore errors, shouldn't happen.
            }).then(() => {
                return result;
            });
        }).catch((error) => {
            if (this.utils.isWebServiceError(error) || !courseId) {
                // The WebService has thrown an error, this means that responses cannot be submitted.
                return Promise.reject(error);
            } else {
                // Couldn't connect to server, store it offline.
                return storeOffline();
            }
        });
    }

    /**
     * Offline version for manually marking a module as completed.
     *
     * @param {number} cmId The module ID.
     * @param {number} completed Whether the module is completed or not.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when completion is successfully sent.
     */
    markCompletedManuallyOnline(cmId: number, completed: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            const params = {
                    cmid: cmId,
                    completed: completed
                };

            return site.write('core_completion_update_activity_completion_status_manually', params);
        });
    }

    /**
     * Check if a module has a view page. E.g. labels don't have a view page.
     *
     * @param {any} module The module object.
     * @return {boolean} Whether the module has a view page.
     */
    moduleHasView(module: any): boolean {
        return !!module.url;
    }

    /**
     * Wait for any course format plugin to load, and open the course page.
     *
     * If the plugin's promise is resolved, the course page will be opened.  If it is rejected, they will see an error.
     * If the promise for the plugin is still in progress when the user tries to open the course, a loader
     * will be displayed until it is complete, before the course page is opened.  If the promise is already complete,
     * they will see the result immediately.
     *
     * This function must be in here instead of course helper to prevent circular dependencies.
     *
     * @param {NavController} navCtrl The nav controller to use. If not defined, the course will be opened in main menu.
     * @param {any} course Course to open
     * @param {any} [params] Other params to pass to the course page.
     * @return {Promise<any>} Promise resolved when done.
     */
    openCourse(navCtrl: NavController, course: any, params?: any): Promise<any> {
        const loading = this.domUtils.showModalLoading();

        // Wait for site plugins to be fetched.
        return this.sitePluginsProvider.waitFetchPlugins().then(() => {
            if (this.sitePluginsProvider.sitePluginPromiseExists('format_' + course.format)) {
                // This course uses a custom format plugin, wait for the format plugin to finish loading.

                return this.sitePluginsProvider.sitePluginLoaded('format_' + course.format).then(() => {
                    // The format loaded successfully, but the handlers wont be registered until all site plugins have loaded.
                    if (this.sitePluginsProvider.sitePluginsFinishedLoading) {
                        return this.courseFormatDelegate.openCourse(navCtrl, course, params);
                    } else {
                        // Wait for plugins to be loaded.
                        const deferred = this.utils.promiseDefer(),
                            observer = this.eventsProvider.on(CoreEventsProvider.SITE_PLUGINS_LOADED, () => {
                                observer && observer.off();

                                this.courseFormatDelegate.openCourse(navCtrl, course, params).then((response) => {
                                    deferred.resolve(response);
                                }).catch((error) => {
                                    deferred.reject(error);
                                });
                            });

                        return deferred.promise;
                    }
                }).catch(() => {
                    // The site plugin failed to load. The user needs to restart the app to try loading it again.
                    this.domUtils.showErrorModal('core.courses.errorloadplugins', true);
                });
            } else {
                // No custom format plugin. We don't need to wait for anything.
                return this.courseFormatDelegate.openCourse(navCtrl, course, params);
            }
        }).finally(() => {
            loading.dismiss();
        });
    }

    /**
     * Change the course status, setting it to the previous status.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<string>} Promise resolved when the status is changed. Resolve param: new status.
     */
    setCoursePreviousStatus(courseId: number, siteId?: string): Promise<string> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.logger.debug(`Set previous status for course ${courseId} in site ${siteId}`);

        return this.sitesProvider.getSite(siteId).then((site) => {
            const db = site.getDb(),
                newData: any = {};

            // Get current stored data.
            return this.getCourseStatusData(courseId, siteId).then((entry) => {
                this.logger.debug(`Set previous status '${entry.status}' for course ${courseId}`);

                newData.status = entry.previous || CoreConstants.NOT_DOWNLOADED;
                newData.updated = Date.now();
                if (entry.status == CoreConstants.DOWNLOADING) {
                    // Going back from downloading to previous status, restore previous download time.
                    newData.downloadTime = entry.previousDownloadTime;
                }

                return db.updateRecords(this.COURSE_STATUS_TABLE, newData, { id: courseId }).then(() => {
                    // Success updating, trigger event.
                    this.triggerCourseStatusChanged(courseId, newData.status, siteId);

                    return newData.status;
                });
            });
        });
    }

    /**
     * Store course status.
     *
     * @param {number} courseId Course ID.
     * @param {string} status New course status.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<void>} Promise resolved when the status is stored.
     */
    setCourseStatus(courseId: number, status: string, siteId?: string): Promise<void> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        this.logger.debug(`Set status '${status}' for course ${courseId} in site ${siteId}`);

        return this.sitesProvider.getSite(siteId).then((site) => {
            let downloadTime,
                previousDownloadTime;

            if (status == CoreConstants.DOWNLOADING) {
                // Set download time if course is now downloading.
                downloadTime = this.timeUtils.timestamp();
            }

            // Search current status to set it as previous status.
            return this.getCourseStatusData(courseId, siteId).then((entry) => {
                if (typeof downloadTime == 'undefined') {
                    // Keep previous download time.
                    downloadTime = entry.downloadTime;
                    previousDownloadTime = entry.previousDownloadTime;
                } else {
                    // The downloadTime will be updated, store current time as previous.
                    previousDownloadTime = entry.downloadTime;
                }

                return entry.status;
            }).catch(() => {
                // No previous status.
            }).then((previousStatus) => {
                if (previousStatus != status) {
                    // Status has changed, update it.
                    const data = {
                        id: courseId,
                        status: status,
                        previous: previousStatus,
                        updated: new Date().getTime(),
                        downloadTime: downloadTime,
                        previousDownloadTime: previousDownloadTime
                    };

                    return site.getDb().insertRecord(this.COURSE_STATUS_TABLE, data);
                }
            }).then(() => {
                // Success inserting, trigger event.
                this.triggerCourseStatusChanged(courseId, status, siteId);
            });
        });
    }

    /**
     * Translate a module name to current language.
     *
     * @param {string} moduleName The module name.
     * @return {string} Translated name.
     */
    translateModuleName(moduleName: string): string {
        if (this.CORE_MODULES.indexOf(moduleName) < 0) {
            moduleName = 'external-tool';
        }

        const langKey = 'core.mod_' + moduleName,
            translated = this.translate.instant(langKey);

        return translated !== langKey ? translated : moduleName;
    }

    /**
     * Trigger COURSE_STATUS_CHANGED with the right data.
     *
     * @param {number} courseId Course ID.
     * @param {string} status New course status.
     * @param {string} [siteId] Site ID. If not defined, current site.
     */
    protected triggerCourseStatusChanged(courseId: number, status: string, siteId?: string): void {
        this.eventsProvider.trigger(CoreEventsProvider.COURSE_STATUS_CHANGED, {
            courseId: courseId,
            status: status
        }, siteId);
    }
}
