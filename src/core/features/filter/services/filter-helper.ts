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

import { CoreApp } from '@services/app';
import { CoreSites } from '@services/sites';
import { CoreFilterDelegate } from './filter-delegate';
import {
    CoreFilter,
    CoreFilterFilter,
    CoreFilterFormatTextOptions,
    CoreFilterClassifiedFilters,
    CoreFiltersGetAvailableInContextWSParamContext,
} from './filter';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourses } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { CoreEvents, CoreEventSiteData } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSite } from '@classes/site';

/**
 * Helper service to provide filter functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreFilterHelperProvider {

    protected logger: CoreLogger;

    /**
     * When a module context is requested, we request all the modules in a course to decrease WS calls. If there are a lot of
     * modules, checking the cache of all contexts can be really slow, so we use this memory cache to speed up the process.
     */
    protected moduleContextsCache: {
        [siteId: string]: {
            [courseId: number]: {
                [contextLevel: string]: {
                    contexts: CoreFilterClassifiedFilters;
                    time: number;
                };
            };
        };
    } = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFilterHelperProvider');

        CoreEvents.on(CoreEvents.WS_CACHE_INVALIDATED, (data: CoreEventSiteData) => {
            delete this.moduleContextsCache[data.siteId || ''];
        });

        CoreEvents.on(CoreEvents.SITE_STORAGE_DELETED, (data: CoreEventSiteData) => {
            delete this.moduleContextsCache[data.siteId || ''];
        });
    }

    /**
     * Get the contexts of all blocks in a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the contexts.
     */
    async getBlocksContexts(courseId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        const blocks = await CoreCourse.getCourseBlocks(courseId, siteId);

        const contexts: CoreFiltersGetAvailableInContextWSParamContext[] = [];

        blocks.forEach((block) => {
            contexts.push({
                contextlevel: 'block',
                instanceid: block.instanceid,
            });
        });

        return contexts;
    }

    /**
     * Get some filters from memory cache. If not in cache, get them and store them in cache.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters.
     */
    protected async getCacheableFilters(
        contextLevel: string,
        instanceId: number,
        getFilters: () => Promise<CoreFiltersGetAvailableInContextWSParamContext[]>,
        options: CoreFilterFormatTextOptions,
        site: CoreSite,
    ): Promise<CoreFilterFilter[]> {

        // Check the memory cache first.
        const result = this.getFromMemoryCache(options.courseId ?? -1, contextLevel, instanceId, site);
        if (result) {
            return result;
        }

        const siteId = site.getId();

        const contexts = await getFilters();

        const filters = await CoreFilter.getAvailableInContexts(contexts, siteId);

        this.storeInMemoryCache(options.courseId ?? -1, contextLevel, filters, siteId);

        return filters[contextLevel][instanceId] || [];
    }

    /**
     * If user is enrolled in the course, return contexts of all enrolled courses to decrease number of WS requests.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the contexts.
     */
    async getCourseContexts(courseId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        const courseIds = await CoreCourses.getCourseIdsIfEnrolled(courseId, siteId);

        const contexts: CoreFiltersGetAvailableInContextWSParamContext[] = [];

        courseIds.forEach((courseId) => {
            contexts.push({
                contextlevel: 'course',
                instanceid: courseId,
            });
        });

        return contexts;
    }

    /**
     * Get the contexts of all course modules in a course.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the contexts.
     */
    async getCourseModulesContexts(courseId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        const sections = await CoreCourse.getSections(courseId, false, true, undefined, siteId);

        const contexts: CoreFiltersGetAvailableInContextWSParamContext[] = [];

        sections.forEach((section) => {
            if (section.modules) {
                section.modules.forEach((module) => {
                    if (module.uservisible) {
                        contexts.push({
                            contextlevel: 'module',
                            instanceid: module.id,
                        });
                    }
                });
            }
        });

        return contexts;
    }

    /**
     * Get the filters in a certain context, performing some checks like the site version.
     * It's recommended to use this function instead of canGetFilters + getEnabledFilters because this function will check if
     * it's really needed to call the WS.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters.
     */
    async getFilters(
        contextLevel: string,
        instanceId: number,
        options?: CoreFilterFormatTextOptions,
        siteId?: string,
    ): Promise<CoreFilterFilter[]> {
        options = options || {};
        options.contextLevel = contextLevel;
        options.instanceId = instanceId;
        options.filter = false;

        try {
            const site = await CoreSites.getSite(siteId);

            siteId = site.getId();

            const canGet = await CoreFilter.canGetFilters(siteId);
            if (!canGet) {
                options.filter = true;

                // We cannot check which filters are available, apply them all.
                return CoreFilterDelegate.getEnabledFilters(contextLevel, instanceId);
            }

            let hasFilters = true;

            if (contextLevel == 'system' || (contextLevel == 'course' && instanceId == site.getSiteHomeId())) {
                // No need to check the site filters because we're requesting the same context, so we'd do the same twice.
            } else {
                // Check if site has any filter to treat.
                hasFilters = await this.siteHasFiltersToTreat(options, siteId);
            }

            if (!hasFilters) {
                return [];
            }

            options.filter = true;

            if (contextLevel == 'module' && options.courseId) {
                // Get all the modules filters with a single call to decrease the number of WS calls.
                const getFilters = this.getCourseModulesContexts.bind(this, options.courseId, siteId);

                return this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);

            } else if (contextLevel == 'course') {
                // If enrolled, get all enrolled courses filters with a single call to decrease number of WS calls.
                const getFilters = this.getCourseContexts.bind(this, instanceId, siteId);

                return this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);
            } else if (contextLevel == 'block' && options.courseId && CoreCourse.canGetCourseBlocks(site)) {
                // Get all the course blocks filters with a single call to decrease number of WS calls.
                const getFilters = this.getBlocksContexts.bind(this, options.courseId, siteId);

                return this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);
            }

            return CoreFilter.getAvailableInContext(contextLevel, instanceId, siteId);
        } catch (error) {
            this.logger.error('Error getting filters, return an empty array', error, contextLevel, instanceId);

            return [];
        }
    }

    /**
     * Get filters and format text.
     *
     * @param text Text to filter.
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the formatted text and the filters.
     */
    async getFiltersAndFormatText(
        text: string,
        contextLevel: string,
        instanceId: number,
        options?: CoreFilterFormatTextOptions,
        siteId?: string,
    ): Promise<{text: string; filters: CoreFilterFilter[]}> {

        const filters = await this.getFilters(contextLevel, instanceId, options, siteId);

        text = await CoreFilter.formatText(text, options, filters, siteId);

        return { text, filters: filters };
    }

    /**
     * Get module context filters from the memory cache.
     *
     * @param courseId Course the module belongs to.
     * @param contextLevel Context level.
     * @param instanceId Instance ID.
     * @param site Site.
     * @return The filters, undefined if not found.
     */
    protected getFromMemoryCache(
        courseId: number,
        contextLevel: string,
        instanceId: number,
        site: CoreSite,
    ): CoreFilterFilter[] | undefined {

        const siteId = site.getId();

        // Check if we have the context in the memory cache.
        if (!this.moduleContextsCache[siteId]?.[courseId]?.[contextLevel]) {
            return;
        }

        const cachedData = this.moduleContextsCache[siteId][courseId][contextLevel];

        if (!CoreApp.isOnline() || Date.now() <= cachedData.time + site.getExpirationDelay(CoreSite.FREQUENCY_RARELY)) {
            // We can use cache, return the filters if found.
            return cachedData.contexts[contextLevel] && cachedData.contexts[contextLevel][instanceId];
        }
    }

    /**
     * Check if site has available any filter that should be treated by the app.
     *
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether it has filters to treat.
     */
    async siteHasFiltersToTreat(options?: CoreFilterFormatTextOptions, siteId?: string): Promise<boolean> {
        options = options || {};

        const site = await CoreSites.getSite(siteId);

        // Get filters at site level.
        const filters = await CoreFilter.getAvailableInContext('system', 0, site.getId());

        return CoreFilterDelegate.shouldBeApplied(filters, options, site);
    }

    /**
     * Store filters in the memory cache.
     *
     * @param contexts Filters to store, classified by contextlevel and instanceid
     * @param siteId Site ID.
     */
    protected storeInMemoryCache(
        courseId: number,
        contextLevel: string,
        contexts: CoreFilterClassifiedFilters,
        siteId: string,
    ): void {

        this.moduleContextsCache[siteId] = this.moduleContextsCache[siteId] || {};
        this.moduleContextsCache[siteId][courseId] = this.moduleContextsCache[siteId][courseId] || {};
        this.moduleContextsCache[siteId][courseId][contextLevel] = {
            contexts: contexts,
            time: Date.now(),
        };
    }

}

export const CoreFilterHelper = makeSingleton(CoreFilterHelperProvider);
