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

import { Injectable, SecurityContext } from '@angular/core';

import { CoreNetwork } from '@services/network';
import { CoreSites, CoreSitesCommonWSOptions, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSite } from '@classes/sites/site';
import { CoreWSExternalWarning } from '@services/ws';
import { CoreText } from '@singletons/text';
import { CoreFilterDelegate } from './filter-delegate';
import { DomSanitizer, makeSingleton } from '@singletons';
import { CoreEvents, CoreEventSiteData } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { ContextLevel, CoreCacheUpdateFrequency } from '@/core/constants';

/**
 * Service to provide filter functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreFilterProvider {

    protected static readonly ROOT_CACHE_KEY = 'mmFilter:';

    protected logger: CoreLogger;

    /**
     * Store the contexts in memory to speed up the process, it can take a lot of time otherwise.
     */
    protected contextsCache: {
        [siteId: string]: {
            [contextlevel: string]: {
                [instanceid: number]: {
                    filters: CoreFilterFilter[];
                    time: number;
                };
            };
        };
    } = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreFilterProvider');

        CoreEvents.on(CoreEvents.WS_CACHE_INVALIDATED, (data: CoreEventSiteData) => {
            delete this.contextsCache[data.siteId || ''];
        });

        CoreEvents.on(CoreEvents.SITE_STORAGE_DELETED, (data: CoreEventSiteData) => {
            delete this.contextsCache[data.siteId || ''];
        });
    }

    /**
     * Check if getting all states is available in site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether it's available.
     * @since 4.4
     */
    async canGetAllStates(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.canGetAllStatesInSite(site);
    }

    /**
     * Check if getting all states is available in site.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's available.
     * @since 4.4
     */
    canGetAllStatesInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site?.wsAvailable('core_filters_get_all_states'));
    }

    /**
     * Returns whether or not we can get the available filters: the WS is available and the feature isn't disabled.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Whether can get filters.
     */
    async canGetFilters(siteId?: string): Promise<boolean> {
        const disabled = await this.checkFiltersDisabled(siteId);

        return !disabled;
    }

    /**
     * Returns whether or not we can get the available filters: the WS is available and the feature isn't disabled.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether can get filters.
     */
    canGetFiltersInSite(site?: CoreSite): boolean {
        return !this.checkFiltersDisabledInSite(site);
    }

    /**
     * Returns whether or not checking the available filters is disabled in the site.
     *
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with boolean: whether it's disabled.
     */
    async checkFiltersDisabled(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);

        return this.checkFiltersDisabledInSite(site);
    }

    /**
     * Returns whether or not checking the available filters is disabled in the site.
     *
     * @param site Site. If not defined, current site.
     * @returns Whether it's disabled.
     */
    checkFiltersDisabledInSite(site?: CoreSite): boolean {
        site = site || CoreSites.getCurrentSite();

        return !!(site?.isFeatureDisabled('CoreFilterDelegate'));
    }

    /**
     * Classify a list of filters into each context.
     *
     * @param contexts List of contexts.
     * @param filters List of filters.
     * @param hadSystemContext Whether the list of contexts originally had system context.
     * @param hadSiteHomeContext Whether the list of contexts originally had site home context.
     * @param site Site instance.
     * @returns Classified filters.
     */
    protected classifyFilters(
        contexts: CoreFiltersGetAvailableInContextWSParamContext[],
        filters: CoreFilterFilter[],
        hadSystemContext: boolean,
        hadSiteHomeContext: boolean,
        site: CoreSite,
    ): CoreFilterClassifiedFilters {
        const classified: CoreFilterClassifiedFilters = {};

        // Initialize all contexts.
        contexts.forEach((context) => {
            classified[context.contextlevel] = classified[context.contextlevel] || {};
            classified[context.contextlevel][context.instanceid] = [];
        });

        if (contexts.length == 1 && !hadSystemContext) {
            // Only 1 context, no need to iterate over the filters.
            classified[contexts[0].contextlevel][contexts[0].instanceid] = filters;

            return classified;
        }

        filters.forEach((filter) => {
            if (hadSystemContext && filter.contextlevel === ContextLevel.COURSE && filter.instanceid == site.getSiteHomeId()) {
                if (hadSiteHomeContext) {
                    // We need to return both site home and system. Add site home first.
                    classified[filter.contextlevel][filter.instanceid].push(filter);

                    // Now copy the object so it can be modified.
                    filter = Object.assign({}, filter);
                }

                // Simulate the system context based on the inherited data.
                filter.contextlevel = ContextLevel.SYSTEM;
                filter.instanceid = 0;
                filter.contextid = undefined;
                filter.localstate = filter.inheritedstate;
            }

            classified[filter.contextlevel][filter.instanceid].push(filter);
        });

        return classified;
    }

    /**
     * Given a context level and instance ID, return the proper context to use.
     *
     * @param contextLevel The context level.
     * @param instanceId Instance ID related to the context.
     * @param options Options.
     * @returns Context to use.
     */
    getEffectiveContext(
        contextLevel: ContextLevel,
        instanceId: number,
        options: { courseId?: number } = {},
    ): { contextLevel: ContextLevel; instanceId: number } {
        if (contextLevel === ContextLevel.BLOCK || contextLevel === ContextLevel.USER) {
            // Blocks and users cannot have specific filters, use the parent context instead.
            return options.courseId ?
                { contextLevel: ContextLevel.COURSE, instanceId: options.courseId } :
                { contextLevel: ContextLevel.SYSTEM, instanceId: 0 };
        }

        return { contextLevel, instanceId };
    }

    /**
     * Given some HTML code, this function returns the text as safe HTML.
     *
     * @param text The text to be formatted.
     * @param options Formatting options.
     * @param filters The filters to apply. Required if filter is set to true.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the formatted text.
     */
    async formatText(
        text: string,
        options?: CoreFilterFormatTextOptions,
        filters?: CoreFilterFilter[],
        siteId?: string,
    ): Promise<string> {

        if (!text || typeof text !== 'string') {
            // No need to do any filters and cleaning.
            return '';
        }

        // Clone object if needed so we can modify it.
        options = options ? Object.assign({}, options) : {};

        if (options.clean === undefined) {
            options.clean = false;
        }

        if (options.filter === undefined) {
            options.filter = true;
        }

        if (!options.contextLevel) {
            options.filter = false;
        }

        if (options.filter) {
            text = await CoreFilterDelegate.filterText(text, filters, options, [], siteId);
        }

        if (options.clean) {
            text = CoreText.cleanTags(text, { singleLine: options.singleLine });
        }

        if (options.sanitize) {
            text = DomSanitizer.sanitize(SecurityContext.HTML, text) || '';
        }

        if (options.shortenLength && options.shortenLength > 0) {
            text = CoreText.shortenText(text, options.shortenLength);
        }

        if (options.highlight) {
            text = CoreText.highlightText(text, options.highlight);
        }

        return text;
    }

    /**
     * Get cache key for get all states WS call.
     *
     * @returns Cache key.
     */
    protected getAllStatesCacheKey(): string {
        return `${CoreFilterProvider.ROOT_CACHE_KEY}allStates`;
    }

    /**
     * Get all the states for filters.
     *
     * @param options Options.
     * @returns Promise resolved with the filters classified by context.
     * @since 4.4
     */
    async getAllStates(options: CoreSitesCommonWSOptions = {}): Promise<CoreFilterAllStates> {
        const site = await CoreSites.getSite(options.siteId);

        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAllStatesCacheKey(),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            // Use stale while revalidate by default, but always use the first value. If data is updated it will be stored in DB.
            ...CoreSites.getReadingStrategyPreSets(options.readingStrategy ?? CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE),
        };

        const result = await site.read<CoreFilterGetAllStatesWSResponse>('core_filters_get_all_states', {}, preSets);

        const classified: CoreFilterAllStates = {};

        result.filters.forEach((filter) => {
            classified[filter.contextlevel] = classified[filter.contextlevel] || {};
            classified[filter.contextlevel][filter.instanceid] = classified[filter.contextlevel][filter.instanceid] || {};

            classified[filter.contextlevel][filter.instanceid][filter.filter] = {
                contextlevel: filter.contextlevel,
                instanceid: filter.instanceid,
                contextid: filter.contextid,
                filter: filter.filter,
                localstate: filter.state,
                inheritedstate: filter.state,
            };
        });

        return classified;
    }

    /**
     * Get cache key for available in contexts WS calls.
     *
     * @param contexts The contexts to check.
     * @returns Cache key.
     */
    protected getAvailableInContextsCacheKey(contexts: CoreFiltersGetAvailableInContextWSParamContext[]): string {
        return this.getAvailableInContextsPrefixCacheKey() + JSON.stringify(contexts);
    }

    /**
     * Get prefixed cache key for available in contexts WS calls.
     *
     * @returns Cache key.
     */
    protected getAvailableInContextsPrefixCacheKey(): string {
        return `${CoreFilterProvider.ROOT_CACHE_KEY}availableInContexts:`;
    }

    /**
     * Get the filters available in several contexts.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the filters classified by context.
     */
    async getAvailableInContexts(
        contexts: CoreFiltersGetAvailableInContextWSParamContext[],
        siteId?: string,
    ): Promise<CoreFilterClassifiedFilters> {

        const site = await CoreSites.getSite(siteId);

        siteId = site.getId();

        const cacheResult = this.getFromMemoryCache(contexts, site);

        if (cacheResult) {
            return cacheResult;
        }

        const contextsToSend = contexts.slice(); // Copy the contexts array to be able to modify it.

        const { hadSystemContext, hadSiteHomeContext } = this.replaceSystemContext(contextsToSend, site);

        const data: CoreFiltersGetAvailableInContextWSParams = {
            contexts: contextsToSend,
        };
        const preSets: CoreSiteWSPreSets = {
            cacheKey: this.getAvailableInContextsCacheKey(contextsToSend),
            updateFrequency: CoreCacheUpdateFrequency.RARELY,
            splitRequest: {
                param: 'contexts',
                maxLength: 300,
            },
            // Use stale while revalidate, but always use the first value. If data is updated it will be stored in DB.
            ...CoreSites.getReadingStrategyPreSets(CoreSitesReadingStrategy.STALE_WHILE_REVALIDATE),
        };

        const result = await site.read<CoreFilterGetAvailableInContextResult>(
            'core_filters_get_available_in_context',
            data,
            preSets,
        );

        const classified = this.classifyFilters(contexts, result.filters, hadSystemContext, hadSiteHomeContext, site);

        this.storeInMemoryCache(classified, siteId);

        return classified;
    }

    /**
     * Get the filters available in a certain context.
     *
     * @param contextLevel The context level to check: system, user, coursecat, course, module, block, ...
     * @param instanceId The instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the filters.
     */
    async getAvailableInContext(contextLevel: ContextLevel, instanceId: number, siteId?: string): Promise<CoreFilterFilter[]> {
        const result = await this.getAvailableInContexts([{ contextlevel: contextLevel, instanceid: instanceId }], siteId);

        return result[contextLevel][instanceId] || [];
    }

    /**
     * Get contexts filters from the memory cache.
     *
     * @param contexts Contexts to get.
     * @param site Site.
     * @returns The filters classified by context and instance.
     */
    protected getFromMemoryCache(
        contexts: CoreFiltersGetAvailableInContextWSParamContext[],
        site: CoreSite,
    ): CoreFilterClassifiedFilters | undefined {

        if (!this.contextsCache[site.getId()]) {
            return;
        }

        // Check if we have the contexts in the memory cache.
        const siteContexts = this.contextsCache[site.getId()];
        const isOnline = CoreNetwork.isOnline();
        const result: CoreFilterClassifiedFilters = {};
        let allFound = true;

        for (let i = 0; i < contexts.length; i++) {
            const context = contexts[i];
            const cachedCtxt = siteContexts[context.contextlevel]?.[context.instanceid];

            // Check the context isn't "expired". The time stored in this cache will not match the one in the site cache.
            if (cachedCtxt && (!isOnline ||
                    Date.now() <= cachedCtxt.time + site.getExpirationDelay(CoreCacheUpdateFrequency.RARELY))) {

                result[context.contextlevel] = result[context.contextlevel] || {};
                result[context.contextlevel][context.instanceid] = cachedCtxt.filters;
            } else {
                allFound = false;
                break;
            }
        }

        if (allFound) {
            return result;
        }
    }

    /**
     * Given a context, return the list of contexts used in the filters inheritance tree, from bottom to top.
     * E.g. when using module, it will return the module context, course context (if course ID is supplied), category context
     * (if categoy ID is supplied) and system context.
     *
     * @param contextLevel Context level.
     * @param instanceId Instance ID.
     * @param options Options
     * @returns List of contexts.
     */
    getContextsTreeList(
        contextLevel: ContextLevel,
        instanceId: number,
        options: { courseId?: number; categoryId?: number } = {},
    ): { contextLevel: ContextLevel; instanceId: number }[] {
        // Make sure context has been converted.
        const newContext = CoreFilter.getEffectiveContext(contextLevel, instanceId, options);
        contextLevel = newContext.contextLevel;
        instanceId = newContext.instanceId;

        const contexts = [
            { contextLevel, instanceId },
        ];

        if (contextLevel === ContextLevel.MODULE && options.courseId) {
            contexts.push({ contextLevel: ContextLevel.COURSE, instanceId: options.courseId });
        }

        if ((contextLevel === ContextLevel.MODULE || contextLevel === ContextLevel.COURSE) && options.categoryId) {
            contexts.push({ contextLevel: ContextLevel.COURSECAT, instanceId: options.categoryId });
        }

        if (contextLevel !== ContextLevel.SYSTEM) {
            contexts.push({ contextLevel: ContextLevel.SYSTEM, instanceId: 0 });
        }

        return contexts;
    }

    /**
     * Invalidates all available in context WS calls.
     *
     * @param siteId Site ID (empty for current site).
     */
    async invalidateAllAvailableInContext(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKeyStartingWith(this.getAvailableInContextsPrefixCacheKey());
    }

    /**
     * Invalidates get all states WS call.
     *
     * @param siteId Site ID (empty for current site).
     */
    async invalidateAllStates(siteId?: string): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAllStatesCacheKey());
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID (empty for current site).
     */
    async invalidateAvailableInContexts(
        contexts: CoreFiltersGetAvailableInContextWSParamContext[],
        siteId?: string,
    ): Promise<void> {
        const site = await CoreSites.getSite(siteId);

        await site.invalidateWsCacheForKey(this.getAvailableInContextsCacheKey(contexts));
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contextLevel The context level to check.
     * @param instanceId The instance ID.
     * @param siteId Site ID (empty for current site).
     */
    async invalidateAvailableInContext(contextLevel: ContextLevel, instanceId: number, siteId?: string): Promise<void> {
        await this.invalidateAvailableInContexts([{ contextlevel: contextLevel, instanceid: instanceId }], siteId);
    }

    /**
     * Given a list of context to send to core_filters_get_available_in_context, search if the system context is in the list
     * and, if so, replace it with a workaround.
     *
     * @param contexts The contexts to check.
     * @param site Site instance.
     * @returns Whether the filters had system context and whether they had the site home context.
     */
    protected replaceSystemContext(
        contexts: CoreFiltersGetAvailableInContextWSParamContext[],
        site: CoreSite,
    ): { hadSystemContext: boolean; hadSiteHomeContext: boolean } {
        const result = {
            hadSystemContext: false,
            hadSiteHomeContext: false,
        };

        // Check if any of the contexts is "system". We cannot use system context, so we'll have to use a wrokaround.
        for (let i = 0; i < contexts.length; i++) {
            const context = contexts[i];

            if (context.contextlevel !== ContextLevel.SYSTEM) {
                continue;
            }

            result.hadSystemContext = true;

            // Use course site home instead. Check if it's already in the list.
            result.hadSiteHomeContext = contexts.some((context) =>
                context.contextlevel === ContextLevel.COURSE && context.instanceid == site.getSiteHomeId());

            if (result.hadSiteHomeContext) {
                // Site home is already in list, remove this context from the list.
                contexts.splice(i, 1);
            } else {
                // Site home not in list, use it instead of system.
                contexts[i] = {
                    contextlevel: ContextLevel.COURSE,
                    instanceid: site.getSiteHomeId(),
                };
            }

            break;
        }

        return result;
    }

    /**
     * Store filters in the memory cache.
     *
     * @param filters Filters to store, classified by contextlevel and instanceid
     * @param siteId Site ID.
     */
    protected storeInMemoryCache(filters: CoreFilterClassifiedFilters, siteId: string): void {
        this.contextsCache[siteId] = this.contextsCache[siteId] || {};

        for (const contextLevel in filters) {
            this.contextsCache[siteId][contextLevel] = this.contextsCache[siteId][contextLevel] || {};

            for (const instanceId in filters[contextLevel]) {
                this.contextsCache[siteId][contextLevel][instanceId] = {
                    filters: filters[contextLevel][instanceId],
                    time: Date.now(),
                };
            }
        }
    }

}

export const CoreFilter = makeSingleton(CoreFilterProvider);

/**
 * Params of core_filters_get_available_in_context WS.
 */
export type CoreFiltersGetAvailableInContextWSParams = {
    contexts: CoreFiltersGetAvailableInContextWSParamContext[]; // The list of contexts to check.
};

/**
 * Data about a context sent to core_filters_get_available_in_context.
 */
export type CoreFiltersGetAvailableInContextWSParamContext = {
    contextlevel: ContextLevel; // The context level where the filters are: (coursecat, course, module).
    instanceid: number; // The instance id of item associated with the context.
};

/**
 * Filter data.
 */
export type CoreFilterFilter = {
    contextlevel: ContextLevel; // The context level where the filters are: (coursecat, course, module).
    instanceid: number; // The instance id of item associated with the context.
    contextid?: number; // The context id. It will be undefined in cases where it cannot be calculated in the app.
    filter: string; // Filter plugin name.
    localstate: CoreFilterStateValue; // Filter state.
    inheritedstate: CoreFilterStateValue; // State to use when localstate is set to inherit.
};

/**
 * Result of core_filters_get_available_in_context.
 */
export type CoreFilterGetAvailableInContextResult = {
    filters: CoreFilterFilter[]; // Available filters.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Filter state returned by core_filters_get_all_states.
 */
export type CoreFilterState = {
    contextlevel: ContextLevel; // The context level where the filters are: (coursecat, course, module).
    instanceid: number; // The instance id of item associated with the context.
    contextid: number; // The context id.
    filter: string; // Filter plugin name.
    state: CoreFilterStateValue; // Filter state.
    sortorder: number; // Sort order.
};

/**
 * Context levels enumeration.
 */
export const enum CoreFilterStateValue {
    ON = 1,
    INHERIT = 0,
    OFF = -1,
    DISABLED = -9999,
}

/**
 * Result of core_filters_get_all_states.
 */
export type CoreFilterGetAllStatesWSResponse = {
    filters: CoreFilterState[]; // Filter state.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Options that can be passed to format text.
 */
export type CoreFilterFormatTextOptions = {
    contextLevel?: ContextLevel; // The context level where the text is.
    instanceId?: number; // The instance id related to the context.
    clean?: boolean; // If true all HTML will be removed. Default false.
    sanitize?: boolean; // If true the text will be sanitized. Default false.
    filter?: boolean; // If true the string will be run through applicable filters as well. Default true.
    singleLine?: boolean; // If true then new lines will be removed (all the text in a single line).
    shortenLength?: number; // Number of characters to shorten the text.
    highlight?: string; // Text to highlight.
    wsNotFiltered?: boolean; // If true it means the WS didn't filter the text for some reason.
    courseId?: number; // Course ID the text belongs to. It can be used to improve performance.
};

/**
 * Filters classified by context and instance.
 */
export type CoreFilterClassifiedFilters = {
    [contextlevel: string]: {
        [instanceid: number]: CoreFilterFilter[];
    };
};

/**
 * All filter states classified by context, instance and filter name.
 */
export type CoreFilterAllStates = {
    [contextlevel: string]: {
        [instanceid: number]: {
            [filtername: string]: CoreFilterFilter;
        };
    };
};
