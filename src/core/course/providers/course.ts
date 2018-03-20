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
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSiteWSPreSets } from '@classes/site';
import { CoreConstants } from '../../constants';

/**
 * Service that provides some features regarding a course.
 */
@Injectable()
export class CoreCourseProvider {
    static ALL_SECTIONS_ID = -1;
    static ACCESS_GUEST = 'courses_access_guest';
    static ACCESS_DEFAULT = 'courses_access_default';

    protected ROOT_CACHE_KEY = 'mmCourse:';

    // Variables for database.
    protected COURSE_STATUS_TABLE = 'course_status';
    protected courseStatusTableSchema = {
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
    };

    protected logger;
    protected CORE_MODULES = [
        'assign', 'assignment', 'book', 'chat', 'choice', 'data', 'database', 'date', 'external-tool',
        'feedback', 'file', 'folder', 'forum', 'glossary', 'ims', 'imscp', 'label', 'lesson', 'lti', 'page', 'quiz',
        'resource', 'scorm', 'survey', 'url', 'wiki', 'workshop'
    ];

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private eventsProvider: CoreEventsProvider,
            private utils: CoreUtilsProvider, private timeUtils: CoreTimeUtilsProvider, private translate: TranslateService) {
        this.logger = logger.getInstance('CoreCourseProvider');

        this.sitesProvider.createTableFromSchema(this.courseStatusTableSchema);
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
                this.triggerCourseStatusChanged(-1, CoreConstants.NOT_DOWNLOADED, site.id);
            });
        });
    }

    /**
     * Get completion status of all the activities in a course for a certain user.
     *
     * @param {number} courseId Course ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @param {number} [userId] User ID. If not defined, current user.
     * @return {Promise<any>} Promise resolved with the completion statuses: object where the key is module ID.
     */
    getActivitiesCompletionStatus(courseId: number, siteId?: string, userId?: number): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            userId = userId || site.getUserId();

            this.logger.debug(`Getting completion status for user ${userId} in course ${courseId}`);

            const params = {
                    courseid: courseId,
                    userid: userId
                },
                preSets = {
                    cacheKey: this.getActivitiesCompletionCacheKey(courseId, userId)
                };

            return site.read('core_completion_get_activities_completion_status', params, preSets).then((data) => {
                if (data && data.statuses) {
                    return this.utils.arrayToObject(data.statuses, 'cmid');
                }

                return Promise.reject(null);
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
     * @return {Promise<any>} Promise resolved with the module.
     */
    getModule(moduleId: number, courseId?: number, sectionId?: number, preferCache?: boolean, ignoreCache?: boolean,
            siteId?: string): Promise<any> {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        let promise;

        if (!courseId) {
            // No courseId passed, try to retrieve it.
            promise = this.getModuleBasicInfo(moduleId, siteId).then((module) => {
                return module.course;
            });
        } else {
            promise = Promise.resolve(courseId);
        }

        return promise.then((cid) => {
            courseId = cid;

            // Get the site.
            return this.sitesProvider.getSite(siteId);
        }).then((site) => {
            // We have courseId, we can use core_course_get_contents for compatibility.
            this.logger.debug(`Getting module ${moduleId} in course ${courseId}`);

            const params = {
                    courseid: courseId,
                    options: [
                        {
                            name: 'cmid',
                            value: moduleId
                        }
                    ]
                },
                preSets: any = {
                    cacheKey: this.getModuleCacheKey(moduleId),
                    omitExpires: preferCache
                };

            if (!preferCache && ignoreCache) {
                preSets.getFromCache = 0;
                preSets.emergencyCache = 0;
            }

            if (sectionId) {
                params.options.push({
                    name: 'sectionid',
                    value: sectionId
                });
            }

            return site.read('core_course_get_contents', params, preSets).catch(() => {
                // Error getting the module. Try to get all contents (without filtering by module).
                return this.getSections(courseId, false, false, preSets, siteId);
            }).then((sections) => {
                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];
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
                    cacheKey: this.getModuleCacheKey(moduleId)
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
                    cacheKey: this.getModuleBasicInfoByInstanceCacheKey(id, module)
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
     * Returns the source to a module icon.
     *
     * @param {string} moduleName The module name.
     * @return {string} The IMG src.
     */
    getModuleIconSrc(moduleName: string): string {
        if (this.CORE_MODULES.indexOf(moduleName) < 0) {
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
     * @return {Promise}                The reject contains the error message, else contains the sections.
     */
    getSections(courseId?: number, excludeModules?: boolean, excludeContents?: boolean, preSets?: CoreSiteWSPreSets,
        siteId?: string): Promise<any[]> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            preSets = preSets || {};
            preSets.cacheKey = this.getSectionsCacheKey(courseId);
            preSets.getCacheUsingCacheKey = true; // This is to make sure users don't lose offline access when updating.

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

            return site.read('core_course_get_contents', params, preSets).then((sections) => {
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
     * Invalidates module WS call.
     *
     * @param {number} moduleId Module ID.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<any>} Promise resolved when the data is invalidated.
     */
    invalidateModule(moduleId: number, siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getModuleCacheKey(moduleId));
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
     * @return {Promise<void>} Promise resolved when loaded.
     */
    loadModuleContents(module: any, courseId?: number, sectionId?: number, preferCache?: boolean, ignoreCache?: boolean,
        siteId?: string): Promise<void> {
        if (!ignoreCache && module.contents && module.contents.length) {
            // Already loaded.
            return Promise.resolve();
        }

        return this.getModule(module.id, courseId, sectionId, preferCache, ignoreCache, siteId).then((mod) => {
            module.contents = mod.contents;
        });
    }

    /**
     * Report a course and section as being viewed.
     *
     * @param {number} courseId  Course ID.
     * @param {number} [sectionNumber] Section number.
     * @param {string} [siteId] Site ID. If not defined, current site.
     * @return {Promise<void>} Promise resolved when the WS call is successful.
     */
    logView(courseId: number, sectionNumber?: number, siteId?: string): Promise<void> {
        const params: any = {
            courseid: courseId
        };

        if (typeof sectionNumber != 'undefined') {
            params.sectionnumber = sectionNumber;
        }

        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.write('core_course_view_course', params).then((response) => {
                if (!response.status) {
                    return Promise.reject(null);
                }
            });
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
