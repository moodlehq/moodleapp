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
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSite } from '@classes/site';
import { CoreWSExternalWarning } from '@providers/ws';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreFilterDelegate } from './delegate';

/**
 * Service to provide filter functionalities.
 */
@Injectable()
export class CoreFilterProvider {

    protected ROOT_CACHE_KEY = 'mmFilter:';

    protected logger;

    /**
     * Store the contexts in memory to speed up the process, it can take a lot of time otherwise.
     */
    protected contextsCache: {
        [siteId: string]: {
            [contextlevel: string]: {
                [instanceid: number]: {
                    filters: CoreFilterFilter[],
                    time: number
                }
            }
        }
    } = {};

    constructor(logger: CoreLoggerProvider,
            eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider,
            private textUtils: CoreTextUtilsProvider,
            private filterDelegate: CoreFilterDelegate,
            private appProvider: CoreAppProvider) {

        this.logger = logger.getInstance('CoreFilterProvider');

        eventsProvider.on(CoreEventsProvider.WS_CACHE_INVALIDATED, (data) => {
            delete this.contextsCache[data.siteId];
        });

        eventsProvider.on(CoreEventsProvider.SITE_STORAGE_DELETED, (data) => {
            delete this.contextsCache[data.siteId];
        });
    }

    /**
     * Returns whether or not WS get available in context is avalaible.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with true if ws is avalaible, false otherwise.
     * @since 3.4
     */
    canGetAvailableInContext(siteId?: string): Promise<boolean> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return this.canGetAvailableInContextInSite(site);
        });
    }

    /**
     * Returns whether or not WS get available in context is avalaible in a certain site.
     *
     * @param site Site. If not defined, current site.
     * @return Promise resolved with true if ws is avalaible, false otherwise.
     * @since 3.4
     */
    canGetAvailableInContextInSite(site?: CoreSite): boolean {
        site = site || this.sitesProvider.getCurrentSite();

        return site.wsAvailable('core_filters_get_available_in_context');
    }

    /**
     * Given some HTML code, this function returns the text as safe HTML.
     *
     * @param text The text to be formatted.
     * @param options Formatting options.
     * @param filters The filters to apply. Required if filter is set to true.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the formatted text.
     */
    formatText(text: string, options?: CoreFilterFormatTextOptions, filters?: CoreFilterFilter[], siteId?: string)
            : Promise<string> {

        if (!text || typeof text != 'string') {
            // No need to do any filters and cleaning.
            return Promise.resolve('');
        }

        // Clone object if needed so we can modify it.
        options = options ? Object.assign({}, options) : {};

        if (typeof options.clean == 'undefined') {
            options.clean = false;
        }

        if (typeof options.filter == 'undefined') {
            options.filter = true;
        }

        if (!options.contextLevel) {
            options.filter  = false;
        }

        let promise: Promise<string>;

        if (options.filter) {
            promise = this.filterDelegate.filterText(text, filters, options, [], siteId);
        } else {
            promise = Promise.resolve(text);
        }

        return promise.then((text) => {

            if (options.clean) {
                text = this.textUtils.cleanTags(text, options.singleLine);
            }

            if (options.shortenLength > 0) {
                text = this.textUtils.shortenText(text, options.shortenLength);
            }

            if (options.highlight) {
                text = this.textUtils.highlightText(text, options.highlight);
            }

            return text;
        });
    }

    /**
     * Get cache key for available in contexts WS calls.
     *
     * @param contexts The contexts to check.
     * @return Cache key.
     */
    protected getAvailableInContextsCacheKey(contexts: {contextlevel: string, instanceid: number}[]): string {
        return this.getAvailableInContextsPrefixCacheKey() + JSON.stringify(contexts);
    }

    /**
     * Get prefixed cache key for available in contexts WS calls.
     *
     * @return Cache key.
     */
    protected getAvailableInContextsPrefixCacheKey(): string {
        return this.ROOT_CACHE_KEY + 'availableInContexts:';
    }

    /**
     * Get the filters available in several contexts.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters classified by context.
     */
    getAvailableInContexts(contexts: {contextlevel: string, instanceid: number}[], siteId?: string)
            : Promise<CoreFilterClassifiedFilters> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            siteId = site.getId();

            const result = this.getFromMemoryCache(contexts, site);

            if (result) {
                return result;
            }

            this.contextsCache[siteId] = this.contextsCache[siteId] || {};

            let hasSystemContext = false,
                hasSiteHomeContext = false;

            const contextsToSend = contexts.slice(); // Copy the contexts array to be able to modify it.

            // Check if any of the contexts is "system". We cannot use system context, so we'll have to use a wrokaround.
            for (let i = 0; i < contextsToSend.length; i++) {
                const context = contextsToSend[i];

                if (context.contextlevel == 'system') {
                    hasSystemContext = true;

                    // Use course site home instead. Check if it's already in the list.
                    hasSiteHomeContext = contextsToSend.some((context) => {
                        return context.contextlevel == 'course' && context.instanceid == site.getSiteHomeId();
                    });

                    if (hasSiteHomeContext) {
                        // Site home is already in list, remove this context from the list.
                        contextsToSend.splice(i, 1);
                    } else {
                        // Site home not in list, use it instead of system.
                        contextsToSend[i] = {
                            contextlevel: 'course',
                            instanceid: site.getSiteHomeId()
                        };
                    }

                    break;
                }
            }

            const data = {
                    contexts: contextsToSend,
                },
                preSets = {
                    cacheKey: this.getAvailableInContextsCacheKey(contextsToSend),
                    updateFrequency: CoreSite.FREQUENCY_RARELY
                };

            return site.read('core_filters_get_available_in_context', data, preSets)
                    .then((result: CoreFilterGetAvailableInContextResult) => {

                const classified: CoreFilterClassifiedFilters = {};

                // Initialize all contexts.
                contexts.forEach((context) => {
                    classified[context.contextlevel] = classified[context.contextlevel] || {};
                    classified[context.contextlevel][context.instanceid] = [];
                });

                if (contexts.length == 1 && !hasSystemContext) {
                    // Only 1 context, no need to iterate over the filters.
                    classified[contexts[0].contextlevel][contexts[0].instanceid] = result.filters;
                    this.storeInMemoryCache(classified, siteId);

                    return classified;
                }

                result.filters.forEach((filter) => {
                    if (hasSystemContext && filter.contextlevel == 'course' && filter.instanceid == site.getSiteHomeId()) {
                        if (hasSiteHomeContext) {
                            // We need to return both site home and system. Add site home first.
                            classified[filter.contextlevel][filter.instanceid].push(filter);

                            // Now copy the object so it can be modified.
                            filter = Object.assign({}, filter);
                        }

                        // Simulate the system context based on the inherited data.
                        filter.contextlevel = 'system';
                        filter.instanceid = 0;
                        filter.contextid = -1;
                        filter.localstate = filter.inheritedstate;
                    }

                    classified[filter.contextlevel][filter.instanceid].push(filter);
                });

                this.storeInMemoryCache(classified, siteId);

                return classified;
            });
        });
    }

    /**
     * Get the filters available in a certain context.
     *
     * @param contextLevel The context level to check: system, user, coursecat, course, module, block, ...
     * @param instanceId The instance ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the filters.
     */
    getAvailableInContext(contextLevel: string, instanceId: number, siteId?: string): Promise<CoreFilterFilter[]> {
        return this.getAvailableInContexts([{contextlevel: contextLevel, instanceid: instanceId}], siteId).then((result) => {
            return result[contextLevel][instanceId];
        });
    }

    /**
     * Get contexts filters from the memory cache.
     *
     * @param contexts Contexts to get.
     * @param site Site.
     * @return The filters classified by context and instance.
     */
    protected getFromMemoryCache(contexts: {contextlevel: string, instanceid: number}[], site: CoreSite)
            : CoreFilterClassifiedFilters {

        if (this.contextsCache[site.getId()]) {
            // Check if we have the contexts in the memory cache.
            const siteContexts = this.contextsCache[site.getId()],
                isOnline = this.appProvider.isOnline(),
                result: CoreFilterClassifiedFilters = {};
            let allFound = true;

            for (let i = 0; i < contexts.length; i++) {
                const context = contexts[i],
                    cachedCtxt = siteContexts[context.contextlevel] && siteContexts[context.contextlevel][context.instanceid];

                // Check the context isn't "expired". The time stored in this cache will not match the one in the site cache.
                if (cachedCtxt && (!isOnline ||
                        Date.now() <= cachedCtxt.time + site.getExpirationDelay(CoreSite.FREQUENCY_RARELY))) {

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
    }

    /**
     * Invalidates all available in context WS calls.
     *
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAllAvailableInContext(siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKeyStartingWith(this.getAvailableInContextsPrefixCacheKey());
        });
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contexts The contexts to check.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContexts(contexts: {contextlevel: string, instanceid: number}[], siteId?: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            return site.invalidateWsCacheForKey(this.getAvailableInContextsCacheKey(contexts));
        });
    }

    /**
     * Invalidates available in context WS call.
     *
     * @param contextLevel The context level to check.
     * @param instanceId The instance ID.
     * @param siteId Site ID (empty for current site).
     * @return Promise resolved when the data is invalidated.
     */
    invalidateAvailableInContext(contextLevel: string, instanceId: number, siteId?: string): Promise<any> {
        return this.invalidateAvailableInContexts([{contextlevel: contextLevel, instanceid: instanceId}], siteId);
    }

    /**
     * Store filters in the memory cache.
     *
     * @param filters Filters to store, classified by contextlevel and instanceid
     * @param siteId Site ID.
     */
    protected storeInMemoryCache(filters: CoreFilterClassifiedFilters, siteId: string): void {

        for (const contextLevel in filters) {
            this.contextsCache[siteId][contextLevel] = this.contextsCache[siteId][contextLevel] || {};

            for (const instanceId in filters[contextLevel]) {
                this.contextsCache[siteId][contextLevel][instanceId] = {
                    filters: filters[contextLevel][instanceId],
                    time: Date.now()
                };
            }
        }
    }
}

/**
 * Filter object returned by core_filters_get_available_in_context.
 */
export type CoreFilterFilter = {
    contextlevel: string; // The context level where the filters are: (coursecat, course, module).
    instanceid: number; // The instance id of item associated with the context.
    contextid: number; // The context id.
    filter: string; // Filter plugin name.
    localstate: number; // Filter state: 1 for on, -1 for off, 0 if inherit.
    inheritedstate: number; // 1 or 0 to use when localstate is set to inherit.
};

/**
 * Result of core_filters_get_available_in_context.
 */
export type CoreFilterGetAvailableInContextResult = {
    filters: CoreFilterFilter[]; // Available filters.
    warnings: CoreWSExternalWarning[]; // List of warnings.
};

/**
 * Options that can be passed to format text.
 */
export type CoreFilterFormatTextOptions = {
    contextLevel?: string; // The context level where the text is.
    instanceId?: number; // The instance id related to the context.
    clean?: boolean; // If true all HTML will be removed. Default false.
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
        [instanceid: number]: CoreFilterFilter[]
    }
};
