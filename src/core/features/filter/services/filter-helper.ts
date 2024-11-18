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

import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreFilterDelegate } from './filter-delegate';
import {
    CoreFilter,
    CoreFilterFilter,
    CoreFilterFormatTextOptions,
    CoreFilterClassifiedFilters,
    CoreFiltersGetAvailableInContextWSParamContext,
    CoreFilterStateValue,
    CoreFilterAllStates,
} from './filter';
import { CoreCourse, sectionContentIsModule } from '@features/course/services/course';
import { CoreCourses } from '@features/courses/services/courses';
import { makeSingleton } from '@singletons';
import { CoreEvents, CoreEventSiteData } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSite } from '@classes/sites/site';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { firstValueFrom } from 'rxjs';
import { ContextLevel, CoreCacheUpdateFrequency } from '@/core/constants';
import { CorePromiseUtils } from '@singletons/promise-utils';

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
     * Get some filters from memory cache. If not in cache, get them and store them in cache.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param getFilters Function to get filter contexts from.
     * @param options Options for format text.
     * @param site Site. If not defined, current site.
     * @returns Promise resolved with the filters.
     */
    protected async getCacheableFilters(
        contextLevel: ContextLevel,
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
     * Return contexts of enrolled courses categories to decrease number of WS requests.
     * If cannot retrieve categories or current category is not in the list, return only the context of the current category.
     *
     * @param categoryId Category ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the contexts.
     */
    async getCategoryContexts(categoryId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        // Get the categories of courses the user is enrolled in to decrease the number of WS requests.
        // Using CoreCourses.getCategories would group more categories, but it would require a new WS request.
        const courses = await CorePromiseUtils.ignoreErrors(CoreCourses.getUserCourses(true, siteId));

        const categoriesIds = (courses ?? []).map(course => course.categoryid)
            .filter((categoryId): categoryId is number => categoryId !== undefined);

        if (!categoriesIds.includes(categoryId)) {
            return [
                {
                    contextlevel: ContextLevel.COURSECAT,
                    instanceid: categoryId,
                },
            ];
        }

        categoriesIds.sort((a, b) => b - a);

        return categoriesIds.map((categoryId) => ({
            contextlevel: ContextLevel.COURSECAT,
            instanceid: categoryId,
        }));
    }

    /**
     * If user is enrolled in the course, return contexts of all enrolled courses to decrease number of WS requests.
     *
     * @param courseId Course ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the contexts.
     */
    async getCourseContexts(courseId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        const courseIds = await CoreCourses.getCourseIdsIfEnrolled(courseId, siteId);

        const contexts: CoreFiltersGetAvailableInContextWSParamContext[] = [];

        courseIds.forEach((courseId) => {
            contexts.push({
                contextlevel: ContextLevel.COURSE,
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
     * @returns Promise resolved with the contexts.
     */
    async getCourseModulesContexts(courseId: number, siteId?: string): Promise<CoreFiltersGetAvailableInContextWSParamContext[]> {
        // Use stale while revalidate, but always use the first value. If data is updated it will be stored in DB.
        const sections = await firstValueFrom(CoreCourse.getSectionsObservable(courseId, {
            excludeContents: true,
            readingStrategy: CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE,
            siteId,
        }));

        const contexts: CoreFiltersGetAvailableInContextWSParamContext[] = [];

        sections.forEach((section) => {
            section.contents.forEach((modOrSubsection) => {
                if (!sectionContentIsModule(modOrSubsection)) {
                    return;
                }

                if (CoreCourseHelper.canUserViewModule(modOrSubsection, section)) {
                    contexts.push({
                        contextlevel: ContextLevel.MODULE,
                        instanceid: modOrSubsection.id,
                    });
                }
            });
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
     * @returns Promise resolved with the filters.
     */
    async getFilters(
        contextLevel: ContextLevel,
        instanceId: number,
        options: CoreFilterFormatTextOptions = {},
        siteId?: string,
    ): Promise<CoreFilterFilter[]> {
        // Check the right context to use.
        const newContext = CoreFilter.getEffectiveContext(contextLevel, instanceId, { courseId: options.courseId });
        contextLevel = newContext.contextLevel;
        instanceId = newContext.instanceId;

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
                return await CoreFilterDelegate.getEnabledFilters(contextLevel, instanceId);
            }

            const filters = await this.getFiltersInContextUsingAllStates(contextLevel, instanceId, options, site);
            if (filters) {
                options.filter = true;

                return filters;
            }

            const courseId = options.courseId;
            let hasFilters = true;

            if (
                contextLevel === ContextLevel.SYSTEM ||
                (contextLevel === ContextLevel.COURSE && instanceId == site.getSiteHomeId())
            ) {
                // No need to check the site filters because we're requesting the same context, so we'd do the same twice.
            } else {
                // Check if site has any filter to treat.
                hasFilters = await this.siteHasFiltersToTreat(options, siteId);
            }

            if (!hasFilters) {
                return [];
            }

            options.filter = true;

            if (contextLevel === ContextLevel.MODULE && courseId) {
                // Get all the modules filters with a single call to decrease the number of WS calls.
                const getFilters = () => this.getCourseModulesContexts(courseId, siteId);

                return await this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);

            } else if (contextLevel === ContextLevel.COURSE) {
                // If enrolled, get all enrolled courses filters with a single call to decrease number of WS calls.
                const getFilters = () => this.getCourseContexts(instanceId, siteId);

                return await this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);
            } else if (contextLevel === ContextLevel.COURSECAT) {
                // Try to get all the categories with a single call.
                const getFilters = () => this.getCategoryContexts(instanceId, siteId);

                return await this.getCacheableFilters(contextLevel, instanceId, getFilters, options, site);
            }

            return await CoreFilter.getAvailableInContext(contextLevel, instanceId, siteId);
        } catch (error) {
            this.logger.error('Error getting filters, return an empty array', error, contextLevel, instanceId);

            return [];
        }
    }

    /**
     * Get filters in context using the all states data.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options.
     * @param site Site.
     * @returns Filters, undefined if all states cannot be used.
     */
    protected async getFiltersInContextUsingAllStates(
        contextLevel: ContextLevel,
        instanceId: number,
        options: CoreFilterFormatTextOptions = {},
        site?: CoreSite,
    ): Promise<CoreFilterFilter[] | undefined> {
        site = site || CoreSites.getCurrentSite();

        if (!CoreFilter.canGetAllStatesInSite(site)) {
            return;
        }

        const allStates = await CoreFilter.getAllStates({ siteId: site?.getId() });
        if (
            contextLevel !== ContextLevel.SYSTEM &&
            contextLevel !== ContextLevel.COURSECAT &&
            this.hasCategoryOverride(allStates)
        ) {
            // A category has an override, we cannot calculate the right filters for child contexts.
            return;
        }

        const contexts = CoreFilter.getContextsTreeList(contextLevel, instanceId, { courseId: options.courseId });
        const contextId = Object.values(allStates[contextLevel]?.[instanceId] ?? {})[0]?.contextid;

        const filters: Record<string, CoreFilterFilter> = {};
        contexts.reverse().forEach((context) => {
            const isParentContext = context.contextLevel !== contextLevel;
            const filtersInContext = allStates[context.contextLevel]?.[context.instanceId];
            if (!filtersInContext) {
                return;
            }

            for (const name in filtersInContext) {
                const filterInContext = filtersInContext[name];
                if (filterInContext.localstate === CoreFilterStateValue.DISABLED) {
                    // Ignore disabled filters to make it consistent with available in context.
                    continue;
                }

                filters[name] = {
                    contextlevel: contextLevel,
                    instanceid: instanceId,
                    contextid: contextId,
                    filter: name,
                    localstate: isParentContext ? CoreFilterStateValue.INHERIT : filterInContext.localstate,
                    inheritedstate: isParentContext ?
                        filterInContext.localstate :
                        filters[name]?.inheritedstate ?? filterInContext.localstate,
                };
            }
        });

        return Object.values(filters);
    }

    /**
     * Check if there is an override for a category in the states of all filters.
     *
     * @param states States to check.
     * @returns True if has category override, false otherwise.
     */
    protected hasCategoryOverride(states: CoreFilterAllStates): boolean {
        if (!states[ContextLevel.COURSECAT]) {
            return false;
        }

        for (const instanceId in states[ContextLevel.COURSECAT]) {
            for (const name in states[ContextLevel.COURSECAT][instanceId]) {
                if (
                    states[ContextLevel.COURSECAT][instanceId][name].localstate !== states[ContextLevel.SYSTEM][0][name].localstate
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get filters and format text.
     *
     * @param text Text to filter.
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options for format text.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the formatted text and the filters.
     */
    async getFiltersAndFormatText(
        text: string,
        contextLevel: ContextLevel,
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
     * @returns The filters, undefined if not found.
     */
    protected getFromMemoryCache(
        courseId: number,
        contextLevel: ContextLevel,
        instanceId: number,
        site: CoreSite,
    ): CoreFilterFilter[] | undefined {

        const siteId = site.getId();

        // Check if we have the context in the memory cache.
        if (!this.moduleContextsCache[siteId]?.[courseId]?.[contextLevel]) {
            return;
        }

        const cachedData = this.moduleContextsCache[siteId][courseId][contextLevel];

        if (!CoreNetwork.isOnline() || Date.now() <= cachedData.time + site.getExpirationDelay(CoreCacheUpdateFrequency.RARELY)) {
            // We can use cache, return the filters if found.
            return cachedData.contexts[contextLevel] && cachedData.contexts[contextLevel][instanceId];
        }
    }

    /**
     * Check if site has available any filter that should be treated by the app.
     *
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it has filters to treat.
     */
    async siteHasFiltersToTreat(options?: CoreFilterFormatTextOptions, siteId?: string): Promise<boolean> {
        options = options || {};

        const site = await CoreSites.getSite(siteId);

        // Get filters at site level.
        const filters = await CoreFilter.getAvailableInContext(ContextLevel.SYSTEM, 0, site.getId());

        return CoreFilterDelegate.shouldBeApplied(filters, options, site);
    }

    /**
     * Store filters in the memory cache.
     *
     * @param courseId Course the module belongs to.
     * @param contextLevel Context level.
     * @param contexts Contexts.
     * @param siteId Site ID.
     */
    protected storeInMemoryCache(
        courseId: number,
        contextLevel: ContextLevel,
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
